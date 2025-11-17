/**
 * Dual-Mode Controls HUD Component
 * 
 * Controls for multi-AI collaboration:
 * - Toggle dual mode on/off
 * - Select secondary PersonI
 * - Switch between collaboration modes (collaborative, debate, teaching, single)
 */

import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { appStateService } from '../../services/app-state-service';
import type { PersoniConfig } from '../../personas';

type DualMode = 'collaborative' | 'debate' | 'teaching' | 'single';

@customElement('dual-mode-controls-hud')
export class DualModeControlsHUD extends LitElement {
  @state() private dualModeEnabled = false;
  @state() private secondaryPersoni: PersoniConfig | null = null;
  @state() private personis: PersoniConfig[] = [];
  @state() private activePersoni: PersoniConfig | null = null;
  @state() private currentMode: DualMode = 'single';
  
  private unsubscribeAppState: (() => void) | null = null;
  private inactivityTimer: number | null = null;
  private readonly HIDE_DELAY = 5000;

  static override styles = css`
    :host {
      display: block;
      position: fixed;
      top: 90px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 150;
      pointer-events: none;
      transition: opacity 0.5s ease-out;
    }

    :host(.hidden) {
      opacity: 0;
    }

    .controls-container {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 16px;
      background: rgba(10, 14, 39, 0.7);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 40px;
      box-shadow: 0 6px 24px rgba(0, 0, 0, 0.25);
      pointer-events: all;
    }

    .toggle-button {
      padding: 6px 14px;
      border-radius: 20px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 0.7);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
      user-select: none;
    }

    .toggle-button:hover {
      background: rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 0.9);
    }

    .toggle-button.active {
      background: rgba(135, 206, 250, 0.25);
      border-color: rgba(135, 206, 250, 0.5);
      color: #87CEFA;
    }

    .mode-selector {
      display: flex;
      gap: 6px;
      padding: 4px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 20px;
    }

    .mode-button {
      padding: 4px 12px;
      border-radius: 16px;
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.6);
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
    }

    .mode-button:hover {
      color: rgba(255, 255, 255, 0.8);
      background: rgba(255, 255, 255, 0.05);
    }

    .mode-button.active {
      background: rgba(135, 206, 250, 0.2);
      color: #87CEFA;
    }

    .secondary-selector {
      position: relative;
    }

    select {
      padding: 6px 12px;
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 0.8);
      font-size: 13px;
      cursor: pointer;
      outline: none;
      transition: all 0.2s ease;
    }

    select:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.2);
    }

    select option {
      background: #1a1e2e;
      color: white;
    }

    .divider {
      width: 1px;
      height: 20px;
      background: rgba(255, 255, 255, 0.1);
    }
  `;

  override connectedCallback(): void {
    super.connectedCallback();
    this.subscribeToAppState();
    
    document.addEventListener('mousemove', this.handleUserActivity);
    document.addEventListener('mousedown', this.handleUserActivity);
    document.addEventListener('keydown', this.handleUserActivity);
    document.addEventListener('touchstart', this.handleUserActivity);
    
    this.resetInactivityTimer();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.unsubscribeAppState) {
      this.unsubscribeAppState();
    }
    
    document.removeEventListener('mousemove', this.handleUserActivity);
    document.removeEventListener('mousedown', this.handleUserActivity);
    document.removeEventListener('keydown', this.handleUserActivity);
    document.removeEventListener('touchstart', this.handleUserActivity);
    
    if (this.inactivityTimer !== null) {
      window.clearTimeout(this.inactivityTimer);
    }
  }

  private resetInactivityTimer() {
    if (this.inactivityTimer !== null) {
      window.clearTimeout(this.inactivityTimer);
    }
    
    this.classList.remove('hidden');
    
    this.inactivityTimer = window.setTimeout(() => {
      this.classList.add('hidden');
    }, this.HIDE_DELAY);
  }

  private handleUserActivity = () => {
    this.resetInactivityTimer();
  };

  private subscribeToAppState(): void {
    this.unsubscribeAppState = appStateService.subscribe(() => {
      this.dualModeEnabled = appStateService.isDualModeEnabled();
      this.secondaryPersoni = appStateService.getSecondaryPersoni();
      this.personis = appStateService.getPersonis();
      this.activePersoni = appStateService.getActivePersoni();
    });
    
    // Initial sync
    this.dualModeEnabled = appStateService.isDualModeEnabled();
    this.secondaryPersoni = appStateService.getSecondaryPersoni();
    this.personis = appStateService.getPersonis();
    this.activePersoni = appStateService.getActivePersoni();
  }

  private handleToggleDualMode(): void {
    appStateService.setDualModeEnabled(!this.dualModeEnabled);
  }

  private handleModeChange(mode: DualMode): void {
    this.currentMode = mode;
    // TODO: Integrate with actual dual-mode conversation manager
  }

  private handleSecondaryChange(e: Event): void {
    const select = e.target as HTMLSelectElement;
    const personiId = select.value;
    const personi = this.personis.find(p => p.id === personiId);
    appStateService.setSecondaryPersoni(personi || null);
  }

  override render() {
    // Don't show if no personas available
    if (this.personis.length < 2) {
      return html``;
    }

    return html`
      <div class="controls-container">
        <!-- Dual Mode Toggle -->
        <div
          class="toggle-button ${this.dualModeEnabled ? 'active' : ''}"
          @click=${this.handleToggleDualMode}
          title="Enable/disable dual-AI mode"
        >
          ${this.dualModeEnabled ? '◉ Dual Mode' : '○ Dual Mode'}
        </div>

        ${this.dualModeEnabled
          ? html`
              <div class="divider"></div>

              <!-- Mode Selector -->
              <div class="mode-selector">
                <button
                  class="mode-button ${this.currentMode === 'collaborative' ? 'active' : ''}"
                  @click=${() => this.handleModeChange('collaborative')}
                  title="Collaborative mode"
                >
                  Collaborate
                </button>
                <button
                  class="mode-button ${this.currentMode === 'debate' ? 'active' : ''}"
                  @click=${() => this.handleModeChange('debate')}
                  title="Debate mode"
                >
                  Debate
                </button>
                <button
                  class="mode-button ${this.currentMode === 'teaching' ? 'active' : ''}"
                  @click=${() => this.handleModeChange('teaching')}
                  title="Teaching mode"
                >
                  Teach
                </button>
              </div>

              <div class="divider"></div>

              <!-- Secondary PersonI Selector -->
              <div class="secondary-selector">
                <select @change=${this.handleSecondaryChange}>
                  <option value="">Select 2nd PersonI</option>
                  ${this.personis
                    .filter(p => p.id !== this.activePersoni?.id)
                    .map(
                      (personi) => html`
                        <option
                          value="${personi.id}"
                          ?selected=${this.secondaryPersoni?.id === personi.id}
                        >
                          ${personi.name}
                        </option>
                      `
                    )}
                </select>
              </div>
            `
          : ''}
      </div>
    `;
  }
}
