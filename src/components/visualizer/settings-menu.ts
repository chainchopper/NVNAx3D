/**
 * Radial Settings Menu Component
 * 
 * Arc-shaped menu with 9 menu items organized by category:
 * - User: Profile
 * - AI: Models, PersonI
 * - Productivity: Tasks, Notes, Memory, Routines
 * - System: Plugins, Connectors
 */

import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

export type MenuItem = 
  | 'userProfile'
  | 'models'
  | 'personis'
  | 'connectorConfig'
  | 'notes'
  | 'tasks'
  | 'memory'
  | 'routines'
  | 'plugins'
  | 'telephony'
  | 'help';

@customElement('settings-menu')
export class SettingsMenu extends LitElement {
  @property({ type: Boolean, reflect: true }) visible = false;
  @property({ type: Number }) fabX = 0;
  @property({ type: Number }) fabY = 0;

  static override styles = css`
    :host {
      display: block;
      position: fixed;
      z-index: 99;
      pointer-events: none;
    }
    
    :host([visible]) {
      pointer-events: all;
    }

    .menu-item {
      pointer-events: all;
      position: absolute;
      bottom: 0;
      right: 0;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: rgba(25, 22, 30, 0.85);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      cursor: pointer;
      transition: transform 0.3s ease-out, opacity 0.3s ease-out, 
                  background 0.2s ease, border-color 0.2s ease, 
                  box-shadow 0.2s ease;
      opacity: 0;
      transform: translate(0, 0);
      outline: none;
    }

    :host([visible]) .menu-item {
      opacity: 1;
    }

    .menu-item:hover {
      background: rgba(135, 206, 250, 0.2);
      border-color: rgba(135, 206, 250, 0.6);
      box-shadow: 0 0 15px rgba(135, 206, 250, 0.3);
      transform: scale(1.1) var(--arc-position);
    }

    .menu-item:focus {
      background: rgba(135, 206, 250, 0.25);
      border-color: rgba(135, 206, 250, 0.8);
      box-shadow: 0 0 20px rgba(135, 206, 250, 0.5);
    }

    .menu-item:active {
      transform: scale(0.95) var(--arc-position);
    }

    /* Category color coding */
    .menu-item.group-user {
      border-color: rgba(135, 206, 250, 0.3);
    }

    .menu-item.group-ai {
      border-color: rgba(156, 39, 176, 0.3);
    }

    .menu-item.group-productivity {
      border-color: rgba(76, 175, 80, 0.3);
    }

    .menu-item.group-system {
      border-color: rgba(255, 152, 0, 0.3);
    }

    /* Arc positions - 9 items in arc */
    :host([visible]) .menu-item:nth-child(1) {
      --arc-position: translate(-90px, -10px);
      transform: var(--arc-position);
      transition-delay: 0.1s;
    }
    :host([visible]) .menu-item:nth-child(2) {
      --arc-position: translate(-70px, -70px);
      transform: var(--arc-position);
      transition-delay: 0.2s;
    }
    :host([visible]) .menu-item:nth-child(3) {
      --arc-position: translate(-10px, -90px);
      transform: var(--arc-position);
      transition-delay: 0.3s;
    }
    :host([visible]) .menu-item:nth-child(4) {
      --arc-position: translate(50px, -90px);
      transform: var(--arc-position);
      transition-delay: 0.4s;
    }
    :host([visible]) .menu-item:nth-child(5) {
      --arc-position: translate(90px, -50px);
      transform: var(--arc-position);
      transition-delay: 0.5s;
    }
    :host([visible]) .menu-item:nth-child(6) {
      --arc-position: translate(90px, 10px);
      transform: var(--arc-position);
      transition-delay: 0.6s;
    }
    :host([visible]) .menu-item:nth-child(7) {
      --arc-position: translate(70px, 70px);
      transform: var(--arc-position);
      transition-delay: 0.7s;
    }
    :host([visible]) .menu-item:nth-child(8) {
      --arc-position: translate(10px, 90px);
      transform: var(--arc-position);
      transition-delay: 0.8s;
    }
    :host([visible]) .menu-item:nth-child(9) {
      --arc-position: translate(-50px, 90px);
      transform: var(--arc-position);
      transition-delay: 0.9s;
    }

    svg {
      width: 32px;
      height: 32px;
    }
  `;

  override render() {
    return html`
      <!-- User Profile -->
      <div
        class="menu-item group-user"
        title="User Profile - Manage your personal information and preferences"
        role="button"
        tabindex="0"
        @click=${() => this.handleClick('userProfile')}
        @keydown=${(e: KeyboardEvent) => this.handleKeydown(e, 'userProfile')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <circle cx="12" cy="10" r="3"></circle>
          <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"></path>
        </svg>
      </div>

      <!-- Models Configuration -->
      <div
        class="menu-item group-ai"
        title="Models - Configure AI providers and speech-to-text"
        role="button"
        tabindex="0"
        @click=${() => this.handleClick('models')}
        @keydown=${(e: KeyboardEvent) => this.handleKeydown(e, 'models')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
          <line x1="12" y1="22.08" x2="12" y2="12"></line>
        </svg>
      </div>

      <!-- PersonI Management -->
      <div
        class="menu-item group-ai"
        title="PersonI - Manage AI personas and their personalities"
        role="button"
        tabindex="0"
        @click=${() => this.handleClick('personis')}
        @keydown=${(e: KeyboardEvent) => this.handleKeydown(e, 'personis')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      </div>

      <!-- Connectors -->
      <div
        class="menu-item group-ai"
        title="Connectors - Configure API credentials for external services"
        role="button"
        tabindex="0"
        @click=${() => this.handleClick('connectorConfig')}
        @keydown=${(e: KeyboardEvent) => this.handleKeydown(e, 'connectorConfig')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72"></path>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72"></path>
        </svg>
      </div>

      <!-- Notes -->
      <div
        class="menu-item group-productivity"
        title="Notes - Create and manage your notes"
        role="button"
        tabindex="0"
        @click=${() => this.handleClick('notes')}
        @keydown=${(e: KeyboardEvent) => this.handleKeydown(e, 'notes')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      </div>

      <!-- Tasks -->
      <div
        class="menu-item group-productivity"
        title="Tasks - Track and manage your tasks"
        role="button"
        tabindex="0"
        @click=${() => this.handleClick('tasks')}
        @keydown=${(e: KeyboardEvent) => this.handleKeydown(e, 'tasks')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 11l3 3L22 4"></path>
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
        </svg>
      </div>

      <!-- Memory Management -->
      <div
        class="menu-item group-productivity"
        title="Memory - View and manage conversation memory"
        role="button"
        tabindex="0"
        @click=${() => this.handleClick('memory')}
        @keydown=${(e: KeyboardEvent) => this.handleKeydown(e, 'memory')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20z"></path>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      </div>

      <!-- Routines -->
      <div
        class="menu-item group-productivity"
        title="Routines - Create and manage automation routines"
        role="button"
        tabindex="0"
        @click=${() => this.handleClick('routines')}
        @keydown=${(e: KeyboardEvent) => this.handleKeydown(e, 'routines')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      </div>

      <!-- Plugins -->
      <div
        class="menu-item group-system"
        title="Plugins - Manage PersonI-generated UI components"
        role="button"
        tabindex="0"
        @click=${() => this.handleClick('plugins')}
        @keydown=${(e: KeyboardEvent) => this.handleKeydown(e, 'plugins')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="9" y1="9" x2="15" y2="15"></line>
          <line x1="15" y1="9" x2="9" y2="15"></line>
        </svg>
      </div>

      <!-- Telephony -->
      <div
        class="menu-item group-system"
        title="Telephony - Configure SMS and voice calls (Twilio/FreePBX)"
        role="button"
        tabindex="0"
        @click=${() => this.handleClick('telephony')}
        @keydown=${(e: KeyboardEvent) => this.handleKeydown(e, 'telephony')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
        </svg>
      </div>

      <!-- Help -->
      <div
        class="menu-item group-system"
        title="Help - Comprehensive documentation and guides"
        role="button"
        tabindex="0"
        @click=${() => this.handleClick('help')}
        @keydown=${(e: KeyboardEvent) => this.handleKeydown(e, 'help')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      </div>
    `;
  }

  private handleClick(item: MenuItem): void {
    this.dispatchEvent(new CustomEvent('menu-item-click', {
      detail: { item },
      bubbles: true,
      composed: true
    }));
  }

  private handleKeydown(e: KeyboardEvent, item: MenuItem): void {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.handleClick(item);
    }
  }
}
