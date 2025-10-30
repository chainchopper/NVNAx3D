/**
 * Camera Controls Component
 * UI controls for camera permission, preview, and power
 */

import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

@customElement('camera-controls')
export class CameraControls extends LitElement {
  @property({ type: Boolean }) hasPermission = false;
  @property({ type: Boolean }) isActive = false;
  @property({ type: Boolean }) showPreview = false;
  @property({ type: String }) error: string | null = null;

  @state() private isExpanded = false;

  static styles = css`
    :host {
      display: block;
    }

    .camera-controls {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      gap: 8px;
      align-items: flex-end;
    }

    .toggle-button {
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(10px);
      border: 2px solid rgba(255, 255, 255, 0.2);
      border-radius: 50%;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.3s ease;
      color: white;
      font-size: 20px;
    }

    .toggle-button:hover {
      background: rgba(0, 0, 0, 0.85);
      border-color: rgba(255, 255, 255, 0.4);
      transform: scale(1.05);
    }

    .toggle-button.active {
      background: rgba(76, 175, 80, 0.3);
      border-color: rgba(76, 175, 80, 0.6);
    }

    .toggle-button.error {
      background: rgba(244, 67, 54, 0.3);
      border-color: rgba(244, 67, 54, 0.6);
    }

    .controls-panel {
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(15px);
      border: 2px solid rgba(255, 255, 255, 0.2);
      border-radius: 16px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-width: 220px;
      animation: slideIn 0.3s ease-out;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .panel-header {
      display: flex;
      align-items: center;
      gap: 8px;
      color: white;
      font-size: 14px;
      font-weight: 600;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #757575;
    }

    .status-indicator.active {
      background: #4CAF50;
      box-shadow: 0 0 8px rgba(76, 175, 80, 0.6);
    }

    .status-indicator.error {
      background: #f44336;
      box-shadow: 0 0 8px rgba(244, 67, 54, 0.6);
    }

    .control-button {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      padding: 10px 16px;
      color: white;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 8px;
      justify-content: center;
    }

    .control-button:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.2);
      border-color: rgba(255, 255, 255, 0.4);
    }

    .control-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .control-button.primary {
      background: rgba(33, 150, 243, 0.3);
      border-color: rgba(33, 150, 243, 0.6);
    }

    .control-button.primary:hover:not(:disabled) {
      background: rgba(33, 150, 243, 0.5);
    }

    .control-button.danger {
      background: rgba(244, 67, 54, 0.3);
      border-color: rgba(244, 67, 54, 0.6);
    }

    .control-button.danger:hover:not(:disabled) {
      background: rgba(244, 67, 54, 0.5);
    }

    .toggle-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 0;
    }

    .toggle-label {
      color: rgba(255, 255, 255, 0.9);
      font-size: 13px;
    }

    .toggle-switch {
      position: relative;
      width: 42px;
      height: 24px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      cursor: pointer;
      transition: background 0.3s ease;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .toggle-switch.active {
      background: rgba(76, 175, 80, 0.5);
      border-color: rgba(76, 175, 80, 0.8);
    }

    .toggle-switch::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 18px;
      height: 18px;
      background: white;
      border-radius: 50%;
      transition: transform 0.3s ease;
    }

    .toggle-switch.active::after {
      transform: translateX(18px);
    }

    .error-message {
      color: #f44336;
      font-size: 11px;
      padding: 8px;
      background: rgba(244, 67, 54, 0.1);
      border-radius: 6px;
      text-align: center;
    }
  `;

  private handleTogglePanel() {
    this.isExpanded = !this.isExpanded;
  }

  private handleRequestPermission() {
    this.dispatchEvent(new CustomEvent('request-permission'));
  }

  private handleToggleCamera() {
    this.dispatchEvent(new CustomEvent('toggle-camera'));
  }

  private handleTogglePreview() {
    this.dispatchEvent(new CustomEvent('toggle-preview'));
  }

  render() {
    const statusClass = this.error ? 'error' : this.isActive ? 'active' : '';

    return html`
      <div class="camera-controls">
        <button 
          class="toggle-button ${statusClass}"
          @click="${this.handleTogglePanel}"
          title="Camera Controls"
        >
          📷
        </button>

        ${this.isExpanded ? html`
          <div class="controls-panel">
            <div class="panel-header">
              <div class="status-indicator ${statusClass}"></div>
              <span>Camera Control</span>
            </div>

            ${!this.hasPermission ? html`
              <button 
                class="control-button primary"
                @click="${this.handleRequestPermission}"
              >
                🔓 Request Permission
              </button>
            ` : html`
              <button 
                class="control-button ${this.isActive ? 'danger' : 'primary'}"
                @click="${this.handleToggleCamera}"
              >
                ${this.isActive ? '⏹ Turn Off Camera' : '▶️ Turn On Camera'}
              </button>

              <div class="toggle-row">
                <span class="toggle-label">Show Preview</span>
                <div 
                  class="toggle-switch ${this.showPreview ? 'active' : ''}"
                  @click="${this.handleTogglePreview}"
                  title="Toggle camera preview"
                ></div>
              </div>
            `}

            ${this.error ? html`
              <div class="error-message">${this.error}</div>
            ` : ''}
          </div>
        ` : ''}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'camera-controls': CameraControls;
  }
}
