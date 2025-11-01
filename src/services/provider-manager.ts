/**
 * Provider Manager Service
 * Manages model providers, STT/TTS configurations
 */

import { ModelProvider, STTProvider, TTSProvider, DEFAULT_PROVIDERS, ModelInfo } from '../types/providers';
import { BaseProvider } from '../providers/base-provider';
import { ProviderFactory } from '../providers/provider-factory';

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
   * Auto-configure providers from environment variables (via backend API)
   */
  private async autoConfigureFromEnvironment() {
    try {
      // Fetch environment configuration from backend
      const response = await fetch('http://localhost:3001/api/config/env');
      if (!response.ok) {
        console.warn('[ProviderManager] Failed to fetch environment config from backend');
        return;
      }
      
      const data = await response.json();
      const envConfig = data.config;
      
      console.log('[ProviderManager] Environment config received:', envConfig);
      
      // Auto-configure Google provider if GEMINI_API_KEY is available
      if (envConfig.geminiApiKey) {
        let googleProvider = Array.from(this.providers.values()).find(p => p.type === 'google');
        
        if (googleProvider) {
          // Update existing Google provider
          const models: ModelInfo[] = [
            {
              id: 'gemini-2.5-flash',
              name: 'Gemini 2.5 Flash',
              providerId: googleProvider.id,
              capabilities: {
                audio: true,
                vision: true,
                streaming: true,
                functionCalling: true,
                maxTokens: 1000000,
              },
            },
            {
              id: 'gemini-2.5-pro',
              name: 'Gemini 2.5 Pro',
              providerId: googleProvider.id,
              capabilities: {
                audio: true,
                vision: true,
                streaming: true,
                functionCalling: true,
                maxTokens: 2000000,
              },
            },
            {
              id: 'gemini-2.0-flash-exp',
              name: 'Gemini 2.0 Flash Experimental',
              providerId: googleProvider.id,
              capabilities: {
                audio: true,
                vision: true,
                streaming: true,
                functionCalling: true,
                maxTokens: 1000000,
              },
            },
          ];
          
          this.updateProvider(googleProvider.id, {
            apiKey: 'configured', // Placeholder - actual key is on backend
            enabled: true,
            verified: true,
            models,
          });
          
          console.log('[ProviderManager] ✅ Auto-configured Google provider with GEMINI_API_KEY');
          console.log('[ProviderManager] Models available:', models.map(m => m.id).join(', '));
        } else {
          console.warn('[ProviderManager] Google provider not found in provider list');
        }
      } else {
        console.warn('[ProviderManager] GEMINI_API_KEY not available on backend');
      }
    } catch (error) {
      console.error('[ProviderManager] Error auto-configuring from environment:', error);
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
      localStorage.setItem(PROVIDERS_KEY, JSON.stringify(data));
      
      if (this.sttConfig) {
        localStorage.setItem(STT_CONFIG_KEY, JSON.stringify(this.sttConfig));
      }
      
      if (this.ttsConfig) {
        localStorage.setItem(TTS_CONFIG_KEY, JSON.stringify(this.ttsConfig));
      }
    } catch (error) {
      console.error('Failed to save provider config:', error);
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

  deleteProvider(id: string) {
    this.providers.delete(id);
    this.clearInstanceCache(id);
    this.saveToStorage();
  }

  async verifyProvider(id: string): Promise<boolean> {
    const provider = this.providers.get(id);
    if (!provider) return false;

    // TODO: Implement actual verification logic per provider type
    // For now, just check if API key is present
    const verified = !!provider.apiKey;
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
