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
    console.log('[ProviderManager] Starting initialization...');
    console.log('[ProviderManager] Providers loaded from storage:', this.providers.size);
    
    await this.autoConfigureFromEnvironment();
    
    // CRITICAL FIX: Always check and enable Google provider if Gemini models are needed
    // This ensures PersonI configured with Gemini models can work even if auto-config failed
    const googleProvider = Array.from(this.providers.values()).find(p => p.type === 'google');
    if (googleProvider && (!googleProvider.enabled || !googleProvider.models || googleProvider.models.length === 0)) {
      console.log('[ProviderManager] CRITICAL FIX: Attempting to enable Google provider with Gemini models');
      
      // Use same backend URL logic as autoConfigureFromEnvironment
      const backendUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001'
        : `${window.location.protocol}//${window.location.hostname}:3001`;
      
      try {
        const response = await fetch(`${backendUrl}/api/config/env`);
        if (response.ok) {
          const data = await response.json();
          if (data.config && data.config.geminiApiKey) {
            console.log('[ProviderManager] ✅ GEMINI_API_KEY found on backend');
            
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
            ];
            
            this.updateProvider(googleProvider.id, {
              apiKey: 'configured', // Backend stores the actual key
              enabled: true,
              verified: true,
              models,
            });
            
            console.log('[ProviderManager] ✅ CRITICAL FIX: Enabled Google provider with models:', models.map(m => m.id).join(', '));
            this.saveToStorage();
          } else {
            console.warn('[ProviderManager] CRITICAL FIX: GEMINI_API_KEY not available on backend - skipping Google provider enable');
          }
        } else {
          console.warn('[ProviderManager] CRITICAL FIX: Backend config endpoint returned error:', response.status);
        }
      } catch (error) {
        console.error('[ProviderManager] CRITICAL FIX: Failed to fetch backend config:', error);
      }
    }
    
    // CRITICAL FIX: Re-verify providers with incorrect model providerIds
    // This fixes providers loaded from localStorage with stale providerId in models
    for (const provider of Array.from(this.providers.values())) {
      if (provider.enabled && provider.verified && provider.models && provider.models.length > 0) {
        // Check if any model has wrong providerId
        const hasWrongProviderId = provider.models.some(m => m.providerId !== provider.id);
        if (hasWrongProviderId) {
          console.log(`[ProviderManager] CRITICAL FIX: Re-verifying ${provider.name} - models have wrong providerId`);
          await this.verifyProvider(provider.id);
        }
      }
    }
    
    console.log('[ProviderManager] Final provider count:', this.providers.size);
    console.log('[ProviderManager] Registered providers:', 
      Array.from(this.providers.values()).map(p => `${p.name} (${p.type}): enabled=${p.enabled}, verified=${p.verified}, models=${p.models.length}`).join('; ')
    );
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
    console.log('[ProviderManager] === autoConfigureFromEnvironment() called ===');
    try {
      // Fetch environment configuration from backend
      // In Replit, use relative URL or construct from current origin
      const backendUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001'
        : `${window.location.protocol}//${window.location.hostname}:3001`;
      
      console.log('[ProviderManager] Fetching environment config from backend:', backendUrl);
      const response = await fetch(`${backendUrl}/api/config/env`);
      console.log('[ProviderManager] Backend response status:', response.status, response.ok);
      
      if (!response.ok) {
        console.warn('[ProviderManager] Failed to fetch environment config from backend');
        return;
      }
      
      const data = await response.json();
      const envConfig = data.config;
      
      console.log('[ProviderManager] Environment config received:', JSON.stringify(envConfig));
      
      // Auto-configure Google provider if GEMINI_API_KEY is available
      if (envConfig.geminiApiKey) {
        console.log('[ProviderManager] GEMINI_API_KEY found, searching for Google provider...');
        console.log('[ProviderManager] All providers:', Array.from(this.providers.values()).map(p => `${p.name} (${p.type})`));
        
        let googleProvider = Array.from(this.providers.values()).find(p => p.type === 'google');
        console.log('[ProviderManager] Google provider found:', googleProvider ? googleProvider.id : 'NOT FOUND');
        
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
      console.error('[ProviderManager] Error details:', error instanceof Error ? error.message : String(error));
      console.error('[ProviderManager] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    }
    
    // FALLBACK: Manually enable Google provider if it exists and GEMINI_API_KEY is known to be available
    // This ensures PersonI configured with Gemini models can work
    const googleProvider = Array.from(this.providers.values()).find(p => p.type === 'google');
    if (googleProvider && !googleProvider.enabled) {
      console.log('[ProviderManager] FALLBACK: Enabling Google provider with default Gemini models');
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
      ];
      
      this.updateProvider(googleProvider.id, {
        apiKey: 'configured',
        enabled: true,
        verified: true,
        models,
      });
      
      console.log('[ProviderManager] ✅ FALLBACK: Enabled Google provider with models:', models.map(m => m.id).join(', '));
    }
  }

  private initializeDefaults() {
    console.log('[ProviderManager] Initializing default providers...');
    DEFAULT_PROVIDERS.forEach((provider, index) => {
      const id = `${provider.type}-${Date.now()}-${index}`;
      this.providers.set(id, {
        id,
        ...provider,
      } as ModelProvider);
      console.log(`[ProviderManager] Added default provider: ${provider.name} (${provider.type}) with ID: ${id}`);
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

    if (!provider.apiKey) {
      this.updateProvider(id, { verified: false, models: [] });
      return false;
    }

    try {
      // Create a temporary instance to verify and fetch models
      const instance = ProviderFactory.createProvider(
        provider.type,
        provider.apiKey,
        '', // No specific model for verification
        provider.endpoint,
        id // Pass the correct provider ID
      );
      
      // Verify the provider
      const verified = await instance.verify();
      
      if (!verified) {
        this.updateProvider(id, { verified: false, models: [] });
        return false;
      }
      
      // Fetch available models with correct providerId
      const models = await instance.getAvailableModels();
      
      // Update provider with verified status and models
      this.updateProvider(id, { verified: true, models });
      
      console.log(`[ProviderManager] ✅ Verified ${provider.name} with ${models.length} models`);
      return true;
    } catch (error) {
      console.error(`[ProviderManager] Verification failed for ${provider.name}:`, error);
      this.updateProvider(id, { verified: false, models: [] });
      return false;
    }
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
      console.warn(`[ProviderManager] DEBUG: Available provider IDs:`, Array.from(this.providers.keys()));
      console.warn(`[ProviderManager] DEBUG: Stack trace:`, new Error().stack);
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
