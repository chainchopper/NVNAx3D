/**
 * UI Controls Component
 * Centralized user interface controls for NIRVANA
 */

import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export type InputMode = 'voice' | 'text';

@customElement('ui-controls')
export class UIControls extends LitElement {
  @property({ type: Boolean }) isMuted = false;
  @property({ type: Boolean }) isSpeaking = false;
  @property({ type: Boolean }) isAiSpeaking = false;
  @property({ type: String }) inputMode: InputMode = 'voice';
  @property({ type: String}) currentTextInput = '';
  @property({ type: Number }) volume = 1.0;
  @property({ type: Boolean }) showVolumeControl = false;
  @property({ type: String }) status = '';

  static styles = css`
    :host {
      display: block;
      position: relative;
    }

    .controls-container {
      position: absolute;
      bottom: 40px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      z-index: 10;
    }

    .main-controls {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .control-button {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      border: 2px solid rgba(255, 255, 255, 0.3);
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(10px);
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      transition: all 0.3s ease;
      user-select: none;
    }

    .control-button:hover {
      background: rgba(0, 0, 0, 0.8);
      border-color: rgba(255, 255, 255, 0.6);
      transform: scale(1.05);
    }

    .control-button:active {
      transform: scale(0.95);
    }

    .control-button.active {
      background: rgba(100, 200, 255, 0.3);
      border-color: rgba(100, 200, 255, 0.8);
    }

    .control-button.recording {
      background: rgba(255, 100, 100, 0.3);
      border-color: rgba(255, 100, 100, 0.8);
      animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }

    .control-button.ai-speaking {
      background: rgba(100, 255, 150, 0.3);
      border-color: rgba(100, 255, 150, 0.8);
      animation: pulse 1.5s infinite;
    }

    .mic-button {
      width: 80px;
      height: 80px;
      font-size: 32px;
    }

    .text-input-container {
      display: flex;
      align-items: center;
      gap: 12px;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(10px);
      padding: 12px 20px;
      border-radius: 30px;
      border: 2px solid rgba(255, 255, 255, 0.2);
      min-width: 400px;
      animation: slideUp 0.3s ease-out;
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .text-input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: white;
      font-size: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }

    .text-input::placeholder {
      color: rgba(255, 255, 255, 0.5);
    }

    .send-button {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(100, 200, 255, 0.3);
      border: 2px solid rgba(100, 200, 255, 0.6);
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      transition: all 0.2s ease;
    }

    .send-button:hover {
      background: rgba(100, 200, 255, 0.5);
      transform: scale(1.05);
    }

    .send-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .status-text {
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(10px);
      padding: 8px 16px;
      border-radius: 20px;
      color: rgba(255, 255, 255, 0.9);
      font-size: 13px;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .volume-control {
      display: flex;
      align-items: center;
      gap: 12px;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(10px);
      padding: 12px 20px;
      border-radius: 30px;
      border: 2px solid rgba(255, 255, 255, 0.2);
      animation: slideUp 0.3s ease-out;
    }

    .volume-slider {
      width: 150px;
      height: 4px;
      border-radius: 2px;
      background: rgba(255, 255, 255, 0.2);
      outline: none;
      -webkit-appearance: none;
    }

    .volume-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: white;
      cursor: pointer;
    }

    .volume-slider::-moz-range-thumb {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: white;
      cursor: pointer;
      border: none;
    }

    .fade-out {
      opacity: 0.3;
      pointer-events: none;
    }
  `;

  private handleMicClick() {
    this.dispatchEvent(new CustomEvent('mic-toggle'));
  }

  private handleInterruptClick() {
    this.dispatchEvent(new CustomEvent('interrupt'));
  }

  private handleModeToggle() {
    const newMode: InputMode = this.inputMode === 'voice' ? 'text' : 'voice';
    this.dispatchEvent(new CustomEvent('mode-change', { detail: { mode: newMode } }));
  }

  private handleTextInput(e: Event) {
    const input = e.target as HTMLInputElement;
    this.currentTextInput = input.value;
  }

  private handleTextSubmit() {
    if (this.currentTextInput.trim()) {
      this.dispatchEvent(new CustomEvent('text-submit', { 
        detail: { text: this.currentTextInput } 
      }));
      this.currentTextInput = '';
    }
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.handleTextSubmit();
    }
  }

  private handleVolumeChange(e: Event) {
    const slider = e.target as HTMLInputElement;
    const volume = parseFloat(slider.value);
    this.dispatchEvent(new CustomEvent('volume-change', { detail: { volume } }));
  }

  private toggleVolumeControl() {
    this.showVolumeControl = !this.showVolumeControl;
  }

  render() {
    const isTextMode = this.inputMode === 'text';

    return html`
      <div class="controls-container">
        ${this.status ? html`
          <div class="status-text">${this.status}</div>
        ` : nothing}

        ${isTextMode ? html`
          <div class="text-input-container">
            <input 
              type="text" 
              class="text-input"
              .value="${this.currentTextInput}"
              @input="${this.handleTextInput}"
              @keydown="${this.handleKeyDown}"
              placeholder="Type your message..."
              autofocus
            />
            <button 
              class="send-button"
              @click="${this.handleTextSubmit}"
              ?disabled="${!this.currentTextInput.trim()}"
            >
              ➤
            </button>
          </div>
        ` : nothing}

        <div class="main-controls ${isTextMode ? 'fade-out' : ''}">
          <div 
            class="control-button mic-button ${this.isSpeaking ? 'recording' : ''} ${this.isAiSpeaking ? 'ai-speaking' : ''}"
            @click="${this.handleMicClick}"
            title="${this.isMuted ? 'Unmute' : 'Mute'}"
          >
            ${this.isMuted ? '🔇' : '🎤'}
          </div>

          ${this.isAiSpeaking && !isTextMode ? html`
            <div 
              class="control-button"
              @click="${this.handleInterruptClick}"
              title="Interrupt"
            >
              ⏸️
            </div>
          ` : nothing}
        </div>

        <div class="main-controls">
          <div 
            class="control-button ${isTextMode ? 'active' : ''}"
            @click="${this.handleModeToggle}"
            title="${isTextMode ? 'Switch to Voice' : 'Switch to Text'}"
          >
            ${isTextMode ? '🎤' : '⌨️'}
          </div>

          <div 
            class="control-button"
            @click="${this.toggleVolumeControl}"
            title="Volume Control"
          >
            🔊
          </div>
        </div>

        ${this.showVolumeControl ? html`
          <div class="volume-control">
            <span>🔉</span>
            <input 
              type="range" 
              class="volume-slider"
              min="0" 
              max="1" 
              step="0.01"
              .value="${this.volume.toString()}"
              @input="${this.handleVolumeChange}"
            />
            <span>🔊</span>
          </div>
        ` : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-controls': UIControls;
  }
}
