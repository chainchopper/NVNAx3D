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
import { agenticReasoningEngine } from './agentic-reasoning-engine';
import { systemContextService } from './system-context-service';
import { capabilityGuard } from './capability-guard';
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

    // Get active persona
    const activePersoni = activePersonasManager.getPrimaryPersona();
    if (!activePersoni) {
      throw new Error('No active PersonI configured');
    }

    // Check conversation capability using CapabilityGuard
    const capabilityCheck = await capabilityGuard.checkCapability({
      capability: 'conversation',
      personaId: activePersoni.id,
      context: 'user message'
    });

    // GRACEFUL FALLBACK: If no provider configured, announce via TTS and return
    if (!capabilityCheck.available) {
      this.updateStatus('No conversation model configured');
      console.warn('[ConversationOrchestrator] Conversation capability not available:', capabilityCheck.error);
      
      // Announce error via TTS
      if (capabilityCheck.error) {
        await capabilityGuard.announceError(capabilityCheck.error);
      }
      
      // Also show text response for UI
      if (onChunk && capabilityCheck.error) {
        onChunk({ text: capabilityCheck.error.userMessage, isComplete: true });
      }
      return;
    }

    // Extract provider from capability check
    const provider = capabilityCheck.provider!;

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
      // AGENTIC REASONING PIPELINE - Execute autonomous actions before conversation
      console.log('[ConversationOrchestrator] 🧠 Starting agentic reasoning pipeline...');
      this.updateStatus('Analyzing intent...');
      
      const perception = await agenticReasoningEngine.perceive(transcript, activePersoni);
      console.log(`[ConversationOrchestrator] 🎯 Intent detected: ${perception.intent}, Sentiment: ${perception.sentiment}`);
      
      this.updateStatus('Planning actions...');
      const reasoning = await agenticReasoningEngine.reason(perception, activePersoni);
      console.log(`[ConversationOrchestrator] 📋 Goal: ${reasoning.goal}, Confidence: ${reasoning.confidence}`);
      
      const actions = await agenticReasoningEngine.planActions(reasoning);
      console.log(`[ConversationOrchestrator] ⚡ Planned ${actions.length} actions`);
      
      // Execute actions if any were planned
      if (actions.length > 0) {
        this.updateStatus('Executing autonomous actions...');
        const results = await agenticReasoningEngine.executeActions(actions, activePersoni);
        const successCount = results.filter(r => r.success).length;
        const failureCount = results.filter(r => !r.success).length;
        console.log(`[ConversationOrchestrator] ✅ Executed ${successCount}/${results.length} actions successfully`);
        
        // Build action summary including both successes and failures
        let actionMessage = '';
        
        if (successCount > 0) {
          const successSummary = results
            .filter(r => r.success)
            .map(r => `✅ ${r.action.type} completed`)
            .join('\n');
          actionMessage += `Autonomous actions completed:\n${successSummary}\n\n`;
        }
        
        if (failureCount > 0) {
          const failureSummary = results
            .filter(r => !r.success)
            .map(r => `⚠️ ${r.action.type} failed: ${r.error || 'Unknown error'}`)
            .join('\n');
          actionMessage += `Action failures:\n${failureSummary}\n\nPlease configure the required connectors in Settings or try rephrasing your request.\n\n`;
        }
        
        // Send action summary to user
        if (actionMessage && onChunk) {
          onChunk({
            text: actionMessage,
            isComplete: false
          });
        }
      }
      
      this.updateStatus('Thinking...');
      
      // 1. Get complete system context for AI awareness
      console.log('[ConversationOrchestrator] 📊 Building complete system context...');
      const systemContext = await systemContextService.getSystemContext(activePersoni);
      const systemContextText = systemContextService.formatContextForPrompt(systemContext);
      console.log('[ConversationOrchestrator] ✅ System context ready');
      
      // 2. Retrieve RAG memories if enabled
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

      // 3. Build system instruction with full context
      let systemInstruction = activePersoni.systemInstruction;
      
      // Add system context (user profile, data snapshots, connector status, etc.)
      systemInstruction = `${systemInstruction}\n\n${systemContextText}`;

      if (memoryContext) {
        systemInstruction = `${systemInstruction}\n\n## Relevant Past Context:\n${memoryContext}\n\nUse this context to provide more personalized and contextually aware responses.`;
      }
      
      if (visionContext) {
        systemInstruction = `${systemInstruction}\n\n${visionContext}`;
      }

      // 4. Prepare messages
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: transcript },
      ];

      // 5. Send message to provider with streaming
      let fullResponse = '';
      let responseComplete = false;
      this.updateStatus('Receiving response...');

      await provider.sendMessage(messages, (chunk) => {
        // Accumulate text if present
        if (chunk.text) {
          fullResponse += chunk.text;
        }
        
        // Track completion status
        if (chunk.done) {
          responseComplete = true;
        }
        
        // Always forward chunk if there's text OR it's the completion signal
        if (onChunk && (chunk.text || chunk.done)) {
          onChunk({
            text: chunk.text || '',
            isComplete: chunk.done || false,
          });
        }
      });

      // Ensure final chunk completion is signaled if not already sent
      if (onChunk && !responseComplete) {
        onChunk({
          text: '',
          isComplete: true,
        });
      }

      // 6. Store conversation in RAG memory
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

      // 7. Update context history in active personas manager
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
    onChunk?: ConversationCallback,
    onPersonISwitch?: (personi: PersoniConfig) => void
  ): Promise<void> {
    const { ragEnabled = true, visionData, enableTools = true } = options;

    // Check dual mode is properly configured
    const primaryPersona = activePersonasManager.getPrimaryPersona();
    const secondaryPersona = activePersonasManager.getSecondaryPersona();

    if (!primaryPersona || !secondaryPersona) {
      throw new Error('Dual mode requires both primary and secondary PersonI');
    }

    // Initialize dual mode in manager if not already active
    if (!dualPersonIManager.isInDualMode()) {
      dualPersonIManager.activateDualMode(primaryPersona, secondaryPersona, mode);
    }

    this.updateStatus(`${mode} conversation in progress...`);
    console.log('[ConversationOrchestrator] 🔀 Dual mode active:', mode);

    // Determine which PersonI should respond
    const activePersonI = dualPersonIManager.getActivePersonI();
    if (!activePersonI) {
      throw new Error('No active PersonI in dual mode');
    }

    const modelId = getPersoniModel(activePersonI, 'conversation');
    const provider = modelId ? providerManager.getProviderInstanceByModelId(modelId) : null;
    
    if (!provider) {
      this.updateStatus('Provider not configured');
      console.warn(`[ConversationOrchestrator] No provider for model: ${modelId}`);
      if (onChunk) {
        onChunk({ 
          text: `${activePersonI.name} needs an AI provider configured to respond.`,
          isComplete: true 
        });
      }
      return;
    }

    try {
      // 1. Retrieve RAG memories if enabled
      let memoryContext = '';
      if (ragEnabled) {
        try {
          const relevantMemories = await ragMemoryManager.retrieveRelevantMemories(
            transcript,
            {
              limit: 8,
              threshold: 0.6,
              persona: `${primaryPersona.name}+${secondaryPersona.name}`,
              memoryType: null,
            }
          );

          if (relevantMemories.length > 0) {
            memoryContext = ragMemoryManager.formatMemoriesForContext(relevantMemories);
            console.log(`[ConversationOrchestrator] 🧠 Found ${relevantMemories.length} dual-mode memories`);
          }
        } catch (error) {
          console.error('[ConversationOrchestrator] Failed to retrieve memories:', error);
        }
      }

      // 2. Build dual-mode system instruction
      const dualPrompt = dualPersonIManager.buildDualPrompt(transcript);
      const userContext = userProfileManager.getSystemPromptContext();
      
      let systemInstruction = activePersonI.systemInstruction;
      if (userContext) {
        systemInstruction = `${systemInstruction}\n\n${userContext}`;
      }
      if (memoryContext) {
        systemInstruction = `${systemInstruction}\n\n## Relevant Past Context:\n${memoryContext}`;
      }

      // Add dual-mode context
      const otherPersonI = dualPersonIManager.getOtherPersonI();
      const conversationContext = dualPersonIManager.getConversationContext(5);
      
      if (conversationContext.length > 0) {
        const contextStr = conversationContext
          .map(turn => `${turn.personi.name}: ${turn.text}`)
          .join('\n');
        systemInstruction = `${systemInstruction}\n\n## Recent Dual-Mode Conversation:\n${contextStr}`;
      }

      // 3. Prepare messages
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: dualPrompt },
      ];

      // 4. Send message to provider with streaming
      let fullResponse = '';
      let responseComplete = false;
      this.updateStatus(`${activePersonI.name} is responding...`);

      await provider.sendMessage(messages, (chunk) => {
        // Accumulate text if present
        if (chunk.text) {
          fullResponse += chunk.text;
        }
        
        // Track completion status
        if (chunk.done) {
          responseComplete = true;
        }
        
        // Always forward chunk if there's text OR it's the completion signal
        if (onChunk && (chunk.text || chunk.done)) {
          onChunk({
            text: chunk.text || '',
            isComplete: chunk.done || false,
          });
        }
      });

      // Ensure final chunk completion is signaled if not already sent
      if (onChunk && !responseComplete) {
        onChunk({
          text: '',
          isComplete: true,
        });
      }

      // 5. Record this turn in dual manager
      const currentSlot = activePersonI === primaryPersona ? 'primary' : 'secondary';
      dualPersonIManager.addTurn(currentSlot, fullResponse);

      // 6. Store conversation in RAG memory
      if (ragEnabled) {
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
            activePersonI.name,
            5
          );

          console.log('[ConversationOrchestrator] 💾 Stored dual-mode conversation');
        } catch (error) {
          console.error('[ConversationOrchestrator] Failed to store dual-mode conversation:', error);
        }
      }

      // 7. Determine if we should switch PersonI for next turn
      if (dualPersonIManager.shouldSwitch()) {
        const nextSlot = dualPersonIManager.switchActiveSlot();
        const nextPersonI = dualPersonIManager.getActivePersonI();
        console.log(`[ConversationOrchestrator] 🔄 Switching to ${nextPersonI?.name} for next turn`);
        
        // Notify UI of the switch to new active PersonI
        if (onPersonISwitch && nextPersonI) {
          onPersonISwitch(nextPersonI);
        }
      }

      this.updateStatus('Idle');
    } catch (error) {
      console.error('[ConversationOrchestrator] Dual-mode error:', error);
      this.updateStatus('Error');
      throw error;
    }
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
