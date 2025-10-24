/**
 * Base provider interface for AI model providers
 */

import { ModelInfo, ModelCapabilities } from '../types/providers';

export interface StreamingResponse {
  text?: string;
  audio?: ArrayBuffer;
  done: boolean;
}

export interface ProviderMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ProviderConfig {
  apiKey?: string;
  endpoint?: string;
  model: string;
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
    onChunk?: (chunk: StreamingResponse) => void
  ): Promise<string>;
  
  // Optional: Audio streaming support
  async sendAudio?(
    audio: ArrayBuffer,
    onChunk?: (chunk: StreamingResponse) => void
  ): Promise<string> {
    throw new Error('Audio not supported by this provider');
  }
}
