/**
 * Factory for creating provider instances
 */

import { BaseProvider } from './base-provider';
import { GoogleProvider } from './google-provider';
import { OpenAIProvider } from './openai-provider';
import { ProviderType } from '../types/providers';

export class ProviderFactory {
  static createProvider(
    type: ProviderType,
    apiKey: string,
    model: string,
    endpoint?: string
  ): BaseProvider {
    const config = { apiKey, model, endpoint };

    switch (type) {
      case 'google':
        return new GoogleProvider(config);
      case 'openai':
        return new OpenAIProvider(config);
      case 'custom':
        return new OpenAIProvider(config); // Custom uses OpenAI-compatible API
      // TODO: Add other providers
      case 'anthropic':
      case 'xai':
      case 'deepseek':
        throw new Error(`${type} provider not yet implemented`);
      default:
        throw new Error(`Unknown provider type: ${type}`);
    }
  }
}
