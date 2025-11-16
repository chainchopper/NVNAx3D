import type { PersoniConfig } from '../personas';
import { ragMemoryManager } from './memory/rag-memory-manager';
import { userProfileManager } from './user-profile-manager';
import { perceptionOrchestrator } from './agentic/perception-orchestrator';
import { plannerService } from './agentic/planner-service';
import type { PerceptionResult } from './agentic/perception-orchestrator';
import type { Plan } from './agentic/planner-service';

export interface Perception {
  input: string;
  intent: string;
  entities: Record<string, any>;
  sentiment: 'positive' | 'negative' | 'neutral';
  context: Record<string, any>;
  timestamp: string;
}

export interface Reasoning {
  goal: string;
  prerequisites: string[];
  plan: {
    steps: string[];
    estimatedTime: string;
    requiredTools: string[];
    plannedActions?: any[];
  };
  confidence: number;
  alternatives: string[];
}

export interface Action {
  type: string;
  parameters: Record<string, any>;
  expectedOutcome: string;
}

class AgenticReasoningEngine {
  private context: Map<string, any> = new Map();
  private patterns: Map<string, number> = new Map();
  
  async perceive(input: string, personi: PersoniConfig): Promise<Perception> {
    const perceptionResult: PerceptionResult = await perceptionOrchestrator.perceive(input, personi);
    
    const relevantMemories = await ragMemoryManager.queryMemories(input, 5);
    const userProfile = userProfileManager.getProfile();
    
    const context = {
      personi: personi.name,
      memories: relevantMemories,
      userPreferences: userProfile,
      currentTime: new Date().toISOString(),
      recentPatterns: Array.from(this.patterns.entries()).slice(-10),
      ...perceptionResult.context
    };
    
    const perception: Perception = {
      input,
      intent: perceptionResult.intent,
      entities: perceptionResult.entities,
      sentiment: perceptionResult.sentiment,
      context,
      timestamp: perceptionResult.timestamp
    };
    
    await this.learnFromPerception(perception);
    
    return perception;
  }
  
  async reason(perception: Perception, personi: PersoniConfig): Promise<Reasoning> {
    const perceptionResult: PerceptionResult = {
      intent: perception.intent,
      entities: perception.entities,
      sentiment: perception.sentiment,
      context: perception.context,
      confidence: 0.8,
      timestamp: perception.timestamp
    };
    
    const planResult: Plan = await plannerService.createPlan(perceptionResult, personi);
    
    return {
      goal: planResult.goal,
      prerequisites: planResult.prerequisites,
      plan: {
        steps: planResult.steps,
        estimatedTime: '10s',
        requiredTools: planResult.actions.map(a => a.type),
        plannedActions: planResult.actions
      },
      confidence: planResult.confidence,
      alternatives: []
    };
  }
  
  async planActions(reasoning: Reasoning): Promise<Action[]> {
    if (reasoning.plan.plannedActions) {
      return reasoning.plan.plannedActions.map(actionDesc => ({
        type: actionDesc.type,
        parameters: actionDesc.parameters,
        expectedOutcome: `Execute ${actionDesc.type}`
      }));
    }
    
    return reasoning.plan.requiredTools.map((toolType) => ({
      type: toolType,
      parameters: {},
      expectedOutcome: `Execute ${toolType}`
    }));
  }
  
  private extractIntent(input: string): string {
    const lower = input.toLowerCase();
    
    const intentPatterns: Record<string, string[]> = {
      'call': ['call', 'phone', 'dial', 'ring'],
      'sms': ['text', 'sms', 'message', 'send message'],
      'email': ['email', 'mail', 'send email'],
      'note': ['note', 'write down', 'remember', 'jot down'],
      'task': ['task', 'todo', 'remind me to'],
      'search': ['search', 'find', 'look up', 'what is'],
      'analyze': ['analyze', 'explain', 'understand', 'why'],
      'create': ['create', 'make', 'generate', 'build'],
      'schedule': ['schedule', 'calendar', 'meeting', 'appointment'],
      'summarize': ['summarize', 'summary', 'tldr', 'brief'],
      'routine': ['routine', 'automate', 'workflow', 'always'],
      'suggestion': ['suggest', 'recommend', 'what should', 'help me decide']
    };
    
    for (const [intent, keywords] of Object.entries(intentPatterns)) {
      if (keywords.some(kw => lower.includes(kw))) {
        this.recordPattern(`intent_${intent}`);
        return intent;
      }
    }
    
    return 'conversation';
  }
  
  async executeActions(actions: Action[], personi: PersoniConfig): Promise<Record<string, any>> {
    const results: Record<string, any> = {};
    
    for (const action of actions) {
      try {
        const result = await this.executeAction(action, personi);
        results[action.type] = result;
      } catch (error) {
        console.error(`[AgenticReasoning] Action execution failed for ${action.type}:`, error);
        results[action.type] = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }
    
    return results;
  }
  
  private async executeAction(action: Action, personi: PersoniConfig): Promise<any> {
    switch (action.type) {
      case 'telephony_call':
        if (action.parameters.phoneNumber) {
          const { telephonyManager } = await import('./telephony/telephony-manager');
          const provider = telephonyManager.getProvider();
          if (provider) {
            return await provider.makeCall(action.parameters.phoneNumber);
          }
        }
        return { success: false, error: 'No phone number or telephony not configured' };
        
      case 'telephony_sms':
        if (action.parameters.phoneNumber && action.parameters.message) {
          const { telephonyManager } = await import('./telephony/telephony-manager');
          const provider = telephonyManager.getProvider();
          if (provider) {
            return await provider.sendSMS(action.parameters.phoneNumber, action.parameters.message);
          }
        }
        return { success: false, error: 'Missing parameters or telephony not configured' };
      
      case 'email_send':
        if (action.parameters.to && action.parameters.subject && action.parameters.body) {
          const { connectorHandlers } = await import('./connector-handlers');
          return await connectorHandlers.sendGmailEmail({
            to: action.parameters.to,
            subject: action.parameters.subject,
            body: action.parameters.body
          });
        }
        return { success: false, error: 'Missing email parameters' };
        
      case 'store_memory':
        await ragMemoryManager.addMemory(
          action.parameters.content,
          'agent',
          action.parameters.type || 'note',
          undefined,
          undefined,
          action.parameters.metadata || {}
        );
        return { success: true };
        
      case 'create_task':
        await ragMemoryManager.addMemory(
          action.parameters.content,
          'agent',
          'task',
          undefined,
          undefined,
          {
            priority: action.parameters.priority || 'P3',
            status: 'pending',
            source: 'agent'
          }
        );
        return { success: true };
      
      case 'calendar_event':
        if (action.parameters.summary && action.parameters.start) {
          const { connectorHandlers } = await import('./connector-handlers');
          return await connectorHandlers.createCalendarEvent({
            summary: action.parameters.summary,
            start: action.parameters.start,
            end: action.parameters.end,
            description: action.parameters.description
          });
        }
        return { success: false, error: 'Missing calendar event parameters' };
      
      case 'web_search':
        if (action.parameters.query) {
          return { success: true, message: 'Web search queued', query: action.parameters.query };
        }
        return { success: false, error: 'Missing search query' };
      
      case 'routine_create':
        if (action.parameters.name && action.parameters.trigger && action.parameters.actions) {
          const { routineExecutor } = await import('./routine-executor');
          const routineId = await routineExecutor.createRoutine({
            name: action.parameters.name,
            description: action.parameters.description || 'Auto-generated routine',
            trigger: action.parameters.trigger,
            conditions: action.parameters.conditions || [],
            actions: action.parameters.actions,
            tags: action.parameters.tags || ['auto-generated']
          });
          return { success: true, routineId };
        }
        return { success: false, error: 'Missing routine parameters (name, trigger, actions required)' };
        
      default:
        return { success: false, error: `Unknown action type: ${action.type}` };
    }
  }
  
  private extractEntities(input: string): Record<string, any> {
    const entities: Record<string, any> = {};
    
    const phoneRegex = /(\+?1?\s*\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/g;
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const dateRegex = /\b(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2})\b/g;
    const timeRegex = /\b(\d{1,2}:\d{2}\s*(?:am|pm)?)\b/gi;
    const numberRegex = /\b(\d+(?:\.\d+)?)\b/g;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    
    const phones = input.match(phoneRegex);
    if (phones) entities.phones = phones;
    
    const emails = input.match(emailRegex);
    if (emails) entities.emails = emails;
    
    const dates = input.match(dateRegex);
    if (dates) entities.dates = dates;
    
    const times = input.match(timeRegex);
    if (times) entities.times = times;
    
    const numbers = input.match(numberRegex);
    if (numbers) entities.numbers = numbers.map(n => parseFloat(n));
    
    const urls = input.match(urlRegex);
    if (urls) entities.urls = urls;
    
    if (input.toLowerCase().includes('tomorrow')) {
      entities.timeReference = 'tomorrow';
    } else if (input.toLowerCase().includes('today')) {
      entities.timeReference = 'today';
    } else if (input.toLowerCase().includes('next week')) {
      entities.timeReference = 'next_week';
    }
    
    return entities;
  }
  
  private analyzeSentiment(input: string): 'positive' | 'negative' | 'neutral' {
    const lower = input.toLowerCase();
    
    const positive = ['good', 'great', 'excellent', 'happy', 'love', 'thank', 'wonderful', 'amazing', 'perfect'];
    const negative = ['bad', 'terrible', 'sad', 'hate', 'angry', 'problem', 'issue', 'wrong', 'error'];
    
    const posCount = positive.filter(w => lower.includes(w)).length;
    const negCount = negative.filter(w => lower.includes(w)).length;
    
    if (posCount > negCount) return 'positive';
    if (negCount > posCount) return 'negative';
    return 'neutral';
  }
  
  private identifyGoal(intent: string): string {
    const goalMap: Record<string, string> = {
      'call': 'Initiate voice communication',
      'sms': 'Send text message',
      'email': 'Send email communication',
      'note': 'Create memory record',
      'task': 'Add to task list',
      'search': 'Retrieve information',
      'analyze': 'Understand and explain',
      'create': 'Generate new content',
      'schedule': 'Organize calendar event',
      'summarize': 'Condense information',
      'routine': 'Automate workflow',
      'suggestion': 'Provide recommendations'
    };
    
    return goalMap[intent] || 'Assist user';
  }
  
  private checkPrerequisites(intent: string, personi: PersoniConfig): string[] {
    const prereqMap: Record<string, string[]> = {
      'call': ['telephony enabled', 'phone number'],
      'sms': ['telephony enabled', 'phone number'],
      'email': ['email connector', 'recipient address'],
      'search': ['web search capability'],
      'schedule': ['calendar access']
    };
    
    const required = prereqMap[intent] || [];
    const available = personi.enabledConnectors || [];
    
    return required;
  }
  
  private async createPlan(perception: Perception, personi: PersoniConfig): Promise<{
    steps: string[];
    estimatedTime: string;
    requiredTools: string[];
  }> {
    const { intent, entities } = perception;
    
    const planTemplates: Record<string, any> = {
      'call': {
        steps: [
          'Extract phone number from input',
          'Initiate call via Twilio',
          'Start call transcription',
          'Enable note-taking mode'
        ],
        estimatedTime: '30s',
        requiredTools: ['telephony', 'transcription']
      },
      'sms': {
        steps: [
          'Extract phone number and message',
          'Send SMS via Twilio',
          'Log to memory'
        ],
        estimatedTime: '5s',
        requiredTools: ['telephony']
      },
      'note': {
        steps: [
          'Extract note content',
          'Determine importance level',
          'Store in RAG memory',
          'Create searchable tags'
        ],
        estimatedTime: '3s',
        requiredTools: ['memory']
      },
      'routine': {
        steps: [
          'Analyze workflow pattern',
          'Extract trigger and actions',
          'Create routine definition',
          'Store in routines system',
          'Suggest activation'
        ],
        estimatedTime: '10s',
        requiredTools: ['routines', 'memory']
      }
    };
    
    const defaultPlan = {
      steps: ['Understand query', 'Process request', 'Formulate response'],
      estimatedTime: '5s',
      requiredTools: []
    };
    
    return planTemplates[intent] || defaultPlan;
  }
  
  private calculateConfidence(perception: Perception, plan: any): number {
    let confidence = 0.7;
    
    if (Object.keys(perception.entities).length > 0) {
      confidence += 0.15;
    }
    
    if (perception.context.memories && perception.context.memories.length > 0) {
      confidence += 0.1;
    }
    
    if (perception.input.split(' ').length > 5) {
      confidence += 0.05;
    }
    
    return Math.min(confidence, 1.0);
  }
  
  private suggestAlternatives(perception: Perception, plan: any): string[] {
    const alternatives: string[] = [];
    
    if (perception.intent === 'call') {
      alternatives.push('Send SMS instead for quick message');
      alternatives.push('Schedule call for later');
    }
    
    if (perception.intent === 'sms') {
      alternatives.push('Make voice call for complex discussion');
      alternatives.push('Send email with more details');
    }
    
    if (perception.intent === 'email') {
      alternatives.push('Send SMS for urgent communication');
    }
    
    return alternatives;
  }
  
  private async stepToAction(step: string, perception: Perception, reasoning: Reasoning): Promise<Action | null> {
    const stepLower = step.toLowerCase();
    
    if (stepLower.includes('extract')) {
      return {
        type: 'extract_data',
        parameters: { source: perception.input, entities: perception.entities },
        expectedOutcome: 'Extracted relevant data'
      };
    }
    
    if (stepLower.includes('call') || stepLower.includes('initiate')) {
      return {
        type: 'telephony_call',
        parameters: { phoneNumber: perception.entities.phones?.[0] },
        expectedOutcome: 'Call initiated'
      };
    }
    
    if (stepLower.includes('sms') || stepLower.includes('message')) {
      return {
        type: 'telephony_sms',
        parameters: { 
          phoneNumber: perception.entities.phones?.[0],
          message: perception.input
        },
        expectedOutcome: 'SMS sent'
      };
    }
    
    if (stepLower.includes('memory') || stepLower.includes('store')) {
      return {
        type: 'store_memory',
        parameters: { content: perception.input, type: 'note' },
        expectedOutcome: 'Stored in memory'
      };
    }
    
    return null;
  }
  
  private async learnFromPerception(perception: Perception): Promise<void> {
    this.recordPattern(`${perception.intent}_${perception.sentiment}`);
    
    if (perception.entities && Object.keys(perception.entities).length > 0) {
      this.recordPattern(`entities_${Object.keys(perception.entities).join('_')}`);
    }
  }
  
  private recordPattern(pattern: string): void {
    const count = this.patterns.get(pattern) || 0;
    this.patterns.set(pattern, count + 1);
    
    this.savePatterns();
  }
  
  private savePatterns(): void {
    try {
      const patternsObj = Object.fromEntries(this.patterns);
      localStorage.setItem('agent_patterns', JSON.stringify(patternsObj));
    } catch (error) {
      console.error('[AgenticReasoning] Failed to save patterns:', error);
    }
  }
  
  private loadPatterns(): void {
    try {
      const saved = localStorage.getItem('agent_patterns');
      if (saved) {
        const patternsObj = JSON.parse(saved);
        this.patterns = new Map(Object.entries(patternsObj).map(([k, v]) => [k, Number(v)]));
      }
    } catch (error) {
      console.error('[AgenticReasoning] Failed to load patterns:', error);
    }
  }
  
  getPatternInsights(): Array<{ pattern: string; frequency: number }> {
    return Array.from(this.patterns.entries())
      .map(([pattern, frequency]) => ({ pattern, frequency }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 20);
  }
  
  constructor() {
    this.loadPatterns();
  }
  
  suggestBasedOnPatterns(): string[] {
    const insights = this.getPatternInsights();
    const suggestions: string[] = [];
    
    for (const { pattern, frequency } of insights) {
      if (frequency > 5 && pattern.includes('call')) {
        suggestions.push('You frequently make calls - would you like to create a speed dial routine?');
      }
      
      if (frequency > 3 && pattern.includes('note')) {
        suggestions.push('You take many notes - enable automatic summarization?');
      }
      
      if (frequency > 4 && pattern.includes('sms')) {
        suggestions.push('You send SMS often - create message templates?');
      }
    }
    
    return suggestions;
  }
}

export const agenticReasoningEngine = new AgenticReasoningEngine();
