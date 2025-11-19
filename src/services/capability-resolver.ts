/**
 * Capability-Aware Model Routing System
 * 
 * Routes requests to best-fit models based on capabilities:
 * - thinking (reasoning, planning)
 * - tools (function calling)
 * - vision (image understanding)
 * - audio (audio processing)
 */

export interface ModelCapabilities {
  thinking: boolean;    // Extended reasoning/planning
  tools: boolean;       // Function calling support
  vision: boolean;      // Image/video understanding
  audio: boolean;       // Audio processing
  streaming: boolean;   // Streaming responses
  contextWindow: number; // Max tokens
}

export interface ModelMetadata {
  id: string;
  providerId: string;
  displayName: string;
  capabilities: ModelCapabilities;
  costTier: 'free' | 'low' | 'medium' | 'high';
  latencyTier: 'fast' | 'medium' | 'slow';
}

export interface CapabilityRequirements {
  thinking?: boolean;
  tools?: boolean;
  vision?: boolean;
  audio?: boolean;
  streaming?: boolean;
  minContextWindow?: number;
}

export interface RoutingPreferences {
  preferLocal: boolean;      // Prefer local models (Ollama, LM Studio)
  maxCostTier: 'free' | 'low' | 'medium' | 'high';
  maxLatencyTier: 'fast' | 'medium' | 'slow';
  fallbackToCloud: boolean;  // Fall back to cloud if local unavailable
}

const DEFAULT_PREFERENCES: RoutingPreferences = {
  preferLocal: true,
  maxCostTier: 'high',
  maxLatencyTier: 'slow',
  fallbackToCloud: true
};

export class CapabilityResolver {
  private static instance: CapabilityResolver;
  
  private modelRegistry: Map<string, ModelMetadata> = new Map();
  private preferences: RoutingPreferences = DEFAULT_PREFERENCES;

  private constructor() {
    this.loadPreferences();
    this.initializeDefaultModels();
  }

  static getInstance(): CapabilityResolver {
    if (!CapabilityResolver.instance) {
      CapabilityResolver.instance = new CapabilityResolver();
    }
    return CapabilityResolver.instance;
  }

  private loadPreferences(): void {
    const stored = localStorage.getItem('capability-routing-preferences');
    if (stored) {
      try {
        this.preferences = { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
      } catch (e) {
        console.warn('[CapabilityResolver] Failed to load preferences');
      }
    }
  }

  private savePreferences(): void {
    localStorage.setItem('capability-routing-preferences', JSON.stringify(this.preferences));
  }

  private initializeDefaultModels(): void {
    // Gemini models
    this.registerModel({
      id: 'gemini-2.0-flash-thinking-exp-1219',
      providerId: 'google',
      displayName: 'Gemini 2.0 Flash Thinking',
      capabilities: {
        thinking: true,
        tools: true,
        vision: true,
        audio: true,
        streaming: true,
        contextWindow: 32000
      },
      costTier: 'medium',
      latencyTier: 'fast'
    });

    this.registerModel({
      id: 'gemini-2.0-flash-exp',
      providerId: 'google',
      displayName: 'Gemini 2.0 Flash',
      capabilities: {
        thinking: false,
        tools: true,
        vision: true,
        audio: true,
        streaming: true,
        contextWindow: 1000000
      },
      costTier: 'low',
      latencyTier: 'fast'
    });

    // OpenAI models
    this.registerModel({
      id: 'gpt-4o',
      providerId: 'openai',
      displayName: 'GPT-4o',
      capabilities: {
        thinking: false,
        tools: true,
        vision: true,
        audio: false,
        streaming: true,
        contextWindow: 128000
      },
      costTier: 'high',
      latencyTier: 'medium'
    });

    this.registerModel({
      id: 'o1',
      providerId: 'openai',
      displayName: 'OpenAI o1',
      capabilities: {
        thinking: true,
        tools: false,
        vision: false,
        audio: false,
        streaming: false,
        contextWindow: 200000
      },
      costTier: 'high',
      latencyTier: 'slow'
    });

    // Anthropic models
    this.registerModel({
      id: 'claude-3-5-sonnet-20241022',
      providerId: 'anthropic',
      displayName: 'Claude 3.5 Sonnet',
      capabilities: {
        thinking: false,
        tools: true,
        vision: true,
        audio: false,
        streaming: true,
        contextWindow: 200000
      },
      costTier: 'high',
      latencyTier: 'medium'
    });

    // Local models (user-configured)
    this.registerModel({
      id: 'llama-3.2-vision',
      providerId: 'ollama',
      displayName: 'Llama 3.2 Vision (Local)',
      capabilities: {
        thinking: false,
        tools: false,
        vision: true,
        audio: false,
        streaming: true,
        contextWindow: 128000
      },
      costTier: 'free',
      latencyTier: 'medium'
    });
  }

  registerModel(metadata: ModelMetadata): void {
    this.modelRegistry.set(metadata.id, metadata);
  }

  updateModelCapabilities(modelId: string, capabilities: Partial<ModelCapabilities>): void {
    const existing = this.modelRegistry.get(modelId);
    if (existing) {
      existing.capabilities = { ...existing.capabilities, ...capabilities };
    }
  }

  setPreferences(preferences: Partial<RoutingPreferences>): void {
    this.preferences = { ...this.preferences, ...preferences };
    this.savePreferences();
  }

  getPreferences(): RoutingPreferences {
    return { ...this.preferences };
  }

  /**
   * Find the best model for given capability requirements
   */
  resolveModel(requirements: CapabilityRequirements): ModelMetadata | null {
    console.log('[CapabilityResolver] Resolving model for requirements:', requirements);

    const candidates = Array.from(this.modelRegistry.values()).filter(model => {
      // Check capability requirements
      if (requirements.thinking && !model.capabilities.thinking) return false;
      if (requirements.tools && !model.capabilities.tools) return false;
      if (requirements.vision && !model.capabilities.vision) return false;
      if (requirements.audio && !model.capabilities.audio) return false;
      if (requirements.streaming && !model.capabilities.streaming) return false;
      if (requirements.minContextWindow && model.capabilities.contextWindow < requirements.minContextWindow) return false;

      // Check preferences
      if (this.getCostTierValue(model.costTier) > this.getCostTierValue(this.preferences.maxCostTier)) return false;
      if (this.getLatencyTierValue(model.latencyTier) > this.getLatencyTierValue(this.preferences.maxLatencyTier)) return false;

      return true;
    });

    if (candidates.length === 0) {
      console.warn('[CapabilityResolver] No models match requirements');
      return null;
    }

    // Score and sort candidates
    const scored = candidates.map(model => ({
      model,
      score: this.scoreModel(model, requirements)
    })).sort((a, b) => b.score - a.score);

    const selected = scored[0].model;
    console.log('[CapabilityResolver] Selected model:', selected.displayName, 'score:', scored[0].score);
    
    return selected;
  }

  /**
   * Score a model based on preferences and requirements
   */
  private scoreModel(model: ModelMetadata, requirements: CapabilityRequirements): number {
    let score = 0;

    // Prefer local models if enabled
    if (this.preferences.preferLocal && this.isLocalProvider(model.providerId)) {
      score += 100;
    }

    // Prefer lower cost
    score += (4 - this.getCostTierValue(model.costTier)) * 20;

    // Prefer lower latency
    score += (3 - this.getLatencyTierValue(model.latencyTier)) * 15;

    // Bonus for exact capability match
    if (requirements.thinking && model.capabilities.thinking) score += 30;
    if (requirements.tools && model.capabilities.tools) score += 25;
    if (requirements.vision && model.capabilities.vision) score += 25;
    if (requirements.audio && model.capabilities.audio) score += 20;

    // Bonus for larger context window
    score += Math.min(model.capabilities.contextWindow / 10000, 20);

    return score;
  }

  private isLocalProvider(providerId: string): boolean {
    return ['ollama', 'lmstudio', 'vllm', 'custom'].includes(providerId);
  }

  private getCostTierValue(tier: string): number {
    const map: Record<string, number> = { free: 0, low: 1, medium: 2, high: 3 };
    return map[tier] ?? 3;
  }

  private getLatencyTierValue(tier: string): number {
    const map: Record<string, number> = { fast: 0, medium: 1, slow: 2 };
    return map[tier] ?? 2;
  }

  getAllModels(): ModelMetadata[] {
    return Array.from(this.modelRegistry.values());
  }

  getModel(modelId: string): ModelMetadata | undefined {
    return this.modelRegistry.get(modelId);
  }

  getModelsByCapability(capability: keyof ModelCapabilities): ModelMetadata[] {
    return Array.from(this.modelRegistry.values())
      .filter(model => model.capabilities[capability]);
  }
}
