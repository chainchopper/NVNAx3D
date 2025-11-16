import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { telephonyManager } from '../../services/telephony/telephony-manager';
import type { TelephonyConfig } from '../../services/telephony/telephony-provider';

@customElement('telephony-settings-panel')
export class TelephonySettingsPanel extends LitElement {
  @state() private config: TelephonyConfig = {
    providerType: 'twilio',
    enabled: false,
    credentials: {}
  };
  @state() private busy = false;
  @state() private saveMessage = '';
  @state() private twilioAccountSid = '';
  @state() private twilioAuthToken = '';
  @state() private twilioPhoneNumber = '';
  @state() private freepbxSipEndpoint = '';
  @state() private freepbxSipUsername = '';
  @state() private freepbxSipPassword = '';

  static styles = css`
    :host {
      display: block;
      padding: 24px;
      color: white;
      font-family: system-ui, -apple-system, sans-serif;
    }

    .section {
      margin-bottom: 32px;
    }

    .section-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .provider-selector {
      display: flex;
      gap: 12px;
      margin-bottom: 24px;
    }

    .provider-option {
      flex: 1;
      padding: 16px;
      background: rgba(255, 255, 255, 0.05);
      border: 2px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      text-align: center;
    }

    .provider-option:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.3);
    }

    .provider-option.selected {
      background: rgba(33, 150, 243, 0.2);
      border-color: #2196f3;
    }

    .provider-name {
      font-weight: 600;
      margin-bottom: 4px;
    }

    .provider-desc {
      font-size: 12px;
      opacity: 0.7;
    }

    .form-group {
      margin-bottom: 20px;
    }

    label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 8px;
      opacity: 0.9;
    }

    input, select {
      width: 100%;
      padding: 12px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px;
      color: white;
      font-size: 14px;
      box-sizing: border-box;
    }

    input:focus, select:focus {
      outline: none;
      border-color: #2196f3;
      background: rgba(255, 255, 255, 0.15);
    }

    input[type="password"] {
      font-family: monospace;
    }

    .toggle-container {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      margin-bottom: 24px;
    }

    .toggle-label {
      flex: 1;
      font-weight: 500;
    }

    .toggle {
      position: relative;
      width: 52px;
      height: 28px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 14px;
      cursor: pointer;
      transition: background 0.3s;
    }

    .toggle.active {
      background: #2196f3;
    }

    .toggle-knob {
      position: absolute;
      top: 3px;
      left: 3px;
      width: 22px;
      height: 22px;
      background: white;
      border-radius: 50%;
      transition: transform 0.3s;
    }

    .toggle.active .toggle-knob {
      transform: translateX(24px);
    }

    .btn {
      padding: 12px 24px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary {
      background: #2196f3;
      color: white;
    }

    .btn-primary:hover {
      background: #1976d2;
    }

    .btn-primary:disabled {
      background: rgba(33, 150, 243, 0.5);
      cursor: not-allowed;
    }

    .save-message {
      margin-top: 12px;
      padding: 12px;
      border-radius: 6px;
      font-size: 14px;
    }

    .save-message.success {
      background: rgba(76, 175, 80, 0.2);
      border: 1px solid rgba(76, 175, 80, 0.5);
      color: #81c784;
    }

    .save-message.error {
      background: rgba(244, 67, 54, 0.2);
      border: 1px solid rgba(244, 67, 54, 0.5);
      color: #e57373;
    }

    .help-text {
      font-size: 12px;
      opacity: 0.6;
      margin-top: 6px;
    }

    .credentials-section {
      padding: 20px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    this.loadConfig();
  }

  private loadConfig(): void {
    const savedConfig = telephonyManager.getConfig();
    if (savedConfig) {
      this.config = savedConfig;
      
      if (savedConfig.providerType === 'twilio') {
        this.twilioAccountSid = savedConfig.credentials.accountSid || '';
        this.twilioAuthToken = savedConfig.credentials.authToken || '';
        this.twilioPhoneNumber = savedConfig.credentials.phoneNumber || '';
      } else if (savedConfig.providerType === 'freepbx') {
        this.freepbxSipEndpoint = savedConfig.credentials.sipEndpoint || '';
        this.freepbxSipUsername = savedConfig.credentials.sipUsername || '';
        this.freepbxSipPassword = savedConfig.credentials.sipPassword || '';
      }
    }
  }

  private handleProviderChange(providerType: 'twilio' | 'freepbx'): void {
    this.config = { ...this.config, providerType };
  }

  private handleToggleEnabled(): void {
    this.config = { ...this.config, enabled: !this.config.enabled };
  }

  private async handleSave(): Promise<void> {
    this.busy = true;
    this.saveMessage = '';

    const credentials: Record<string, string> = {};

    if (this.config.providerType === 'twilio') {
      credentials.accountSid = this.twilioAccountSid;
      credentials.authToken = this.twilioAuthToken;
      credentials.phoneNumber = this.twilioPhoneNumber;

      if (!credentials.accountSid || !credentials.authToken || !credentials.phoneNumber) {
        this.saveMessage = 'Please fill in all Twilio credentials';
        this.busy = false;
        return;
      }
    } else if (this.config.providerType === 'freepbx') {
      credentials.sipEndpoint = this.freepbxSipEndpoint;
      credentials.sipUsername = this.freepbxSipUsername;
      credentials.sipPassword = this.freepbxSipPassword;

      if (!credentials.sipEndpoint || !credentials.sipUsername || !credentials.sipPassword) {
        this.saveMessage = 'Please fill in all FreePBX credentials';
        this.busy = false;
        return;
      }
    }

    const result = await telephonyManager.saveConfig({
      ...this.config,
      credentials
    });

    if (result.success) {
      this.saveMessage = 'Configuration saved successfully!';
    } else {
      this.saveMessage = `Error: ${result.error || 'Failed to save configuration'}`;
    }

    this.busy = false;

    setTimeout(() => {
      this.saveMessage = '';
    }, 3000);
  }

  render() {
    return html`
      <div class="section">
        <div class="section-title">
          📞 Telephony Configuration
        </div>

        <div class="toggle-container">
          <div class="toggle-label">Enable Telephony (SMS & Voice Calls)</div>
          <div 
            class="toggle ${this.config.enabled ? 'active' : ''}" 
            @click=${this.handleToggleEnabled}
          >
            <div class="toggle-knob"></div>
          </div>
        </div>

        <div class="provider-selector">
          <div 
            class="provider-option ${this.config.providerType === 'twilio' ? 'selected' : ''}"
            @click=${() => this.handleProviderChange('twilio')}
          >
            <div class="provider-name">Twilio</div>
            <div class="provider-desc">Cloud-based SMS & Voice (Paid)</div>
          </div>
          <div 
            class="provider-option ${this.config.providerType === 'freepbx' ? 'selected' : ''}"
            @click=${() => this.handleProviderChange('freepbx')}
          >
            <div class="provider-name">FreePBX</div>
            <div class="provider-desc">Self-hosted SIP Server (Free)</div>
          </div>
        </div>

        ${this.config.providerType === 'twilio' ? html`
          <div class="credentials-section">
            <div class="form-group">
              <label>Account SID</label>
              <input 
                type="text" 
                .value=${this.twilioAccountSid}
                @input=${(e: Event) => this.twilioAccountSid = (e.target as HTMLInputElement).value}
                placeholder="AC..."
              />
              <div class="help-text">Find in Twilio Console → Account Info</div>
            </div>

            <div class="form-group">
              <label>Auth Token</label>
              <input 
                type="password" 
                .value=${this.twilioAuthToken}
                @input=${(e: Event) => this.twilioAuthToken = (e.target as HTMLInputElement).value}
                placeholder="••••••••••••••••"
              />
              <div class="help-text">Find in Twilio Console → Account Info</div>
            </div>

            <div class="form-group">
              <label>Phone Number</label>
              <input 
                type="text" 
                .value=${this.twilioPhoneNumber}
                @input=${(e: Event) => this.twilioPhoneNumber = (e.target as HTMLInputElement).value}
                placeholder="+1234567890"
              />
              <div class="help-text">Your Twilio phone number (include country code)</div>
            </div>
          </div>
        ` : html`
          <div class="credentials-section">
            <div class="form-group">
              <label>SIP Endpoint</label>
              <input 
                type="text" 
                .value=${this.freepbxSipEndpoint}
                @input=${(e: Event) => this.freepbxSipEndpoint = (e.target as HTMLInputElement).value}
                placeholder="sip.yourserver.com:5060"
              />
              <div class="help-text">Your FreePBX server address and port</div>
            </div>

            <div class="form-group">
              <label>SIP Username</label>
              <input 
                type="text" 
                .value=${this.freepbxSipUsername}
                @input=${(e: Event) => this.freepbxSipUsername = (e.target as HTMLInputElement).value}
                placeholder="extension or username"
              />
              <div class="help-text">SIP extension or username</div>
            </div>

            <div class="form-group">
              <label>SIP Password</label>
              <input 
                type="password" 
                .value=${this.freepbxSipPassword}
                @input=${(e: Event) => this.freepbxSipPassword = (e.target as HTMLInputElement).value}
                placeholder="••••••••"
              />
              <div class="help-text">SIP extension password</div>
            </div>
          </div>
        `}

        <button 
          class="btn btn-primary" 
          @click=${this.handleSave}
          ?disabled=${this.busy}
        >
          ${this.busy ? 'Saving...' : 'Save Configuration'}
        </button>

        ${this.saveMessage ? html`
          <div class="save-message ${this.saveMessage.includes('Error') ? 'error' : 'success'}">
            ${this.saveMessage}
          </div>
        ` : ''}
      </div>
    `;
  }
}
