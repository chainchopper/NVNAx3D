/**
 * PersonI Carousel Component
 * 
 * Single-card carousel with left/right navigation
 * Requires verbal/click confirmation before switching PersonI
 */

import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import type { PersoniConfig } from '../../personas';
import { appStateService } from '../../services/app-state-service';

@customElement('personi-carousel')
export class PersonICarousel extends LitElement {
  @state() private personis: PersoniConfig[] = [];
  @state() private currentIndex = 0;
  @state() private confirming = false;
  @state() private selectedPersoni: PersoniConfig | null = null;

  private unsubscribe?: () => void;

  static override styles = css`
    :host {
      display: block;
      position: fixed;
      bottom: 24px;
      left: 24px;
      z-index: 180;
      width: 320px;
    }

    .carousel-container {
      position: relative;
      padding: 16px 60px;
    }

    .card {
      background: linear-gradient(135deg, rgba(10, 14, 39, 0.95), rgba(20, 28, 58, 0.95));
      border: 1px solid rgba(135, 206, 250, 0.3);
      border-radius: 20px;
      padding: 32px;
      text-align: center;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(12px);
      transition: all 0.3s ease;
    }

    .card.confirming {
      border-color: rgba(255, 193, 7, 0.6);
      box-shadow: 0 0 32px rgba(255, 193, 7, 0.3);
    }

    .avatar {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      margin: 0 auto 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 48px;
      border: 3px solid rgba(135, 206, 250, 0.3);
    }

    .name {
      font-size: 28px;
      font-weight: 600;
      color: #87CEFA;
      margin-bottom: 8px;
    }

    .description {
      font-size: 15px;
      color: rgba(255, 255, 255, 0.7);
      line-height: 1.6;
      margin-bottom: 20px;
    }

    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: center;
      margin-bottom: 24px;
    }

    .tag {
      padding: 6px 12px;
      background: rgba(135, 206, 250, 0.15);
      border: 1px solid rgba(135, 206, 250, 0.3);
      border-radius: 20px;
      font-size: 12px;
      color: #87CEFA;
    }

    .nav-button {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.6);
      border: 2px solid rgba(135, 206, 250, 0.3);
      color: white;
      font-size: 24px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      backdrop-filter: blur(8px);
    }

    .nav-button:hover {
      background: rgba(135, 206, 250, 0.2);
      border-color: rgba(135, 206, 250, 0.6);
      transform: translateY(-50%) scale(1.1);
    }

    .nav-button:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    .nav-button.prev {
      left: 0;
    }

    .nav-button.next {
      right: 0;
    }

    .confirmation-panel {
      margin-top: 24px;
      padding: 20px;
      background: rgba(255, 193, 7, 0.1);
      border: 2px solid rgba(255, 193, 7, 0.4);
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .confirmation-text {
      color: #FFC107;
      font-weight: 600;
      font-size: 14px;
    }

    .confirmation-buttons {
      display: flex;
      gap: 12px;
      justify-content: center;
    }

    .confirm-btn, .cancel-btn {
      padding: 10px 24px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      border: none;
      font-size: 14px;
    }

    .confirm-btn {
      background: rgba(76, 175, 80, 0.3);
      border: 1px solid rgba(76, 175, 80, 0.6);
      color: #4CAF50;
    }

    .confirm-btn:hover {
      background: rgba(76, 175, 80, 0.4);
    }

    .cancel-btn {
      background: rgba(244, 67, 54, 0.2);
      border: 1px solid rgba(244, 67, 54, 0.4);
      color: #F44336;
    }

    .cancel-btn:hover {
      background: rgba(244, 67, 54, 0.3);
    }

    .indicator {
      text-align: center;
      margin-top: 16px;
      color: rgba(255, 255, 255, 0.5);
      font-size: 13px;
    }

    .active-badge {
      display: inline-block;
      padding: 4px 12px;
      background: rgba(76, 175, 80, 0.2);
      border: 1px solid rgba(76, 175, 80, 0.4);
      border-radius: 12px;
      color: #4CAF50;
      font-size: 12px;
      font-weight: 600;
      margin-top: 12px;
    }
  `;

  override connectedCallback(): void {
    super.connectedCallback();
    this.loadPersonis();
    
    this.unsubscribe = appStateService.subscribe(() => {
      this.loadPersonis();
    });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.unsubscribe?.();
  }

  private loadPersonis(): void {
    const state = appStateService.getState();
    this.personis = state.personis || [];
    
    const activePersoni = state.activePersoni;
    if (activePersoni) {
      const index = this.personis.findIndex(p => p.id === activePersoni.id);
      if (index !== -1) {
        this.currentIndex = index;
      }
    }
  }

  private handlePrevious(): void {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.requestConfirmation();
    }
  }

  private handleNext(): void {
    if (this.currentIndex < this.personis.length - 1) {
      this.currentIndex++;
      this.requestConfirmation();
    }
  }

  private requestConfirmation(): void {
    this.selectedPersoni = this.personis[this.currentIndex];
    this.confirming = true;
  }

  private handleConfirm(): void {
    if (this.selectedPersoni) {
      appStateService.setActivePersoni(this.selectedPersoni);
      
      this.dispatchEvent(new CustomEvent('personi-changed', {
        detail: { personi: this.selectedPersoni },
        bubbles: true,
        composed: true
      }));
    }
    
    this.confirming = false;
    this.selectedPersoni = null;
  }

  private handleCancel(): void {
    const activePersoni = appStateService.getState().activePersoni;
    if (activePersoni) {
      const index = this.personis.findIndex(p => p.id === activePersoni.id);
      if (index !== -1) {
        this.currentIndex = index;
      }
    }
    
    this.confirming = false;
    this.selectedPersoni = null;
  }

  private getTags(personi: PersoniConfig): string[] {
    const tags: string[] = [];
    
    if (personi.capabilities?.vision) tags.push('Vision');
    if (personi.capabilities?.imageGeneration) tags.push('Image Gen');
    if (personi.capabilities?.webSearch) tags.push('Web Search');
    if (personi.capabilities?.tools) tags.push('Tools');
    
    return tags;
  }

  override render() {
    if (this.personis.length === 0) {
      return html`
        <div class="carousel-container">
          <div class="card">
            <p style="color: rgba(255,255,255,0.5);">No PersonI configured</p>
          </div>
        </div>
      `;
    }

    const currentPersoni = this.personis[this.currentIndex];
    const activePersoni = appStateService.getState().activePersoni;
    const isActive = activePersoni?.id === currentPersoni.id;
    const tags = this.getTags(currentPersoni);

    return html`
      <div class="carousel-container">
        <button 
          class="nav-button prev"
          @click=${this.handlePrevious}
          ?disabled=${this.currentIndex === 0}
          aria-label="Previous PersonI"
        >
          ◀
        </button>

        <div class="card ${this.confirming ? 'confirming' : ''}">
          <div class="avatar">${currentPersoni.avatarUrl ? html`<img src="${currentPersoni.avatarUrl}" alt="${currentPersoni.name}">` : '🤖'}</div>
          <div class="name">${currentPersoni.name}</div>
          <div class="description">${currentPersoni.systemInstruction || currentPersoni.tagline || 'AI Assistant'}</div>
          
          ${tags.length > 0 ? html`
            <div class="tags">
              ${tags.map(tag => html`<span class="tag">${tag}</span>`)}
            </div>
          ` : ''}

          ${isActive && !this.confirming ? html`
            <div class="active-badge">✓ Currently Active</div>
          ` : ''}

          ${this.confirming ? html`
            <div class="confirmation-panel">
              <div class="confirmation-text">
                Switch to ${currentPersoni.name}?
              </div>
              <div class="confirmation-buttons">
                <button class="confirm-btn" @click=${this.handleConfirm}>
                  ✓ Confirm
                </button>
                <button class="cancel-btn" @click=${this.handleCancel}>
                  ✗ Cancel
                </button>
              </div>
            </div>
          ` : ''}
        </div>

        <button 
          class="nav-button next"
          @click=${this.handleNext}
          ?disabled=${this.currentIndex === this.personis.length - 1}
          aria-label="Next PersonI"
        >
          ▶
        </button>

        <div class="indicator">
          ${this.currentIndex + 1} / ${this.personis.length}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'personi-carousel': PersonICarousel;
  }
}
