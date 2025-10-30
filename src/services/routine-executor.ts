/**
 * RoutineExecutor Service
 * Manages routine execution with trigger listeners, condition evaluation, and action execution
 */

import { EnhancedRAGMemoryManager } from './memory/enhanced-rag-memory-manager';
import type { Memory } from '../types/memory';
import type { 
  Routine, 
  RoutineExecution, 
  RoutineTrigger,
  RoutineCondition,
  RoutineAction,
  RoutineSummary,
  RoutineDetail
} from '../types/routine-types';
import { connectorHandlers } from './connector-handlers';

export class RoutineExecutor {
  private ragMemory: EnhancedRAGMemoryManager;
  private initialized = false;
  private timeBasedTimers: Map<string, number> = new Map();
  private eventListeners: Map<string, Function> = new Map();
  private stateMonitors: Map<string, { timerId: number; lastState: any }> = new Map();
  
  constructor() {
    this.ragMemory = new EnhancedRAGMemoryManager();
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('[RoutineExecutor] Already initialized');
      return;
    }

    await this.ragMemory.initialize();
    await this.loadAndStartRoutines();
    
    this.initialized = true;
    console.log('[RoutineExecutor] Initialized successfully');
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('RoutineExecutor not initialized. Call initialize() first.');
    }
  }

  private async loadAndStartRoutines(): Promise<void> {
    const routineMemories = await this.ragMemory.getRoutines(true);
    
    for (const routineMemory of routineMemories) {
      const routine = this.memoryToRoutine(routineMemory);
      if (routine.enabled) {
        this.setupTriggerForRoutine(routine);
      }
    }
    
    console.log(`[RoutineExecutor] Loaded ${routineMemories.length} enabled routines`);
  }

  async createRoutine(params: {
    name: string;
    description: string;
    trigger: RoutineTrigger;
    conditions?: RoutineCondition[];
    actions: RoutineAction[];
    tags?: string[];
    createdFromTask?: string;
  }): Promise<string> {
    this.ensureInitialized();

    const { name, description, trigger, conditions = [], actions, tags = [], createdFromTask } = params;

    if (!name || name.trim().length === 0) {
      throw new Error('Routine name cannot be empty');
    }

    if (!description || description.trim().length === 0) {
      throw new Error('Routine description cannot be empty');
    }

    if (!actions || actions.length === 0) {
      throw new Error('Routine must have at least one action');
    }

    const routineData: Routine = {
      id: '',
      name,
      description,
      createdAt: new Date(),
      executionCount: 0,
      enabled: true,
      trigger,
      conditions,
      actions,
      tags,
      createdFromTask,
    };

    const combinedText = `${name}\n\n${description}\n\nTrigger: ${this.describeTrigger(trigger)}\nActions: ${actions.length} action(s)`;
    const timestamp = new Date().toISOString();

    const id = await this.ragMemory.addMemory(
      combinedText,
      'system',
      'routine',
      'NIRVANA',
      8,
      {
        routineName: name,
        routineDescription: description,
        routineEnabled: true,
        routineExecutionCount: 0,
        routineTrigger: JSON.stringify(trigger),
        routineConditions: JSON.stringify(conditions),
        routineActions: JSON.stringify(actions),
        routineTags: tags,
        routineCreatedFromTask: createdFromTask,
        createdAt: timestamp,
        lastExecuted: null,
      }
    );

    routineData.id = id;

    if (routineData.enabled) {
      this.setupTriggerForRoutine(routineData);
    }

    console.log(`[RoutineExecutor] Created routine: ${id} - "${name}"`);
    return id;
  }

  async getRoutines(enabledOnly: boolean = false): Promise<RoutineSummary[]> {
    this.ensureInitialized();

    const routineMemories = await this.ragMemory.getRoutines(enabledOnly);
    return routineMemories.map(memory => this.memoryToRoutineSummary(memory));
  }

  async getRoutineById(id: string): Promise<RoutineDetail | null> {
    this.ensureInitialized();

    const memory = await this.ragMemory.getMemoryById(id);
    
    if (!memory || memory.metadata.type !== 'routine') {
      return null;
    }

    return this.memoryToRoutineDetail(memory);
  }

  async updateRoutine(id: string, updates: {
    name?: string;
    description?: string;
    enabled?: boolean;
    trigger?: RoutineTrigger;
    conditions?: RoutineCondition[];
    actions?: RoutineAction[];
    tags?: string[];
  }): Promise<void> {
    this.ensureInitialized();

    const existingMemory = await this.ragMemory.getMemoryById(id);
    
    if (!existingMemory || existingMemory.metadata.type !== 'routine') {
      throw new Error(`Routine with ID ${id} not found`);
    }

    const currentName = existingMemory.metadata.routineName || '';
    const currentDescription = existingMemory.metadata.routineDescription || '';
    const currentEnabled = existingMemory.metadata.routineEnabled ?? true;
    const currentTrigger = JSON.parse(existingMemory.metadata.routineTrigger || '{}');
    const currentConditions = JSON.parse(existingMemory.metadata.routineConditions || '[]');
    const currentActions = JSON.parse(existingMemory.metadata.routineActions || '[]');
    const currentTags = existingMemory.metadata.routineTags || [];

    const newName = updates.name !== undefined ? updates.name : currentName;
    const newDescription = updates.description !== undefined ? updates.description : currentDescription;
    const newEnabled = updates.enabled !== undefined ? updates.enabled : currentEnabled;
    const newTrigger = updates.trigger !== undefined ? updates.trigger : currentTrigger;
    const newConditions = updates.conditions !== undefined ? updates.conditions : currentConditions;
    const newActions = updates.actions !== undefined ? updates.actions : currentActions;
    const newTags = updates.tags !== undefined ? updates.tags : currentTags;

    const wasEnabled = currentEnabled;
    const isNowEnabled = newEnabled;

    if (wasEnabled && !isNowEnabled) {
      this.removeTriggerForRoutine(id);
    }

    const updatedText = `${newName}\n\n${newDescription}\n\nTrigger: ${this.describeTrigger(newTrigger)}\nActions: ${newActions.length} action(s)`;
    
    const embeddingGenerator = (this.ragMemory as any).embeddingGenerator;
    const updatedEmbedding = embeddingGenerator 
      ? await embeddingGenerator.generateEmbedding(updatedText)
      : existingMemory.embedding;

    const updatedMemory: Memory = {
      ...existingMemory,
      text: updatedText,
      embedding: updatedEmbedding,
      metadata: {
        ...existingMemory.metadata,
        routineName: newName,
        routineDescription: newDescription,
        routineEnabled: newEnabled,
        routineTrigger: JSON.stringify(newTrigger),
        routineConditions: JSON.stringify(newConditions),
        routineActions: JSON.stringify(newActions),
        routineTags: newTags,
      },
    };

    await this.ragMemory.updateMemory(id, updatedMemory);

    if (!wasEnabled && isNowEnabled) {
      const routine = this.memoryToRoutine(updatedMemory);
      this.setupTriggerForRoutine(routine);
    } else if (isNowEnabled) {
      this.removeTriggerForRoutine(id);
      const routine = this.memoryToRoutine(updatedMemory);
      this.setupTriggerForRoutine(routine);
    }

    console.log(`[RoutineExecutor] Updated routine: ${id} - "${newName}"`);
  }

  async deleteRoutine(id: string): Promise<void> {
    this.ensureInitialized();

    const memory = await this.ragMemory.getMemoryById(id);
    
    if (!memory || memory.metadata.type !== 'routine') {
      throw new Error(`Routine with ID ${id} not found`);
    }

    this.removeTriggerForRoutine(id);

    const deleted = await this.ragMemory.deleteMemory(id);
    
    if (!deleted) {
      throw new Error(`Failed to delete routine with ID ${id}`);
    }

    console.log(`[RoutineExecutor] Deleted routine: ${id}`);
  }

  async toggleRoutine(id: string): Promise<void> {
    this.ensureInitialized();

    const routine = await this.getRoutineById(id);
    
    if (!routine) {
      throw new Error(`Routine with ID ${id} not found`);
    }

    await this.updateRoutine(id, { enabled: !routine.enabled });
    console.log(`[RoutineExecutor] Toggled routine: ${id} - enabled: ${!routine.enabled}`);
  }

  async executeRoutine(routineId: string, manualTrigger: boolean = false): Promise<RoutineExecution> {
    this.ensureInitialized();

    const memory = await this.ragMemory.getMemoryById(routineId);
    
    if (!memory || memory.metadata.type !== 'routine') {
      throw new Error(`Routine with ID ${routineId} not found`);
    }

    const routine = this.memoryToRoutine(memory);

    if (!routine.enabled && !manualTrigger) {
      throw new Error(`Routine ${routineId} is disabled`);
    }

    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const execution: RoutineExecution = {
      routineId,
      executionId,
      startTime: new Date(),
      success: false,
    };

    console.log(`[RoutineExecutor] Executing routine: ${routine.name} (${routineId})`);

    try {
      const conditionsPass = await this.evaluateConditions(routine);
      
      if (!conditionsPass && !manualTrigger) {
        execution.success = false;
        execution.error = 'Conditions not met';
        execution.endTime = new Date();
        console.log(`[RoutineExecutor] Routine ${routine.name} conditions not met, skipping execution`);
        return execution;
      }

      const results = await this.executeActions(routine);
      
      execution.success = true;
      execution.results = results;
      execution.endTime = new Date();

      const newExecutionCount = (memory.metadata.routineExecutionCount || 0) + 1;
      const timestamp = new Date().toISOString();

      await this.ragMemory.updateMemory(routineId, {
        ...memory,
        metadata: {
          ...memory.metadata,
          routineExecutionCount: newExecutionCount,
          lastExecuted: timestamp,
        },
      });

      console.log(`[RoutineExecutor] Routine ${routine.name} executed successfully`);
      return execution;
    } catch (error: any) {
      execution.success = false;
      execution.error = error.message;
      execution.endTime = new Date();
      console.error(`[RoutineExecutor] Routine ${routine.name} execution failed:`, error);
      return execution;
    }
  }

  private setupTriggerForRoutine(routine: Routine): void {
    if (routine.trigger.type === 'time') {
      this.setupTimeTrigger(routine);
    } else if (routine.trigger.type === 'state_change') {
      this.setupStateChangeTrigger(routine);
    } else if (routine.trigger.type === 'vision_detection') {
      this.setupVisionDetectionTrigger(routine);
    }
  }

  private setupTimeTrigger(routine: Routine): void {
    const schedule = routine.trigger.config.schedule;
    
    if (!schedule) {
      console.warn(`[RoutineExecutor] Time trigger for routine ${routine.id} has no schedule`);
      return;
    }

    const intervalMs = this.parseSchedule(schedule);
    
    if (intervalMs === null) {
      console.warn(`[RoutineExecutor] Invalid schedule for routine ${routine.id}: ${schedule}`);
      return;
    }

    const timerId = window.setInterval(() => {
      this.executeRoutine(routine.id, false).catch(error => {
        console.error(`[RoutineExecutor] Error executing routine ${routine.id}:`, error);
      });
    }, intervalMs);

    this.timeBasedTimers.set(routine.id, timerId);
    console.log(`[RoutineExecutor] Set up time trigger for routine ${routine.name}: ${schedule} (${intervalMs}ms)`);
  }

  private setupStateChangeTrigger(routine: Routine): void {
    const monitor = routine.trigger.config.monitor;
    
    if (!monitor || !monitor.service || !monitor.entity) {
      console.warn(`[RoutineExecutor] State change trigger for routine ${routine.id} missing service or entity`);
      return;
    }

    if (monitor.service !== 'homeassistant') {
      console.warn(`[RoutineExecutor] State change monitoring only supports Home Assistant currently`);
      return;
    }

    const pollInterval = 30000;
    const targetProperty = monitor.property;
    
    const checkState = async () => {
      try {
        const result = await connectorHandlers.handleHomeassistantState({ entityId: monitor.entity! });
        
        if (!result.success) {
          console.warn(`[RoutineExecutor] Failed to check state for ${monitor.entity}:`, result.error);
          return;
        }

        const currentState = targetProperty 
          ? result.data?.attributes?.[targetProperty]
          : result.data?.state;
        const previousMonitor = this.stateMonitors.get(routine.id);
        
        if (previousMonitor && previousMonitor.lastState !== undefined && previousMonitor.lastState !== currentState) {
          console.log(`[RoutineExecutor] State change detected for ${monitor.entity}: ${previousMonitor.lastState} → ${currentState}`);
          this.executeRoutine(routine.id, false).catch(error => {
            console.error(`[RoutineExecutor] Error executing routine ${routine.id}:`, error);
          });
        }

        const existingMonitor = this.stateMonitors.get(routine.id);
        if (existingMonitor) {
          existingMonitor.lastState = currentState;
        }
      } catch (error) {
        console.error(`[RoutineExecutor] Error checking state for routine ${routine.id}:`, error);
      }
    };

    checkState();

    const timerId = window.setInterval(checkState, pollInterval);

    this.stateMonitors.set(routine.id, { timerId, lastState: undefined });
    console.log(`[RoutineExecutor] Set up state change monitor for routine ${routine.name}: ${monitor.entity} (polling every ${pollInterval}ms)`);
  }

  private setupVisionDetectionTrigger(routine: Routine): void {
    const visionConfig = routine.trigger.config.visionDetection;
    
    if (!visionConfig || !visionConfig.service || !visionConfig.objectTypes || visionConfig.objectTypes.length === 0) {
      console.warn(`[RoutineExecutor] Vision detection trigger for routine ${routine.id} missing required configuration`);
      return;
    }

    const pollInterval = visionConfig.checkInterval || 10000;
    const minConfidence = visionConfig.minConfidence || 0.5;
    
    const checkForObjects = async () => {
      try {
        let result;
        
        if (visionConfig.service === 'local') {
          // Use the local TensorFlow.js object detection service
          const { objectRecognitionService } = await import('./object-recognition');
          
          // Initialize the TensorFlow model (idempotent - safe to call multiple times)
          await objectRecognitionService.initialize();
          
          const videoElement = document.querySelector('video');
          
          if (!videoElement) {
            console.warn(`[RoutineExecutor] Local vision trigger missing video element for routine ${routine.id}`);
            return;
          }
          
          const detectedObjects = await objectRecognitionService.detectObjects(videoElement);
          
          result = {
            success: true,
            data: {
              detections: detectedObjects.map(obj => ({
                label: obj.class,
                confidence: obj.score
              }))
            }
          };
        } else if (visionConfig.service === 'frigate') {
          if (!visionConfig.camera) {
            console.warn(`[RoutineExecutor] Frigate vision trigger missing camera for routine ${routine.id}`);
            return;
          }
          
          result = await connectorHandlers.handleFrigateEvents({
            camera: visionConfig.camera,
            objectType: visionConfig.objectTypes.join(','),
            limit: 5,
          });
        } else if (visionConfig.service === 'codeprojectai') {
          if (!visionConfig.imageSource) {
            console.warn(`[RoutineExecutor] CodeProject.AI vision trigger missing imageSource for routine ${routine.id}`);
            return;
          }
          
          result = await connectorHandlers.handleCodeprojectaiDetect({
            imageUrl: visionConfig.imageSource,
            minConfidence,
          });
        } else if (visionConfig.service === 'yolo') {
          if (!visionConfig.imageSource) {
            console.warn(`[RoutineExecutor] YOLO vision trigger missing imageSource for routine ${routine.id}`);
            return;
          }
          
          result = await connectorHandlers.handleYoloDetect({
            imageUrl: visionConfig.imageSource,
            minConfidence,
          });
        } else {
          console.warn(`[RoutineExecutor] Unknown vision service: ${visionConfig.service}`);
          return;
        }

        if (!result.success) {
          console.warn(`[RoutineExecutor] Vision detection failed for routine ${routine.id}:`, result.error);
          return;
        }

        let detectedObjects: string[] = [];
        
        if (visionConfig.service === 'frigate') {
          const events = result.data?.events || [];
          detectedObjects = events.map((event: any) => event.label);
        } else {
          const detections = result.data?.detections || [];
          detectedObjects = detections
            .filter((det: any) => det.confidence >= minConfidence)
            .map((det: any) => det.label);
        }

        const matchedObjects = detectedObjects.filter(obj => 
          visionConfig.objectTypes.some(target => 
            obj.toLowerCase().includes(target.toLowerCase()) || target.toLowerCase().includes(obj.toLowerCase())
          )
        );

        const previousMonitor = this.stateMonitors.get(routine.id);
        const currentDetectionHash = matchedObjects.sort().join(',');
        
        if (matchedObjects.length > 0) {
          if (!previousMonitor || previousMonitor.lastState !== currentDetectionHash) {
            console.log(`[RoutineExecutor] Vision detection triggered for ${routine.name}: detected ${matchedObjects.join(', ')}`);
            this.executeRoutine(routine.id, false).catch(error => {
              console.error(`[RoutineExecutor] Error executing routine ${routine.id}:`, error);
            });
          }
        }

        const existingMonitor = this.stateMonitors.get(routine.id);
        if (existingMonitor) {
          existingMonitor.lastState = currentDetectionHash;
        }
      } catch (error) {
        console.error(`[RoutineExecutor] Error checking vision for routine ${routine.id}:`, error);
      }
    };

    checkForObjects();

    const timerId = window.setInterval(checkForObjects, pollInterval);

    this.stateMonitors.set(routine.id, { timerId, lastState: undefined });
    console.log(`[RoutineExecutor] Set up vision detection for routine ${routine.name}: ${visionConfig.service} monitoring ${visionConfig.objectTypes.join(', ')} (polling every ${pollInterval}ms)`);
  }

  private parseSchedule(schedule: string): number | null {
    const lowerSchedule = schedule.toLowerCase();
    
    if (lowerSchedule.includes('every hour')) {
      return 60 * 60 * 1000;
    }
    if (lowerSchedule.includes('every day') || lowerSchedule.includes('daily')) {
      return 24 * 60 * 60 * 1000;
    }
    if (lowerSchedule.includes('every week') || lowerSchedule.includes('weekly')) {
      return 7 * 24 * 60 * 60 * 1000;
    }
    
    const minutesMatch = lowerSchedule.match(/every (\d+) minutes?/);
    if (minutesMatch) {
      return parseInt(minutesMatch[1]) * 60 * 1000;
    }
    
    const hoursMatch = lowerSchedule.match(/every (\d+) hours?/);
    if (hoursMatch) {
      return parseInt(hoursMatch[1]) * 60 * 60 * 1000;
    }

    return null;
  }

  private removeTriggerForRoutine(routineId: string): void {
    if (this.timeBasedTimers.has(routineId)) {
      const timerId = this.timeBasedTimers.get(routineId)!;
      window.clearInterval(timerId);
      this.timeBasedTimers.delete(routineId);
      console.log(`[RoutineExecutor] Removed time trigger for routine ${routineId}`);
    }

    if (this.stateMonitors.has(routineId)) {
      const monitor = this.stateMonitors.get(routineId)!;
      window.clearInterval(monitor.timerId);
      this.stateMonitors.delete(routineId);
      console.log(`[RoutineExecutor] Removed state monitor for routine ${routineId}`);
    }

    if (this.eventListeners.has(routineId)) {
      this.eventListeners.delete(routineId);
      console.log(`[RoutineExecutor] Removed event listener for routine ${routineId}`);
    }
  }

  private async evaluateConditions(routine: Routine): Promise<boolean> {
    if (routine.conditions.length === 0) {
      return true;
    }

    for (const condition of routine.conditions) {
      const result = await this.evaluateCondition(condition);
      if (!result) {
        return false;
      }
    }

    return true;
  }

  private async evaluateCondition(condition: RoutineCondition): Promise<boolean> {
    switch (condition.type) {
      case 'time_range':
        return this.evaluateTimeRangeCondition(condition.config);
      case 'state_check':
      case 'comparison':
      case 'custom':
        return true;
      default:
        console.warn(`[RoutineExecutor] Unknown condition type: ${condition.type}`);
        return true;
    }
  }

  private evaluateTimeRangeCondition(config: any): boolean {
    const now = new Date();
    const currentHour = now.getHours();
    
    if (config.startHour !== undefined && config.endHour !== undefined) {
      return currentHour >= config.startHour && currentHour < config.endHour;
    }

    return true;
  }

  private async executeActions(routine: Routine): Promise<any[]> {
    const results: any[] = [];

    for (const action of routine.actions) {
      const result = await this.executeAction(action, routine);
      results.push(result);
    }

    return results;
  }

  private async executeAction(action: RoutineAction, routine: Routine): Promise<any> {
    console.log(`[RoutineExecutor] Executing action type: ${action.type}`);

    switch (action.type) {
      case 'connector_call':
        return await this.executeConnectorCall(action);
      case 'notification':
        return this.executeNotification(action, routine);
      case 'state_change':
      case 'custom':
        return { success: true, message: `Action type ${action.type} executed (placeholder)` };
      default:
        console.warn(`[RoutineExecutor] Unknown action type: ${action.type}`);
        return { success: false, error: `Unknown action type: ${action.type}` };
    }
  }

  private async executeConnectorCall(action: RoutineAction): Promise<any> {
    const { service, method, parameters } = action;

    if (!service || !method) {
      return { success: false, error: 'Connector action missing service or method' };
    }

    const handlerMethodName = `handle${service.charAt(0).toUpperCase() + service.slice(1)}`;
    const handler = (connectorHandlers as any)[handlerMethodName];

    if (typeof handler !== 'function') {
      return { success: false, error: `No handler found for service: ${service}` };
    }

    try {
      const result = await handler.call(connectorHandlers, parameters || {});
      return result;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private executeNotification(action: RoutineAction, routine: Routine): any {
    const message = action.parameters?.message || `Routine "${routine.name}" executed`;
    console.log(`[RoutineExecutor] Notification: ${message}`);
    
    if (window.Notification && Notification.permission === 'granted') {
      new Notification('NIRVANA Routine', { body: message });
    }

    return { success: true, message };
  }

  private describeTrigger(trigger: RoutineTrigger): string {
    switch (trigger.type) {
      case 'time':
        return `Time-based: ${trigger.config.schedule || 'No schedule'}`;
      case 'event':
        return `Event: ${trigger.config.eventName || 'Unknown event'}`;
      case 'state_change':
        return `State change: ${trigger.config.monitor?.service || 'Unknown service'}`;
      case 'user_action':
        return `User action: ${trigger.config.actionType || 'Unknown action'}`;
      case 'completion':
        return `Task completion: ${trigger.config.taskPattern || 'Any task'}`;
      case 'vision_detection':
        const vision = trigger.config.visionDetection;
        return `Vision detection: ${vision?.service || 'Unknown service'} detecting ${vision?.objectTypes?.join(', ') || 'objects'}`;
      default:
        return 'Unknown trigger';
    }
  }

  private memoryToRoutine(memory: Memory): Routine {
    return {
      id: memory.id,
      name: memory.metadata.routineName || 'Untitled Routine',
      description: memory.metadata.routineDescription || '',
      createdAt: new Date(memory.metadata.createdAt || memory.metadata.timestamp),
      lastExecuted: memory.metadata.lastExecuted ? new Date(memory.metadata.lastExecuted) : undefined,
      executionCount: memory.metadata.routineExecutionCount || 0,
      enabled: memory.metadata.routineEnabled ?? true,
      trigger: JSON.parse(memory.metadata.routineTrigger || '{}'),
      conditions: JSON.parse(memory.metadata.routineConditions || '[]'),
      actions: JSON.parse(memory.metadata.routineActions || '[]'),
      tags: memory.metadata.routineTags || [],
      createdFromTask: memory.metadata.routineCreatedFromTask,
    };
  }

  private memoryToRoutineSummary(memory: Memory): RoutineSummary {
    return {
      id: memory.id,
      name: memory.metadata.routineName || 'Untitled Routine',
      description: memory.metadata.routineDescription || '',
      enabled: memory.metadata.routineEnabled ?? true,
      lastExecuted: memory.metadata.lastExecuted || undefined,
      executionCount: memory.metadata.routineExecutionCount || 0,
      tags: memory.metadata.routineTags || [],
    };
  }

  private memoryToRoutineDetail(memory: Memory): RoutineDetail {
    const summary = this.memoryToRoutineSummary(memory);
    
    return {
      ...summary,
      createdAt: memory.metadata.createdAt || memory.metadata.timestamp,
      trigger: JSON.parse(memory.metadata.routineTrigger || '{}'),
      conditions: JSON.parse(memory.metadata.routineConditions || '[]'),
      actions: JSON.parse(memory.metadata.routineActions || '[]'),
      createdFromTask: memory.metadata.routineCreatedFromTask,
    };
  }

  async shutdown(): Promise<void> {
    this.timeBasedTimers.forEach((timerId) => {
      window.clearInterval(timerId);
    });
    this.timeBasedTimers.clear();
    
    this.stateMonitors.forEach((monitor) => {
      window.clearInterval(monitor.timerId);
    });
    this.stateMonitors.clear();
    
    this.eventListeners.clear();
    console.log('[RoutineExecutor] Shutdown complete');
  }
}

export const routineExecutor = new RoutineExecutor();
