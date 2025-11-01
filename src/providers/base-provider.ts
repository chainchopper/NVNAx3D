/**
 * Base provider interface for AI model providers
 */

import { ModelInfo, ModelCapabilities } from '../types/providers';

export interface StreamingResponse {
  text?: string;
  audio?: ArrayBuffer;
  done: boolean;
}

export interface ContentPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

export interface ProviderMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | ContentPart[];
}

export interface ProviderConfig {
  apiKey?: string;
  endpoint?: string;
  model: string;
  providerId: string;
  providerType: string;
}

export interface SendMessageOptions {
  tools?: any[];
  systemInstruction?: string;
  onChunk?: (chunk: StreamingResponse) => void;
}

export abstract class BaseProvider {
  protected config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  abstract verify(): Promise<boolean>;
  abstract getAvailableModels(): Promise<ModelInfo[]>;
  abstract sendMessage(
    messages: ProviderMessage[],
    options?: SendMessageOptions | ((chunk: StreamingResponse) => void)
  ): Promise<string | { text: string, functionCalls: any[] }>;
  
  // Optional: Audio streaming support
  async sendAudio?(
    audio: ArrayBuffer,
    onChunk?: (chunk: StreamingResponse) => void
  ): Promise<string> {
    throw new Error('Audio not supported by this provider');
  }
}
