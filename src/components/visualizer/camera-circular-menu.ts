/**
 * Camera Circular Menu Component
 * 
 * Radial menu for camera controls with circular icon layout
 * Actions: Camera On/Off (center), Hide Preview, Switch Camera, Object Detection, Snapshot
 */

import { LitElement, css, html, svg, SVGTemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

interface CameraAction {
  id: string;
  label: string;
  icon: () => SVGTemplateResult;
  active?: boolean;
  disabled?: boolean;
}

@customElement('camera-circular-menu')
export class CameraCircularMenu extends LitElement {
  @property({ type: Boolean }) cameraActive = false;
  @property({ type: Boolean }) previewVisible = true;
  @property({ type: Boolean }) detectionActive = false;
  @property({ type: Boolean }) hasPermission = false;
  @property({ type: String }) error: string | null = null;
  
  @state() private expanded = false;
  
  private inactivityTimer: number | null = null;
  private readonly HIDE_DELAY = 5000;

  override willUpdate(changedProps: Map<string, any>): void {
    // Use willUpdate instead of updated to avoid scheduling updates during update cycle
    if (changedProps.has('cameraActive')) {
      const previousValue = changedProps.get('cameraActive');
      if (!this.cameraActive && this.expanded) {
        this.expanded = false;
      } else if (this.cameraActive && !previousValue) {
        this.expanded = true;
      }
    }
  }

  private readonly MENU_ACTIONS: CameraAction[] = [
    {
      id: 'preview',
      label: 'Toggle Preview',
      icon: () => svg`
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      `
    },
    {
      id: 'switch',
      label: 'Switch Camera',
      icon: () => svg`
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
          <path d="M9 13a3 3 0 1 0 6 0"/>
          <path d="M9 13v-2m6 2v-2"/>
        </svg>
      `
    },
    {
      id: 'detection',
      label: 'Object Detection',
      icon: () => svg`
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <path d="M9 9h.01M15 9h.01M9 15h6"/>
        </svg>
      `
    },
    {
      id: 'snapshot',
      label: 'Take Snapshot',
      icon: () => svg`
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
      `
    }
  ];

  static override styles = css`
    :host {
      display: block;
      position: fixed;
      bottom: 300px;
      left: 20px;
      z-index: 250;
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
      border: 2px solid rgba(255, 255, 255, 0.2);
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
      border-color: rgba(255, 255, 255, 0.4);
      transform: translate(-50%, -50%) scale(1.1);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5);
    }

    .center-button.active {
      background: rgba(76, 175, 80, 0.25);
      border-color: rgba(76, 175, 80, 0.6);
      box-shadow: 0 0 20px rgba(76, 175, 80, 0.4);
    }

    .center-button.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .action-button {
      position: absolute;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(10px);
      border: 2px solid rgba(255, 255, 255, 0.15);
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
      border-color: rgba(135, 206, 250, 0.5);
      transform: scale(1.15);
      box-shadow: 0 4px 16px rgba(135, 206, 250, 0.3);
    }

    .action-button.active {
      background: rgba(135, 206, 250, 0.2);
      border-color: rgba(135, 206, 250, 0.6);
      box-shadow: 0 0 16px rgba(135, 206, 250, 0.4);
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
      left: calc(100% + 12px);
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
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .action-button:hover .tooltip {
      opacity: 1;
    }

    .center-button .tooltip {
      top: auto;
      left: auto;
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
    if (!this.hasPermission) {
      console.log('[CameraCircularMenu] Requesting camera permission...');
      this.dispatchEvent(new CustomEvent('request-camera-permission', {
        bubbles: true,
        composed: true,
        detail: {}
      }));
      return;
    }

    if (this.cameraActive) {
      this.expanded = !this.expanded;
    } else {
      console.log('[CameraCircularMenu] Starting camera...');
      this.dispatchEvent(new CustomEvent('camera-start', {
        bubbles: true,
        composed: true,
        detail: {}
      }));
    }
  }

  private handleActionClick(actionId: string): void {
    if (!this.cameraActive) return;
    
    switch (actionId) {
      case 'preview':
        this.dispatchEvent(new CustomEvent('camera-toggle-preview', {
          bubbles: true,
          composed: true
        }));
        break;
      case 'switch':
        this.dispatchEvent(new CustomEvent('camera-switch', {
          bubbles: true,
          composed: true
        }));
        break;
      case 'detection':
        this.dispatchEvent(new CustomEvent('camera-toggle-detection', {
          bubbles: true,
          composed: true
        }));
        break;
      case 'snapshot':
        this.dispatchEvent(new CustomEvent('camera-snapshot', {
          bubbles: true,
          composed: true
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
    const actionsDisabled = !this.cameraActive;

    return html`
      <div class="menu-container">
        <!-- Center Camera Button -->
        <button
          class="center-button ${this.cameraActive ? 'active' : ''}"
          @click=${this.handleCenterClick}
          aria-label="Camera control"
          title="${this.error || ''}"
        >
          ${this.error ? '⚠️' : '📷'}
          <span class="tooltip">
            ${this.error 
              ? this.error 
              : !this.hasPermission
                ? 'Grant Camera Permission'
                : this.cameraActive 
                  ? (this.expanded ? 'Hide Menu' : 'Show Menu') 
                  : 'Start Camera'}
          </span>
        </button>

        <!-- Action Buttons -->
        ${this.MENU_ACTIONS.map((action, index) => {
          const pos = this.calculatePosition(index, this.MENU_ACTIONS.length);
          const visible = this.expanded && this.cameraActive;
          const active = 
            (action.id === 'preview' && this.previewVisible) ||
            (action.id === 'detection' && this.detectionActive);
          
          return html`
            <button
              class="action-button ${visible ? 'visible' : ''} ${active ? 'active' : ''} ${actionsDisabled ? 'disabled' : ''}"
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
    'camera-circular-menu': CameraCircularMenu;
  }
}
