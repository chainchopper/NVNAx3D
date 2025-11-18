/**
 * Background Manager Component
 * 
 * Centralized viewport-wide background content manager
 * Handles camera feeds, external video sources (HTTPS, RTMP, NDI, etc.)
 * with full viewport width and dynamic resizing
 */

import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

export type BackgroundSource = 'none' | 'camera' | 'external-stream';

@customElement('background-manager')
export class BackgroundManager extends LitElement {
  @property({ type: String }) source: BackgroundSource = 'none';
  @property({ type: Object }) videoElement: HTMLVideoElement | null = null;
  @property({ type: String }) externalStreamUrl: string | null = null;
  
  @state() private isLoading = false;
  @state() private error: string | null = null;

  static override styles = css`
    :host {
      display: block;
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 1;
      overflow: hidden;
      pointer-events: none;
    }

    :host([hidden]) {
      display: none;
    }

    .background-container {
      width: 100%;
      height: 100%;
      position: relative;
      background: #000;
    }

    video {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .external-stream-container {
      width: 100%;
      height: 100%;
      position: relative;
    }

    .external-stream-container iframe {
      width: 100%;
      height: 100%;
      border: none;
    }

    .loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      font-size: 18px;
    }

    .error-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.8);
      color: #ff4444;
      font-size: 16px;
      padding: 20px;
      text-align: center;
    }
  `;

  private renderCameraFeed() {
    if (!this.videoElement) {
      return html`<div class="error-overlay">No camera feed available</div>`;
    }

    return html`${this.videoElement}`;
  }

  private renderExternalStream() {
    if (!this.externalStreamUrl) {
      return html`<div class="error-overlay">No stream URL configured</div>`;
    }

    // For HLS/DASH/RTMP streams, we'd use video.js or similar
    // For now, basic iframe support for HTTPS streams
    return html`
      <div class="external-stream-container">
        <iframe 
          src="${this.externalStreamUrl}"
          allow="autoplay; fullscreen"
          allowfullscreen
        ></iframe>
      </div>
    `;
  }

  override render() {
    if (this.source === 'none') {
      return html``;
    }

    return html`
      <div class="background-container">
        ${this.source === 'camera' ? this.renderCameraFeed() : ''}
        ${this.source === 'external-stream' ? this.renderExternalStream() : ''}
        
        ${this.isLoading ? html`
          <div class="loading-overlay">
            Loading background content...
          </div>
        ` : ''}
        
        ${this.error ? html`
          <div class="error-overlay">
            ${this.error}
          </div>
        ` : ''}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'background-manager': BackgroundManager;
  }
}
