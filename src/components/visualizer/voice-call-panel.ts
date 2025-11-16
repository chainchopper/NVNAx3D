import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { telephonyManager } from '../../services/telephony/telephony-manager';
import type { VoiceCall } from '../../services/telephony/telephony-provider';

@customElement('voice-call-panel')
export class VoiceCallPanel extends LitElement {
  @state() private activeCalls: VoiceCall[] = [];
  @state() private phoneNumber = '';
  @state() private busy = false;
  @state() private errorMessage = '';
  private pollInterval: number | null = null;

  static styles = css`
    :host {
      display: block;
      position: fixed;
      bottom: 24px;
      right: 420px;
      width: 340px;
      background: rgba(20, 20, 30, 0.95);
      backdrop-filter: blur(30px);
      border-radius: 20px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      color: white;
      font-family: system-ui, -apple-system, sans-serif;
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

    .make-call-section {
      padding: 16px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .phone-input {
      width: 100%;
      padding: 12px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 10px;
      color: white;
      font-size: 14px;
      margin-bottom: 12px;
      box-sizing: border-box;
    }

    .phone-input:focus {
      outline: none;
      border-color: #4caf50;
    }

    .call-btn {
      width: 100%;
      padding: 14px;
      background: #4caf50;
      border: none;
      border-radius: 10px;
      color: white;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .call-btn:hover {
      background: #45a049;
    }

    .call-btn:disabled {
      background: rgba(76, 175, 80, 0.5);
      cursor: not-allowed;
    }

    .active-calls {
      padding: 16px 20px;
      max-height: 400px;
      overflow-y: auto;
    }

    .calls-header {
      font-size: 13px;
      font-weight: 600;
      opacity: 0.7;
      margin-bottom: 12px;
    }

    .call-item {
      padding: 14px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      margin-bottom: 12px;
    }

    .call-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }

    .call-number {
      font-weight: 600;
      font-size: 14px;
    }

    .call-status {
      font-size: 12px;
      padding: 4px 10px;
      border-radius: 12px;
      background: rgba(33, 150, 243, 0.2);
      border: 1px solid rgba(33, 150, 243, 0.5);
      color: #64b5f6;
    }

    .call-status.ringing {
      background: rgba(255, 193, 7, 0.2);
      border-color: rgba(255, 193, 7, 0.5);
      color: #ffd54f;
    }

    .call-status.in-progress {
      background: rgba(76, 175, 80, 0.2);
      border-color: rgba(76, 175, 80, 0.5);
      color: #81c784;
    }

    .call-controls {
      display: flex;
      gap: 8px;
      margin-top: 10px;
    }

    .control-btn {
      flex: 1;
      padding: 8px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.05);
      color: white;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .control-btn:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .control-btn.active {
      background: rgba(33, 150, 243, 0.3);
      border-color: #2196f3;
    }

    .hangup-btn {
      width: 100%;
      padding: 10px;
      background: #f44336;
      border: none;
      border-radius: 8px;
      color: white;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 8px;
      transition: background 0.2s;
    }

    .hangup-btn:hover {
      background: #d32f2f;
    }

    .empty-state {
      padding: 40px 20px;
      text-align: center;
      opacity: 0.5;
      font-size: 14px;
    }

    .error-message {
      padding: 8px 12px;
      background: rgba(244, 67, 54, 0.2);
      border: 1px solid rgba(244, 67, 54, 0.5);
      border-radius: 8px;
      font-size: 12px;
      color: #e57373;
      margin: 0 20px 12px;
    }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    this.loadActiveCalls();
    this.pollInterval = window.setInterval(() => this.loadActiveCalls(), 3000);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.pollInterval !== null) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  private async loadActiveCalls(): Promise<void> {
    const provider = telephonyManager.getProvider();
    if (!provider) {
      return;
    }

    const result = await provider.getActiveCalls();
    if (result.success && result.calls) {
      this.activeCalls = result.calls;
    }
  }

  private async handleMakeCall(): Promise<void> {
    if (!this.phoneNumber.trim()) {
      return;
    }

    const provider = telephonyManager.getProvider();
    if (!provider) {
      this.errorMessage = 'Telephony not configured';
      return;
    }

    this.busy = true;
    this.errorMessage = '';

    const result = await provider.makeCall(this.phoneNumber);
    
    if (result.success) {
      this.phoneNumber = '';
      await this.loadActiveCalls();
    } else {
      this.errorMessage = result.error || 'Failed to make call';
    }

    this.busy = false;
  }

  private async handleToggleControl(callSid: string, control: 'mute' | 'listen' | 'join'): Promise<void> {
    const provider = telephonyManager.getProvider();
    if (!provider) {
      return;
    }

    const call = this.activeCalls.find(c => c.sid === callSid);
    if (!call) {
      return;
    }

    const updates: any = {};
    if (control === 'mute') {
      updates.mute = !call.userMuted;
    } else if (control === 'listen') {
      updates.listen = !call.userListening;
    } else if (control === 'join') {
      updates.join = !call.userJoined;
    }

    await provider.updateCallControls(callSid, updates);
    await this.loadActiveCalls();
  }

  private async handleHangup(callSid: string): Promise<void> {
    const provider = telephonyManager.getProvider();
    if (!provider) {
      return;
    }

    await provider.hangupCall(callSid);
    await this.loadActiveCalls();
  }

  private handleClose(): void {
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  private formatDuration(startTime: string): string {
    const start = new Date(startTime).getTime();
    const now = Date.now();
    const seconds = Math.floor((now - start) / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  render() {
    return html`
      <div class="header">
        <div class="header-title">
          📞 Voice Calls
        </div>
        <button class="close-btn" @click=${this.handleClose}>×</button>
      </div>

      <div class="make-call-section">
        <input 
          type="tel" 
          class="phone-input"
          .value=${this.phoneNumber}
          @input=${(e: Event) => this.phoneNumber = (e.target as HTMLInputElement).value}
          placeholder="Phone number (+1234567890)"
        />
        <button 
          class="call-btn" 
          @click=${this.handleMakeCall}
          ?disabled=${this.busy || !this.phoneNumber.trim()}
        >
          <span>📞</span>
          <span>${this.busy ? 'Calling...' : 'Make Call'}</span>
        </button>
      </div>

      ${this.errorMessage ? html`
        <div class="error-message">${this.errorMessage}</div>
      ` : ''}

      <div class="active-calls">
        ${this.activeCalls.length > 0 ? html`
          <div class="calls-header">Active Calls (${this.activeCalls.length})</div>
          ${this.activeCalls.map(call => html`
            <div class="call-item">
              <div class="call-info">
                <div class="call-number">${call.direction === 'outbound' ? call.to : call.from}</div>
                <div class="call-status ${call.status}">${call.status}</div>
              </div>
              
              ${call.status === 'in-progress' ? html`
                <div style="font-size: 12px; opacity: 0.7; margin-bottom: 8px;">
                  ⏱️ ${this.formatDuration(call.startTime)}
                </div>
                
                <div class="call-controls">
                  <button 
                    class="control-btn ${call.userMuted ? 'active' : ''}"
                    @click=${() => this.handleToggleControl(call.sid, 'mute')}
                  >
                    ${call.userMuted ? '🔇 Muted' : '🎤 Mute'}
                  </button>
                  <button 
                    class="control-btn ${call.userListening ? 'active' : ''}"
                    @click=${() => this.handleToggleControl(call.sid, 'listen')}
                  >
                    ${call.userListening ? '🔊 Listening' : '🔇 Listen'}
                  </button>
                  <button 
                    class="control-btn ${call.userJoined ? 'active' : ''}"
                    @click=${() => this.handleToggleControl(call.sid, 'join')}
                  >
                    ${call.userJoined ? '✅ Joined' : '👤 Join'}
                  </button>
                </div>
              ` : ''}
              
              <button class="hangup-btn" @click=${() => this.handleHangup(call.sid)}>
                ❌ Hang Up
              </button>
            </div>
          `)}
        ` : html`
          <div class="empty-state">
            <div>📵</div>
            <div>No active calls</div>
          </div>
        `}
      </div>
    `;
  }
}
