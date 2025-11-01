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
    options?: { tools?: any[], systemInstruction?: string, onChunk?: (chunk: StreamingResponse) => void } | ((chunk: StreamingResponse) => void)
  ): Promise<string | { text: string, functionCalls: any[] }> {
    // Handle backward compat: options can be a function (onChunk) or an object
    const onChunk = typeof options === 'function' ? options : options?.onChunk;
    const tools = typeof options === 'object' && options ? options.tools : undefined;
    const systemInstruction = typeof options === 'object' && options ? options.systemInstruction : undefined;
    
    // Filter out system messages and extract system instruction
    let extractedSystemInstruction = systemInstruction;
    const contents = messages
      .filter(msg => {
        if (msg.role === 'system') {
          // Extract system instruction from system message
          if (!extractedSystemInstruction && typeof msg.content === 'string') {
            extractedSystemInstruction = msg.content;
          }
          return false; // Don't include system messages in contents
        }
        return true;
      })
      .map(msg => {
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

    // Build request payload
    const requestPayload: any = {
      model: this.config.model,
      contents,
    };

    // Add systemInstruction if provided
    if (extractedSystemInstruction) {
      requestPayload.systemInstruction = extractedSystemInstruction;
    }

    // Add tools if provided
    if (tools && tools.length > 0) {
      requestPayload.tools = [{ functionDeclarations: tools }];
    }

    // Call backend proxy endpoint instead of using API key directly (Vite proxy handles routing)
    const response = await fetch('/api/gemini/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestPayload),
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
    const functionCalls = data.data.functionCalls || [];

    if (onChunk) {
      onChunk({ text, done: true });
    }

    // Return both text and functionCalls if there are function calls
    if (functionCalls.length > 0) {
      return { text, functionCalls };
    }

    return text;
  }
}
