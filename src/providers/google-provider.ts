/**
 * Google Gemini provider implementation
 * SECURITY: Uses backend proxy to prevent API key exposure in browser
 */

import { BaseProvider, ProviderMessage, StreamingResponse } from './base-provider';
import { ModelInfo } from '../types/providers';

export class GoogleProvider extends BaseProvider {
  constructor(config: any) {
    super(config);
  }

  async verify(): Promise<boolean> {
    try {
      // Verify by making a test API call through backend proxy (Vite proxy handles routing)
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemini-2.5-flash',
          contents: [{
            role: 'user',
            parts: [{ text: 'test' }],
          }],
        }),
      });

      const data = await response.json();
      return data.success === true;
    } catch (error) {
      console.error('Google provider verification failed:', error);
      return false;
    }
  }

  async getAvailableModels(): Promise<ModelInfo[]> {
    // Gemini available models (no backend call needed - static list)
    return [
      {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        providerId: this.config.providerId,
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
        providerId: this.config.providerId,
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
        providerId: this.config.providerId,
        capabilities: {
          audio: true,
          vision: true,
          streaming: true,
          functionCalling: true,
          maxTokens: 1000000,
        },
      },
    ];
  }

  async sendMessage(
    messages: ProviderMessage[],
    onChunk?: (chunk: StreamingResponse) => void
  ): Promise<string> {
    const contents = messages.map(msg => {
      const role = msg.role === 'assistant' ? 'model' : 'user';
      
      if (typeof msg.content === 'string') {
        return {
          role,
          parts: [{ text: msg.content }],
        };
      } else {
        return {
          role,
          parts: msg.content,
        };
      }
    });

    // Call backend proxy endpoint instead of using API key directly (Vite proxy handles routing)
    const response = await fetch('/api/gemini/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.model,
        contents,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `Backend returned ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Backend request failed');
    }

    const text = data.data.text || '';

    if (onChunk) {
      onChunk({ text, done: true });
    }

    return text;
  }
}
