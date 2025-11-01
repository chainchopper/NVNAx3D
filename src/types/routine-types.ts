/**
 * Routine Automation System Types
 * IF-THEN-THAT automation system for NIRVANA
 */

export type TriggerType = 'time' | 'event' | 'state_change' | 'user_action' | 'completion' | 'vision_detection' | 'price_alert' | 'portfolio_change' | 'market_event';
export type ConditionType = 'time_range' | 'state_check' | 'comparison' | 'custom' | 'price_threshold' | 'percent_change';
export type ActionType = 'connector_call' | 'notification' | 'state_change' | 'custom' | 'send_sms' | 'make_call' | 'send_email' | 'execute_trade' | 'tool_execution';

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
    priceAlert?: {
      symbol: string;
      assetType: 'crypto' | 'stock';
      condition: 'above' | 'below' | 'crosses';
      targetPrice: number;
      dataSource?: 'coingecko' | 'coinmarketcap' | 'alphavantage';
      checkInterval?: number;
    };
    portfolioChange?: {
      metric: 'total_value' | 'daily_change' | 'asset_allocation';
      condition: 'above' | 'below';
      threshold: number;
      percentChange?: boolean;
      checkInterval?: number;
    };
    marketEvent?: {
      eventType: 'market_open' | 'market_close' | 'volatility_spike' | 'news_sentiment';
      market?: 'stocks' | 'crypto' | 'forex';
      sentimentThreshold?: number;
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
  smsConfig?: {
    to: string;
    message: string;
    includeData?: boolean;
  };
  callConfig?: {
    to: string;
    personaVoice?: string;
    message?: string;
  };
  emailConfig?: {
    to: string;
    subject: string;
    body: string;
    includeData?: boolean;
  };
  tradeConfig?: {
    exchange: 'coinbase' | 'alpaca';
    action: 'buy' | 'sell';
    symbol: string;
    amount?: number;
    percentage?: number;
    requireConfirmation: boolean;
  };
  toolConfig?: {
    toolId: string;
    parameters: any;
    requireConfirmation?: boolean;
  };
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
