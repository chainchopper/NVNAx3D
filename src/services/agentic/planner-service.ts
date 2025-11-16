import { providerManager } from '../provider-manager';
import type { PersoniConfig } from '../../personas';
import type { PerceptionResult } from './perception-orchestrator';

export interface ActionDescriptor {
  type: string;
  parameters: Record<string, any>;
  requiredConnectors?: string[];
  priority: number;
}

export interface Plan {
  goal: string;
  steps: string[];
  actions: ActionDescriptor[];
  prerequisites: string[];
  confidence: number;
}

export class PlannerService {
  async createPlan(
    perception: PerceptionResult, 
    personi: PersoniConfig
  ): Promise<Plan> {
    try {
      const llmPlan = await this.llmPlanning(perception, personi);
      if (llmPlan) {
        return llmPlan;
      }
    } catch (error) {
      console.error('[PlannerService] LLM planning failed, using templates:', error);
    }
    
    return this.templatePlanning(perception, personi);
  }
  
  private async llmPlanning(
    perception: PerceptionResult,
    personi: PersoniConfig
  ): Promise<Plan | null> {
    const conversationModel = personi.models?.conversation || personi.thinkingModel;
    if (!conversationModel) return null;
    
    const modelId = typeof conversationModel === 'string' ? conversationModel : conversationModel.modelId;
    const provider = providerManager.getProviderInstanceByModelId(modelId);
    if (!provider) return null;
    
    const availableTools = this.getAvailableTools(personi);
    
    const systemPrompt = `You are a planning assistant. Given a user's intent and entities, create an actionable plan.

Available tools: ${availableTools.join(', ')}
Available connectors: ${personi.enabledConnectors?.join(', ') || 'none'}

Return ONLY valid JSON in this format:
{
  "goal": "brief description",
  "steps": ["step 1", "step 2"],
  "actions": [
    {
      "type": "action_type",
      "parameters": {"key": "value"},
      "priority": 1
    }
  ],
  "prerequisites": ["requirement 1"],
  "confidence": 0.0-1.0
}

Action types: telephony_call, telephony_sms, email_send, store_memory, create_task, calendar_event, web_search, routine_create`;

    const userPrompt = `Intent: ${perception.intent}
Entities: ${JSON.stringify(perception.entities)}
Context: ${JSON.stringify(perception.context)}

Create a plan to fulfill this intent.`;

    try {
      const response = await provider.sendMessage([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]);
      
      const content = response || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        goal: parsed.goal || 'Assist user',
        steps: parsed.steps || [],
        actions: parsed.actions || [],
        prerequisites: parsed.prerequisites || [],
        confidence: parsed.confidence || 0.7
      };
    } catch (error) {
      console.error('[PlannerService] LLM plan parsing error:', error);
      return null;
    }
  }
  
  private templatePlanning(perception: PerceptionResult, personi: PersoniConfig): Plan {
    const actionMap: Record<string, ActionDescriptor[]> = {
      'call': [{
        type: 'telephony_call',
        parameters: { phoneNumber: perception.entities.phones?.[0] },
        requiredConnectors: ['twilio'],
        priority: 1
      }],
      'sms': [{
        type: 'telephony_sms',
        parameters: { 
          phoneNumber: perception.entities.phones?.[0],
          message: perception.context.message || 'Message from AI assistant'
        },
        requiredConnectors: ['twilio'],
        priority: 1
      }],
      'email': [{
        type: 'email_send',
        parameters: {
          to: perception.entities.emails?.[0],
          subject: 'Message from AI Assistant',
          body: perception.context.message || 'Message content'
        },
        requiredConnectors: ['gmail'],
        priority: 1
      }],
      'note': [{
        type: 'store_memory',
        parameters: {
          content: perception.context.noteContent || '',
          type: 'notes'
        },
        priority: 2
      }],
      'task': [{
        type: 'create_task',
        parameters: {
          content: perception.context.taskContent || '',
          priority: 'P3'
        },
        priority: 1
      }],
      'routine': [{
        type: 'routine_create',
        parameters: {
          trigger: perception.context.trigger || 'manual',
          actions: perception.context.actions || []
        },
        priority: 2
      }]
    };
    
    const actions = actionMap[perception.intent] || [];
    const validatedActions = this.validateActions(actions, personi);
    
    return {
      goal: `Execute ${perception.intent} action`,
      steps: actions.map((a, i) => `Step ${i + 1}: ${a.type}`),
      actions: validatedActions,
      prerequisites: this.checkPrerequisites(validatedActions, personi),
      confidence: 0.8
    };
  }
  
  private getAvailableTools(personi: PersoniConfig): string[] {
    const tools: string[] = ['memory', 'tasks'];
    
    if (personi.enabledConnectors) {
      for (const connector of personi.enabledConnectors) {
        if (connector.includes('twilio')) tools.push('telephony');
        if (connector.includes('gmail')) tools.push('email');
        if (connector.includes('calendar')) tools.push('calendar');
      }
    }
    
    return tools;
  }
  
  private validateActions(actions: ActionDescriptor[], personi: PersoniConfig): ActionDescriptor[] {
    return actions.filter(action => {
      if (!action.requiredConnectors) return true;
      
      const enabledConnectors = personi.enabledConnectors || [];
      return action.requiredConnectors.some(required => 
        enabledConnectors.some(enabled => enabled.includes(required))
      );
    });
  }
  
  private checkPrerequisites(actions: ActionDescriptor[], personi: PersoniConfig): string[] {
    const missing: string[] = [];
    
    for (const action of actions) {
      if (action.requiredConnectors) {
        const enabledConnectors = personi.enabledConnectors || [];
        for (const required of action.requiredConnectors) {
          if (!enabledConnectors.some(e => e.includes(required))) {
            missing.push(`Connector required: ${required}`);
          }
        }
      }
    }
    
    return missing;
  }
}

export const plannerService = new PlannerService();
