/**
 * Capability Guard Service
 * 
 * Provider-agnostic capability guardrail layer that:
 * - Intercepts all AI feature requests
 * - Checks if required capabilities are available
 * - Returns structured errors with TTS guidance when services are missing
 * - Triggers browser TTS to guide users to configure missing services
 * 
 * CRITICAL: NO provider or model should block functionality.
 * Missing services result in helpful TTS messages, not silent failures.
 */

import { providerManager } from './provider-manager';
import { appStateService } from './app-state-service';
import type { BaseProvider } from '../providers/base-provider';
import type { PersoniConfig } from '../personas';

export interface CapabilityRequest {
  capability: 'conversation' | 'vision' | 'embedding' | 'stt' | 'tts' | 'functionCalling' | 'imageGeneration';
  personaId?: string;
  context?: string; // e.g., "image upload", "voice input", "memory search"
}

export interface CapabilityResponse {
  available: boolean;
  provider?: BaseProvider;
  providerId?: string;
  modelId?: string;
  error?: CapabilityError;
}

export interface CapabilityError {
  capability: string;
  message: string; // Technical message for logs
  userMessage: string; // User-friendly message
  ttsGuidance: string; // Message to speak via TTS
  settingsPath: string; // Where to configure: "Models", "Providers", "Connectors"
  actionRequired: string; // What user needs to do
}

class CapabilityGuard {
  /**
   * Helper to extract modelId and providerId from various format types
   * Validates and normalizes model references, returning null for malformed inputs
   */
  private parseModelReference(
    model: string | { providerId?: string | null; modelId?: string | null } | undefined
  ): { modelId: string; providerId: string | undefined } | null {
    if (!model) return null;

    let modelId: string;
    let providerId: string | undefined;
    
    if (typeof model === 'string') {
      // Normalize: trim whitespace
      const trimmed = model.trim();
      if (!trimmed) return null; // Empty string

      // Legacy format or composite "providerId:::modelId"
      if (trimmed.includes(':::')) {
        const parts = trimmed.split(':::');
        
        // Validate: must have exactly 2 non-empty segments
        if (parts.length !== 2) {
          console.warn(`[CapabilityGuard] Malformed composite model reference: "${model}" (too many delimiters)`);
          return null;
        }

        const [providerPart, modelPart] = parts;
        const trimmedProvider = providerPart?.trim();
        const trimmedModel = modelPart?.trim();

        // Both parts must be non-empty
        if (!trimmedProvider || !trimmedModel) {
          console.warn(`[CapabilityGuard] Malformed composite model reference: "${model}" (empty segments)`);
          return null;
        }

        providerId = trimmedProvider;
        modelId = trimmedModel;
      } else {
        // Legacy format: plain model ID
        modelId = trimmed;
      }
    } else {
      // New object format {providerId?, modelId}
      const trimmedModel = model.modelId?.trim();

      // Validate: modelId is required
      if (!trimmedModel) {
        console.warn(`[CapabilityGuard] Malformed object model reference (missing modelId):`, model);
        return null;
      }

      // providerId is optional (legacy objects may only have modelId)
      const trimmedProvider = model.providerId?.trim();
      providerId = trimmedProvider || undefined;
      modelId = trimmedModel;
    }

    return { modelId, providerId };
  }

  /**
   * Check if a capability is available and get the provider instance
   */
  async checkCapability(request: CapabilityRequest): Promise<CapabilityResponse> {
    const { capability, personaId, context } = request;
    
    // Get active PersonI or use provided ID
    let personi: PersoniConfig | null = null;
    if (personaId) {
      const allPersonis = appStateService.getPersonis();
      personi = allPersonis.find(p => p.id === personaId) || null;
    } else {
      personi = appStateService.getActivePersoni();
    }

    // Build context string for error messages
    const contextStr = context ? ` for ${context}` : '';

    // Check capability-specific requirements
    switch (capability) {
      case 'conversation': {
        const parsed = this.parseModelReference(personi?.models?.conversation);
        if (!parsed) {
          // Check if model was set but malformed
          const rawModel = personi?.models?.conversation;
          if (rawModel) {
            return this.createError(
              'conversation',
              `Malformed conversation model configuration: "${typeof rawModel === 'string' ? rawModel : JSON.stringify(rawModel)}"`,
              'The conversation model configuration is invalid.',
              'The conversation model configuration appears to be malformed or incomplete. Please open Settings, go to PersonI settings, and reconfigure your conversation model selection.',
              'Models',
              'Reconfigure conversation model in PersonI settings'
            );
          }

          return this.createError(
            'conversation',
            `No conversation model configured${contextStr}`,
            'To chat with me, you need to configure a language model.',
            'No conversation model configured. Please open Settings, go to the Models panel, add a provider like OpenAI, Gemini, or a local server like Ollama or LM Studio, then configure a conversation model in your PersonI settings.',
            'Models',
            'Add a provider (OpenAI, Gemini, Ollama, LM Studio, etc.) and select a conversation model'
          );
        }

        const { modelId, providerId } = parsed;

        // Get provider instance - try by providerId first if available
        let provider;
        if (providerId) {
          provider = providerManager.getProviderInstance(providerId);
        } else {
          // Fallback to model ID lookup (legacy)
          provider = providerManager.getProviderInstanceByModelId(modelId);
        }
        
        if (!provider) {
          const providerHint = providerId || 'unknown';
          return this.createError(
            'conversation',
            `Provider for conversation model ${modelId} not available`,
            `The conversation model you selected isn't available.`,
            `The conversation model you selected, ${modelId}, is not currently available. Please check that the ${providerHint} provider is properly configured in Settings under Models.`,
            'Models',
            `Verify ${providerHint} provider is configured and accessible`
          );
        }

        return {
          available: true,
          provider,
          providerId,
          modelId
        };
      }

      case 'vision': {
        const parsed = this.parseModelReference(personi?.models?.vision);
        if (!parsed) {
          const rawModel = personi?.models?.vision;
          if (rawModel) {
            return this.createError(
              'vision',
              `Malformed vision model configuration: "${typeof rawModel === 'string' ? rawModel : JSON.stringify(rawModel)}"`,
              'The vision model configuration is invalid.',
              'The vision model configuration appears to be malformed or incomplete. Please open Settings, go to PersonI settings, and reconfigure your vision model selection.',
              'Models',
              'Reconfigure vision model in PersonI settings'
            );
          }

          return this.createError(
            'vision',
            `No vision model configured${contextStr}`,
            'To analyze images, you need to configure a vision model.',
            'No vision model configured. To analyze images or use camera features, please add a vision-capable model in Settings. You can use GPT-4 Vision, Gemini Vision, or local models like LLaVA or Moondream through LM Studio or vLLM.',
            'Models',
            'Add a vision-capable model (GPT-4V, Gemini, LLaVA, Moondream)'
          );
        }

        const { modelId, providerId } = parsed;
        let provider;
        if (providerId) {
          provider = providerManager.getProviderInstance(providerId);
        } else {
          provider = providerManager.getProviderInstanceByModelId(modelId);
        }
        
        if (!provider) {
          const providerHint = providerId || 'unknown';
          return this.createError(
            'vision',
            `Provider for vision model ${modelId} not available`,
            `The vision model you selected isn't available.`,
            `The vision model ${modelId} is not currently available. Please verify that the ${providerHint} provider is running and properly configured in Settings.`,
            'Models',
            `Verify ${providerHint} provider is running and configured`
          );
        }

        return {
          available: true,
          provider,
          providerId,
          modelId
        };
      }

      case 'embedding': {
        const parsed = this.parseModelReference(personi?.models?.embedding);
        if (!parsed) {
          const rawModel = personi?.models?.embedding;
          if (rawModel) {
            return this.createError(
              'embedding',
              `Malformed embedding model configuration: "${typeof rawModel === 'string' ? rawModel : JSON.stringify(rawModel)}"`,
              'The embedding model configuration is invalid.',
              'The embedding model configuration appears to be malformed or incomplete. Please open Settings, go to PersonI settings, and reconfigure your embedding model selection.',
              'Models',
              'Reconfigure embedding model in PersonI settings'
            );
          }

          return this.createError(
            'embedding',
            `No embedding model configured${contextStr}`,
            'Memory and search features require an embedding model.',
            'Memory features are not available because no embedding model is configured. To enable semantic memory search and RAG features, please add an embedding model like text-embedding-3 from OpenAI or a local embedding model in Settings under Models.',
            'Models',
            'Add an embedding model for memory/RAG features'
          );
        }

        const { modelId, providerId } = parsed;
        let provider;
        if (providerId) {
          provider = providerManager.getProviderInstance(providerId);
        } else {
          provider = providerManager.getProviderInstanceByModelId(modelId);
        }
        
        if (!provider) {
          const providerHint = providerId || 'unknown';
          return this.createError(
            'embedding',
            `Provider for embedding model ${modelId} not available`,
            `The embedding model isn't available.`,
            `The embedding model ${modelId} is not available. Memory features require this to be running. Please check the ${providerHint} provider configuration in Settings.`,
            'Models',
            `Verify ${providerHint} provider is configured`
          );
        }

        return {
          available: true,
          provider,
          providerId,
          modelId
        };
      }

      case 'functionCalling': {
        const parsed = this.parseModelReference(personi?.models?.functionCalling || personi?.models?.conversation);
        if (!parsed) {
          const rawModel = personi?.models?.functionCalling || personi?.models?.conversation;
          if (rawModel) {
            return this.createError(
              'functionCalling',
              `Malformed function calling model configuration: "${typeof rawModel === 'string' ? rawModel : JSON.stringify(rawModel)}"`,
              'The function calling model configuration is invalid.',
              'The function calling model configuration appears to be malformed or incomplete. Please open Settings, go to PersonI settings, and reconfigure your function calling or conversation model selection.',
              'Models',
              'Reconfigure function calling model in PersonI settings'
            );
          }

          return this.createError(
            'functionCalling',
            `No function calling model configured${contextStr}`,
            'Tool use requires a function-calling capable model.',
            'To use tools like sending SMS, checking stocks, or searching email, you need a model that supports function calling. Please configure a function-calling model in Settings. GPT-4, Claude, and Gemini all support this feature.',
            'Models',
            'Add a function-calling capable model (GPT-4, Claude, Gemini)'
          );
        }

        const { modelId, providerId } = parsed;
        let provider;
        if (providerId) {
          provider = providerManager.getProviderInstance(providerId);
        } else {
          provider = providerManager.getProviderInstanceByModelId(modelId);
        }
        
        if (!provider) {
          const providerHint = providerId || 'unknown';
          return this.createError(
            'functionCalling',
            `Provider for function calling model ${modelId} not available`,
            'Function calling model not available.',
            'The function calling model is not currently available. Please verify your provider configuration in Settings under Models.',
            'Models',
            `Verify ${providerHint} provider is configured`
          );
        }

        return {
          available: true,
          provider,
          providerId,
          modelId
        };
      }

      case 'imageGeneration': {
        const parsed = this.parseModelReference(personi?.models?.imageGeneration);
        if (!parsed) {
          const rawModel = personi?.models?.imageGeneration;
          if (rawModel) {
            return this.createError(
              'imageGeneration',
              `Malformed image generation model configuration: "${typeof rawModel === 'string' ? rawModel : JSON.stringify(rawModel)}"`,
              'The image generation model configuration is invalid.',
              'The image generation model configuration appears to be malformed or incomplete. Please open Settings, go to PersonI settings, and reconfigure your image generation model selection.',
              'Models',
              'Reconfigure image generation model in PersonI settings'
            );
          }

          return this.createError(
            'imageGeneration',
            `No image generation model configured${contextStr}`,
            'Image generation requires a configured model.',
            'To generate images, you need to configure an image generation model or ComfyUI endpoint in Settings. You can use DALL-E, Stable Diffusion via ComfyUI, or other image generation services.',
            'Models',
            'Add an image generation model or configure ComfyUI'
          );
        }

        const { modelId, providerId } = parsed;
        let provider;
        if (providerId) {
          provider = providerManager.getProviderInstance(providerId);
        } else {
          provider = providerManager.getProviderInstanceByModelId(modelId);
        }
        
        if (!provider) {
          const providerHint = providerId || 'unknown';
          return this.createError(
            'imageGeneration',
            `Provider for image generation model ${modelId} not available`,
            'Image generation service not available.',
            'The image generation service is not currently available. Please verify your configuration in Settings.',
            'Models',
            `Verify ${providerHint} provider is configured`
          );
        }

        return {
          available: true,
          provider,
          providerId,
          modelId
        };
      }

      case 'stt': {
        // STT has browser fallback (local Whisper), so always available
        // Just check if a provider-based STT is configured for better quality
        return {
          available: true,
          // No provider needed - browser Whisper is the fallback
        };
      }

      case 'tts': {
        // TTS has Web Speech API fallback, so always available
        return {
          available: true,
          // No provider needed - Web Speech API is the fallback
        };
      }

      default:
        return this.createError(
          capability,
          `Unknown capability: ${capability}`,
          'Unknown feature requested.',
          'An unknown feature was requested. This might be a system error.',
          'Help',
          'Contact support or check system logs'
        );
    }
  }

  /**
   * Create a structured error response
   */
  private createError(
    capability: string,
    message: string,
    userMessage: string,
    ttsGuidance: string,
    settingsPath: string,
    actionRequired: string
  ): CapabilityResponse {
    const error: CapabilityError = {
      capability,
      message,
      userMessage,
      ttsGuidance,
      settingsPath,
      actionRequired
    };

    // Log the error
    console.warn(`[CapabilityGuard] ${capability} not available:`, message);

    return {
      available: false,
      error
    };
  }

  /**
   * Announce error via TTS (uses Web Speech API fallback if needed)
   */
  async announceError(error: CapabilityError): Promise<void> {
    try {
      // Use Web Speech API as ultimate fallback
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(error.ttsGuidance);
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        window.speechSynthesis.cancel(); // Cancel any ongoing speech
        window.speechSynthesis.speak(utterance);
      }
    } catch (err) {
      console.error('[CapabilityGuard] Failed to announce error:', err);
    }
  }

  /**
   * Get all missing capabilities for a PersonI
   */
  async getMissingCapabilities(personaId?: string): Promise<CapabilityError[]> {
    const errors: CapabilityError[] = [];
    
    const capabilities: CapabilityRequest['capability'][] = [
      'conversation',
      'vision',
      'embedding',
      'functionCalling',
      'imageGeneration'
    ];

    for (const capability of capabilities) {
      const response = await this.checkCapability({ capability, personaId });
      if (!response.available && response.error) {
        errors.push(response.error);
      }
    }

    return errors;
  }
}

export const capabilityGuard = new CapabilityGuard();
