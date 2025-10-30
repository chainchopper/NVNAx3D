/**
 * Dual PersonI Manager
 * Manages two simultaneously active PersonI instances for collaborative AI
 */

import { PersoniConfig } from '../personas';

export type PersonISlot = 'primary' | 'secondary';
export type DualMode = 'single' | 'collaborative' | 'debate' | 'teaching';

export interface DualPersonIState {
  primary: PersoniConfig | null;
  secondary: PersoniConfig | null;
  mode: DualMode;
  isActive: boolean;
}

export interface ConversationTurn {
  slot: PersonISlot;
  personi: PersoniConfig;
  text: string;
  timestamp: number;
}

export class DualPersonIManager {
  private state: DualPersonIState = {
    primary: null,
    secondary: null,
    mode: 'single',
    isActive: false
  };

  private conversationHistory: ConversationTurn[] = [];
  private currentSpeaker: PersonISlot = 'primary';
  private turnCount = 0;

  activateDualMode(primary: PersoniConfig, secondary: PersoniConfig, mode: DualMode = 'collaborative'): void {
    this.state = {
      primary,
      secondary,
      mode,
      isActive: true
    };
    
    this.conversationHistory = [];
    this.currentSpeaker = 'primary';
    this.turnCount = 0;
    
    console.log(`[DualPersonI] Activated dual mode: ${mode}`);
    console.log(`[DualPersonI] Primary: ${primary.name}, Secondary: ${secondary.name}`);
  }

  deactivateDualMode(): void {
    const previousPrimary = this.state.primary;
    
    this.state = {
      primary: previousPrimary,
      secondary: null,
      mode: 'single',
      isActive: false
    };
    
    this.conversationHistory = [];
    this.currentSpeaker = 'primary';
    console.log('[DualPersonI] Deactivated dual mode, restored primary persona');
  }

  switchActiveSlot(): PersonISlot {
    this.currentSpeaker = this.currentSpeaker === 'primary' ? 'secondary' : 'primary';
    return this.currentSpeaker;
  }

  getActivePersonI(): PersoniConfig | null {
    if (!this.state.isActive || this.state.mode === 'single') {
      return this.state.primary;
    }
    return this.currentSpeaker === 'primary' ? this.state.primary : this.state.secondary;
  }

  getOtherPersonI(): PersoniConfig | null {
    if (!this.state.isActive) return null;
    return this.currentSpeaker === 'primary' ? this.state.secondary : this.state.primary;
  }

  addTurn(slot: PersonISlot, text: string): void {
    const personi = slot === 'primary' ? this.state.primary : this.state.secondary;
    if (!personi) return;

    this.conversationHistory.push({
      slot,
      personi,
      text,
      timestamp: Date.now()
    });

    this.turnCount++;
  }

  shouldSwitch(): boolean {
    if (!this.state.isActive || this.state.mode === 'single') return false;

    switch (this.state.mode) {
      case 'collaborative':
        return this.turnCount % 2 === 1;
      
      case 'debate':
        return this.turnCount % 2 === 1;
      
      case 'teaching':
        return this.turnCount % 3 === 0;
      
      default:
        return false;
    }
  }

  getConversationContext(maxTurns: number = 10): ConversationTurn[] {
    return this.conversationHistory.slice(-maxTurns);
  }

  buildDualPrompt(userMessage: string): string {
    const context = this.getConversationContext(5);
    const activePersonI = this.getActivePersonI();
    const otherPersonI = this.getOtherPersonI();
    
    if (!activePersonI || !otherPersonI || this.state.mode === 'single') {
      return userMessage;
    }

    let systemPrompt = '';
    
    switch (this.state.mode) {
      case 'collaborative':
        systemPrompt = `You are ${activePersonI.name}, collaborating with ${otherPersonI.name} to help the user. Build on their insights and provide complementary information.`;
        break;
      
      case 'debate':
        systemPrompt = `You are ${activePersonI.name}, engaging in a friendly debate with ${otherPersonI.name}. Present your perspective respectfully while acknowledging theirs.`;
        break;
      
      case 'teaching':
        if (this.currentSpeaker === 'primary') {
          systemPrompt = `You are ${activePersonI.name}, teaching alongside ${otherPersonI.name}. Explain concepts clearly and set up opportunities for ${otherPersonI.name} to provide examples.`;
        } else {
          systemPrompt = `You are ${activePersonI.name}, assisting ${otherPersonI.name} in teaching. Provide concrete examples and practical applications of the concepts they explain.`;
        }
        break;
    }

    if (context.length > 0) {
      const recentContext = context.map(turn => 
        `${turn.personi.name}: ${turn.text}`
      ).join('\n');
      
      return `${systemPrompt}\n\nRecent conversation:\n${recentContext}\n\nUser: ${userMessage}`;
    }

    return `${systemPrompt}\n\nUser: ${userMessage}`;
  }

  getState(): DualPersonIState {
    return { ...this.state };
  }

  isInDualMode(): boolean {
    return this.state.isActive;
  }

  getCurrentMode(): DualMode {
    return this.state.mode;
  }

  setMode(mode: DualMode): void {
    this.state.mode = mode;
    console.log(`[DualPersonI] Mode changed to: ${mode}`);
  }
}

export const dualPersonIManager = new DualPersonIManager();
