/**
 * Active Personas Manager
 * Manages dual-slot PersonI system with independent providers and state
 */

import { PersoniConfig } from '../personas';
import { BaseProvider } from '../providers/base-provider';
import { providerManager } from './provider-manager';
import { ragMemoryManager } from './memory/rag-memory-manager';

const ACTIVE_PERSONAS_KEY = 'nirvana-active-personas';
const CONTEXT_HISTORY_KEY = 'nirvana-context-history';

export type PersonaSlot = 'primary' | 'secondary';

export interface SlotState {
  persona: PersoniConfig | null;
  provider: BaseProvider | null;
  status: 'idle' | 'thinking' | 'speaking' | 'error';
  contextHistory: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
}

export interface AudioQueueItem {
  slot: PersonaSlot;
  text: string;
  priority: number;
  timestamp: number;
}

export type PersonaEventType = 'speaking' | 'thinking' | 'toolCall' | 'error' | 'statusChange';

export interface PersonaEvent {
  slot: PersonaSlot;
  type: PersonaEventType;
  data?: any;
}

type EventListener = (event: PersonaEvent) => void;

export class ActivePersonasManager {
  private slots: Map<PersonaSlot, SlotState>;
  private audioQueue: AudioQueueItem[] = [];
  private currentSpeaker: PersonaSlot | null = null;
  private eventListeners: EventListener[] = [];
  private isProcessingQueue = false;

  constructor() {
    this.slots = new Map([
      ['primary', this.createEmptySlot()],
      ['secondary', this.createEmptySlot()],
    ]);
    this.loadFromStorage();
  }

  private createEmptySlot(): SlotState {
    return {
      persona: null,
      provider: null,
      status: 'idle',
      contextHistory: [],
    };
  }

  public addEventListener(listener: EventListener): void {
    this.eventListeners.push(listener);
  }

  public removeEventListener(listener: EventListener): void {
    this.eventListeners = this.eventListeners.filter(l => l !== listener);
  }

  private emitEvent(event: PersonaEvent): void {
    this.eventListeners.forEach(listener => listener(event));
  }

  private loadFromStorage(): void {
    try {
      const saved = localStorage.getItem(ACTIVE_PERSONAS_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.primary) {
          this.setPersona('primary', data.primary);
        }
        if (data.secondary) {
          this.setPersona('secondary', data.secondary);
        }
      }

      const historySaved = localStorage.getItem(CONTEXT_HISTORY_KEY);
      if (historySaved) {
        const historyData = JSON.parse(historySaved);
        const primarySlot = this.slots.get('primary');
        const secondarySlot = this.slots.get('secondary');
        
        if (primarySlot && historyData.primary) {
          primarySlot.contextHistory = historyData.primary;
        }
        if (secondarySlot && historyData.secondary) {
          secondarySlot.contextHistory = historyData.secondary;
        }
      }
    } catch (error) {
      console.error('[ActivePersonasManager] Failed to load from storage:', error);
    }
  }

  private saveToStorage(): void {
    try {
      const data = {
        primary: this.slots.get('primary')?.persona || null,
        secondary: this.slots.get('secondary')?.persona || null,
      };
      localStorage.setItem(ACTIVE_PERSONAS_KEY, JSON.stringify(data));

      const historyData = {
        primary: this.slots.get('primary')?.contextHistory || [],
        secondary: this.slots.get('secondary')?.contextHistory || [],
      };
      localStorage.setItem(CONTEXT_HISTORY_KEY, JSON.stringify(historyData));
    } catch (error) {
      console.error('[ActivePersonasManager] Failed to save to storage:', error);
    }
  }

  public setPersona(slot: PersonaSlot, persona: PersoniConfig | null): void {
    const slotState = this.slots.get(slot);
    if (!slotState) return;

    if (slotState.provider) {
      this.destroyProvider(slot);
    }

    slotState.persona = persona;
    slotState.status = 'idle';

    if (persona) {
      const provider = this.initializeProvider(persona);
      slotState.provider = provider;
      
      if (!provider) {
        slotState.status = 'error';
        this.emitEvent({ 
          slot, 
          type: 'error', 
          data: { message: 'Failed to initialize provider' } 
        });
      }
    } else {
      slotState.provider = null;
    }

    this.saveToStorage();
    this.emitEvent({ slot, type: 'statusChange', data: { status: slotState.status } });
  }

  private initializeProvider(persona: PersoniConfig): BaseProvider | null {
    const modelId = persona.thinkingModel;
    const availableModels = providerManager.getAvailableModels();
    const modelInfo = availableModels.find(m => m.id === modelId);
    
    if (!modelInfo) {
      console.warn(`[ActivePersonasManager] Model "${modelId}" not found in any configured provider`);
      return null;
    }
    
    return providerManager.getProviderInstance(modelInfo.providerId, modelId);
  }

  private destroyProvider(slot: PersonaSlot): void {
    const slotState = this.slots.get(slot);
    if (!slotState) return;

    slotState.provider = null;
  }

  public getPersona(slot: PersonaSlot): PersoniConfig | null {
    return this.slots.get(slot)?.persona || null;
  }

  public getProvider(slot: PersonaSlot): BaseProvider | null {
    return this.slots.get(slot)?.provider || null;
  }

  public getStatus(slot: PersonaSlot): SlotState['status'] {
    return this.slots.get(slot)?.status || 'idle';
  }

  public setStatus(slot: PersonaSlot, status: SlotState['status']): void {
    const slotState = this.slots.get(slot);
    if (!slotState) return;
    
    slotState.status = status;
    this.emitEvent({ slot, type: 'statusChange', data: { status } });
  }

  public getContextHistory(slot: PersonaSlot): Array<{ role: 'user' | 'assistant' | 'system'; content: string }> {
    return this.slots.get(slot)?.contextHistory || [];
  }

  public addToContext(slot: PersonaSlot, role: 'user' | 'assistant' | 'system', content: string): void {
    const slotState = this.slots.get(slot);
    if (!slotState) return;

    slotState.contextHistory.push({ role, content });
    
    const maxHistory = 50;
    if (slotState.contextHistory.length > maxHistory) {
      slotState.contextHistory = slotState.contextHistory.slice(-maxHistory);
    }
    
    this.saveToStorage();
  }

  public clearContext(slot: PersonaSlot): void {
    const slotState = this.slots.get(slot);
    if (!slotState) return;
    
    slotState.contextHistory = [];
    this.saveToStorage();
  }

  public hasActivePersonas(): boolean {
    return this.slots.get('primary')?.persona !== null || 
           this.slots.get('secondary')?.persona !== null;
  }

  public getPrimaryPersona(): PersoniConfig | null {
    return this.getPersona('primary');
  }

  public getSecondaryPersona(): PersoniConfig | null {
    return this.getPersona('secondary');
  }

  public isSingleMode(): boolean {
    return this.getSecondaryPersona() === null;
  }

  public isDualMode(): boolean {
    return !this.isSingleMode();
  }

  public queueAudio(slot: PersonaSlot, text: string, priority: number = 0): void {
    const item: AudioQueueItem = {
      slot,
      text,
      priority,
      timestamp: Date.now(),
    };

    this.audioQueue.push(item);
    this.audioQueue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.timestamp - b.timestamp;
    });

    if (!this.isProcessingQueue) {
      this.processAudioQueue();
    }
  }

  private async processAudioQueue(): Promise<void> {
    if (this.isProcessingQueue || this.audioQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.audioQueue.length > 0) {
      const item = this.audioQueue.shift();
      if (!item) break;

      const slotState = this.slots.get(item.slot);
      if (!slotState || !slotState.persona) continue;

      this.currentSpeaker = item.slot;
      this.setStatus(item.slot, 'speaking');
      this.emitEvent({ 
        slot: item.slot, 
        type: 'speaking', 
        data: { text: item.text } 
      });

      await new Promise(resolve => {
        const estimatedDuration = item.text.length * 50;
        setTimeout(resolve, estimatedDuration);
      });

      this.setStatus(item.slot, 'idle');
      this.currentSpeaker = null;
    }

    this.isProcessingQueue = false;
  }

  public getCurrentSpeaker(): PersonaSlot | null {
    return this.currentSpeaker;
  }

  public interruptSpeech(): void {
    this.audioQueue = [];
    this.currentSpeaker = null;
    this.isProcessingQueue = false;
    
    ['primary', 'secondary'].forEach(slot => {
      const slotState = this.slots.get(slot as PersonaSlot);
      if (slotState && slotState.status === 'speaking') {
        slotState.status = 'idle';
        this.emitEvent({ 
          slot: slot as PersonaSlot, 
          type: 'statusChange', 
          data: { status: 'idle' } 
        });
      }
    });
  }

  public getSharedMemoryManager() {
    return ragMemoryManager;
  }

  public async addMemoryForSlot(
    slot: PersonaSlot, 
    text: string, 
    speaker: 'user' | 'ai', 
    type: 'conversation' | 'fact' = 'conversation',
    importance: number = 5
  ): Promise<void> {
    const persona = this.getPersona(slot);
    if (!persona) return;

    try {
      await ragMemoryManager.addMemory(text, speaker, type, persona.name, importance);
    } catch (error) {
      console.error(`[ActivePersonasManager] Failed to add memory for ${slot}:`, error);
    }
  }

  public async queryMemoryForSlot(
    slot: PersonaSlot,
    query: string,
    limit: number = 5
  ): Promise<any[]> {
    const persona = this.getPersona(slot);
    if (!persona) return [];

    try {
      const results = await ragMemoryManager.retrieveRelevantMemories(query, {
        limit,
        threshold: 0.6,
        persona: persona.name
      });
      return results.map(r => r.memory);
    } catch (error) {
      console.error(`[ActivePersonasManager] Failed to query memory for ${slot}:`, error);
      return [];
    }
  }

  public getSlotByPersonaName(name: string): PersonaSlot | null {
    const primary = this.getPersona('primary');
    const secondary = this.getPersona('secondary');

    if (primary?.name === name) return 'primary';
    if (secondary?.name === name) return 'secondary';
    return null;
  }

  public switchSlots(): void {
    const primarySlot = this.slots.get('primary');
    const secondarySlot = this.slots.get('secondary');
    
    if (!primarySlot || !secondarySlot) return;

    const tempPersona = primarySlot.persona;
    const tempProvider = primarySlot.provider;
    const tempHistory = primarySlot.contextHistory;

    primarySlot.persona = secondarySlot.persona;
    primarySlot.provider = secondarySlot.provider;
    primarySlot.contextHistory = secondarySlot.contextHistory;

    secondarySlot.persona = tempPersona;
    secondarySlot.provider = tempProvider;
    secondarySlot.contextHistory = tempHistory;

    this.saveToStorage();
    this.emitEvent({ slot: 'primary', type: 'statusChange', data: { status: primarySlot.status } });
    this.emitEvent({ slot: 'secondary', type: 'statusChange', data: { status: secondarySlot.status } });
  }

  public clear(): void {
    ['primary', 'secondary'].forEach(slot => {
      this.setPersona(slot as PersonaSlot, null);
      this.clearContext(slot as PersonaSlot);
    });
    this.audioQueue = [];
    this.currentSpeaker = null;
  }
}

export const activePersonasManager = new ActivePersonasManager();
