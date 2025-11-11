export interface CustomProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKey?: string;
  type: 'openai-compatible' | 'custom';
  capabilities: {
    streaming: boolean;
    functionCalling: boolean;
    vision: boolean;
    embedding: boolean;
  };
  headers?: Record<string, string>;
}

export interface ModelDiscoveryRequest {
  baseUrl: string;
  apiKey?: string;
  headers?: Record<string, string>;
}

export interface ModelDiscoveryResponse {
  models: Array<{
    id: string;
    name: string;
    type: 'conversation' | 'vision' | 'embedding' | 'function-calling';
    capabilities: string[];
  }>;
}
