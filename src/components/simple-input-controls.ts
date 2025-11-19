import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import './file-upload';

@customElement('simple-input-controls')
export class SimpleInputControls extends LitElement {
  @property({ type: Boolean }) isRecording = false;
  @property({ type: String }) textInput = '';
  @property({ type: Boolean }) textInputVisible = false;
  @property({ type: Boolean }) thinkingEnabled = false;
  @property({ type: Boolean }) searchEnabled = false;

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
      flex-direction: row;
    }

    .n-button {
      width: 70px;
      height: 70px;
      border-radius: 50%;
      background: rgba(20, 20, 30, 0.95);
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 42px;
      font-weight: 700;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: #87CEFA;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6), 0 0 0 0 rgba(135, 206, 250, 0.6);
      user-select: none;
      animation: glow 2s ease-in-out infinite;
    }

    .n-button:hover {
      transform: scale(1.1);
      box-shadow: 0 12px 48px rgba(135, 206, 250, 0.6), 0 0 40px rgba(135, 206, 250, 0.8);
    }

    .n-button:active {
      transform: scale(0.95);
    }

    .n-button.active {
      animation: glow-active 1s ease-in-out infinite;
    }

    @keyframes glow {
      0%, 100% { 
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6), 0 0 20px rgba(135, 206, 250, 0.4);
      }
      50% { 
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6), 0 0 40px rgba(135, 206, 250, 0.8);
      }
    }

    @keyframes glow-active {
      0%, 100% { 
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6), 0 0 40px rgba(135, 206, 250, 1);
      }
      50% { 
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6), 0 0 60px rgba(135, 206, 250, 1);
      }
    }

    .text-input-box {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(20, 20, 30, 0.95);
      border: none;
      border-radius: 40px;
      padding: 8px 20px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6), 0 0 20px rgba(135, 206, 250, 0.3);
      min-width: 500px;
      opacity: 0;
      transform: translateY(20px) scale(0.9);
      pointer-events: none;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .text-input-box.visible {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: auto;
    }

    .input-icon {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(135, 206, 250, 0.1);
      border: none;
      color: rgba(255, 255, 255, 0.6);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }

    .input-icon:hover {
      background: rgba(135, 206, 250, 0.2);
      color: white;
      transform: scale(1.1);
      box-shadow: 0 0 12px rgba(135, 206, 250, 0.4);
    }

    .input-icon.active {
      background: rgba(135, 206, 250, 0.3);
      color: #87CEFA;
      box-shadow: 0 0 16px rgba(135, 206, 250, 0.6);
    }

    .input-icon.recording {
      background: rgba(255, 50, 50, 0.3);
      color: #ff5050;
      box-shadow: 0 0 16px rgba(255, 50, 50, 0.6);
      animation: pulse-mic 1s infinite;
    }

    @keyframes pulse-mic {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
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

    .upload-btn {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: rgba(135, 206, 250, 0.2);
      border: 2px solid rgba(135, 206, 250, 0.5);
      color: #87CEFA;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }

    .upload-btn:hover {
      background: rgba(135, 206, 250, 0.3);
      border-color: rgba(135, 206, 250, 0.8);
      transform: scale(1.1);
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

  private handleNButtonClick() {
    console.log('[SimpleInputControls] N BUTTON CLICKED - Toggling text input visibility');
    this.textInputVisible = !this.textInputVisible;
    this.requestUpdate();
  }

  private handleThinkingToggle() {
    this.thinkingEnabled = !this.thinkingEnabled;
    this.dispatchEvent(new CustomEvent('thinking-toggle', {
      detail: { enabled: this.thinkingEnabled },
      bubbles: true,
      composed: true
    }));
  }

  private handleSearchToggle() {
    this.searchEnabled = !this.searchEnabled;
    this.dispatchEvent(new CustomEvent('search-toggle', {
      detail: { enabled: this.searchEnabled },
      bubbles: true,
      composed: true
    }));
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
        <!-- Animated glowing N button - reveals text input -->
        <button
          class="n-button ${this.textInputVisible ? 'active' : ''}"
          @click=${this.handleNButtonClick}
          title="Nirvana Input"
        >
          N
        </button>

        <!-- Text input box with all controls - slides in/out -->
        <div class="text-input-box ${this.textInputVisible ? 'visible' : ''}">
          <!-- Mic toggle icon -->
          <button
            class="input-icon ${this.isRecording ? 'recording' : ''}"
            @click=${this.handleMicClick}
            title="${this.isRecording ? 'Stop recording' : 'Voice input'}"
          >
            🎤
          </button>

          <!-- File upload icon -->
          <file-upload
            @file-uploaded=${(e: CustomEvent) => {
              this.dispatchEvent(new CustomEvent('file-uploaded', {
                detail: e.detail,
                bubbles: true,
                composed: true
              }));
            }}
            style="flex-shrink: 0;"
          ></file-upload>

          <!-- Brain icon (thinking toggle) -->
          <button
            class="input-icon ${this.thinkingEnabled ? 'active' : ''}"
            @click=${this.handleThinkingToggle}
            title="${this.thinkingEnabled ? 'Thinking enabled' : 'Enable thinking'}"
          >
            🧠
          </button>

          <!-- Web icon (search toggle) -->
          <button
            class="input-icon ${this.searchEnabled ? 'active' : ''}"
            @click=${this.handleSearchToggle}
            title="${this.searchEnabled ? 'Search enabled' : 'Enable web search'}"
          >
            🌐
          </button>

          <!-- Text input field -->
          <input
            type="text"
            .value=${this.textInput}
            @input=${this.handleTextInput}
            @keypress=${this.handleKeyPress}
            placeholder="Type your message..."
            ?autofocus=${this.textInputVisible}
          />

          <!-- Send button -->
          <button
            class="send-btn"
            @click=${this.handleSendClick}
            ?disabled=${!this.textInput.trim()}
          >
            ➤
          </button>
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
