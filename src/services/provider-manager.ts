/**
 * Provider Manager Service
 * Manages model providers, STT/TTS configurations
 */

import { ModelProvider, STTProvider, TTSProvider, DEFAULT_PROVIDERS, ModelInfo } from '../types/providers';
import { BaseProvider } from '../providers/base-provider';
import { ProviderFactory } from '../providers/provider-factory';
import { getBackendUrl } from '../config/backend-url';

const PROVIDERS_KEY = 'nirvana-providers';
const STT_CONFIG_KEY = 'nirvana-stt-config';
const TTS_CONFIG_KEY = 'nirvana-tts-config';

export class ProviderManager {
  private providers: Map<string, ModelProvider> = new Map();
  private providerInstances: Map<string, BaseProvider> = new Map();
  private sttConfig: STTProvider | null = null;
  private ttsConfig: TTSProvider | null = null;

  constructor() {
    this.loadFromStorage();
    // Defer auto-configuration until async init is called
  }
  
  async initialize() {
    await this.autoConfigureFromEnvironment();
  }

  loadFromStorage() {
    try {
      const saved = localStorage.getItem(PROVIDERS_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        this.providers = new Map(Object.entries(data));
        this.migrateProviderCapabilities();
      } else {
        this.initializeDefaults();
      }

      const sttSaved = localStorage.getItem(STT_CONFIG_KEY);
      if (sttSaved) {
        this.sttConfig = JSON.parse(sttSaved);
      } else {
        this.sttConfig = {
          id: 'local-whisper',
          name: 'Local Whisper',
          type: 'local-whisper',
          enabled: true,
        };
      }

      const ttsSaved = localStorage.getItem(TTS_CONFIG_KEY);
      if (ttsSaved) {
        this.ttsConfig = JSON.parse(ttsSaved);
      } else {
        this.ttsConfig = {
          id: 'browser',
          name: 'Browser TTS',
          type: 'browser',
          enabled: true,
        };
      }
    } catch (error) {
      console.error('Failed to load provider config:', error);
      this.initializeDefaults();
    }
  }

  /**
   * Migrate legacy provider models to include new capability flags
   */
  private migrateProviderCapabilities() {
    let migrated = false;

    this.providers.forEach((provider, providerId) => {
      if (!provider.models || provider.models.length === 0) return;

      provider.models = provider.models.map((model) => {
        const caps = model.capabilities || {};
        
        // Check if migration is needed (missing new flags)
        if (caps.conversation === undefined || caps.embedding === undefined || caps.imageGeneration === undefined) {
          migrated = true;
          
          const modelId = model.id.toLowerCase();
          
          // Infer missing capabilities from model name or existing flags
          const isEmbedding = modelId.includes('embed') || modelId.includes('embedding');
          const isImageGen = modelId.includes('dall-e') || modelId.includes('imagen') || modelId.includes('stable-diffusion');
          const hasVision = caps.vision || modelId.includes('vision');
          const isConversation = !isEmbedding && !isImageGen;
          
          return {
            ...model,
            capabilities: {
              ...caps,
              conversation: caps.conversation ?? isConversation,
              embedding: caps.embedding ?? isEmbedding,
              imageGeneration: caps.imageGeneration ?? isImageGen,
            },
          };
        }
        
        return model;
      });
    });

    // Persist migrated data if changes were made
    if (migrated) {
      console.log('[ProviderManager] 🔄 Migrated legacy provider models with new capability flags');
      this.saveToStorage();
    }
  }

  /**
   * Auto-configure providers from environment variables (via backend API)
   */
  private async autoConfigureFromEnvironment() {
    try {
      // Use relative path for CORS compatibility
      const backendUrl = getBackendUrl('/api/config/env');
      
      // Retry fetch with exponential backoff (backend might not be ready yet)
      let response;
      let lastError;
      const maxRetries = 3;
      
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
          
          response = await fetch(backendUrl, {
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          
          if (response.ok) {
            break; // Success!
          }
        } catch (fetchError) {
          lastError = fetchError;
          if (attempt < maxRetries - 1) {
            // Wait before retrying (exponential backoff: 500ms, 1s, 2s)
            await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempt)));
            continue;
          }
        }
      }
      
      if (!response || !response.ok) {
        console.warn('[ProviderManager] Failed to fetch environment config from backend after', maxRetries, 'attempts');
        return;
      }
      
      const data = await response.json();
      const envConfig = data.config;
      
      console.log('[ProviderManager] Environment config received:', envConfig);
      
      // Auto-configure Google Gemini if API key is present
      if (envConfig.geminiApiKey) {
        const googleProvider = Array.from(this.providers.values()).find(p => p.type === 'google');
        if (googleProvider) {
          const wasVerified = googleProvider.verified;
          googleProvider.apiKey = 'env:GEMINI_API_KEY'; // Placeholder - backend handles real key
          googleProvider.enabled = true;
          googleProvider.verified = true;
          
          // Sync models if not verified before OR if models list is empty
          if (!wasVerified || googleProvider.models.length === 0) {
            await this.syncProviderModels(googleProvider.id);
            console.log('[ProviderManager] Auto-configured Google Gemini from environment');
          }
        }
      }
      
      // Note: Other model configuration is handled through Settings UI
      // Users can manually add any models they want via the Models panel
    } catch (error) {
      console.error('[ProviderManager] Error auto-configuring from environment:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        error
      });
    }
  }

  private initializeDefaults() {
    DEFAULT_PROVIDERS.forEach((provider, index) => {
      const id = `${provider.type}-${Date.now()}-${index}`;
      this.providers.set(id, {
        id,
        ...provider,
      } as ModelProvider);
    });
    this.saveToStorage();
  }

  saveToStorage() {
    try {
      const data = Object.fromEntries(this.providers.entries());
      const providersJson = JSON.stringify(data);
      const providersSize = new Blob([providersJson]).size;
      
      // Log size for quota monitoring
      if (providersSize > 100000) { // Warn if > 100KB
        console.warn(`[ProviderManager] Large provider data: ${(providersSize / 1024).toFixed(1)}KB`);
      }
      
      localStorage.setItem(PROVIDERS_KEY, providersJson);
      
      if (this.sttConfig) {
        localStorage.setItem(STT_CONFIG_KEY, JSON.stringify(this.sttConfig));
      }
      
      if (this.ttsConfig) {
        localStorage.setItem(TTS_CONFIG_KEY, JSON.stringify(this.ttsConfig));
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.error('[ProviderManager] LocalStorage quota exceeded! Attempting cleanup...');
        this.logStorageUsage();
        // Try to save with minimal data
        try {
          const minimalData = Object.fromEntries(
            Array.from(this.providers.entries()).filter(([_, p]) => p.enabled)
          );
          localStorage.setItem(PROVIDERS_KEY, JSON.stringify(minimalData));
        } catch (retryError) {
          console.error('[ProviderManager] Failed to save even minimal provider data');
        }
      } else {
        console.error('[ProviderManager] Failed to save provider config:', error);
      }
    }
  }
  
  private logStorageUsage() {
    try {
      let totalSize = 0;
      const sizes: Record<string, number> = {};
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key) || '';
          const size = new Blob([value]).size;
          sizes[key] = size;
          totalSize += size;
        }
      }
      
      console.log('[Storage Usage] Total:', (totalSize / 1024).toFixed(1), 'KB');
      
      // Sort by size and log top 10
      const sorted = Object.entries(sizes).sort((a, b) => b[1] - a[1]).slice(0, 10);
      sorted.forEach(([key, size]) => {
        console.log(`  ${key}: ${(size / 1024).toFixed(1)}KB`);
      });
    } catch (error) {
      console.error('[Storage Usage] Failed to calculate:', error);
    }
  }

  getAllProviders(): ModelProvider[] {
    return Array.from(this.providers.values());
  }

  getProvider(id: string): ModelProvider | undefined {
    return this.providers.get(id);
  }

  updateProvider(id: string, updates: Partial<ModelProvider>) {
    const provider = this.providers.get(id);
    if (provider) {
      this.providers.set(id, { ...provider, ...updates });
      this.clearInstanceCache(id);
      this.saveToStorage();
    }
  }

  addCustomProvider(provider: Omit<ModelProvider, 'id'>): string {
    const id = `custom-${Date.now()}`;
    this.providers.set(id, { ...provider, id });
    this.saveToStorage();
    return id;
  }

  async addCustomProviderWithDiscovery(config: {
    name: string;
    baseUrl: string;
    apiKey?: string;
    capabilities?: {
      streaming: boolean;
      functionCalling: boolean;
      vision: boolean;
    };
  }): Promise<{ success: boolean; providerId?: string; error?: string }> {
    try {
      // Use relative path for CORS compatibility
      const proxyUrl = getBackendUrl('/api/models/proxy');
      
      // Use backend proxy to discover models with SSRF protection
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: config.baseUrl,
          apiKey: config.apiKey,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, error: errorData.error || 'Model discovery failed' };
      }

      const { data } = await response.json();
      
      if (!data.data && !data.models) {
        return { success: false, error: 'No models discovered from endpoint' };
      }

      // Create provider first to get the ID
      const providerId = this.addCustomProvider({
        name: config.name,
        type: 'custom',
        apiKey: config.apiKey,
        endpoint: config.baseUrl,
        enabled: true,
        verified: true,
        models: [], // Will be populated below
      });

      // Now create models with the correct providerId and inferred capabilities
      const models: ModelInfo[] = (data.data || data.models || []).map((model: any) => {
        const modelId = model.id.toLowerCase();
        
        // Infer capabilities from model name/ID
        const isEmbedding = modelId.includes('embed') || modelId.includes('embedding');
        const isImageGen = modelId.includes('dall-e') || modelId.includes('imagen') || modelId.includes('stable-diffusion');
        const isVision = modelId.includes('vision') || modelId.includes('gpt-4') || modelId.includes('gemini') || modelId.includes('claude');
        const isConversation = !isEmbedding && !isImageGen; // Most models support conversation
        
        return {
          id: model.id,
          name: model.id,
          providerId: providerId,
          capabilities: {
            conversation: isConversation,
            streaming: config.capabilities?.streaming ?? true,
            functionCalling: config.capabilities?.functionCalling ?? (modelId.includes('gpt-4') || modelId.includes('function')),
            vision: config.capabilities?.vision ?? isVision,
            embedding: isEmbedding,
            imageGeneration: isImageGen,
          },
        };
      });

      // Update provider with discovered models
      const provider = this.providers.get(providerId);
      if (provider) {
        provider.models = models;
        this.saveToStorage();
      }

      console.log(`[ProviderManager] Added custom provider "${config.name}" with ${models.length} models`);
      return { success: true, providerId };
    } catch (error: any) {
      console.error('[ProviderManager] Custom provider discovery failed:', error);
      return { success: false, error: error.message || 'Failed to add custom provider' };
    }
  }

  deleteProvider(id: string) {
    this.providers.delete(id);
    this.clearInstanceCache(id);
    this.saveToStorage();
  }

  /**
   * Sync models from a provider instance to the provider configuration
   * This fetches the actual available models from the provider (e.g., GoogleProvider, OpenAIProvider)
   */
  async syncProviderModels(id: string): Promise<void> {
    const provider = this.providers.get(id);
    if (!provider || !provider.enabled) {
      return;
    }
    
    // Check if this is a local provider (doesn't need API key)
    const isLocalProvider = provider.type === 'custom' || 
                           provider.endpoint?.includes('localhost') ||
                           provider.endpoint?.includes('127.0.0.1') ||
                           provider.endpoint?.includes('0.0.0.0');
    
    // Skip if no API key for non-local providers
    if (!provider.apiKey && !isLocalProvider) {
      return;
    }

    try {
      // Create a fresh provider instance directly without using getProviderInstance
      // to avoid infinite recursion
      const instance = ProviderFactory.createProvider(
        provider.type,
        provider.apiKey,
        '', // Empty model for now
        provider.endpoint,
        id
      );

      // Fetch available models from the provider
      const models = await instance.getAvailableModels();
      
      if (models && models.length > 0) {
        provider.models = models;
        this.saveToStorage();
        console.log(`[ProviderManager] Synced ${models.length} models for ${provider.name}`);
      }
    } catch (error) {
      console.error(`[ProviderManager] Failed to sync models for ${provider.name}:`, error);
    }
  }

  async verifyProvider(id: string): Promise<boolean> {
    const provider = this.providers.get(id);
    if (!provider) return false;

    // For custom providers (Ollama, LM Studio, etc.), API key is optional
    // They only need a valid endpoint
    const isLocalProvider = provider.type === 'custom' || 
                           provider.endpoint?.includes('localhost') ||
                           provider.endpoint?.includes('127.0.0.1') ||
                           provider.endpoint?.includes('0.0.0.0');
    
    const verified = isLocalProvider ? !!provider.endpoint : !!provider.apiKey;
    
    // If verified, sync models from the provider instance
    if (verified && provider.enabled) {
      await this.syncProviderModels(id);
    }
    
    this.updateProvider(id, { verified });
    return verified;
  }

  getSTTConfig(): STTProvider | null {
    return this.sttConfig;
  }

  updateSTTConfig(config: STTProvider) {
    this.sttConfig = config;
    this.saveToStorage();
  }

  getTTSConfig(): TTSProvider | null {
    return this.ttsConfig;
  }

  updateTTSConfig(config: TTSProvider) {
    this.ttsConfig = config;
    this.saveToStorage();
  }

  getAvailableModels(): ModelInfo[] {
    const allModels: ModelInfo[] = [];
    
    Array.from(this.providers.values())
      .filter(p => p.enabled && p.verified)
      .forEach(provider => {
        allModels.push(...provider.models);
      });
    
    return allModels;
  }

  /**
   * Get models filtered by capability (conversation, vision, embedding, etc.)
   */
  getModelsByCapability(
    capability: 'conversation' | 'vision' | 'embedding' | 'functionCalling' | 'imageGeneration',
    options?: { providerId?: string }
  ): ModelInfo[] {
    let models = this.getAvailableModels();
    
    // Filter by provider if specified
    if (options?.providerId) {
      models = models.filter(m => m.providerId === options.providerId);
    }
    
    // Filter by capability
    models = models.filter(m => m.capabilities[capability] === true);
    
    return models;
  }

  /**
   * Get all enabled and verified providers
   */
  getActiveProviders(): ModelProvider[] {
    return Array.from(this.providers.values())
      .filter(p => p.enabled && p.verified);
  }

  /**
   * Get providers that have at least one model with the specified capability
   */
  getProvidersByCapability(
    capability: 'conversation' | 'vision' | 'embedding' | 'functionCalling' | 'imageGeneration'
  ): ModelProvider[] {
    return this.getActiveProviders().filter(provider => 
      provider.models.some(m => m.capabilities[capability] === true)
    );
  }

  /**
   * Get provider instance by model ID (searches all providers for the model)
   * This is the preferred method for PersonI model configuration
   * 
   * BACKWARD COMPATIBILITY: Also accepts legacy provider IDs for smooth migration
   */
  getProviderInstanceByModelId(modelIdOrProviderId: string): BaseProvider | null {
    if (!modelIdOrProviderId) {
      console.warn('[ProviderManager] No model/provider ID provided');
      return null;
    }

    // BACKWARD COMPATIBILITY: Check if this is a provider ID (legacy thinkingModel)
    // Provider IDs typically have format like "google-1234567-0" or "openai-1234567-0"
    const legacyProvider = this.providers.get(modelIdOrProviderId);
    if (legacyProvider) {
      console.log(`[ProviderManager] Legacy provider ID detected: "${modelIdOrProviderId}", using fallback`);
      return this.getProviderInstance(modelIdOrProviderId);
    }

    // NEW PATH: Search all providers for this model ID
    for (const provider of Array.from(this.providers.values())) {
      if (!provider.enabled || !provider.verified) {
        continue;
      }

      const model = provider.models.find(m => m.id === modelIdOrProviderId);
      if (model) {
        console.log(`[ProviderManager] Found model "${modelIdOrProviderId}" in provider "${provider.name}"`);
        return this.getProviderInstance(provider.id, modelIdOrProviderId);
      }
    }

    console.warn(`[ProviderManager] No provider found for model/provider ID: ${modelIdOrProviderId}`);
    return null;
  }

  getProviderInstance(providerId: string, modelId?: string): BaseProvider | null {
    const provider = this.providers.get(providerId);
    
    if (!provider) {
      console.warn(`Provider "${providerId}" not found`);
      return null;
    }
    
    if (!provider.enabled) {
      console.warn(`Provider "${provider.name}" is disabled`);
      return null;
    }
    
    if (!provider.verified) {
      console.warn(`Provider "${provider.name}" is not verified`);
      return null;
    }
    
    if (!provider.apiKey) {
      console.warn(`Provider "${provider.name}" has no API key configured`);
      return null;
    }
    
    const cacheKey = `${providerId}-${modelId || 'default'}`;
    
    if (this.providerInstances.has(cacheKey)) {
      return this.providerInstances.get(cacheKey)!;
    }
    
    try {
      const model = modelId || provider.models[0]?.id || '';
      const instance = ProviderFactory.createProvider(
        provider.type,
        provider.apiKey,
        model,
        provider.endpoint,
        providerId
      );
      
      this.providerInstances.set(cacheKey, instance);
      return instance;
    } catch (error) {
      console.error(`Failed to create provider instance for ${provider.name}:`, error);
      return null;
    }
  }

  clearInstanceCache(providerId?: string) {
    if (providerId) {
      for (const key of this.providerInstances.keys()) {
        if (key.startsWith(`${providerId}-`)) {
          this.providerInstances.delete(key);
        }
      }
    } else {
      this.providerInstances.clear();
    }
  }
}

export const providerManager = new ProviderManager();
