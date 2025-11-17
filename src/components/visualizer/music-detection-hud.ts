/**
 * Music Detection HUD Component
 * 
 * Shows real-time music detection status with song information bubble:
 * - Detection indicator (pulsing when music detected)
 * - Song title, artist (from AudD API)
 * - BPM and confidence level
 */

import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { appStateService } from '../../services/app-state-service';

@customElement('music-detection-hud')
export class MusicDetectionHUD extends LitElement {
  @state() private isMusicDetected = false;
  @state() private musicBpm = 0;
  @state() private musicConfidence = 0;
  @state() private expanded = false;
  
  private unsubscribeAppState: (() => void) | null = null;

  static override styles = css`
    :host {
      display: block;
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 150;
      pointer-events: none;
    }

    .indicator-container {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 16px;
      background: rgba(10, 14, 39, 0.7);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 30px;
      box-shadow: 0 6px 24px rgba(0, 0, 0, 0.25);
      pointer-events: all;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .indicator-container:hover {
      background: rgba(10, 14, 39, 0.85);
      transform: translateY(-2px);
      box-shadow: 0 8px 28px rgba(0, 0, 0, 0.3);
    }

    .indicator-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.2);
      transition: all 0.3s ease;
    }

    .indicator-dot.active {
      background: #4CAF50;
      box-shadow: 0 0 12px rgba(76, 175, 80, 0.6);
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
        transform: scale(1);
      }
      50% {
        opacity: 0.7;
        transform: scale(1.1);
      }
    }

    .indicator-label {
      color: rgba(255, 255, 255, 0.8);
      font-size: 13px;
      font-weight: 500;
      white-space: nowrap;
    }

    .info-bubble {
      margin-top: 8px;
      padding: 12px 16px;
      background: rgba(10, 14, 39, 0.9);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      max-height: 0;
      overflow: hidden;
      opacity: 0;
      transition: all 0.3s ease;
    }

    .info-bubble.expanded {
      max-height: 200px;
      opacity: 1;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 12px;
    }

    .info-row:last-child {
      margin-bottom: 0;
    }

    .info-label {
      color: rgba(255, 255, 255, 0.6);
      margin-right: 12px;
    }

    .info-value {
      color: rgba(255, 255, 255, 0.9);
      font-weight: 500;
    }

    .song-title {
      color: #87CEFA;
      font-weight: 600;
      font-size: 14px;
      margin-bottom: 8px;
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
      const state = appStateService.getState();
      this.isMusicDetected = state.isMusicDetected;
      this.musicBpm = state.musicBpm;
      this.musicConfidence = state.musicConfidence;
    });
    
    // Initial sync
    const state = appStateService.getState();
    this.isMusicDetected = state.isMusicDetected;
    this.musicBpm = state.musicBpm;
    this.musicConfidence = state.musicConfidence;
  }

  private handleToggleExpanded(): void {
    this.expanded = !this.expanded;
  }

  override render() {
    return html`
      <div>
        <div class="indicator-container" @click=${this.handleToggleExpanded}>
          <div class="indicator-dot ${this.isMusicDetected ? 'active' : ''}"></div>
          <div class="indicator-label">
            ${this.isMusicDetected ? '♫ Music Detected' : 'Listening...'}
          </div>
        </div>

        ${this.isMusicDetected
          ? html`
              <div class="info-bubble ${this.expanded ? 'expanded' : ''}">
                <div class="song-title">Unknown Track</div>
                <div class="info-row">
                  <span class="info-label">BPM:</span>
                  <span class="info-value">${this.musicBpm || '--'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Confidence:</span>
                  <span class="info-value">${Math.round(this.musicConfidence * 100)}%</span>
                </div>
              </div>
            `
          : ''}
      </div>
    `;
  }
}
