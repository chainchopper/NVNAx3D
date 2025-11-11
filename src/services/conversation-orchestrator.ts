/**
 * Conversation Orchestrator Service
 * 
 * Centralizes all AI interaction logic:
 * - Provider interaction (send message, streaming)
 * - RAG memory retrieval and storage
 * - Tool calling via ToolOrchestrator
 * - Dual-persona coordination
 * - Provides clean API for UI components
 */

import { activePersonasManager, PersonaSlot } from './active-personas-manager';
import { providerManager } from './provider-manager';
import { ragMemoryManager } from './memory/rag-memory-manager';
import { dualPersonIManager } from './dual-personi-manager';
import { toolOrchestrator } from './tool-orchestrator';
import { userProfileManager } from './user-profile-manager';
import { cameraVisionService } from './camera-vision-service';
import type { PersoniConfig } from '../personas';
import { getPersoniModel } from '../personas';
import type { BaseProvider } from '../providers/base-provider';
import type { MemoryType } from '../types/memory';
import type { VisionRequestOptions } from '../types/vision';

export interface ConversationOptions {
  ragEnabled?: boolean;
  visionData?: {
    image: string;
    mimeType: string;
  };
  enableTools?: boolean;
  visionRequest?: VisionRequestOptions;
}

export interface StreamChunk {
  text: string;
  isComplete: boolean;
}

type ConversationCallback = (chunk: StreamChunk) => void;
type StatusCallback = (status: string) => void;

export class ConversationOrchestrator {
  private onStatusChange: StatusCallback | null = null;

  /**
   * Set status callback for UI updates
   */
  setStatusCallback(callback: StatusCallback): void {
    this.onStatusChange = callback;
  }

  private updateStatus(status: string): void {
    if (this.onStatusChange) {
      this.onStatusChange(status);
    }
  }

  /**
   * Send user input to active PersonI and get streaming response
   */
  async handleUserInput(
    transcript: string,
    options: ConversationOptions = {},
    onChunk?: ConversationCallback
  ): Promise<void> {
    const { ragEnabled = true, visionData, enableTools = true, visionRequest } = options;

    // Get active persona and provider
    const activePersoni = activePersonasManager.getPrimaryPersona();
    if (!activePersoni) {
      throw new Error('No active PersonI configured');
    }

    const modelId = getPersoniModel(activePersoni, 'conversation');
    const provider = modelId ? providerManager.getProviderInstanceByModelId(modelId) : null;
    
    // GRACEFUL FALLBACK: If no provider configured, still allow conversation with browser-only mode
    if (!provider) {
      this.updateStatus('Provider not configured - using browser voice only');
      console.warn(`[ConversationOrchestrator] No provider for model: ${modelId}. Using browser-only mode.`);
      // Return a friendly message since we can't generate AI responses
      const fallbackMessage = `I'm currently running in browser-only mode. Please configure an AI provider in Settings → Models to enable full conversation capabilities.`;
      if (onChunk) {
        onChunk({ text: fallbackMessage, isComplete: true });
      }
      return;
    }

    this.updateStatus('Thinking...');
    
    // Get vision context if requested
    let visionContext: string | null = null;
    if (visionRequest?.includeVision && activePersoni.capabilities?.vision) {
      const freshnessMs = visionRequest.freshness || 30000;
      const cachedVision = cameraVisionService.getCachedVision(freshnessMs);
      
      if (cachedVision) {
        visionContext = `\n\n[Current Visual Context]: ${cachedVision.summary}`;
        console.log('[ConversationOrchestrator] 👁️ Including vision context');
      } else if (visionRequest.forceNewInference) {
        console.warn('[ConversationOrchestrator] Vision requested but no cached data available');
      }
    }

    try {
      // 1. Retrieve RAG memories if enabled
      let memoryContext = '';
      if (ragEnabled) {
        try {
          console.log('[ConversationOrchestrator] 🔍 Retrieving relevant memories...');
          const relevantMemories = await ragMemoryManager.retrieveRelevantMemories(
            transcript,
            {
              limit: 10,
              threshold: 0.6,
              persona: activePersoni.name,
              memoryType: null,
            }
          );

          if (relevantMemories.length > 0) {
            memoryContext = ragMemoryManager.formatMemoriesForContext(relevantMemories);
            console.log(`[ConversationOrchestrator] 🧠 Found ${relevantMemories.length} relevant memories`);
          }
        } catch (error) {
          console.error('[ConversationOrchestrator] Failed to retrieve memories:', error);
        }
      }

      // 2. Build system instruction with user profile and memory context
      const userContext = userProfileManager.getSystemPromptContext();
      let systemInstruction = userContext
        ? `${activePersoni.systemInstruction}\n\n${userContext}`
        : activePersoni.systemInstruction;

      if (memoryContext) {
        systemInstruction = `${systemInstruction}\n\n## Relevant Past Context:\n${memoryContext}\n\nUse this context to provide more personalized and contextually aware responses.`;
      }
      
      if (visionContext) {
        systemInstruction = `${systemInstruction}\n\n${visionContext}`;
      }

      // 3. Prepare messages
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: transcript },
      ];

      // 4. Send message to provider with streaming
      let fullResponse = '';
      this.updateStatus('Receiving response...');

      await provider.sendMessage(messages, (chunk) => {
        if (chunk.text) {
          fullResponse += chunk.text;
          if (onChunk) {
            onChunk({
              text: chunk.text,
              isComplete: chunk.done || false,
            });
          }
        }
      });

      // 5. Store conversation in RAG memory
      if (ragEnabled) {
        try {
          // Store user message
          await ragMemoryManager.addMemory(
            transcript,
            activePersoni.name,
            'conversation',
            'user',
            5
          );

          // Store AI response
          await ragMemoryManager.addMemory(
            fullResponse,
            activePersoni.name,
            'conversation',
            activePersoni.name,
            5
          );

          console.log('[ConversationOrchestrator] 💾 Stored conversation in memory');
        } catch (error) {
          console.error('[ConversationOrchestrator] Failed to store memories:', error);
        }
      }

      // 6. Update context history in active personas manager
      activePersonasManager.addToContext('primary', 'user', transcript);
      activePersonasManager.addToContext('primary', 'assistant', fullResponse);

      this.updateStatus('Idle');
    } catch (error) {
      console.error('[ConversationOrchestrator] Error:', error);
      this.updateStatus('Error');
      throw error;
    }
  }

  /**
   * Handle dual-mode conversation (two PersonI collaborating)
   */
  async handleDualModeInput(
    transcript: string,
    mode: 'collaborative' | 'debate' | 'teaching',
    options: ConversationOptions = {},
    onChunk?: ConversationCallback
  ): Promise<void> {
    // Check dual mode is properly configured
    const primaryPersona = activePersonasManager.getPrimaryPersona();
    const secondaryPersona = activePersonasManager.getSecondaryPersona();

    if (!primaryPersona || !secondaryPersona) {
      throw new Error('Dual mode requires both primary and secondary PersonI');
    }

    this.updateStatus(`${mode} conversation in progress...`);

    // Use DualPersonIManager to coordinate the conversation
    let fullResponse = '';

    // TODO: Implement dual-persona conversation in DualPersonIManager
    // For now, just use primary persona
    console.warn('[ConversationOrchestrator] Dual-mode conversation not fully implemented yet');
    fullResponse = 'Dual-mode conversation is not yet implemented. Using single PersonI mode.';

    // Store in RAG memory if enabled
    if (options.ragEnabled) {
      try {
        await ragMemoryManager.addMemory(
          transcript,
          `${primaryPersona.name}+${secondaryPersona.name}`,
          'conversation',
          'user',
          5
        );

        await ragMemoryManager.addMemory(
          fullResponse,
          `${primaryPersona.name}+${secondaryPersona.name}`,
          'conversation',
          'ai',
          5
        );
      } catch (error) {
        console.error('[ConversationOrchestrator] Failed to store dual-mode conversation:', error);
      }
    }

    this.updateStatus('Idle');
  }

  /**
   * Switch active PersonI
   */
  async switchPersona(persona: PersoniConfig): Promise<void> {
    const modelId = getPersoniModel(persona, 'conversation');
    const provider = modelId ? providerManager.getProviderInstanceByModelId(modelId) : null;
    if (!provider) {
      throw new Error(`No provider configured for model: ${modelId || 'none'}`);
    }

    activePersonasManager.setPersona('primary', persona);
    console.log(`[ConversationOrchestrator] Switched to PersonI: ${persona.name}`);
  }

  /**
   * Get current active PersonI
   */
  getActivePersona(): PersoniConfig | null {
    return activePersonasManager.getPrimaryPersona();
  }

  /**
   * Get current secondary PersonI (for dual mode)
   */
  getSecondaryPersona(): PersoniConfig | null {
    return activePersonasManager.getSecondaryPersona();
  }

  /**
   * Set secondary PersonI for dual mode
   */
  async setSecondaryPersona(persona: PersoniConfig | null): Promise<void> {
    if (persona) {
      const modelId = getPersoniModel(persona, 'conversation');
      const provider = modelId ? providerManager.getProviderInstanceByModelId(modelId) : null;
      if (!provider) {
        throw new Error(`No provider configured for model: ${modelId || 'none'}`);
      }
      activePersonasManager.setPersona('secondary', persona);
    } else {
      activePersonasManager.setPersona('secondary', null);
    }
  }
}

export const conversationOrchestrator = new ConversationOrchestrator();
