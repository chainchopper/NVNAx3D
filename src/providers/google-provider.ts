/**
 * Google Gemini provider implementation - Backend Proxy Mode
 * All API calls go through backend at http://localhost:3001/api/chat/gemini
 * This keeps API keys secure on the server side
 */

import { BaseProvider, ProviderMessage, StreamingResponse } from './base-provider';
import { ModelInfo } from '../types/providers';

const BACKEND_URL = 'http://localhost:3001';

export class GoogleProvider extends BaseProvider {
  async verify(): Promise<boolean> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/chat/gemini`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemini-2.5-flash',
          messages: [{ role: 'user', content: 'test' }],
          stream: false,
        }),
      });

      if (!response.ok) {
        console.error('Google provider verification failed:', await response.text());
        return false;
      }

      const data = await response.json();
      return data.success && !!data.text;
    } catch (error) {
      console.error('Google provider verification failed:', error);
      return false;
    }
  }

  async getAvailableModels(): Promise<ModelInfo[]> {
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
    const stream = !!onChunk;

    const response = await fetch(`${BACKEND_URL}/api/chat/gemini`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        stream,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${error}`);
    }

    if (stream && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text) {
                fullText += data.text;
              }
              if (onChunk) {
                onChunk(data);
              }
            } catch (e) {
            }
          }
        }
      }

      return fullText;
    } else {
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to generate response');
      }

      if (onChunk) {
        onChunk({ text: data.text, done: true });
      }

      return data.text;
    }
  }

  async generateSpeech(text: string, voice?: string): Promise<string> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/gemini/generate-speech`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          personaVoice: voice,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate speech text');
      }

      const data = await response.json();
      return data.spokenText || text;
    } catch (error) {
      console.error('[GoogleProvider] TTS generation failed:', error);
      return text;
    }
  }
}
