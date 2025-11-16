import { TwilioProvider } from './twilio-provider';
import { FreePBXProvider } from './freepbx-provider';
import type { TelephonyProvider, TelephonyConfig } from './telephony-provider';

const TELEPHONY_CONFIG_KEY = 'nirvana-telephony-config';

class TelephonyManager {
  private providers: Map<string, TelephonyProvider> = new Map();
  private activeProvider: TelephonyProvider | null = null;
  private config: TelephonyConfig | null = null;

  constructor() {
    this.providers.set('twilio', new TwilioProvider());
    this.providers.set('freepbx', new FreePBXProvider());
    
    this.loadConfig();
  }

  private async loadConfig(): Promise<void> {
    try {
      const saved = localStorage.getItem(TELEPHONY_CONFIG_KEY);
      if (saved) {
        this.config = JSON.parse(saved);
        
        if (this.config?.enabled && this.config.providerType) {
          const provider = this.providers.get(this.config.providerType);
          if (provider) {
            const configSuccess = await provider.configure(this.config.credentials);
            
            if (configSuccess) {
              this.activeProvider = provider;
              console.log('[TelephonyManager] Loaded and configured provider:', provider.name);
            } else {
              console.warn('[TelephonyManager] Provider configuration failed on load, telephony disabled');
              this.activeProvider = null;
            }
          }
        }
      }
    } catch (error) {
      console.error('[TelephonyManager] Failed to load config:', error);
    }
  }

  async saveConfig(config: TelephonyConfig): Promise<{ success: boolean; error?: string }> {
    try {
      this.config = config;
      localStorage.setItem(TELEPHONY_CONFIG_KEY, JSON.stringify(config));
      
      if (config.enabled) {
        const provider = this.providers.get(config.providerType);
        if (!provider) {
          const error = `Unknown provider type: ${config.providerType}`;
          console.error('[TelephonyManager]', error);
          return { success: false, error };
        }

        const configSuccess = await provider.configure(config.credentials);
        
        if (!configSuccess) {
          const error = `Failed to configure ${provider.name} provider`;
          console.error('[TelephonyManager]', error);
          this.activeProvider = null;
          return { success: false, error };
        }

        this.activeProvider = provider;
        console.log('[TelephonyManager] Provider configured successfully:', provider.name);
        return { success: true };
      } else {
        this.activeProvider = null;
        console.log('[TelephonyManager] Telephony disabled');
        return { success: true };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[TelephonyManager] Failed to save config:', errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  getConfig(): TelephonyConfig | null {
    return this.config;
  }

  getProvider(): TelephonyProvider | null {
    return this.activeProvider;
  }

  getProviderNames(): string[] {
    return Array.from(this.providers.keys());
  }

  isConfigured(): boolean {
    return !!(this.activeProvider && this.activeProvider.isConfigured());
  }
}

export const telephonyManager = new TelephonyManager();
