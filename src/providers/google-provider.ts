/**
 * Google Gemini provider implementation
 */

import { BaseProvider, ProviderMessage, StreamingResponse } from './base-provider';
import { ModelInfo } from '../types/providers';
import { GoogleGenAI } from '@google/genai';

export class GoogleProvider extends BaseProvider {
  private client: GoogleGenAI | null = null;

  async verify(): Promise<boolean> {
    if (!this.config.apiKey) return false;

    try {
      this.client = new GoogleGenAI({ apiKey: this.config.apiKey });
      
      // Actually verify by making a simple API call
      const response = await this.client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{
          role: 'user',
          parts: [{ text: 'test' }],
        }],
      });

      // If we get here without error, the API key is valid
      return !!response;
    } catch (error) {
      console.error('Google provider verification failed:', error);
      this.client = null;
      return false;
    }
  }

  async getAvailableModels(): Promise<ModelInfo[]> {
    if (!this.client) {
      throw new Error('Provider not initialized');
    }

    // Gemini available models
    return [
      {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        providerId: 'google',
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
        providerId: 'google',
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
        providerId: 'google',
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
    if (!this.client) {
      throw new Error('Provider not initialized');
    }

    // Convert messages to Gemini format
    const contents = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    const response = await this.client.models.generateContent({
      model: this.config.model,
      contents,
    });

    const text = response.text || '';

    if (onChunk) {
      onChunk({ text, done: true });
    }

    return text;
  }
}
