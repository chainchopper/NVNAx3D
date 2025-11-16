import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { telephonyManager } from '../../services/telephony/telephony-manager';
import type { SMSMessage } from '../../services/telephony/telephony-provider';

@customElement('sms-panel')
export class SMSPanel extends LitElement {
  @state() private messages: SMSMessage[] = [];
  @state() private recipient = '';
  @state() private messageText = '';
  @state() private busy = false;
  @state() private errorMessage = '';

  static styles = css`
    :host {
      display: block;
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 380px;
      height: 520px;
      background: rgba(20, 20, 30, 0.95);
      backdrop-filter: blur(30px);
      border-radius: 20px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      color: white;
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      flex-direction: column;
      z-index: 150;
      animation: slideUp 0.3s ease-out;
    }

    @keyframes slideUp {
      from {
        transform: translateY(100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .header {
      padding: 16px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header-title {
      font-size: 16px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .close-btn {
      background: none;
      border: none;
      color: white;
      font-size: 20px;
      cursor: pointer;
      opacity: 0.7;
      padding: 4px;
      transition: opacity 0.2s;
    }

    .close-btn:hover {
      opacity: 1;
    }

    .messages-container {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .message {
      max-width: 75%;
      padding: 10px 14px;
      border-radius: 16px;
      font-size: 14px;
      line-height: 1.4;
      word-wrap: break-word;
    }

    .message.outbound {
      align-self: flex-end;
      background: #2196f3;
      color: white;
      border-bottom-right-radius: 4px;
    }

    .message.inbound {
      align-self: flex-start;
      background: rgba(255, 255, 255, 0.1);
      color: white;
      border-bottom-left-radius: 4px;
    }

    .message-time {
      font-size: 11px;
      opacity: 0.6;
      margin-top: 4px;
    }

    .message-from {
      font-size: 11px;
      font-weight: 600;
      margin-bottom: 4px;
      opacity: 0.8;
    }

    .input-area {
      padding: 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .recipient-input {
      width: 100%;
      padding: 10px 12px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      color: white;
      font-size: 13px;
      margin-bottom: 8px;
      box-sizing: border-box;
    }

    .recipient-input:focus {
      outline: none;
      border-color: #2196f3;
    }

    .message-input-container {
      display: flex;
      gap: 8px;
    }

    .message-input {
      flex: 1;
      padding: 10px 12px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 20px;
      color: white;
      font-size: 14px;
      resize: none;
      height: 38px;
      box-sizing: border-box;
    }

    .message-input:focus {
      outline: none;
      border-color: #2196f3;
    }

    .send-btn {
      padding: 0 16px;
      background: #2196f3;
      border: none;
      border-radius: 20px;
      color: white;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
      height: 38px;
    }

    .send-btn:hover {
      background: #1976d2;
    }

    .send-btn:disabled {
      background: rgba(33, 150, 243, 0.5);
      cursor: not-allowed;
    }

    .error-message {
      padding: 8px 12px;
      background: rgba(244, 67, 54, 0.2);
      border: 1px solid rgba(244, 67, 54, 0.5);
      border-radius: 8px;
      font-size: 12px;
      color: #e57373;
      margin: 8px 12px 0;
    }

    .empty-state {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      gap: 12px;
      opacity: 0.5;
      font-size: 14px;
      text-align: center;
      padding: 20px;
    }

    .refresh-btn {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px;
      color: white;
      font-size: 12px;
      padding: 6px 12px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .refresh-btn:hover {
      background: rgba(255, 255, 255, 0.2);
    }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    this.loadMessages();
  }

  private async loadMessages(): Promise<void> {
    const provider = telephonyManager.getProvider();
    if (!provider) {
      this.errorMessage = 'Telephony not configured';
      return;
    }

    this.busy = true;
    const result = await provider.getSMSHistory(50);
    this.busy = false;

    if (result.success && result.messages) {
      this.messages = result.messages.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      setTimeout(() => {
        const container = this.shadowRoot?.querySelector('.messages-container');
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      }, 100);
    } else {
      this.errorMessage = result.error || 'Failed to load messages';
    }
  }

  private async handleSend(): Promise<void> {
    if (!this.messageText.trim() || !this.recipient.trim()) {
      return;
    }

    const provider = telephonyManager.getProvider();
    if (!provider) {
      this.errorMessage = 'Telephony not configured';
      return;
    }

    this.busy = true;
    this.errorMessage = '';

    const result = await provider.sendSMS(this.recipient, this.messageText);
    
    if (result.success) {
      this.messageText = '';
      await this.loadMessages();
    } else {
      this.errorMessage = result.error || 'Failed to send message';
    }

    this.busy = false;
  }

  private handleKeyPress(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.handleSend();
    }
  }

  private handleClose(): void {
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  private formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  render() {
    return html`
      <div class="header">
        <div class="header-title">
          💬 SMS Messages
        </div>
        <button class="refresh-btn" @click=${this.loadMessages} ?disabled=${this.busy}>
          🔄 Refresh
        </button>
        <button class="close-btn" @click=${this.handleClose}>×</button>
      </div>

      ${this.errorMessage ? html`
        <div class="error-message">${this.errorMessage}</div>
      ` : ''}

      <div class="messages-container">
        ${this.messages.length === 0 ? html`
          <div class="empty-state">
            <div>📭</div>
            <div>No messages yet</div>
            <div style="font-size: 12px;">Send a message to get started</div>
          </div>
        ` : this.messages.map(msg => html`
          <div class="message ${msg.direction}">
            ${msg.direction === 'inbound' ? html`
              <div class="message-from">${msg.from}</div>
            ` : ''}
            <div>${msg.body}</div>
            <div class="message-time">${this.formatTime(msg.timestamp)}</div>
          </div>
        `)}
      </div>

      <div class="input-area">
        <input 
          type="text" 
          class="recipient-input"
          .value=${this.recipient}
          @input=${(e: Event) => this.recipient = (e.target as HTMLInputElement).value}
          placeholder="Recipient phone number (+1234567890)"
        />
        <div class="message-input-container">
          <textarea 
            class="message-input"
            .value=${this.messageText}
            @input=${(e: Event) => this.messageText = (e.target as HTMLTextAreaElement).value}
            @keypress=${this.handleKeyPress}
            placeholder="Type a message..."
          ></textarea>
          <button 
            class="send-btn" 
            @click=${this.handleSend}
            ?disabled=${this.busy || !this.messageText.trim() || !this.recipient.trim()}
          >
            Send
          </button>
        </div>
      </div>
    `;
  }
}
