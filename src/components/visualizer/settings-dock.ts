/**
 * Settings Dock - Right-side docked panel system
 * 
 * Features:
 * - Slides in from right edge
 * - Multi-layer navigation with stack (back arrow when depth > 1)
 * - X button to close completely
 * - Click-outside-to-close with overlay
 * - Escape key to close
 * - Glass-morphism aesthetic
 */

import { LitElement, css, html } from 'lit';
import { customElement, state, property } from 'lit/decorators.js';
import { gsap } from 'gsap';
import { appStateService } from '../../services/app-state-service';

interface PanelView {
  id: string;
  title: string;
  content: any; // HTML template or component
}

@customElement('settings-dock')
export class SettingsDock extends LitElement {
  @property({ type: Boolean, reflect: true }) visible = false;
  @state() private navigationStack: PanelView[] = [];
  
  private unsubscribeAppState: (() => void) | null = null;
  private overlayElement: HTMLElement | null = null;
  private dockElement: HTMLElement | null = null;

  static override styles = css`
    :host {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      z-index: 200; /* Above panels, primary settings layer */
      pointer-events: none;
    }

    :host([visible]) {
      pointer-events: auto;
    }

    /* Transparent overlay for click-outside-to-close */
    .overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: transparent;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease;
    }

    :host([visible]) .overlay {
      opacity: 1;
      pointer-events: auto;
    }

    /* Docked panel */
    .dock {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      width: clamp(320px, 28vw, 420px);
      background: rgba(25, 22, 30, 0.92);
      backdrop-filter: blur(20px);
      border-left: 1px solid rgba(255, 255, 255, 0.15);
      box-shadow: -4px 0 24px rgba(0, 0, 0, 0.4);
      display: flex;
      flex-direction: column;
      transform: translateX(100%);
      pointer-events: auto;
    }

    /* Header */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(135, 206, 250, 0.05);
      min-height: 70px;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .back-button {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #87CEFA;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 18px;
    }

    .back-button:hover {
      background: rgba(135, 206, 250, 0.15);
      border-color: rgba(135, 206, 250, 0.4);
      transform: translateX(-2px);
    }

    .title {
      font-size: 20px;
      font-weight: 600;
      color: white;
      letter-spacing: 0.5px;
    }

    .close-button {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #87CEFA;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 20px;
    }

    .close-button:hover {
      background: rgba(255, 100, 100, 0.2);
      border-color: rgba(255, 100, 100, 0.4);
      color: #FF6B6B;
    }

    /* Content area */
    .content {
      flex: 1;
      overflow-y: auto;
      padding: 0;
      color: white;
      max-height: 100%;
      display: flex;
      flex-direction: column;
    }

    /* Custom scrollbar */
    .content::-webkit-scrollbar {
      width: 8px;
    }

    .content::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.05);
    }

    .content::-webkit-scrollbar-thumb {
      background: rgba(135, 206, 250, 0.3);
      border-radius: 4px;
    }

    .content::-webkit-scrollbar-thumb:hover {
      background: rgba(135, 206, 250, 0.5);
    }
  `;

  override connectedCallback(): void {
    super.connectedCallback();
    
    // Subscribe to AppState
    this.unsubscribeAppState = appStateService.subscribe(() => {
      // Get full state from service (events only emit partial payloads)
      const state = appStateService.getState();
      
      // Panel IDs managed by this dock (all panels now opened via radial menu)
      const dockManagedPanels = ['models', 'personis', 'tts', 'notes', 'tasks', 'memory', 'userProfile', 'routines', 'plugins', 'connectorConfig', 'help', 'telephony', 'device', 'vision', 'comfyui'];
      const isDockManaged = dockManagedPanels.includes(state.activeSidePanel);
      
      if (isDockManaged) {
        // Dock-managed panel requested - open/navigate to it
        this.openPanel(state.activeSidePanel);
      } else if (state.activeSidePanel === 'none' && this.visible) {
        // Explicit close request
        this.close();
      } else if (!isDockManaged && this.visible) {
        // Non-dock panel requested while dock is open - close dock
        this.close();
      }
    });

    // Listen for Escape key
    document.addEventListener('keydown', this.handleKeyDown);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.unsubscribeAppState?.();
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  override firstUpdated(): void {
    this.overlayElement = this.shadowRoot?.querySelector('.overlay') as HTMLElement;
    this.dockElement = this.shadowRoot?.querySelector('.dock') as HTMLElement;
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this.visible) {
      this.close();
    }
  };

  private handleOverlayClick = (): void => {
    this.close();
  };

  private handleBackClick = (): void => {
    if (this.navigationStack.length > 1) {
      // Pop current panel and go back to previous
      this.navigationStack = this.navigationStack.slice(0, -1);
      
      // Sync AppState with the new top panel
      const newTopPanel = this.navigationStack[this.navigationStack.length - 1];
      appStateService.setActiveSidePanel(newTopPanel.id as any);
      
      this.requestUpdate();
    }
  };

  private handleCloseClick = (): void => {
    this.close();
  };

  /**
   * Open a panel by ID (push to navigation stack)
   */
  private openPanel(panelId: string): void {
    const panelView = this.getPanelView(panelId);
    
    if (!panelView) {
      console.warn('[SettingsDock] Unknown panel ID:', panelId);
      return;
    }

    // If dock is not visible, this is a fresh open - replace stack
    if (!this.visible) {
      this.navigationStack = [panelView];
      this.show();
      return;
    }
    
    // If dock is visible, check if we're navigating to a different panel
    const currentPanel = this.navigationStack[this.navigationStack.length - 1];
    
    if (currentPanel?.id === panelId) {
      // Same panel - do nothing (prevent duplicates)
      return;
    }
    
    // Different panel - push onto stack for back navigation
    this.navigationStack = [...this.navigationStack, panelView];
    this.requestUpdate();
  }

  /**
   * Push a new panel onto the navigation stack (for multi-layer navigation)
   */
  public pushPanel(panelId: string, title: string, content: any): void {
    this.navigationStack = [...this.navigationStack, { id: panelId, title, content }];
    this.requestUpdate();
  }

  /**
   * Get panel view configuration by ID
   */
  private getPanelView(panelId: string): PanelView | null {
    // Map panel IDs to their configurations (using actual existing panel components)
    const panels: Record<string, PanelView> = {
      'models': {
        id: 'models',
        title: 'AI Models',
        content: html`<models-panel @close=${this.handlePanelCloseRequest}></models-panel>`,
      },
      'personis': {
        id: 'personis',
        title: 'PersonI Settings',
        content: html`<personi-settings-panel @close=${this.handlePanelCloseRequest}></personi-settings-panel>`,
      },
      'tts': {
        id: 'tts',
        title: 'Text-to-Speech',
        content: html`<chatterbox-settings @close=${this.handlePanelCloseRequest}></chatterbox-settings>`,
      },
      'notes': {
        id: 'notes',
        title: 'Notes',
        content: html`<notes-panel @close=${this.handlePanelCloseRequest}></notes-panel>`,
      },
      'tasks': {
        id: 'tasks',
        title: 'Tasks',
        content: html`<tasks-panel @close=${this.handlePanelCloseRequest}></tasks-panel>`,
      },
      'memory': {
        id: 'memory',
        title: 'Memory',
        content: html`<memory-panel @close=${this.handlePanelCloseRequest}></memory-panel>`,
      },
      'userProfile': {
        id: 'userProfile',
        title: 'User Profile',
        content: html`<user-profile-panel @close=${this.handlePanelCloseRequest}></user-profile-panel>`,
      },
      'routines': {
        id: 'routines',
        title: 'Routines',
        content: html`<routines-panel @close=${this.handlePanelCloseRequest}></routines-panel>`,
      },
      'plugins': {
        id: 'plugins',
        title: 'Plugins',
        content: html`<plugin-manager-panel @close=${this.handlePanelCloseRequest}></plugin-manager-panel>`,
      },
      'connectorConfig': {
        id: 'connectorConfig',
        title: 'Connectors',
        content: html`<connector-config-panel @close=${this.handlePanelCloseRequest}></connector-config-panel>`,
      },
      'telephony': {
        id: 'telephony',
        title: 'Telephony',
        content: html`<telephony-settings-panel @close=${this.handlePanelCloseRequest}></telephony-settings-panel>`,
      },
      'device': {
        id: 'device',
        title: 'Device Settings',
        content: html`<device-settings-panel @close=${this.handlePanelCloseRequest}></device-settings-panel>`,
      },
      'help': {
        id: 'help',
        title: 'NIRVANA HELP AND DOCUMENTATION',
        content: html`<help-panel @close=${this.handlePanelCloseRequest}></help-panel>`,
      },
      'vision': {
        id: 'vision',
        title: 'Vision AI',
        content: html`<vision-panel @close=${this.handlePanelCloseRequest}></vision-panel>`,
      },
      'comfyui': {
        id: 'comfyui',
        title: 'Image Generation',
        content: html`<comfyui-settings-panel @close=${this.handlePanelCloseRequest}></comfyui-settings-panel>`,
      },
    };

    return panels[panelId] || null;
  }

  /**
   * Handle close request from panel components
   */
  private handlePanelCloseRequest = (): void => {
    this.close();
  };


  /**
   * Show the dock with slide-in animation
   */
  private show(): void {
    this.visible = true;
    
    this.updateComplete.then(() => {
      if (this.dockElement) {
        gsap.to(this.dockElement, {
          x: 0,
          duration: 0.4,
          ease: 'power3.out',
        });
      }
    });
  }

  /**
   * Close the dock with slide-out animation
   */
  private close(): void {
    if (!this.dockElement) return;

    gsap.to(this.dockElement, {
      x: '100%',
      duration: 0.3,
      ease: 'power2.in',
      onComplete: () => {
        this.visible = false;
        this.navigationStack = [];
        appStateService.setActiveSidePanel('none');
      },
    });
  }

  override render() {
    const currentPanel = this.navigationStack[this.navigationStack.length - 1];
    const showBackButton = this.navigationStack.length > 1;

    return html`
      <div class="overlay" @click=${this.handleOverlayClick}></div>
      
      <div class="dock" @click=${(e: Event) => e.stopPropagation()}>
        <div class="header">
          <div class="header-left">
            ${showBackButton ? html`
              <button class="back-button" @click=${this.handleBackClick} title="Back">
                ←
              </button>
            ` : ''}
            <div class="title">${currentPanel?.title || 'Settings'}</div>
          </div>
          <button class="close-button" @click=${this.handleCloseClick} title="Close">
            ×
          </button>
        </div>
        
        <div class="content">
          ${currentPanel?.content || html`<div>Select a menu item</div>`}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'settings-dock': SettingsDock;
  }
}
