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
      z-index: 1000;
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
      padding: 24px;
      color: white;
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
      
      // Panel IDs managed by this dock
      const dockManagedPanels = ['main-menu', 'models', 'personis', 'notes', 'tasks', 'memory', 'profile', 'calendar'];
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
    // Map panel IDs to their configurations
    const panels: Record<string, PanelView> = {
      'main-menu': {
        id: 'main-menu',
        title: 'Settings',
        content: this.renderMainMenu(),
      },
      'models': {
        id: 'models',
        title: 'AI Models',
        content: html`<div>AI Models panel coming soon...</div>`,
      },
      'personis': {
        id: 'personis',
        title: 'PersonI',
        content: html`<div>PersonI panel coming soon...</div>`,
      },
      'notes': {
        id: 'notes',
        title: 'Notes',
        content: html`<div>Notes panel coming soon...</div>`,
      },
      'tasks': {
        id: 'tasks',
        title: 'Tasks',
        content: html`<div>Tasks panel coming soon...</div>`,
      },
      'memory': {
        id: 'memory',
        title: 'Memory',
        content: html`<div>Memory panel coming soon...</div>`,
      },
      'profile': {
        id: 'profile',
        title: 'Profile',
        content: html`<div>Profile panel coming soon...</div>`,
      },
      'calendar': {
        id: 'calendar',
        title: 'Calendar',
        content: html`<div>Calendar panel coming soon...</div>`,
      },
    };

    return panels[panelId] || null;
  }

  /**
   * Render main menu navigation
   */
  private renderMainMenu() {
    const menuItems = [
      { id: 'models', label: 'AI Models', icon: '🤖' },
      { id: 'personis', label: 'PersonI', icon: '👤' },
      { id: 'notes', label: 'Notes', icon: '📝' },
      { id: 'tasks', label: 'Tasks', icon: '✅' },
      { id: 'memory', label: 'Memory', icon: '🧠' },
      { id: 'profile', label: 'Profile', icon: '👨' },
      { id: 'calendar', label: 'Calendar', icon: '📅' },
    ];

    return html`
      <style>
        .menu-items {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .menu-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 20px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .menu-item:hover {
          background: rgba(135, 206, 250, 0.15);
          border-color: rgba(135, 206, 250, 0.3);
          transform: translateX(4px);
        }

        .menu-item-icon {
          font-size: 24px;
        }

        .menu-item-label {
          font-size: 16px;
          font-weight: 500;
          color: white;
        }

        .menu-item-arrow {
          margin-left: auto;
          color: rgba(135, 206, 250, 0.6);
          font-size: 18px;
        }
      </style>

      <div class="menu-items">
        ${menuItems.map(item => html`
          <div class="menu-item" @click=${() => this.handleMenuItemClick(item.id)}>
            <span class="menu-item-icon">${item.icon}</span>
            <span class="menu-item-label">${item.label}</span>
            <span class="menu-item-arrow">→</span>
          </div>
        `)}
      </div>
    `;
  }

  private handleMenuItemClick(itemId: string): void {
    // Update AppState to show the selected panel
    appStateService.setActiveSidePanel(itemId as any);
  }

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
