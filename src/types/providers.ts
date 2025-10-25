/**
 * Model provider types and interfaces
 */

export type ProviderType = 'openai' | 'google' | 'xai' | 'anthropic' | 'deepseek' | 'custom';

export interface ModelProvider {
  id: string;
  name: string;
  type: ProviderType;
  apiKey?: string;
  endpoint?: string;
  enabled: boolean;
  verified: boolean;
  models: ModelInfo[];
}

export interface ModelInfo {
  id: string;
  name: string;
  providerId: string;
  capabilities: ModelCapabilities;
}

export interface ModelCapabilities {
  audio?: boolean;
  vision?: boolean;
  streaming?: boolean;
  functionCalling?: boolean;
  maxTokens?: number;
}

export interface STTProvider {
  id: string;
  name: string;
  type: 'local-whisper' | 'google' | 'custom';
  endpoint?: string;
  enabled: boolean;
}

export interface TTSProvider {
  id: string;
  name: string;
  type: 'browser' | 'chatterbox' | 'google' | 'custom';
  endpoint?: string;
  enabled: boolean;
}

export const DEFAULT_PROVIDERS: Partial<ModelProvider>[] = [
  {
    type: 'google',
    name: 'Google Gemini',
    enabled: false,
    verified: false,
    models: [],
  },
  {
    type: 'openai',
    name: 'OpenAI',
    enabled: false,
    verified: false,
    models: [],
  },
  // TODO: Implement these providers before enabling
  // {
  //   type: 'anthropic',
  //   name: 'Anthropic Claude',
  //   enabled: false,
  //   verified: false,
  //   models: [],
  // },
  // {
  //   type: 'xai',
  //   name: 'xAI Grok',
  //   enabled: false,
  //   verified: false,
  //   models: [],
  // },
  // {
  //   type: 'deepseek',
  //   name: 'Deepseek',
  //   enabled: false,
  //   verified: false,
  //   models: [],
  // },
];
