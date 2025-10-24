/**
 * OpenAI provider implementation
 */

import { BaseProvider, ProviderMessage, StreamingResponse } from './base-provider';
import { ModelInfo } from '../types/providers';

export class OpenAIProvider extends BaseProvider {
  async verify(): Promise<boolean> {
    if (!this.config.apiKey) return false;

    try {
      const endpoint = this.config.endpoint || 'https://api.openai.com/v1';
      const response = await fetch(`${endpoint}/models`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error('OpenAI provider verification failed:', error);
      return false;
    }
  }

  async getAvailableModels(): Promise<ModelInfo[]> {
    const endpoint = this.config.endpoint || 'https://api.openai.com/v1';
    
    try {
      const response = await fetch(`${endpoint}/models`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }

      const data = await response.json();
      
      // Filter for chat models
      return data.data
        .filter((model: any) => model.id.includes('gpt'))
        .map((model: any) => ({
          id: model.id,
          name: model.id,
          providerId: 'openai',
          capabilities: {
            vision: model.id.includes('vision') || model.id.includes('gpt-4'),
            streaming: true,
            functionCalling: true,
          },
        }));
    } catch (error) {
      console.error('Failed to get OpenAI models:', error);
      return [];
    }
  }

  async sendMessage(
    messages: ProviderMessage[],
    onChunk?: (chunk: StreamingResponse) => void
  ): Promise<string> {
    const endpoint = this.config.endpoint || 'https://api.openai.com/v1';

    const response = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        stream: !!onChunk,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    if (!onChunk) {
      const data = await response.json();
      return data.choices[0].message.content;
    }

    // Handle streaming
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    if (!reader) {
      throw new Error('No response body');
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        onChunk({ done: true });
        break;
      }

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim() !== '');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content || '';
            if (content) {
              fullText += content;
              onChunk({ text: content, done: false });
            }
          } catch (e) {
            // Skip parsing errors
          }
        }
      }
    }

    return fullText;
  }
}
