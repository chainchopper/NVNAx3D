/**
 * Persona Carousel HUD Component
 * 
 * Displays PersonI list in a horizontal carousel with active selection,
 * allows switching between personas and creating new ones.
 */

import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { appStateService } from '../../services/app-state-service';
import { activePersonasManager } from '../../services/active-personas-manager';
import type { PersoniConfig } from '../../personas';

@customElement('persona-carousel-hud')
export class PersonaCarouselHUD extends LitElement {
  @state() private personis: PersoniConfig[] = [];
  @state() private activePersoni: PersoniConfig | null = null;
  
  private unsubscribeAppState: (() => void) | null = null;

  static override styles = css`
    :host {
      display: block;
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 50;
      pointer-events: none;
    }

    .carousel-container {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 20px;
      background: rgba(10, 14, 39, 0.75);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 50px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      pointer-events: all;
    }

    .persona-chip {
      padding: 8px 16px;
      border-radius: 24px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 0.7);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
      user-select: none;
    }

    .persona-chip:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(135, 206, 250, 0.4);
      color: rgba(255, 255, 255, 0.9);
      transform: translateY(-2px);
    }

    .persona-chip.active {
      background: rgba(135, 206, 250, 0.2);
      border-color: rgba(135, 206, 250, 0.6);
      color: #87CEFA;
      box-shadow: 0 0 15px rgba(135, 206, 250, 0.3);
    }

    .persona-chip.create {
      background: rgba(76, 175, 80, 0.15);
      border-color: rgba(76, 175, 80, 0.4);
      color: rgba(76, 175, 80, 0.9);
    }

    .persona-chip.create:hover {
      background: rgba(76, 175, 80, 0.25);
      border-color: rgba(76, 175, 80, 0.6);
    }

    .persona-avatar {
      display: inline-block;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      margin-right: 8px;
      vertical-align: middle;
      object-fit: cover;
    }
    
    .persona-avatar.has-image {
      background: transparent;
    }

    .empty-state {
      color: rgba(255, 255, 255, 0.5);
      font-size: 14px;
      font-style: italic;
      padding: 0 12px;
    }
  `;

  override connectedCallback(): void {
    super.connectedCallback();
    this.subscribeToAppState();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.unsubscribeAppState) {
      this.unsubscribeAppState();
    }
  }

  private subscribeToAppState(): void {
    this.unsubscribeAppState = appStateService.subscribe(() => {
      this.personis = appStateService.getPersonis();
      this.activePersoni = appStateService.getActivePersoni();
    });
    
    // Initial sync
    this.personis = appStateService.getPersonis();
    this.activePersoni = appStateService.getActivePersoni();
  }

  private handleSelectPersoni(personi: PersoniConfig): void {
    appStateService.setActivePersoni(personi);
    
    // Sync with activePersonasManager (primary slot)
    activePersonasManager.setPersona('primary', personi);
  }

  private handleCreateNew(): void {
    // Open personis panel for persona creation/management
    appStateService.setActiveSidePanel('personis');
  }

  override render() {
    return html`
      <div class="carousel-container">
        ${this.personis.length === 0
          ? html`<div class="empty-state">No PersonI configured</div>`
          : this.personis.map(
              (personi) => html`
                <div
                  class="persona-chip ${this.activePersoni?.id === personi.id ? 'active' : ''}"
                  @click=${() => this.handleSelectPersoni(personi)}
                  title="${personi.name} - ${personi.tagline || 'No tagline'}"
                >
                  ${personi.avatarUrl
                    ? html`<img src="${personi.avatarUrl}" class="persona-avatar has-image" alt="${personi.name}" />`
                    : html`<span class="persona-avatar" style="background: ${personi.visuals?.accentColor || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}"></span>`
                  }
                  ${personi.name}
                </div>
              `
            )}
        
        <!-- Create New Button -->
        <div
          class="persona-chip create"
          @click=${this.handleCreateNew}
          title="Create new PersonI"
        >
          + New
        </div>
      </div>
    `;
  }
}
