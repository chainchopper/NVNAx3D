import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { tasksManager } from '../services/tasks-manager';
import { TaskSummary, TaskDetail, TaskStatus } from '../types/memory';
import { TaskStatistics } from '../services/tasks-manager';

@customElement('tasks-panel')
export class TasksPanel extends LitElement {
  @state() private tasks: TaskSummary[] = [];
  @state() private selectedTaskId: string | null = null;
  @state() private selectedTask: TaskDetail | null = null;
  @state() private draftTitle = '';
  @state() private draftDescription = '';
  @state() private draftStatus: TaskStatus = 'pending';
  @state() private draftPriority = 3;
  @state() private draftDueDate = '';
  @state() private draftAssignee = 'user';
  @state() private searchText = '';
  @state() private filterStatus: TaskStatus | 'all' | 'overdue' = 'all';
  @state() private filterAssignee: string | 'all' = 'all';
  @state() private sortBy: 'dueDate' | 'priority' | 'createdDate' = 'priority';
  @state() private busy = false;
  @state() private isCreating = false;
  @state() private hasChanges = false;
  @state() private statistics: TaskStatistics | null = null;

  static styles = css`
    :host {
      display: block;
      position: fixed;
      right: 0;
      top: 0;
      bottom: 0;
      width: 900px;
      max-width: 95vw;
      background: rgba(20, 20, 30, 0.98);
      backdrop-filter: blur(20px);
      box-shadow: -4px 0 20px rgba(0, 0, 0, 0.5);
      z-index: 1000;
      color: white;
      font-family: system-ui, -apple-system, sans-serif;
      animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }

    .header {
      padding: 20px 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(0, 0, 0, 0.2);
    }

    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .header-top h2 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .close-btn {
      background: none;
      border: none;
      color: white;
      font-size: 24px;
      cursor: pointer;
      padding: 8px;
      opacity: 0.7;
      transition: opacity 0.2s;
    }

    .close-btn:hover {
      opacity: 1;
    }

    .statistics-dashboard {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      align-items: center;
      font-size: 13px;
    }

    .stat-item {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .stat-item.total { border-color: rgba(135, 206, 250, 0.5); }
    .stat-item.completed { border-color: rgba(76, 175, 80, 0.5); }
    .stat-item.in-progress { border-color: rgba(255, 193, 7, 0.5); }
    .stat-item.overdue { border-color: rgba(244, 67, 54, 0.5); }

    .stat-label {
      opacity: 0.8;
      font-size: 12px;
    }

    .stat-value {
      font-weight: 600;
      font-size: 14px;
    }

    .completion-bar-container {
      flex: 1;
      min-width: 150px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .completion-bar {
      flex: 1;
      height: 8px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      overflow: hidden;
      position: relative;
    }

    .completion-fill {
      height: 100%;
      background: linear-gradient(90deg, #4caf50, #8bc34a);
      transition: width 0.3s ease;
    }

    .completion-fill.low {
      background: linear-gradient(90deg, #f44336, #ff5722);
    }

    .completion-fill.medium {
      background: linear-gradient(90deg, #ff9800, #ffc107);
    }

    .completion-text {
      font-size: 12px;
      font-weight: 600;
      min-width: 40px;
    }

    .main-container {
      display: flex;
      height: calc(100% - 130px);
    }

    .sidebar {
      width: 30%;
      min-width: 250px;
      border-right: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      flex-direction: column;
      background: rgba(0, 0, 0, 0.1);
    }

    .sidebar-header {
      padding: 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .search-box {
      width: 100%;
      padding: 10px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px;
      color: white;
      font-size: 14px;
      box-sizing: border-box;
      margin-bottom: 12px;
    }

    .search-box:focus {
      outline: none;
      border-color: #2196f3;
    }

    .filter-controls {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 12px;
    }

    .filter-tabs {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
    }

    .filter-tab {
      flex: 1;
      min-width: 60px;
      padding: 6px 8px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      color: white;
      font-size: 11px;
      cursor: pointer;
      text-align: center;
      transition: all 0.2s;
    }

    .filter-tab:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .filter-tab.active {
      background: rgba(33, 150, 243, 0.3);
      border-color: #2196f3;
    }

    .filter-select {
      width: 100%;
      padding: 8px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px;
      color: white;
      font-size: 13px;
      box-sizing: border-box;
    }

    .filter-select option {
      background: #1a1a24;
      color: white;
    }

    .new-task-btn {
      width: 100%;
      padding: 12px;
      background: #2196f3;
      border: none;
      border-radius: 6px;
      color: white;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
      margin-bottom: 12px;
    }

    .new-task-btn:hover {
      background: #1976d2;
    }

    .tasks-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    }

    .task-item {
      padding: 12px;
      margin-bottom: 8px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      gap: 10px;
      align-items: flex-start;
    }

    .task-item:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.3);
    }

    .task-item.selected {
      background: rgba(33, 150, 243, 0.2);
      border-color: #2196f3;
    }

    .task-item.overdue {
      border-left: 3px solid #f44336;
    }

    .task-checkbox {
      width: 20px;
      height: 20px;
      border: 2px solid rgba(255, 255, 255, 0.4);
      border-radius: 4px;
      cursor: pointer;
      flex-shrink: 0;
      margin-top: 2px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .task-checkbox:hover {
      border-color: #2196f3;
      background: rgba(33, 150, 243, 0.1);
    }

    .task-checkbox.completed {
      background: #4caf50;
      border-color: #4caf50;
    }

    .task-checkbox.in-progress {
      background: #ff9800;
      border-color: #ff9800;
    }

    .task-item-content {
      flex: 1;
      min-width: 0;
    }

    .task-item-title {
      font-weight: 600;
      margin-bottom: 6px;
      font-size: 14px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .task-item-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      gap: 8px;
      flex-wrap: wrap;
    }

    .task-meta-left {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .priority-badge {
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: 600;
      border: 1px solid;
    }

    .priority-1 {
      background: rgba(158, 158, 158, 0.2);
      border-color: rgba(158, 158, 158, 0.5);
      color: #9e9e9e;
    }

    .priority-2 {
      background: rgba(33, 150, 243, 0.2);
      border-color: rgba(33, 150, 243, 0.5);
      color: #2196f3;
    }

    .priority-3 {
      background: rgba(255, 193, 7, 0.2);
      border-color: rgba(255, 193, 7, 0.5);
      color: #ffc107;
    }

    .priority-4 {
      background: rgba(255, 152, 0, 0.2);
      border-color: rgba(255, 152, 0, 0.5);
      color: #ff9800;
    }

    .priority-5 {
      background: rgba(244, 67, 54, 0.2);
      border-color: rgba(244, 67, 54, 0.5);
      color: #f44336;
    }

    .status-badge {
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: 600;
      border: 1px solid;
      opacity: 0.8;
    }

    .status-pending {
      background: rgba(158, 158, 158, 0.2);
      border-color: rgba(158, 158, 158, 0.5);
      color: #9e9e9e;
    }

    .status-in_progress {
      background: rgba(255, 193, 7, 0.2);
      border-color: rgba(255, 193, 7, 0.5);
      color: #ffc107;
    }

    .status-completed {
      background: rgba(76, 175, 80, 0.2);
      border-color: rgba(76, 175, 80, 0.5);
      color: #4caf50;
    }

    .status-cancelled {
      background: rgba(158, 158, 158, 0.2);
      border-color: rgba(158, 158, 158, 0.5);
      color: #9e9e9e;
    }

    .due-date {
      font-size: 11px;
      opacity: 0.7;
    }

    .due-date.overdue {
      color: #f44336;
      font-weight: 600;
      opacity: 1;
    }

    .assignee-badge {
      padding: 2px 8px;
      background: rgba(156, 39, 176, 0.2);
      border-radius: 12px;
      font-size: 10px;
      border: 1px solid rgba(156, 39, 176, 0.5);
      color: #ce93d8;
    }

    .editor {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      padding: 24px;
    }

    .editor.empty {
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.5;
      text-align: center;
    }

    .empty-state {
      font-size: 18px;
      color: rgba(255, 255, 255, 0.5);
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 8px;
      color: rgba(255, 255, 255, 0.9);
    }

    .form-group input[type="text"],
    .form-group textarea,
    .form-group select,
    .form-group input[type="datetime-local"] {
      width: 100%;
      padding: 10px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px;
      color: white;
      font-size: 14px;
      box-sizing: border-box;
      font-family: system-ui, -apple-system, sans-serif;
    }

    .form-group input[type="text"]:focus,
    .form-group textarea:focus,
    .form-group select:focus,
    .form-group input[type="datetime-local"]:focus {
      outline: none;
      border-color: #2196f3;
    }

    .form-group textarea {
      min-height: 200px;
      resize: vertical;
      line-height: 1.6;
    }

    .form-group select option {
      background: #1a1a24;
      color: white;
    }

    .title-input {
      font-size: 18px;
      font-weight: 600;
    }

    .priority-selector-container {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .priority-option {
      flex: 1;
      padding: 10px;
      background: rgba(255, 255, 255, 0.05);
      border: 2px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      cursor: pointer;
      text-align: center;
      font-size: 12px;
      font-weight: 600;
      transition: all 0.2s;
      display: flex;
      flex-direction: column;
      gap: 4px;
      align-items: center;
    }

    .priority-option:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .priority-option.selected {
      border-width: 2px;
    }

    .priority-option.p1.selected { border-color: #9e9e9e; background: rgba(158, 158, 158, 0.2); }
    .priority-option.p2.selected { border-color: #2196f3; background: rgba(33, 150, 243, 0.2); }
    .priority-option.p3.selected { border-color: #ffc107; background: rgba(255, 193, 7, 0.2); }
    .priority-option.p4.selected { border-color: #ff9800; background: rgba(255, 152, 0, 0.2); }
    .priority-option.p5.selected { border-color: #f44336; background: rgba(244, 67, 54, 0.2); }

    .priority-stars {
      font-size: 16px;
      line-height: 1;
    }

    .timestamps {
      margin-top: 20px;
      padding: 12px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 6px;
      font-size: 12px;
      opacity: 0.8;
    }

    .timestamps > div {
      margin-bottom: 4px;
    }

    .timestamps > div:last-child {
      margin-bottom: 0;
    }

    .action-buttons {
      display: flex;
      gap: 12px;
      margin-top: 24px;
    }

    .btn {
      padding: 12px 24px;
      border-radius: 6px;
      border: none;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
      font-weight: 500;
    }

    .btn-primary {
      background: #2196f3;
      color: white;
      flex: 1;
    }

    .btn-primary:hover {
      background: #1976d2;
    }

    .btn-primary:disabled {
      background: rgba(33, 150, 243, 0.3);
      cursor: not-allowed;
    }

    .btn-danger {
      background: rgba(244, 67, 54, 0.2);
      color: #f44336;
      border: 1px solid rgba(244, 67, 54, 0.5);
    }

    .btn-danger:hover {
      background: rgba(244, 67, 54, 0.3);
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.1);
      color: white;
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .input-hint {
      font-size: 12px;
      opacity: 0.6;
      margin-top: 4px;
    }

    .loading {
      text-align: center;
      padding: 20px;
      opacity: 0.7;
    }

    @media (max-width: 768px) {
      :host {
        width: 100%;
      }

      .main-container {
        flex-direction: column;
      }

      .sidebar {
        width: 100%;
        max-height: 40%;
        border-right: none;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }
    }
  `;

  async connectedCallback() {
    super.connectedCallback();
    await this.initialize();
    this.addEventListener('keydown', this.handleKeydown);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this.handleKeydown);
  }

  private handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      this.handleClose();
    } else if (e.ctrlKey && e.key === 'n') {
      e.preventDefault();
      this.createNewTask();
    }
  };

  private async initialize() {
    this.busy = true;
    try {
      await tasksManager.initialize();
      await this.loadTasks();
      await this.loadStatistics();
    } catch (error) {
      console.error('[TasksPanel] Initialization error:', error);
    } finally {
      this.busy = false;
    }
  }

  private async loadTasks() {
    try {
      const filters: any = {};
      
      if (this.filterStatus !== 'all') {
        if (this.filterStatus === 'overdue') {
          filters.status = ['pending', 'in_progress'];
        } else {
          filters.status = this.filterStatus;
        }
      }

      if (this.filterAssignee !== 'all') {
        filters.assignee = this.filterAssignee;
      }

      this.tasks = await tasksManager.getTasks(filters);

      if (this.filterStatus === 'overdue') {
        this.tasks = this.tasks.filter(t => t.isOverdue);
      }

      if (this.searchText) {
        const searchResults = await tasksManager.searchTasks(this.searchText, 50);
        const searchIds = new Set(searchResults.map(r => r.id));
        this.tasks = this.tasks.filter(t => searchIds.has(t.id));
      }

      this.sortTasks();
    } catch (error) {
      console.error('[TasksPanel] Error loading tasks:', error);
    }
  }

  private async loadStatistics() {
    try {
      const filters: any = {};
      if (this.filterAssignee !== 'all') {
        filters.assignee = this.filterAssignee;
      }
      
      this.statistics = await tasksManager.computeStatistics(filters);
    } catch (error) {
      console.error('[TasksPanel] Error loading statistics:', error);
    }
  }

  private sortTasks() {
    if (this.sortBy === 'dueDate') {
      this.tasks.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
    } else if (this.sortBy === 'priority') {
      this.tasks.sort((a, b) => b.priority - a.priority);
    } else if (this.sortBy === 'createdDate') {
      this.tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  }

  private getAllAssignees(): string[] {
    const assigneeSet = new Set<string>();
    this.tasks.forEach(task => {
      assigneeSet.add(task.assignee);
    });
    return Array.from(assigneeSet).sort();
  }

  private createNewTask() {
    this.isCreating = true;
    this.selectedTaskId = null;
    this.selectedTask = null;
    this.draftTitle = '';
    this.draftDescription = '';
    this.draftStatus = 'pending';
    this.draftPriority = 3;
    this.draftDueDate = '';
    this.draftAssignee = 'user';
    this.hasChanges = false;
  }

  private async selectTask(taskId: string) {
    if (this.hasChanges) {
      if (!confirm('You have unsaved changes. Discard them?')) {
        return;
      }
    }

    this.busy = true;
    try {
      const task = await tasksManager.getTaskById(taskId);
      if (task) {
        this.selectedTaskId = taskId;
        this.selectedTask = task;
        this.draftTitle = task.title;
        this.draftDescription = task.description;
        this.draftStatus = task.status;
        this.draftPriority = task.priority;
        this.draftDueDate = task.dueDate ? this.formatDateTimeLocal(task.dueDate) : '';
        this.draftAssignee = task.assignee;
        this.isCreating = false;
        this.hasChanges = false;
      }
    } catch (error) {
      console.error('[TasksPanel] Error selecting task:', error);
    } finally {
      this.busy = false;
    }
  }

  private handleInputChange() {
    this.hasChanges = true;
  }

  private async saveTask() {
    if (!this.draftTitle.trim()) {
      alert('Task title is required');
      return;
    }

    if (!this.draftDescription.trim()) {
      alert('Task description is required');
      return;
    }

    this.busy = true;
    try {
      if (this.isCreating) {
        await tasksManager.createTask({
          title: this.draftTitle,
          description: this.draftDescription,
          priority: this.draftPriority,
          dueDate: this.draftDueDate ? new Date(this.draftDueDate) : undefined,
          assignee: this.draftAssignee,
        });
      } else if (this.selectedTaskId) {
        await tasksManager.updateTask(this.selectedTaskId, {
          title: this.draftTitle,
          description: this.draftDescription,
          status: this.draftStatus,
          priority: this.draftPriority,
          dueDate: this.draftDueDate ? new Date(this.draftDueDate) : null,
          assignee: this.draftAssignee,
        });
      }

      await this.loadTasks();
      await this.loadStatistics();
      this.hasChanges = false;

      if (this.isCreating) {
        this.isCreating = false;
        this.selectedTaskId = null;
        this.selectedTask = null;
      } else if (this.selectedTaskId) {
        await this.selectTask(this.selectedTaskId);
      }
    } catch (error) {
      console.error('[TasksPanel] Error saving task:', error);
      alert('Failed to save task: ' + (error as Error).message);
    } finally {
      this.busy = false;
    }
  }

  private async deleteTask() {
    if (!this.selectedTaskId) return;

    if (!confirm('Are you sure you want to delete this task?')) {
      return;
    }

    this.busy = true;
    try {
      await tasksManager.deleteTask(this.selectedTaskId);
      await this.loadTasks();
      await this.loadStatistics();
      
      this.selectedTaskId = null;
      this.selectedTask = null;
      this.isCreating = false;
      this.hasChanges = false;
    } catch (error) {
      console.error('[TasksPanel] Error deleting task:', error);
      alert('Failed to delete task');
    } finally {
      this.busy = false;
    }
  }

  private cancelEdit() {
    if (this.hasChanges) {
      if (!confirm('Discard unsaved changes?')) {
        return;
      }
    }

    this.selectedTaskId = null;
    this.selectedTask = null;
    this.isCreating = false;
    this.hasChanges = false;
  }

  private async handleCheckboxToggle(taskId: string, event: Event) {
    event.stopPropagation();
    
    this.busy = true;
    try {
      await tasksManager.toggleTaskStatus(taskId);
      await this.loadTasks();
      await this.loadStatistics();
      
      if (this.selectedTaskId === taskId) {
        await this.selectTask(taskId);
      }
    } catch (error) {
      console.error('[TasksPanel] Error toggling task status:', error);
    } finally {
      this.busy = false;
    }
  }

  private async handleSearch(e: Event) {
    this.searchText = (e.target as HTMLInputElement).value;
    await this.loadTasks();
  }

  private async handleFilterChange() {
    await this.loadTasks();
    await this.loadStatistics();
  }

  private async handleSortChange(e: Event) {
    this.sortBy = (e.target as HTMLSelectElement).value as any;
    this.sortTasks();
    this.requestUpdate();
  }

  private handleClose() {
    if (this.hasChanges) {
      if (!confirm('You have unsaved changes. Close anyway?')) {
        return;
      }
    }
    this.dispatchEvent(new CustomEvent('close'));
  }

  private formatDateTimeLocal(isoDate: string): string {
    const date = new Date(isoDate);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  private formatRelativeDate(isoDate: string | null, isOverdue: boolean): string {
    if (!isoDate) return '';

    const now = new Date();
    const due = new Date(isoDate);
    const diffMs = due.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (isOverdue) {
      const overdueDays = Math.abs(diffDays);
      if (overdueDays === 0) return 'Overdue today!';
      if (overdueDays === 1) return 'Overdue 1 day';
      return `Overdue ${overdueDays} days`;
    }

    if (diffDays === 0) {
      if (diffHours <= 0) return 'Due now';
      return `Due in ${diffHours}h`;
    }
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return `in ${diffDays} days`;
    if (diffDays < 30) return `in ${Math.floor(diffDays / 7)} weeks`;
    return `in ${Math.floor(diffDays / 30)} months`;
  }

  private formatTimestamp(isoDate: string): string {
    const date = new Date(isoDate);
    return date.toLocaleString();
  }

  private getPriorityLabel(priority: number): string {
    const labels = ['', 'Lowest', 'Low', 'Medium', 'High', 'Critical'];
    return labels[priority] || 'Medium';
  }

  private getStatusLabel(status: TaskStatus): string {
    const labels: Record<TaskStatus, string> = {
      pending: 'Pending',
      in_progress: 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled',
    };
    return labels[status] || status;
  }

  private getCheckboxIcon(status: TaskStatus): string {
    if (status === 'completed') return '✓';
    if (status === 'in_progress') return '●';
    return '';
  }

  render() {
    return html`
      <div class="header">
        <div class="header-top">
          <h2>
            <span>✓</span>
            Tasks
          </h2>
          <button class="close-btn" @click=${this.handleClose} title="Close (Esc)">×</button>
        </div>
        
        ${this.statistics ? html`
          <div class="statistics-dashboard">
            <div class="stat-item total">
              <span class="stat-label">Total:</span>
              <span class="stat-value">${this.statistics.total}</span>
            </div>
            <div class="stat-item completed">
              <span class="stat-label">✓ Completed:</span>
              <span class="stat-value">${this.statistics.completed}</span>
            </div>
            <div class="stat-item in-progress">
              <span class="stat-label">⏳ In Progress:</span>
              <span class="stat-value">${this.statistics.inProgress}</span>
            </div>
            <div class="stat-item overdue">
              <span class="stat-label">⚠️ Overdue:</span>
              <span class="stat-value">${this.statistics.overdue}</span>
            </div>
            <div class="completion-bar-container">
              <div class="completion-bar">
                <div 
                  class="completion-fill ${
                    this.statistics.completionRate >= 70 ? '' : 
                    this.statistics.completionRate >= 40 ? 'medium' : 'low'
                  }" 
                  style="width: ${this.statistics.completionRate}%"
                ></div>
              </div>
              <span class="completion-text">${Math.round(this.statistics.completionRate)}%</span>
            </div>
          </div>
        ` : ''}
      </div>

      <div class="main-container">
        <div class="sidebar">
          <div class="sidebar-header">
            <button class="new-task-btn" @click=${this.createNewTask}>+ New Task</button>
            
            <input
              type="text"
              class="search-box"
              placeholder="Search tasks..."
              .value=${this.searchText}
              @input=${this.handleSearch}
            />

            <div class="filter-controls">
              <div class="filter-tabs">
                <div 
                  class="filter-tab ${this.filterStatus === 'all' ? 'active' : ''}"
                  @click=${() => { this.filterStatus = 'all'; this.handleFilterChange(); }}
                >
                  All
                </div>
                <div 
                  class="filter-tab ${this.filterStatus === 'pending' ? 'active' : ''}"
                  @click=${() => { this.filterStatus = 'pending'; this.handleFilterChange(); }}
                >
                  Pending
                </div>
                <div 
                  class="filter-tab ${this.filterStatus === 'in_progress' ? 'active' : ''}"
                  @click=${() => { this.filterStatus = 'in_progress'; this.handleFilterChange(); }}
                >
                  In Progress
                </div>
                <div 
                  class="filter-tab ${this.filterStatus === 'completed' ? 'active' : ''}"
                  @click=${() => { this.filterStatus = 'completed'; this.handleFilterChange(); }}
                >
                  Completed
                </div>
                <div 
                  class="filter-tab ${this.filterStatus === 'overdue' ? 'active' : ''}"
                  @click=${() => { this.filterStatus = 'overdue'; this.handleFilterChange(); }}
                >
                  Overdue
                </div>
              </div>

              <select class="filter-select" @change=${this.handleSortChange}>
                <option value="priority" ?selected=${this.sortBy === 'priority'}>Sort by Priority</option>
                <option value="dueDate" ?selected=${this.sortBy === 'dueDate'}>Sort by Due Date</option>
                <option value="createdDate" ?selected=${this.sortBy === 'createdDate'}>Sort by Created Date</option>
              </select>

              <select 
                class="filter-select" 
                @change=${(e: Event) => { 
                  this.filterAssignee = (e.target as HTMLSelectElement).value; 
                  this.handleFilterChange(); 
                }}
              >
                <option value="all">All Assignees</option>
                ${this.getAllAssignees().map(assignee => html`
                  <option value=${assignee} ?selected=${this.filterAssignee === assignee}>
                    ${assignee}
                  </option>
                `)}
              </select>
            </div>
          </div>

          <div class="tasks-list">
            ${this.busy && this.tasks.length === 0 ? html`
              <div class="loading">Loading tasks...</div>
            ` : this.tasks.length === 0 ? html`
              <div style="text-align: center; padding: 20px; opacity: 0.5;">
                No tasks found
              </div>
            ` : this.tasks.map(task => html`
              <div 
                class="task-item ${this.selectedTaskId === task.id ? 'selected' : ''} ${task.isOverdue ? 'overdue' : ''}"
                @click=${() => this.selectTask(task.id)}
              >
                <div 
                  class="task-checkbox ${task.status === 'completed' ? 'completed' : task.status === 'in_progress' ? 'in-progress' : ''}"
                  @click=${(e: Event) => this.handleCheckboxToggle(task.id, e)}
                  title="Toggle status"
                >
                  ${this.getCheckboxIcon(task.status)}
                </div>
                <div class="task-item-content">
                  <div class="task-item-title">${task.title}</div>
                  <div class="task-item-meta">
                    <div class="task-meta-left">
                      <span class="priority-badge priority-${task.priority}">
                        P${task.priority}
                      </span>
                      <span class="status-badge status-${task.status}">
                        ${this.getStatusLabel(task.status)}
                      </span>
                      ${task.dueDate ? html`
                        <span class="due-date ${task.isOverdue ? 'overdue' : ''}">
                          ${this.formatRelativeDate(task.dueDate, task.isOverdue)}
                        </span>
                      ` : ''}
                    </div>
                    <span class="assignee-badge">${task.assignee}</span>
                  </div>
                </div>
              </div>
            `)}
          </div>
        </div>

        <div class="editor ${!this.selectedTaskId && !this.isCreating ? 'empty' : ''}">
          ${!this.selectedTaskId && !this.isCreating ? html`
            <div class="empty-state">
              Select a task to view details<br>
              or create a new task
            </div>
          ` : html`
            <div class="form-group">
              <label>Title</label>
              <input
                type="text"
                class="title-input"
                placeholder="Task title"
                .value=${this.draftTitle}
                @input=${(e: Event) => {
                  this.draftTitle = (e.target as HTMLInputElement).value;
                  this.handleInputChange();
                }}
              />
            </div>

            <div class="form-group">
              <label>Description</label>
              <textarea
                placeholder="Task description..."
                .value=${this.draftDescription}
                @input=${(e: Event) => {
                  this.draftDescription = (e.target as HTMLTextAreaElement).value;
                  this.handleInputChange();
                }}
              ></textarea>
            </div>

            <div class="form-group">
              <label>Status</label>
              <select
                .value=${this.draftStatus}
                @change=${(e: Event) => {
                  this.draftStatus = (e.target as HTMLSelectElement).value as TaskStatus;
                  this.handleInputChange();
                }}
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div class="form-group">
              <label>Priority</label>
              <div class="priority-selector-container">
                ${[1, 2, 3, 4, 5].map(p => html`
                  <div 
                    class="priority-option p${p} ${this.draftPriority === p ? 'selected' : ''}"
                    @click=${() => {
                      this.draftPriority = p;
                      this.handleInputChange();
                    }}
                  >
                    <div class="priority-stars">${'★'.repeat(p)}</div>
                    <div>${this.getPriorityLabel(p)}</div>
                  </div>
                `)}
              </div>
            </div>

            <div class="form-group">
              <label>Due Date</label>
              <input
                type="datetime-local"
                .value=${this.draftDueDate}
                @input=${(e: Event) => {
                  this.draftDueDate = (e.target as HTMLInputElement).value;
                  this.handleInputChange();
                }}
              />
              <div class="input-hint">Leave empty for no due date</div>
            </div>

            <div class="form-group">
              <label>Assignee</label>
              <input
                type="text"
                placeholder="Assignee name"
                .value=${this.draftAssignee}
                @input=${(e: Event) => {
                  this.draftAssignee = (e.target as HTMLInputElement).value;
                  this.handleInputChange();
                }}
              />
            </div>

            ${this.selectedTask ? html`
              <div class="timestamps">
                <div><strong>Created:</strong> ${this.formatTimestamp(this.selectedTask.createdAt)}</div>
                <div><strong>Updated:</strong> ${this.formatTimestamp(this.selectedTask.updatedAt)}</div>
                ${this.selectedTask.completedAt ? html`
                  <div><strong>Completed:</strong> ${this.formatTimestamp(this.selectedTask.completedAt)}</div>
                ` : ''}
              </div>
            ` : ''}

            <div class="action-buttons">
              <button 
                class="btn btn-primary" 
                @click=${this.saveTask}
                ?disabled=${this.busy}
              >
                ${this.busy ? 'Saving...' : this.isCreating ? 'Create Task' : 'Save Changes'}
              </button>
              
              ${!this.isCreating ? html`
                <button class="btn btn-danger" @click=${this.deleteTask} ?disabled=${this.busy}>
                  Delete
                </button>
              ` : ''}
              
              <button class="btn btn-secondary" @click=${this.cancelEdit} ?disabled=${this.busy}>
                Cancel
              </button>
            </div>
          `}
        </div>
      </div>
    `;
  }
}
