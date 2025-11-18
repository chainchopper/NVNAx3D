/**
 * UI Controls Component
 * Centralized user interface controls for NIRVANA
 */

import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import './file-upload';

export type InputMode = 'voice' | 'text';

@customElement('ui-controls')
export class UIControls extends LitElement {
  @property({ type: Boolean }) isMuted = false;
  @property({ type: Boolean }) isSpeaking = false;
  @property({ type: Boolean }) isAiSpeaking = false;
  @property({ type: String }) inputMode: InputMode = 'voice';
  @property({ type: String}) currentTextInput = '';
  @property({ type: String }) status = '';
  @property({ type: Boolean }) isVisible = true;

  private inactivityTimer: number | null = null;
  private readonly HIDE_DELAY = 5000; // 5 seconds

  static styles = css`
    :host {
      display: block;
      position: fixed;
      top: 20px;
      right: 20px;
      pointer-events: none;
      z-index: 9999;
      transition: opacity 0.5s ease-out;
    }

    :host(.hidden) {
      opacity: 0;
    }

    .controls-container {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 12px;
      pointer-events: all;
    }

    .main-controls {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-direction: row-reverse;
    }

    .control-button {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      border: 2px solid rgba(255, 255, 255, 0.3);
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(15px);
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      transition: all 0.3s ease;
      user-select: none;
      position: relative;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    }

    .control-button .tooltip {
      position: absolute;
      right: calc(100% + 12px);
      top: 50%;
      transform: translateY(-50%);
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      white-space: nowrap;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s ease;
      z-index: 10001;
    }

    .control-button:hover .tooltip {
      opacity: 1;
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
      width: 56px;
      height: 56px;
      font-size: 24px;
    }

    .text-input-container {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(15px);
      padding: 10px 16px;
      border-radius: 25px;
      border: 2px solid rgba(255, 255, 255, 0.25);
      min-width: 350px;
      max-width: 400px;
      animation: slideLeft 0.3s ease-out;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
    }

    @keyframes slideLeft {
      from {
        opacity: 0;
        transform: translateX(20px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    .file-upload-btn {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: rgba(135, 206, 250, 0.2);
      border: 2px solid rgba(135, 206, 250, 0.4);
      color: #87CEFA;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }

    .file-upload-btn:hover {
      background: rgba(135, 206, 250, 0.3);
      border-color: rgba(135, 206, 250, 0.6);
      transform: scale(1.05);
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
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: rgba(100, 200, 255, 0.3);
      border: 2px solid rgba(100, 200, 255, 0.6);
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }

    .send-button:hover {
      background: rgba(100, 200, 255, 0.5);
      transform: scale(1.05);
    }

    .send-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    input[type="file"] {
      display: none;
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

  private resetInactivityTimer() {
    if (this.inactivityTimer !== null) {
      window.clearTimeout(this.inactivityTimer);
    }
    
    // Show controls
    this.isVisible = true;
    this.classList.remove('hidden');
    
    // Set new timer to hide after inactivity
    this.inactivityTimer = window.setTimeout(() => {
      this.isVisible = false;
      this.classList.add('hidden');
    }, this.HIDE_DELAY);
  }

  private handleUserActivity = () => {
    this.resetInactivityTimer();
  };

  connectedCallback() {
    super.connectedCallback();
    
    // Listen for user activity on document level
    document.addEventListener('mousemove', this.handleUserActivity);
    document.addEventListener('mousedown', this.handleUserActivity);
    document.addEventListener('keydown', this.handleUserActivity);
    document.addEventListener('touchstart', this.handleUserActivity);
    
    // Start initial timer
    this.resetInactivityTimer();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    
    // Clean up event listeners
    document.removeEventListener('mousemove', this.handleUserActivity);
    document.removeEventListener('mousedown', this.handleUserActivity);
    document.removeEventListener('keydown', this.handleUserActivity);
    document.removeEventListener('touchstart', this.handleUserActivity);
    
    // Clear timer
    if (this.inactivityTimer !== null) {
      window.clearTimeout(this.inactivityTimer);
    }
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
            <file-upload
              @file-uploaded=${(e: CustomEvent) => {
                this.dispatchEvent(new CustomEvent('file-uploaded', { detail: e.detail }));
              }}
              style="flex-shrink: 0; margin: 0 8px 0 0;"
            ></file-upload>
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
          >
            ${this.isMuted ? '🔇' : '🎤'}
            <span class="tooltip">${this.isMuted ? 'Unmute' : 'Mute'}</span>
          </div>

          ${this.isAiSpeaking && !isTextMode ? html`
            <div 
              class="control-button"
              @click="${this.handleInterruptClick}"
            >
              ⏸️
              <span class="tooltip">Interrupt</span>
            </div>
          ` : nothing}
          
          <div 
            class="control-button ${isTextMode ? 'active' : ''}"
            @click="${this.handleModeToggle}"
          >
            ${isTextMode ? '🎤' : '⌨️'}
            <span class="tooltip">${isTextMode ? 'Switch to Voice' : 'Switch to Text'}</span>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-controls': UIControls;
  }
}
