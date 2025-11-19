/**
 * RAG Settings Circular Menu Component
 * 
 * Radial menu for RAG memory controls with circular icon layout
 * Actions: RAG On/Off (center), Retrieval Context, History, Events, System Context
 */

import { LitElement, css, html, svg, SVGTemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

interface RAGAction {
  id: string;
  label: string;
  icon: () => SVGTemplateResult;
  active?: boolean;
  disabled?: boolean;
}

@customElement('rag-settings-menu')
export class RAGSettingsMenu extends LitElement {
  @property({ type: Boolean }) enabled = true;
  @property({ type: Boolean }) initialized = false;
  @property({ type: Number }) lastRetrievedCount = 0;
  
  // RAG configuration toggles
  @property({ type: Boolean }) includeHistory = true;
  @property({ type: Boolean }) includeEvents = true;
  @property({ type: Boolean }) includeSystemContext = true;
  
  @state() private expanded = false;
  
  private inactivityTimer: number | null = null;
  private readonly HIDE_DELAY = 5000;
  private lastClickTime = 0;
  private readonly DOUBLE_CLICK_DELAY = 300; // ms

  override willUpdate(changedProps: Map<string, any>): void {
    if (changedProps.has('enabled')) {
      const previousValue = changedProps.get('enabled');
      if (!this.enabled && this.expanded) {
        this.expanded = false;
      } else if (this.enabled && !previousValue) {
        this.expanded = true;
      }
    }
  }

  private readonly MENU_ACTIONS: RAGAction[] = [
    {
      id: 'context',
      label: 'Retrieval Context',
      icon: () => svg`
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 6v6l4 2"/>
        </svg>
      `
    },
    {
      id: 'history',
      label: 'Include History',
      icon: () => svg`
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
          <path d="M21 3v5h-5"/>
          <path d="M12 7v5l3 3"/>
        </svg>
      `
    },
    {
      id: 'events',
      label: 'Include Events',
      icon: () => svg`
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <path d="M16 2v4M8 2v4M3 10h18"/>
        </svg>
      `
    },
    {
      id: 'system',
      label: 'System Context',
      icon: () => svg`
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 1v6m0 6v6M5.6 5.6l4.2 4.2m4.4 4.4l4.2 4.2m0-13.6l-4.2 4.2m-4.4 4.4l-4.2 4.2"/>
        </svg>
      `
    }
  ];

  static override styles = css`
    :host {
      display: block;
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 150;
      user-select: none;
      transition: opacity 0.5s ease-out;
    }
    
    :host([hidden]) {
      opacity: 0;
      pointer-events: none;
    }

    .menu-container {
      position: relative;
      width: 220px;
      height: 220px;
    }

    .center-button {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(12px);
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
      font-size: 24px;
    }

    .center-button:hover {
      background: rgba(0, 0, 0, 0.95);
      transform: translate(-50%, -50%) scale(1.1);
      box-shadow: 0 0 24px rgba(135, 206, 250, 0.5);
    }

    .center-button.active {
      background: rgba(76, 175, 80, 0.25);
      box-shadow: 0 0 20px rgba(76, 175, 80, 0.6);
    }

    .center-button.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .memory-count {
      position: absolute;
      top: -8px;
      right: -8px;
      font-size: 10px;
      padding: 2px 6px;
      background: rgba(76, 175, 80, 0.3);
      border-radius: 10px;
      color: #4CAF50;
      border: 1px solid rgba(76, 175, 80, 0.5);
      font-weight: 600;
      min-width: 20px;
      text-align: center;
    }

    .action-button {
      position: absolute;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(10px);
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      opacity: 0;
      transform: scale(0);
      pointer-events: none;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
    }

    .action-button.visible {
      opacity: 1;
      transform: scale(1);
      pointer-events: auto;
    }

    .action-button:hover {
      background: rgba(0, 0, 0, 0.95);
      transform: scale(1.15);
      box-shadow: 0 0 20px rgba(135, 206, 250, 0.5);
    }

    .action-button.active {
      background: rgba(135, 206, 250, 0.2);
      box-shadow: 0 0 16px rgba(135, 206, 250, 0.6);
    }

    .action-button.disabled {
      opacity: 0.3;
      cursor: not-allowed;
      pointer-events: none;
    }

    .action-button svg {
      width: 20px;
      height: 20px;
      color: #fff;
    }

    .action-button.active svg {
      color: #87CEFA;
    }

    .tooltip {
      position: absolute;
      top: 50%;
      right: calc(100% + 12px);
      transform: translateY(-50%);
      background: rgba(0, 0, 0, 0.95);
      color: white;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s ease;
      border: none;
    }

    .action-button:hover .tooltip {
      opacity: 1;
    }

    .center-button .tooltip {
      top: auto;
      right: auto;
      bottom: calc(100% + 12px);
      left: 50%;
      transform: translateX(-50%);
    }

    .center-button:hover .tooltip {
      opacity: 1;
    }
  `;

  private calculatePosition(index: number, total: number): { x: number; y: number } {
    const radius = 85;
    const angle = (360 / total) * index - 90;
    const angleRad = (angle * Math.PI) / 180;
    const x = Math.cos(angleRad) * radius;
    const y = Math.sin(angleRad) * radius;
    return { x, y };
  }

  private handleCenterClick(): void {
    if (!this.initialized) {
      console.log('[RAGSettingsMenu] RAG not initialized');
      return;
    }

    const now = Date.now();
    const timeSinceLastClick = now - this.lastClickTime;
    const isDoubleClick = timeSinceLastClick < this.DOUBLE_CLICK_DELAY;
    this.lastClickTime = now;

    if (isDoubleClick) {
      // Double-click: toggle RAG on/off
      const newState = !this.enabled;
      console.log(`[RAGSettingsMenu] ${newState ? 'Enabling' : 'Disabling'} RAG...`);
      this.dispatchEvent(new CustomEvent('rag-toggle', {
        bubbles: true,
        composed: true,
        detail: { enabled: newState }
      }));
      this.expanded = false; // Collapse when toggling
    } else if (this.enabled) {
      // Single click while enabled: expand/collapse menu
      this.expanded = !this.expanded;
    } else {
      // Single click while disabled: enable RAG
      console.log('[RAGSettingsMenu] Enabling RAG...');
      this.dispatchEvent(new CustomEvent('rag-toggle', {
        bubbles: true,
        composed: true,
        detail: { enabled: true }
      }));
    }
  }

  private handleActionClick(actionId: string): void {
    if (!this.enabled) return;
    
    switch (actionId) {
      case 'context':
        // Open retrieval context settings
        this.dispatchEvent(new CustomEvent('rag-open-context-settings', {
          bubbles: true,
          composed: true
        }));
        break;
      case 'history':
        this.includeHistory = !this.includeHistory;
        this.dispatchEvent(new CustomEvent('rag-toggle-history', {
          bubbles: true,
          composed: true,
          detail: { enabled: this.includeHistory }
        }));
        break;
      case 'events':
        this.includeEvents = !this.includeEvents;
        this.dispatchEvent(new CustomEvent('rag-toggle-events', {
          bubbles: true,
          composed: true,
          detail: { enabled: this.includeEvents }
        }));
        break;
      case 'system':
        this.includeSystemContext = !this.includeSystemContext;
        this.dispatchEvent(new CustomEvent('rag-toggle-system-context', {
          bubbles: true,
          composed: true,
          detail: { enabled: this.includeSystemContext }
        }));
        break;
    }
  }

  private resetInactivityTimer(): void {
    if (this.inactivityTimer !== null) {
      window.clearTimeout(this.inactivityTimer);
    }
    
    this.removeAttribute('hidden');
    
    this.inactivityTimer = window.setTimeout(() => {
      this.setAttribute('hidden', '');
    }, this.HIDE_DELAY);
  }

  private handleUserActivity = (): void => {
    this.resetInactivityTimer();
  };

  override connectedCallback(): void {
    super.connectedCallback();
    
    document.addEventListener('mousemove', this.handleUserActivity);
    document.addEventListener('mousedown', this.handleUserActivity);
    document.addEventListener('keydown', this.handleUserActivity);
    document.addEventListener('touchstart', this.handleUserActivity);
    
    this.resetInactivityTimer();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    
    document.removeEventListener('mousemove', this.handleUserActivity);
    document.removeEventListener('mousedown', this.handleUserActivity);
    document.removeEventListener('keydown', this.handleUserActivity);
    document.removeEventListener('touchstart', this.handleUserActivity);
    
    if (this.inactivityTimer !== null) {
      window.clearTimeout(this.inactivityTimer);
    }
  }

  override render() {
    const centerIcon = this.enabled ? '🧠' : '💤';
    const centerTooltip = this.initialized 
      ? (this.enabled ? 'Click to configure, Double-click to disable' : 'Click to enable RAG')
      : 'RAG Not Initialized';
    const actionsDisabled = !this.enabled;

    return html`
      <div class="menu-container">
        <!-- Center toggle button -->
        <button
          class="center-button ${this.enabled ? 'active' : ''} ${!this.initialized ? 'disabled' : ''}"
          @click=${this.handleCenterClick}
          aria-label="RAG Memory control"
        >
          ${centerIcon}
          ${this.enabled && this.lastRetrievedCount > 0 ? html`
            <span class="memory-count">${this.lastRetrievedCount}</span>
          ` : ''}
          <span class="tooltip">${centerTooltip}</span>
        </button>

        <!-- Radial action buttons -->
        ${this.MENU_ACTIONS.map((action, index) => {
          const pos = this.calculatePosition(index, this.MENU_ACTIONS.length);
          let isActive = false;
          
          switch (action.id) {
            case 'history': isActive = this.includeHistory; break;
            case 'events': isActive = this.includeEvents; break;
            case 'system': isActive = this.includeSystemContext; break;
          }
          const visible = this.expanded && this.enabled;
          
          return html`
            <button
              class="action-button ${visible ? 'visible' : ''} ${isActive ? 'active' : ''} ${actionsDisabled ? 'disabled' : ''}"
              style="left: calc(50% + ${pos.x}px - 24px); top: calc(50% + ${pos.y}px - 24px);"
              @click=${() => this.handleActionClick(action.id)}
              aria-label="${action.label}"
            >
              ${action.icon()}
              <span class="tooltip">${action.label}</span>
            </button>
          `;
        })}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'rag-settings-menu': RAGSettingsMenu;
  }
}
