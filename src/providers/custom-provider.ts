import { BaseProvider, ProviderMessage, StreamingResponse, ProviderConfig } from './base-provider';
import { ModelInfo } from '../types/providers';
import { CustomProviderConfig } from '../types/custom-provider';

export class CustomProvider extends BaseProvider {
  public readonly id: string;
  public readonly name: string;
  private baseUrl: string;
  private apiKey?: string;
  private headers: Record<string, string>;
  private capabilities: CustomProviderConfig['capabilities'];

  constructor(config: CustomProviderConfig) {
    super({
      apiKey: config.apiKey,
      endpoint: config.baseUrl,
      model: '',
      providerId: config.id,
      providerType: 'custom',
    });
    
    this.id = config.id;
    this.name = config.name;
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.capabilities = config.capabilities;
    this.headers = {
      'Content-Type': 'application/json',
      ...(config.headers || {}),
    };

    if (this.apiKey) {
      this.headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
  }

  async verify(): Promise<boolean> {
    try {
      await this.discoverModels();
      return true;
    } catch (error) {
      console.error(`[CustomProvider:${this.name}] Verification failed:`, error);
      return false;
    }
  }

  async discoverModels(): Promise<ModelInfo[]> {
    try {
      const url = `${this.baseUrl}/v1/models`;
      const response = await fetch(url, {
        headers: this.headers,
      });

      if (!response.ok) {
        throw new Error(`Model discovery failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      const models: ModelInfo[] = (data.data || data.models || []).map((model: any) => ({
        id: model.id,
        name: model.id,
        providerId: this.id,
        capabilities: this.inferCapabilities(model),
      }));

      return models;
    } catch (error) {
      console.error(`[CustomProvider:${this.name}] Model discovery error:`, error);
      return [];
    }
  }

  private inferCapabilities(model: any) {
    return {
      streaming: this.capabilities.streaming,
      functionCalling: this.capabilities.functionCalling,
      vision: this.capabilities.vision,
    };
  }

  async getAvailableModels(): Promise<ModelInfo[]> {
    return this.discoverModels();
  }

  async sendMessage(
    messages: ProviderMessage[],
    onChunk?: (chunk: StreamingResponse) => void
  ): Promise<string> {
    const shouldStream = !!onChunk && this.capabilities.streaming;

    const requestBody: any = {
      model: this.config.model,
      messages: this.convertMessages(messages),
      temperature: 0.7,
      stream: shouldStream,
    };

    try {
      const url = `${this.baseUrl}/v1/chat/completions`;
      const response = await fetch(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      if (shouldStream && onChunk) {
        return await this.handleStream(response, onChunk);
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || '';

      return text;
    } catch (error) {
      console.error(`[CustomProvider:${this.name}] Generation error:`, error);
      throw error;
    }
  }

  private convertMessages(messages: ProviderMessage[]): any[] {
    return messages.map(msg => ({
      role: msg.role,
      content: typeof msg.content === 'string' 
        ? msg.content 
        : msg.content.map(part => {
            if (part.text) {
              return { type: 'text', text: part.text };
            } else if (part.inlineData) {
              return {
                type: 'image_url',
                image_url: {
                  url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
                }
              };
            }
            return part;
          })
    }));
  }

  private async handleStream(
    response: Response,
    onChunk: (chunk: StreamingResponse) => void
  ): Promise<string> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim() || line.startsWith(':')) continue;
          if (line === 'data: [DONE]') continue;

          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6);
            try {
              const data = JSON.parse(jsonStr);
              const delta = data.choices?.[0]?.delta?.content;
              if (delta) {
                fullText += delta;
                onChunk({ text: delta, done: false });
              }
            } catch (e) {
              console.warn('[CustomProvider] Failed to parse stream chunk:', e);
            }
          }
        }
      }
      
      onChunk({ text: '', done: true });
      return fullText;
    } finally {
      reader.releaseLock();
    }
  }

  supportsStreaming(): boolean {
    return this.capabilities.streaming;
  }

  supportsFunctionCalling(): boolean {
    return this.capabilities.functionCalling;
  }

  supportsVision(): boolean {
    return this.capabilities.vision;
  }
}
