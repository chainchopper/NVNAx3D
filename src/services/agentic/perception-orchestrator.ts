import { providerManager } from '../provider-manager';
import type { PersoniConfig } from '../../personas';
import { ragMemoryManager } from '../memory/rag-memory-manager';

export interface PerceptionResult {
  intent: string;
  entities: Record<string, any>;
  sentiment: 'positive' | 'negative' | 'neutral';
  context: Record<string, any>;
  confidence: number;
  timestamp: string;
}

export class PerceptionOrchestrator {
  async perceive(input: string, personi: PersoniConfig): Promise<PerceptionResult> {
    try {
      const llmResult = await this.llmPerception(input, personi);
      if (llmResult) {
        await this.persistPerception(llmResult);
        return llmResult;
      }
    } catch (error) {
      console.error('[PerceptionOrchestrator] LLM perception failed, falling back to heuristics:', error);
    }
    
    return this.heuristicPerception(input);
  }
  
  private async llmPerception(input: string, personi: PersoniConfig): Promise<PerceptionResult | null> {
    const conversationModel = personi.models?.conversation || personi.thinkingModel;
    if (!conversationModel) {
      console.warn('[PerceptionOrchestrator] No conversation model configured');
      return null;
    }
    
    const modelId = typeof conversationModel === 'string' ? conversationModel : conversationModel.modelId;
    const provider = providerManager.getProviderInstanceByModelId(modelId);
    if (!provider) {
      console.warn('[PerceptionOrchestrator] No provider available for LLM perception');
      return null;
    }
    
    const systemPrompt = `You are a perception analyzer for an AI assistant. Analyze user input and extract:
1. PRIMARY INTENT: call, sms, email, note, task, search, analyze, create, schedule, summarize, routine, suggestion, or conversation
2. ENTITIES: Extract phone numbers, emails, dates, times, names, locations, URLs, amounts
3. SENTIMENT: positive, negative, or neutral
4. CONTEXT: Any additional contextual information

Return ONLY valid JSON in this exact format:
{
  "intent": "string",
  "entities": {"type": ["value1", "value2"]},
  "sentiment": "positive|negative|neutral",
  "context": {"key": "value"},
  "confidence": 0.0-1.0
}`;

    const userPrompt = `Analyze this user input:\n"${input}"`;
    
    try {
      const response = await provider.sendMessage([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]);
      
      const content = response || '';
      
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('[PerceptionOrchestrator] No JSON found in LLM response');
        return null;
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        intent: parsed.intent || 'conversation',
        entities: parsed.entities || {},
        sentiment: parsed.sentiment || 'neutral',
        context: parsed.context || {},
        confidence: parsed.confidence || 0.7,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('[PerceptionOrchestrator] LLM parsing error:', error);
      return null;
    }
  }
  
  private heuristicPerception(input: string): PerceptionResult {
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
    
    let intent = 'conversation';
    for (const [intentType, keywords] of Object.entries(intentPatterns)) {
      if (keywords.some(kw => lower.includes(kw))) {
        intent = intentType;
        break;
      }
    }
    
    const entities: Record<string, any> = {};
    const phoneRegex = /(\+?1?\s*\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/g;
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    
    const phones = input.match(phoneRegex);
    if (phones) entities.phones = phones;
    
    const emails = input.match(emailRegex);
    if (emails) entities.emails = emails;
    
    const positive = ['good', 'great', 'excellent', 'happy', 'love', 'thank', 'wonderful'];
    const negative = ['bad', 'terrible', 'sad', 'hate', 'angry', 'problem', 'issue', 'wrong'];
    
    const posCount = positive.filter(w => lower.includes(w)).length;
    const negCount = negative.filter(w => lower.includes(w)).length;
    
    let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
    if (posCount > negCount) sentiment = 'positive';
    else if (negCount > posCount) sentiment = 'negative';
    
    return {
      intent,
      entities,
      sentiment,
      context: {},
      confidence: 0.6,
      timestamp: new Date().toISOString()
    };
  }
  
  private async persistPerception(result: PerceptionResult): Promise<void> {
    try {
      await ragMemoryManager.addMemory(
        `Intent: ${result.intent}, Entities: ${JSON.stringify(result.entities)}, Sentiment: ${result.sentiment}`,
        'agent',
        'system_status',
        undefined,
        undefined,
        {
          type: 'perception',
          intent: result.intent,
          sentiment: result.sentiment,
          confidence: result.confidence
        }
      );
    } catch (error) {
      console.error('[PerceptionOrchestrator] Failed to persist perception:', error);
    }
  }
}

export const perceptionOrchestrator = new PerceptionOrchestrator();
