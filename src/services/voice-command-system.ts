/**
 * Voice Command System
 * Hands-free control via voice commands
 */

export interface VoiceCommand {
  pattern: RegExp;
  action: string;
  parameters?: Record<string, any>;
  description: string;
}

export interface CommandMatch {
  command: VoiceCommand;
  matches: RegExpMatchArray;
}

export class VoiceCommandSystem {
  private commands: Map<string, VoiceCommand> = new Map();
  private isListening = false;
  private commandCallback: ((action: string, params: Record<string, any>) => void) | null = null;

  constructor() {
    this.registerDefaultCommands();
  }

  private registerDefaultCommands() {
    this.registerCommand({
      pattern: /(?:hey|hi|hello)\s+(?:nirvana|nervana)/i,
      action: 'wake',
      description: 'Wake word activation'
    });

    this.registerCommand({
      pattern: /switch\s+(?:to\s+)?(?:persona\s+)?(\w+)/i,
      action: 'switch_personi',
      description: 'Switch to a different PersonI'
    });

    this.registerCommand({
      pattern: /(?:activate|load|enable)\s+(\w+)/i,
      action: 'activate_personi',
      description: 'Activate a PersonI'
    });

    this.registerCommand({
      pattern: /(?:mute|unmute|silence)/i,
      action: 'toggle_mute',
      description: 'Toggle mute'
    });

    this.registerCommand({
      pattern: /(?:turn\s+)?(?:camera|video)\s+(on|off)/i,
      action: 'toggle_camera',
      description: 'Control camera'
    });

    this.registerCommand({
      pattern: /(?:show|hide)\s+(?:camera\s+)?preview/i,
      action: 'toggle_preview',
      description: 'Toggle camera preview'
    });

    this.registerCommand({
      pattern: /(?:open|show)\s+(notes|tasks|memory|settings|connectors|models|profile|routines|financial)/i,
      action: 'open_panel',
      description: 'Open a UI panel'
    });

    this.registerCommand({
      pattern: /(?:close|hide)\s+(?:all\s+)?(?:panels?|windows?)/i,
      action: 'close_panels',
      description: 'Close all panels'
    });

    this.registerCommand({
      pattern: /(?:enable|disable)\s+(?:rag|memory)/i,
      action: 'toggle_rag',
      description: 'Toggle RAG memory'
    });

    this.registerCommand({
      pattern: /(?:start|begin|enable)\s+(?:object\s+)?(?:detection|recognition)/i,
      action: 'enable_object_detection',
      description: 'Enable object detection'
    });

    this.registerCommand({
      pattern: /(?:stop|end|disable)\s+(?:object\s+)?(?:detection|recognition)/i,
      action: 'disable_object_detection',
      description: 'Disable object detection'
    });

    this.registerCommand({
      pattern: /(?:increase|raise|turn\s+up)\s+volume/i,
      action: 'volume_up',
      description: 'Increase volume'
    });

    this.registerCommand({
      pattern: /(?:decrease|lower|turn\s+down)\s+volume/i,
      action: 'volume_down',
      description: 'Decrease volume'
    });

    this.registerCommand({
      pattern: /(?:what|identify|recognize)\s+(?:do\s+you\s+)?see/i,
      action: 'describe_vision',
      description: 'Describe what the camera sees'
    });

    this.registerCommand({
      pattern: /take\s+(?:a\s+)?(?:picture|photo|screenshot)/i,
      action: 'take_photo',
      description: 'Capture a photo'
    });

    this.registerCommand({
      pattern: /(?:create|make|add)\s+(?:a\s+)?(?:note|reminder|task)/i,
      action: 'create_item',
      description: 'Create note/reminder/task'
    });
  }

  registerCommand(command: VoiceCommand): void {
    const key = command.pattern.toString();
    this.commands.set(key, command);
  }

  parseCommand(text: string): CommandMatch | null {
    const normalizedText = text.toLowerCase().trim();
    
    for (const [, command] of this.commands) {
      const match = normalizedText.match(command.pattern);
      if (match) {
        return { command, matches: match };
      }
    }
    
    return null;
  }

  extractParameters(match: CommandMatch): Record<string, any> {
    const params: Record<string, any> = { ...match.command.parameters };
    
    if (match.matches.length > 1) {
      match.matches.slice(1).forEach((value, index) => {
        params[`param${index}`] = value;
      });
    }
    
    switch (match.command.action) {
      case 'switch_personi':
      case 'activate_personi':
        if (match.matches[1]) {
          params.personiName = match.matches[1].toUpperCase();
        }
        break;
      
      case 'toggle_camera':
        if (match.matches[1]) {
          params.state = match.matches[1].toLowerCase() === 'on';
        }
        break;
      
      case 'open_panel':
        if (match.matches[1]) {
          params.panelName = match.matches[1].toLowerCase();
        }
        break;
    }
    
    return params;
  }

  startListening(callback: (action: string, params: Record<string, any>) => void): void {
    this.isListening = true;
    this.commandCallback = callback;
    console.log('[VoiceCommands] Started listening for voice commands');
  }

  stopListening(): void {
    this.isListening = false;
    this.commandCallback = null;
    console.log('[VoiceCommands] Stopped listening for voice commands');
  }

  processTranscript(transcript: string): { matched: boolean; action?: string; params?: Record<string, any> } {
    if (!this.isListening) return { matched: false };
    
    const match = this.parseCommand(transcript);
    if (match && this.commandCallback) {
      const params = this.extractParameters(match);
      console.log(`[VoiceCommands] Matched command: ${match.command.action}`, params);
      this.commandCallback(match.command.action, params);
      return { matched: true, action: match.command.action, params };
    }
    
    return { matched: false };
  }

  getAllCommands(): VoiceCommand[] {
    return Array.from(this.commands.values());
  }

  isActive(): boolean {
    return this.isListening;
  }
}

export const voiceCommandSystem = new VoiceCommandSystem();
