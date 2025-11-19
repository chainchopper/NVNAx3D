/**
 * CommandRouter Service
 * Handles voice/text commands for controlling ALL app functions
 * Provides LLM function-calling manifest for agentic command execution
 */

import { appStateService, type ActiveSidePanel } from './app-state-service';

export interface CommandResult {
  success: boolean;
  message: string;
  data?: unknown;
}

export interface CommandFunction {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required?: string[];
  };
  handler: (params: Record<string, unknown>) => Promise<CommandResult> | CommandResult;
}

/**
 * CommandRouter - Exposes app control functions for LLM calling
 */
export class CommandRouter {
  private commands: Map<string, CommandFunction> = new Map();

  constructor() {
    this.registerCommands();
    console.log('[CommandRouter] Initialized with', this.commands.size, 'commands');
  }

  /**
   * Register all app control commands
   */
  private registerCommands(): void {
    // Camera Controls
    this.registerCommand({
      name: 'toggle_camera',
      description: 'Turn the camera on or off',
      parameters: {
        type: 'object',
        properties: {
          enabled: {
            type: 'boolean',
            description: 'True to enable camera, false to disable',
          },
        },
      },
      handler: (params) => this.handleToggleCamera(params.enabled as boolean | undefined),
    });

    this.registerCommand({
      name: 'toggle_camera_preview',
      description: 'Show or hide the camera preview overlay',
      parameters: {
        type: 'object',
        properties: {
          visible: {
            type: 'boolean',
            description: 'True to show preview, false to hide',
          },
        },
      },
      handler: (params) => this.handleToggleCameraPreview(params.visible as boolean | undefined),
    });

    this.registerCommand({
      name: 'toggle_object_detection',
      description: 'Start or stop real-time object detection using the camera',
      parameters: {
        type: 'object',
        properties: {
          enabled: {
            type: 'boolean',
            description: 'True to start detection, false to stop',
          },
        },
      },
      handler: (params) => this.handleToggleObjectDetection(params.enabled as boolean | undefined),
    });

    this.registerCommand({
      name: 'analyze_camera_view',
      description: 'Analyze what the camera currently sees using local vision AI (Moondream/LLaVA). Captures frame and answers questions about the image.',
      parameters: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description: 'Question or instruction about the image (e.g., "What do you see?", "Describe this scene", "What objects are present?")',
          },
        },
        required: ['prompt'],
      },
      handler: (params) => this.handleAnalyzeCameraView(params.prompt as string),
    });

    // PersonI Management
    this.registerCommand({
      name: 'switch_personi',
      description: 'Switch to a different AI persona (PersonI)',
      parameters: {
        type: 'object',
        properties: {
          persona_name: {
            type: 'string',
            description: 'Name of the persona to switch to (e.g., NIRVANA, ATHENA, BILLY)',
          },
        },
        required: ['persona_name'],
      },
      handler: (params) => this.handleSwitchPersonI(params.persona_name as string),
    });

    this.registerCommand({
      name: 'enable_dual_mode',
      description: 'Enable dual PersonI mode for multi-AI collaboration',
      parameters: {
        type: 'object',
        properties: {
          primary: {
            type: 'string',
            description: 'Primary persona name',
          },
          secondary: {
            type: 'string',
            description: 'Secondary persona name',
          },
          mode: {
            type: 'string',
            description: 'Collaboration mode',
            enum: ['collaborative', 'debate', 'teaching', 'single'],
          },
        },
      },
      handler: (params) =>
        this.handleEnableDualMode(
          params.primary as string | undefined,
          params.secondary as string | undefined,
          params.mode as string | undefined
        ),
    });

    // UI Panel Controls
    this.registerCommand({
      name: 'open_panel',
      description: 'Open a specific settings or management panel',
      parameters: {
        type: 'object',
        properties: {
          panel: {
            type: 'string',
            description: 'Panel to open',
            enum: [
              'models',
              'personis',
              'notes',
              'tasks',
              'memory',
              'routines',
              'plugins',
              'connectorConfig',
              'telephony',
              'userProfile',
              'help',
            ],
          },
        },
        required: ['panel'],
      },
      handler: (params) => this.handleOpenPanel(params.panel as ActiveSidePanel),
    });

    this.registerCommand({
      name: 'close_panel',
      description: 'Close the currently open panel',
      parameters: {
        type: 'object',
        properties: {},
      },
      handler: () => this.handleClosePanel(),
    });

    // RAG Memory Controls
    this.registerCommand({
      name: 'toggle_rag',
      description: 'Enable or disable RAG (Retrieval-Augmented Generation) memory system',
      parameters: {
        type: 'object',
        properties: {
          enabled: {
            type: 'boolean',
            description: 'True to enable RAG, false to disable',
          },
        },
      },
      handler: (params) => this.handleToggleRAG(params.enabled as boolean | undefined),
    });

    // Content Creation
    this.registerCommand({
      name: 'create_note',
      description: 'Create a new note with title and content',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Note title',
          },
          content: {
            type: 'string',
            description: 'Note content',
          },
        },
        required: ['title', 'content'],
      },
      handler: (params) => this.handleCreateNote(params.title as string, params.content as string),
    });

    this.registerCommand({
      name: 'create_task',
      description: 'Create a new task with description and optional due date',
      parameters: {
        type: 'object',
        properties: {
          description: {
            type: 'string',
            description: 'Task description',
          },
          dueDate: {
            type: 'string',
            description: 'Due date in ISO format (optional)',
          },
        },
        required: ['description'],
      },
      handler: (params) =>
        this.handleCreateTask(params.description as string, params.dueDate as string | undefined),
    });

    // Settings Controls
    this.registerCommand({
      name: 'toggle_settings_menu',
      description: 'Open or close the settings menu',
      parameters: {
        type: 'object',
        properties: {
          visible: {
            type: 'boolean',
            description: 'True to show menu, false to hide',
          },
        },
      },
      handler: (params) => this.handleToggleSettingsMenu(params.visible as boolean | undefined),
    });

    // Voice/Audio Controls
    this.registerCommand({
      name: 'mute_microphone',
      description: 'Mute or unmute the microphone',
      parameters: {
        type: 'object',
        properties: {
          muted: {
            type: 'boolean',
            description: 'True to mute, false to unmute',
          },
        },
      },
      handler: (params) => this.handleMuteMicrophone(params.muted as boolean | undefined),
    });
  }

  private registerCommand(command: CommandFunction): void {
    this.commands.set(command.name, command);
  }

  /**
   * Get function manifest for LLM function calling
   */
  getFunctionManifest(): Array<{
    name: string;
    description: string;
    parameters: CommandFunction['parameters'];
  }> {
    return Array.from(this.commands.values()).map((cmd) => ({
      name: cmd.name,
      description: cmd.description,
      parameters: cmd.parameters,
    }));
  }

  /**
   * Execute a command by name
   */
  async executeCommand(
    commandName: string,
    parameters: Record<string, unknown>
  ): Promise<CommandResult> {
    const command = this.commands.get(commandName);
    if (!command) {
      return {
        success: false,
        message: `Unknown command: ${commandName}`,
      };
    }

    try {
      console.log('[CommandRouter] Executing command:', commandName, parameters);
      const result = await command.handler(parameters);
      console.log('[CommandRouter] Command result:', result);
      return result;
    } catch (error) {
      console.error('[CommandRouter] Command execution failed:', error);
      return {
        success: false,
        message: `Command failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  // ==================== COMMAND HANDLERS ====================

  private handleToggleCamera(enabled?: boolean): CommandResult {
    // Dispatch event for VisualizerShell to handle camera state
    window.dispatchEvent(
      new CustomEvent('command-toggle-camera', { detail: { enabled } })
    );

    return {
      success: true,
      message: enabled !== undefined 
        ? `Camera ${enabled ? 'enabled' : 'disabled'}`
        : 'Camera toggled',
      data: { enabled },
    };
  }

  private handleToggleCameraPreview(visible?: boolean): CommandResult {
    window.dispatchEvent(
      new CustomEvent('command-toggle-camera-preview', { detail: { visible } })
    );

    return {
      success: true,
      message: visible !== undefined
        ? `Camera preview ${visible ? 'shown' : 'hidden'}`
        : 'Camera preview toggled',
      data: { visible },
    };
  }

  private handleToggleObjectDetection(enabled?: boolean): CommandResult {
    // Dispatch event for VisualizerShell to handle
    window.dispatchEvent(
      new CustomEvent('command-toggle-object-detection', { detail: { enabled } })
    );

    return {
      success: true,
      message: `Object detection ${enabled ? 'started' : 'stopped'}`,
      data: { enabled },
    };
  }

  private handleAnalyzeCameraView(prompt: string): CommandResult {
    // Dispatch event for VisualizerShell to handle vision analysis
    window.dispatchEvent(
      new CustomEvent('command-analyze-camera-view', { detail: { prompt } })
    );

    return {
      success: true,
      message: 'Analyzing camera view...',
      data: { prompt },
    };
  }

  private handleSwitchPersonI(personaName: string): CommandResult {
    const normalizedName = personaName.toUpperCase();

    // Dispatch event for VisualizerShell to handle
    window.dispatchEvent(
      new CustomEvent('command-switch-personi', { detail: { personaName: normalizedName } })
    );

    return {
      success: true,
      message: `Switched to ${normalizedName} persona`,
      data: { personaName: normalizedName },
    };
  }

  private handleEnableDualMode(
    primary?: string,
    secondary?: string,
    mode?: string
  ): CommandResult {
    const state = appStateService.getState();
    const primaryPersona = primary ? primary.toUpperCase() : state.activePersoni?.name.toUpperCase() || 'NIRVANA';
    const secondaryPersona = secondary
      ? secondary.toUpperCase()
      : state.secondaryPersoni?.name.toUpperCase() || 'ATHENA';
    const collaborationMode = mode || 'collaborative';

    // Dispatch event for VisualizerShell to handle
    window.dispatchEvent(
      new CustomEvent('command-enable-dual-mode', { 
        detail: { primary: primaryPersona, secondary: secondaryPersona, mode: collaborationMode } 
      })
    );

    return {
      success: true,
      message: `Dual mode enabled: ${primaryPersona} + ${secondaryPersona} (${collaborationMode})`,
      data: { primary: primaryPersona, secondary: secondaryPersona, mode: collaborationMode },
    };
  }

  private handleOpenPanel(panel: ActiveSidePanel): CommandResult {
    appStateService.setActiveSidePanel(panel);
    appStateService.setSettingsMenuVisible(false);

    return {
      success: true,
      message: `Opened ${panel} panel`,
      data: { panel },
    };
  }

  private handleClosePanel(): CommandResult {
    appStateService.setActiveSidePanel('none');

    return {
      success: true,
      message: 'Panel closed',
    };
  }

  private handleToggleRAG(enabled?: boolean): CommandResult {
    // Dispatch event for RAG toggle component to handle
    window.dispatchEvent(
      new CustomEvent('command-toggle-rag', { detail: { enabled } })
    );

    return {
      success: true,
      message: enabled !== undefined
        ? `RAG memory ${enabled ? 'enabled' : 'disabled'}`
        : 'RAG memory toggled',
      data: { enabled },
    };
  }

  private handleCreateNote(title: string, content: string): CommandResult {
    // Dispatch event for NoteManager to handle
    window.dispatchEvent(
      new CustomEvent('command-create-note', { detail: { title, content } })
    );

    return {
      success: true,
      message: `Note "${title}" created`,
      data: { title, content },
    };
  }

  private handleCreateTask(description: string, dueDate?: string): CommandResult {
    // Dispatch event for TaskManager to handle
    window.dispatchEvent(
      new CustomEvent('command-create-task', { detail: { description, dueDate } })
    );

    return {
      success: true,
      message: `Task "${description}" created`,
      data: { description, dueDate },
    };
  }

  private handleToggleSettingsMenu(visible?: boolean): CommandResult {
    const currentState = appStateService.getState().settingsMenuVisible;
    const newState = visible !== undefined ? visible : !currentState;

    appStateService.setSettingsMenuVisible(newState);

    return {
      success: true,
      message: `Settings menu ${newState ? 'opened' : 'closed'}`,
      data: { visible: newState },
    };
  }

  private handleMuteMicrophone(muted?: boolean): CommandResult {
    // Dispatch event for audio system to handle
    window.dispatchEvent(new CustomEvent('command-mute-microphone', { detail: { muted } }));

    return {
      success: true,
      message: `Microphone ${muted ? 'muted' : 'unmuted'}`,
      data: { muted },
    };
  }
}

// Export singleton instance for use across the app
export const commandRouter = new CommandRouter();
