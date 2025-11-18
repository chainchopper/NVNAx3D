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
      left: 50%;
      transform: translateX(-50%);
      z-index: 180;
      width: 330px;
      animation: slideInFromLeft 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    @keyframes slideInFromLeft {
      from {
        transform: translateX(-120px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    .carousel-container {
      position: relative;
      padding: 0 48px;
    }

    .card {
      background: rgba(10, 14, 26, 0.85);
      backdrop-filter: blur(20px);
      border-radius: 24px;
      border: 1px solid rgba(135, 206, 250, 0.25);
      padding: 20px 16px;
      text-align: center;
      box-shadow: 
        0 8px 32px rgba(0, 0, 0, 0.5),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      min-height: 280px;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
    }

    .card.confirming {
      border-color: rgba(255, 193, 7, 0.6);
      box-shadow: 
        0 0 40px rgba(255, 193, 7, 0.4),
        0 8px 32px rgba(0, 0, 0, 0.5),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
      animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.02); }
    }

    .avatar {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      margin: 0 auto 12px;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.3), rgba(118, 75, 162, 0.3));
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 36px;
      border: 2px solid rgba(135, 206, 250, 0.4);
      box-shadow: 
        0 4px 16px rgba(0, 0, 0, 0.3),
        inset 0 2px 8px rgba(255, 255, 255, 0.1);
      overflow: hidden;
      transition: all 0.3s ease;
      position: relative;
    }

    .avatar:hover {
      transform: scale(1.08);
      border-color: rgba(135, 206, 250, 0.6);
    }

    .avatar img,
    .avatar video {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 50%;
    }

    .avatar video {
      pointer-events: none;
    }

    .avatar iframe {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border: none;
      border-radius: 50%;
    }

    .name {
      font-size: 20px;
      font-weight: 700;
      color: #87CEFA;
      margin-bottom: 6px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .description {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.65);
      line-height: 1.5;
      margin-bottom: 12px;
      max-height: 54px;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      text-overflow: ellipsis;
    }

    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      justify-content: center;
      margin-bottom: 12px;
      max-height: 48px;
      overflow: hidden;
    }

    .tag {
      padding: 4px 10px;
      background: rgba(135, 206, 250, 0.12);
      border: 1px solid rgba(135, 206, 250, 0.25);
      border-radius: 12px;
      font-size: 10px;
      font-weight: 600;
      color: rgba(135, 206, 250, 0.9);
      text-transform: uppercase;
      letter-spacing: 0.3px;
      white-space: nowrap;
    }

    .nav-button {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(10, 14, 26, 0.85);
      backdrop-filter: blur(12px);
      border: 2px solid rgba(135, 206, 250, 0.3);
      color: rgba(135, 206, 250, 0.8);
      font-size: 14px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 
        0 4px 16px rgba(0, 0, 0, 0.4),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
    }

    .nav-button:hover:not(:disabled) {
      background: rgba(135, 206, 250, 0.2);
      border-color: rgba(135, 206, 250, 0.6);
      color: #87CEFA;
      transform: translateY(-50%) scale(1.15);
      box-shadow: 
        0 6px 24px rgba(135, 206, 250, 0.3),
        inset 0 1px 0 rgba(255, 255, 255, 0.15);
    }

    .nav-button:disabled {
      opacity: 0.25;
      cursor: not-allowed;
      border-color: rgba(255, 255, 255, 0.1);
    }

    .nav-button.prev {
      left: 0;
    }

    .nav-button.next {
      right: 0;
    }

    .confirmation-panel {
      margin-top: 12px;
      padding: 12px;
      background: rgba(255, 193, 7, 0.08);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 193, 7, 0.35);
      border-radius: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      box-shadow: 
        0 4px 16px rgba(255, 193, 7, 0.15),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
    }

    .confirmation-text {
      color: #FFC107;
      font-weight: 700;
      font-size: 12px;
      letter-spacing: 0.3px;
      text-transform: uppercase;
    }

    .confirmation-buttons {
      display: flex;
      gap: 8px;
      justify-content: center;
    }

    .confirm-btn, .cancel-btn {
      padding: 8px 20px;
      border-radius: 12px;
      font-weight: 700;
      font-size: 11px;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      border: none;
      backdrop-filter: blur(8px);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .confirm-btn {
      background: rgba(76, 175, 80, 0.25);
      border: 1px solid rgba(76, 175, 80, 0.5);
      color: #4CAF50;
      box-shadow: 0 2px 8px rgba(76, 175, 80, 0.2);
    }

    .confirm-btn:hover {
      background: rgba(76, 175, 80, 0.35);
      border-color: rgba(76, 175, 80, 0.7);
      transform: scale(1.05);
      box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
    }

    .cancel-btn {
      background: rgba(244, 67, 54, 0.15);
      border: 1px solid rgba(244, 67, 54, 0.35);
      color: #F44336;
      box-shadow: 0 2px 8px rgba(244, 67, 54, 0.15);
    }

    .cancel-btn:hover {
      background: rgba(244, 67, 54, 0.25);
      border-color: rgba(244, 67, 54, 0.5);
      transform: scale(1.05);
      box-shadow: 0 4px 12px rgba(244, 67, 54, 0.25);
    }

    .indicator {
      text-align: center;
      margin-top: 8px;
      color: rgba(255, 255, 255, 0.4);
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    .active-badge {
      display: inline-block;
      padding: 5px 12px;
      background: rgba(76, 175, 80, 0.15);
      border: 1px solid rgba(76, 175, 80, 0.4);
      border-radius: 12px;
      color: #4CAF50;
      font-size: 10px;
      font-weight: 700;
      margin-top: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      box-shadow: 0 2px 8px rgba(76, 175, 80, 0.2);
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

  private isYouTubeUrl(url: string): boolean {
    return url.includes('youtube.com') || url.includes('youtu.be');
  }

  private normalizeYouTubeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      let videoId = '';

      // Handle youtube.com/watch?v=ABC
      if (urlObj.hostname.includes('youtube.com') && urlObj.pathname === '/watch') {
        videoId = urlObj.searchParams.get('v') || '';
      }
      // Handle youtu.be/ABC
      else if (urlObj.hostname.includes('youtu.be')) {
        videoId = urlObj.pathname.substring(1); // Remove leading /
      }

      if (videoId) {
        // Preserve other query parameters
        const params = new URLSearchParams();
        urlObj.searchParams.forEach((value, key) => {
          if (key !== 'v') { // Don't include 'v' param in embed URL
            params.set(key, value);
          }
        });
        const queryString = params.toString();
        return `https://www.youtube.com/embed/${videoId}${queryString ? '?' + queryString : ''}`;
      }
    } catch (e) {
      // If URL parsing fails, return original
    }
    return url;
  }

  private isVideoUrl(url: string): boolean {
    // Check for data URL videos
    if (url.startsWith('data:video/')) {
      return true;
    }
    // Check for video file extensions (before query/hash)
    try {
      const urlObj = new URL(url);
      return /\.(mp4|webm|ogg)$/i.test(urlObj.pathname);
    } catch (e) {
      // Fallback to simple regex for relative paths
      return /\.(mp4|webm|ogg)(?:[?#]|$)/i.test(url);
    }
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
          <div class="avatar">
            ${currentPersoni.avatarUrl ? 
              this.isYouTubeUrl(currentPersoni.avatarUrl) ? html`
                <iframe 
                  src="${this.normalizeYouTubeUrl(currentPersoni.avatarUrl)}" 
                  frameborder="0"
                  allow="autoplay; encrypted-media"
                  allowfullscreen
                ></iframe>
              ` : this.isVideoUrl(currentPersoni.avatarUrl) ? html`
                <video src="${currentPersoni.avatarUrl}" loop muted autoplay playsinline></video>
              ` : html`
                <img src="${currentPersoni.avatarUrl}" alt="${currentPersoni.name}">
              `
            : '🤖'}
          </div>
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
