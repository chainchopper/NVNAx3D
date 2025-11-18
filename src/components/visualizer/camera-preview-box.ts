/**
 * Camera Preview Box
 * 
 * Simple native video element displaying camera feed in bottom-left corner
 */

import { LitElement, css, html } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';

@customElement('camera-preview-box')
export class CameraPreviewBox extends LitElement {
  @property({ type: Boolean, reflect: true }) visible = false;
  @property({ type: Object }) stream: MediaStream | null = null;
  @property({ type: Boolean }) hasPermission = false;
  
  @query('video') private videoElement!: HTMLVideoElement;

  static override styles = css`
    :host {
      display: block;
      position: fixed;
      bottom: 24px;
      left: 24px;
      z-index: 200;
      pointer-events: auto;
    }

    :host(:not([visible])) {
      display: none;
    }

    .preview-container {
      width: 320px;
      height: 240px;
      border-radius: 16px;
      overflow: hidden;
      background: rgba(0, 0, 0, 0.9);
      backdrop-filter: blur(12px);
      border: 2px solid rgba(135, 206, 250, 0.3);
      box-shadow: 
        0 8px 32px rgba(0, 0, 0, 0.6),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
      transition: all 0.3s ease;
    }

    .preview-container:hover {
      border-color: rgba(135, 206, 250, 0.5);
      box-shadow: 
        0 12px 48px rgba(0, 0, 0, 0.7),
        inset 0 1px 0 rgba(255, 255, 255, 0.15);
    }

    video {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      transform: scaleX(-1);
    }

    .label {
      position: absolute;
      top: 8px;
      left: 8px;
      background: rgba(0, 0, 0, 0.7);
      color: rgba(255, 255, 255, 0.9);
      padding: 4px 10px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      backdrop-filter: blur(8px);
    }

    .error {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: rgba(255, 100, 100, 0.9);
      font-size: 12px;
      text-align: center;
      padding: 16px;
      background: rgba(0, 0, 0, 0.9);
      z-index: 10;
    }
  `;

  override async updated(changedProps: Map<string, any>) {
    if (changedProps.has('stream')) {
      await this.updateComplete;
      if (this.videoElement && this.stream) {
        this.videoElement.srcObject = this.stream;
        await this.videoElement.play().catch(err => {
          console.warn('[CameraPreviewBox] Failed to play video:', err);
        });
        console.log('[CameraPreviewBox] Stream attached to video element');
      } else if (this.videoElement && !this.stream) {
        this.videoElement.srcObject = null;
      }
    }
  }

  override render() {
    return html`
      <div class="preview-container">
        <video autoplay playsinline muted></video>
        <div class="label">Camera</div>
        ${!this.hasPermission && this.visible ? html`
          <div class="error">
            Camera access denied.<br>
            Please allow camera permissions.
          </div>
        ` : ''}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'camera-preview-box': CameraPreviewBox;
  }
}
