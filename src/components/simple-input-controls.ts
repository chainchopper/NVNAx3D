import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('simple-input-controls')
export class SimpleInputControls extends LitElement {
  @property({ type: String }) mode: 'voice' | 'text' = 'voice';
  @property({ type: Boolean }) isRecording = false;
  @property({ type: String }) textInput = '';

  static styles = css`
    :host {
      display: block;
      position: fixed;
      bottom: 40px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 200;
      pointer-events: none;
    }

    .container {
      display: flex;
      align-items: center;
      gap: 20px;
      pointer-events: auto;
    }

    .icon-button {
      width: 70px;
      height: 70px;
      border-radius: 50%;
      background: rgba(20, 20, 30, 0.95);
      border: 3px solid rgba(100, 200, 255, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 32px;
      transition: all 0.3s ease;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
      user-select: none;
    }

    .icon-button:hover {
      transform: scale(1.1);
      border-color: rgba(100, 200, 255, 1);
      box-shadow: 0 12px 48px rgba(100, 200, 255, 0.4);
    }

    .icon-button:active {
      transform: scale(0.95);
    }

    .icon-button.active {
      background: rgba(100, 200, 255, 0.3);
      border-color: rgba(100, 200, 255, 1);
      animation: pulse 2s infinite;
    }

    .icon-button.recording {
      background: rgba(255, 50, 50, 0.3);
      border-color: rgba(255, 50, 50, 1);
      animation: pulse 1s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }

    .text-input-box {
      display: flex;
      align-items: center;
      gap: 12px;
      background: rgba(20, 20, 30, 0.95);
      border: 3px solid rgba(100, 200, 255, 0.6);
      border-radius: 40px;
      padding: 12px 24px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
      min-width: 400px;
    }

    .text-input-box input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: white;
      font-size: 18px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }

    .text-input-box input::placeholder {
      color: rgba(255, 255, 255, 0.5);
    }

    .send-btn {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(100, 200, 255, 0.3);
      border: 2px solid rgba(100, 200, 255, 0.8);
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      transition: all 0.2s ease;
    }

    .send-btn:hover {
      background: rgba(100, 200, 255, 0.6);
      transform: scale(1.1);
    }

    .send-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    .label {
      position: absolute;
      bottom: -30px;
      left: 50%;
      transform: translateX(-50%);
      color: rgba(255, 255, 255, 0.8);
      font-size: 14px;
      font-weight: 600;
      white-space: nowrap;
      pointer-events: none;
    }
  `;

  private handleMicClick() {
    console.log('[SimpleInputControls] 🎤 MIC BUTTON CLICKED');
    this.dispatchEvent(new CustomEvent('voice-input-toggle', {
      bubbles: true,
      composed: true
    }));
  }

  private handleKeyboardClick() {
    console.log('[SimpleInputControls] ⌨️ KEYBOARD BUTTON CLICKED');
    this.mode = this.mode === 'voice' ? 'text' : 'voice';
    this.requestUpdate();
  }

  private handleTextInput(e: Event) {
    const input = e.target as HTMLInputElement;
    this.textInput = input.value;
  }

  private handleSendClick() {
    if (this.textInput.trim()) {
      console.log('[SimpleInputControls] 📤 SENDING TEXT:', this.textInput);
      this.dispatchEvent(new CustomEvent('text-input-submit', {
        detail: { text: this.textInput },
        bubbles: true,
        composed: true
      }));
      this.textInput = '';
      this.requestUpdate();
    }
  }

  private handleKeyPress(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.handleSendClick();
    }
  }

  render() {
    return html`
      <div class="container">
        ${this.mode === 'voice' ? html`
          <div 
            class="icon-button ${this.isRecording ? 'recording' : ''}"
            @click=${this.handleMicClick}
            title="Click to speak"
          >
            🎤
            <div class="label">${this.isRecording ? 'Recording...' : 'Voice Input'}</div>
          </div>
        ` : html`
          <div class="text-input-box">
            <input
              type="text"
              .value=${this.textInput}
              @input=${this.handleTextInput}
              @keypress=${this.handleKeyPress}
              placeholder="Type your message..."
              autofocus
            />
            <button
              class="send-btn"
              @click=${this.handleSendClick}
              ?disabled=${!this.textInput.trim()}
            >
              ➤
            </button>
          </div>
        `}
        
        <div 
          class="icon-button ${this.mode === 'text' ? 'active' : ''}"
          @click=${this.handleKeyboardClick}
          title="Toggle input mode"
        >
          ${this.mode === 'voice' ? '⌨️' : '🎤'}
          <div class="label">${this.mode === 'voice' ? 'Switch to Text' : 'Switch to Voice'}</div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'simple-input-controls': SimpleInputControls;
  }
}
