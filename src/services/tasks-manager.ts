/**
 * TasksManager Service
 * Manages tasks with CRUD operations, semantic search, and statistics leveraging RAG memory system
 */

import { EnhancedRAGMemoryManager } from './memory/enhanced-rag-memory-manager';
import { TaskSummary, TaskDetail, TaskStatus, Memory } from '../types/memory';

export interface TaskFilters {
  status?: TaskStatus | TaskStatus[];
  assignee?: string;
  dueBefore?: Date;
  dueAfter?: Date;
  priority?: number;
}

export interface TaskStatistics {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  overdue: number;
  completionRate: number;
  priorityDistribution: { [priority: number]: number };
}

export class TasksManager {
  private ragMemory: EnhancedRAGMemoryManager;
  private initialized = false;

  constructor() {
    this.ragMemory = new EnhancedRAGMemoryManager();
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('[TasksManager] Already initialized');
      return;
    }

    await this.ragMemory.initialize();
    this.initialized = true;
    console.log('[TasksManager] Initialized successfully');
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('TasksManager not initialized. Call initialize() first.');
    }
  }

  private validatePriority(priority: number): void {
    if (priority < 1 || priority > 5) {
      throw new Error('Priority must be between 1 and 5');
    }
  }

  private isTaskOverdue(dueDate: string | null, status: TaskStatus): boolean {
    if (!dueDate || status === 'completed' || status === 'cancelled') {
      return false;
    }

    const due = new Date(dueDate);
    const now = new Date();
    return due < now;
  }

  async createTask(params: {
    title: string;
    description: string;
    priority?: number;
    dueDate?: Date;
    assignee?: string;
  }): Promise<string> {
    this.ensureInitialized();

    const { title, description, priority = 3, dueDate, assignee = 'user' } = params;

    if (!title || title.trim().length === 0) {
      throw new Error('Task title cannot be empty');
    }

    if (!description || description.trim().length === 0) {
      throw new Error('Task description cannot be empty');
    }

    this.validatePriority(priority);

    const combinedText = `${title}\n\n${description}`;
    const timestamp = new Date().toISOString();

    const id = await this.ragMemory.addMemory(
      combinedText,
      'user',
      'task',
      assignee,
      priority,
      {
        taskTitle: title,
        taskDescription: description,
        taskStatus: 'pending' as TaskStatus,
        priority,
        dueDate: dueDate ? dueDate.toISOString() : null,
        assignee,
        createdAt: timestamp,
        updatedAt: timestamp,
        completedAt: null,
      }
    );

    console.log(`[TasksManager] Created task: ${id} - "${title}"`);
    return id;
  }

  async getTasks(filters?: TaskFilters): Promise<TaskSummary[]> {
    this.ensureInitialized();

    let tasks = await this.ragMemory.getTasks();

    if (filters?.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      tasks = tasks.filter(task => statuses.includes(task.metadata.taskStatus as TaskStatus));
    }

    if (filters?.assignee) {
      tasks = tasks.filter(task => task.metadata.assignee === filters.assignee);
    }

    if (filters?.priority !== undefined) {
      tasks = tasks.filter(task => task.metadata.priority === filters.priority);
    }

    if (filters?.dueBefore) {
      tasks = tasks.filter(task => {
        if (!task.metadata.dueDate) return false;
        return new Date(task.metadata.dueDate) <= filters.dueBefore!;
      });
    }

    if (filters?.dueAfter) {
      tasks = tasks.filter(task => {
        if (!task.metadata.dueDate) return false;
        return new Date(task.metadata.dueDate) >= filters.dueAfter!;
      });
    }

    tasks.sort((a, b) => {
      const priorityDiff = (b.metadata.priority || 3) - (a.metadata.priority || 3);
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.metadata.updatedAt || b.metadata.timestamp).getTime() - 
             new Date(a.metadata.updatedAt || a.metadata.timestamp).getTime();
    });

    return tasks.map(task => this.memoryToTaskSummary(task));
  }

  async getTaskById(id: string): Promise<TaskDetail | null> {
    this.ensureInitialized();

    const memory = await this.ragMemory.getMemoryById(id);
    
    if (!memory || memory.metadata.type !== 'task') {
      return null;
    }

    return this.memoryToTaskDetail(memory);
  }

  async updateTask(id: string, updates: {
    title?: string;
    description?: string;
    status?: TaskStatus;
    priority?: number;
    dueDate?: Date | null;
    assignee?: string;
  }): Promise<void> {
    this.ensureInitialized();

    const existingMemory = await this.ragMemory.getMemoryById(id);
    
    if (!existingMemory || existingMemory.metadata.type !== 'task') {
      throw new Error(`Task with ID ${id} not found`);
    }

    const currentTitle = existingMemory.metadata.taskTitle || '';
    const currentDescription = existingMemory.metadata.taskDescription || '';
    const currentStatus = existingMemory.metadata.taskStatus as TaskStatus;
    const currentPriority = existingMemory.metadata.priority || 3;
    const currentDueDate = existingMemory.metadata.dueDate;
    const currentAssignee = existingMemory.metadata.assignee || 'user';
    const currentCompletedAt = existingMemory.metadata.completedAt;

    const newTitle = updates.title !== undefined ? updates.title : currentTitle;
    const newDescription = updates.description !== undefined ? updates.description : currentDescription;
    const newStatus = updates.status !== undefined ? updates.status : currentStatus;
    const newPriority = updates.priority !== undefined ? updates.priority : currentPriority;
    const newDueDate = updates.dueDate !== undefined 
      ? (updates.dueDate ? updates.dueDate.toISOString() : null)
      : currentDueDate;
    const newAssignee = updates.assignee !== undefined ? updates.assignee : currentAssignee;

    if (updates.priority !== undefined) {
      this.validatePriority(updates.priority);
    }

    const titleOrDescriptionChanged = newTitle !== currentTitle || newDescription !== currentDescription;
    
    let updatedText = existingMemory.text;
    let updatedEmbedding = existingMemory.embedding;

    if (titleOrDescriptionChanged) {
      updatedText = `${newTitle}\n\n${newDescription}`;
      const embeddingGenerator = (this.ragMemory as any).embeddingGenerator;
      if (embeddingGenerator) {
        updatedEmbedding = await embeddingGenerator.generateEmbedding(updatedText);
      }
    }

    const timestamp = new Date().toISOString();
    
    let completedAt = currentCompletedAt;
    if (newStatus === 'completed' && currentStatus !== 'completed') {
      completedAt = timestamp;
    } else if (newStatus !== 'completed') {
      completedAt = null;
    }

    const updatedMemory: Memory = {
      ...existingMemory,
      text: updatedText,
      embedding: updatedEmbedding,
      metadata: {
        ...existingMemory.metadata,
        taskTitle: newTitle,
        taskDescription: newDescription,
        taskStatus: newStatus,
        priority: newPriority,
        dueDate: newDueDate,
        assignee: newAssignee,
        updatedAt: timestamp,
        completedAt,
      },
    };

    await this.ragMemory.updateMemory(id, updatedMemory);
    console.log(`[TasksManager] Updated task: ${id} - "${newTitle}"`);
  }

  async deleteTask(id: string): Promise<void> {
    this.ensureInitialized();

    const memory = await this.ragMemory.getMemoryById(id);
    
    if (!memory || memory.metadata.type !== 'task') {
      throw new Error(`Task with ID ${id} not found`);
    }

    const deleted = await this.ragMemory.deleteMemory(id);
    
    if (!deleted) {
      throw new Error(`Failed to delete task with ID ${id}`);
    }

    console.log(`[TasksManager] Deleted task: ${id}`);
  }

  async searchTasks(query: string, limit: number = 10): Promise<TaskDetail[]> {
    this.ensureInitialized();

    if (!query || query.trim().length === 0) {
      throw new Error('Search query cannot be empty');
    }

    const results = await this.ragMemory.retrieveRelevantMemories(query, {
      memoryType: 'task',
      limit,
      threshold: 0.5,
    });

    return results.map(result => this.memoryToTaskDetail(result.memory));
  }

  async computeStatistics(filters?: TaskFilters): Promise<TaskStatistics> {
    this.ensureInitialized();

    const tasks = await this.getTasks(filters);

    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const pending = tasks.filter(t => t.status === 'pending').length;
    const overdue = tasks.filter(t => t.isOverdue).length;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    const priorityDistribution: { [priority: number]: number } = {};
    tasks.forEach(task => {
      priorityDistribution[task.priority] = (priorityDistribution[task.priority] || 0) + 1;
    });

    return {
      total,
      completed,
      inProgress,
      pending,
      overdue,
      completionRate,
      priorityDistribution,
    };
  }

  async toggleTaskStatus(id: string): Promise<void> {
    this.ensureInitialized();

    const task = await this.getTaskById(id);
    
    if (!task) {
      throw new Error(`Task with ID ${id} not found`);
    }

    let newStatus: TaskStatus;
    switch (task.status) {
      case 'pending':
        newStatus = 'in_progress';
        break;
      case 'in_progress':
        newStatus = 'completed';
        break;
      case 'completed':
        newStatus = 'pending';
        break;
      case 'cancelled':
        newStatus = 'pending';
        break;
      default:
        newStatus = 'pending';
    }

    await this.updateTask(id, { status: newStatus });
    console.log(`[TasksManager] Toggled task status: ${id} - ${task.status} -> ${newStatus}`);
  }

  private memoryToTaskSummary(memory: Memory): TaskSummary {
    const status = memory.metadata.taskStatus as TaskStatus || 'pending';
    const dueDate = memory.metadata.dueDate;

    return {
      id: memory.id,
      title: memory.metadata.taskTitle || 'Untitled Task',
      status,
      priority: memory.metadata.priority || 3,
      dueDate: dueDate || null,
      assignee: memory.metadata.assignee || 'user',
      createdAt: memory.metadata.createdAt || memory.metadata.timestamp,
      updatedAt: memory.metadata.updatedAt || memory.metadata.timestamp,
      completedAt: memory.metadata.completedAt || null,
      isOverdue: this.isTaskOverdue(dueDate, status),
    };
  }

  private memoryToTaskDetail(memory: Memory): TaskDetail {
    const summary = this.memoryToTaskSummary(memory);
    
    return {
      ...summary,
      description: memory.metadata.taskDescription || memory.text,
    };
  }
}

export const tasksManager = new TasksManager();
