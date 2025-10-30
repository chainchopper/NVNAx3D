/**
 * Routine Automation System Types
 * IF-THEN-THAT automation system for NIRVANA
 */

export type TriggerType = 'time' | 'event' | 'state_change' | 'user_action' | 'completion' | 'vision_detection';
export type ConditionType = 'time_range' | 'state_check' | 'comparison' | 'custom';
export type ActionType = 'connector_call' | 'notification' | 'state_change' | 'custom';

export interface RoutineTrigger {
  type: TriggerType;
  config: {
    schedule?: string;
    eventName?: string;
    monitor?: {
      service: string;
      entity?: string;
      property?: string;
    };
    actionType?: string;
    taskPattern?: string;
    visionDetection?: {
      service: 'frigate' | 'codeprojectai' | 'yolo' | 'local';
      camera?: string;
      objectTypes: string[];
      minConfidence?: number;
      zone?: string;
      imageSource?: string;
      checkInterval?: number;
    };
  };
}

export interface RoutineCondition {
  type: ConditionType;
  config: any;
}

export interface RoutineAction {
  type: ActionType;
  service?: string;
  method?: string;
  parameters?: any;
}

export interface Routine {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  lastExecuted?: Date;
  executionCount: number;
  enabled: boolean;
  trigger: RoutineTrigger;
  conditions: RoutineCondition[];
  actions: RoutineAction[];
  createdFromTask?: string;
  tags: string[];
}

export interface RoutineExecution {
  routineId: string;
  executionId: string;
  startTime: Date;
  endTime?: Date;
  success: boolean;
  error?: string;
  results?: any[];
}

export interface RoutinePattern {
  type: 'temporal' | 'sequential' | 'conditional';
  description: string;
  occurrences: number;
  confidence: number;
  suggestedRoutine?: Partial<Routine>;
}

export interface RoutineSummary {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  lastExecuted?: string;
  executionCount: number;
  tags: string[];
}

export interface RoutineDetail extends RoutineSummary {
  createdAt: string;
  trigger: RoutineTrigger;
  conditions: RoutineCondition[];
  actions: RoutineAction[];
  createdFromTask?: string;
}
