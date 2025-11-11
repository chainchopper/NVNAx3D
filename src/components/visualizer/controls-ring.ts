/**
 * Controls Ring Component
 * Circular menu for visualizer controls (like persona carousel)
 * Placeholder for Phase 3/4 implementation
 */

import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('controls-ring')
export class ControlsRing extends LitElement {
  static styles = css`
    :host {
      display: block;
      position: fixed;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 100;
    }

    .ring-container {
      display: flex;
      gap: 20px;
      padding: 20px;
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 50px;
    }

    button {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: white;
      font-size: 20px;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    button:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: scale(1.1);
    }
  `;

  private handleShowSettings(): void {
    this.dispatchEvent(new CustomEvent('show-twilio-settings', { bubbles: true, composed: true }));
  }

  private handleShowSMS(): void {
    this.dispatchEvent(new CustomEvent('show-sms', { bubbles: true, composed: true }));
  }

  private handleShowVoice(): void {
    this.dispatchEvent(new CustomEvent('show-voice', { bubbles: true, composed: true }));
  }

  render() {
    return html`
      <div class="ring-container">
        <button @click=${this.handleShowSettings} title="Twilio Settings">⚙️</button>
        <button @click=${this.handleShowSMS} title="SMS">💬</button>
        <button @click=${this.handleShowVoice} title="Voice Calls">📞</button>
      </div>
    `;
  }
}
