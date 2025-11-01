/**
 * Minimalist Camera Controls
 * Simple icon-based controls for camera
 */

import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('camera-controls')
export class CameraControls extends LitElement {
  @property({ type: Boolean }) hasPermission = false;
  @property({ type: Boolean }) isActive = false;
  @property({ type: Boolean }) showPreview = false;
  @property({ type: String }) error: string | null = null;

  static styles = css`
    :host {
      display: block;
    }

    .camera-controls {
      position: fixed;
      bottom: 100px;
      right: 20px;
      z-index: 900;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .icon-button {
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(10px);
      border: 2px solid rgba(255, 255, 255, 0.15);
      border-radius: 50%;
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
      color: white;
      font-size: 18px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }

    .icon-button:hover {
      background: rgba(0, 0, 0, 0.85);
      border-color: rgba(255, 255, 255, 0.3);
      transform: scale(1.08);
    }

    .icon-button:active {
      transform: scale(0.95);
    }

    .icon-button.active {
      background: rgba(76, 175, 80, 0.25);
      border-color: rgba(76, 175, 80, 0.5);
    }

    .icon-button.disabled {
      opacity: 0.4;
      cursor: not-allowed;
      pointer-events: none;
    }

    .icon-button.error {
      background: rgba(244, 67, 54, 0.25);
      border-color: rgba(244, 67, 54, 0.5);
    }

    .tooltip {
      position: absolute;
      right: 54px;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 6px 10px;
      border-radius: 6px;
      font-size: 12px;
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s ease;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .icon-button:hover .tooltip {
      opacity: 1;
    }
  `;

  private handleToggleCamera() {
    if (!this.hasPermission) return;
    this.dispatchEvent(new CustomEvent('toggle-camera'));
  }

  private handleTogglePreview() {
    if (!this.hasPermission || !this.isActive) return;
    this.dispatchEvent(new CustomEvent('toggle-preview'));
  }

  private handleSwitchCamera() {
    if (!this.hasPermission || !this.isActive) return;
    this.dispatchEvent(new CustomEvent('switch-camera'));
  }

  render() {
    const cameraClass = this.error ? 'error' : this.isActive ? 'active' : '';
    const previewClass = this.showPreview ? 'active' : '';
    const previewDisabled = !this.hasPermission || !this.isActive ? 'disabled' : '';
    const switchDisabled = !this.hasPermission || !this.isActive ? 'disabled' : '';

    return html`
      <div class="camera-controls">
        <!-- Switch Camera icon: Front/Back (mobile) -->
        <div 
          class="icon-button ${switchDisabled}"
          @click="${this.handleSwitchCamera}"
          title="Switch camera (front/back)"
        >
          🔄
          <span class="tooltip">Switch Camera</span>
        </div>

        <!-- Eye icon: Show/Hide Preview -->
        <div 
          class="icon-button ${previewClass} ${previewDisabled}"
          @click="${this.handleTogglePreview}"
          title="Toggle camera preview"
        >
          ${this.showPreview ? '👁️' : '🙈'}
          <span class="tooltip">${this.showPreview ? 'Hide Preview' : 'Show Preview'}</span>
        </div>

        <!-- Camera icon: On/Off -->
        <div 
          class="icon-button ${cameraClass}"
          @click="${this.handleToggleCamera}"
          title="Toggle camera"
        >
          📷
          <span class="tooltip">${this.isActive ? 'Camera Off' : 'Camera On'}</span>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'camera-controls': CameraControls;
  }
}
