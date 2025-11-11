/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { AVAILABLE_CONNECTORS } from '../personas';
import type { ConnectorConfig, ConnectorFieldDefinition } from '../types/connector-config';
import { ConnectorConfigManager, CONNECTOR_FIELDS } from '../types/connector-config';
import { oauthService } from '../services/oauth-service';

type PanelMode = 'list' | 'configure';

@customElement('connector-config-panel')
export class ConnectorConfigPanel extends LitElement {
  @state() mode: PanelMode = 'list';
  @state() configs: ConnectorConfig[] = [];
  @state() editingConnector: string | null = null;
  @state() formCredentials: Record<string, string> = {};
  @state() verifying = false;
  @state() verificationMessage = '';
  @state() oauthLoading = false;
  @state() oauthConnected = false;
  
  private oauthUnsubscribe?: () => void;

  static styles = css`
    :host {
      display: block;
      height: 100%;
    }

    .panel-content {
      height: 100%;
      overflow-y: auto;
      padding: 16px;
    }

    .header {
      margin-bottom: 16px;
    }

    .header h3 {
      margin: 0 0 8px 0;
      color: white;
    }

    .header p {
      margin: 0;
      color: rgba(255, 255, 255, 0.7);
      font-size: 14px;
      line-height: 1.5;
    }

    .connector-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .connector-item {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 12px;
      transition: all 0.2s ease;
    }

    .connector-item:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(135, 206, 250, 0.5);
    }

    .connector-item.verified {
      border-color: rgba(76, 175, 80, 0.5);
    }

    .connector-item.configured {
      border-color: rgba(255, 193, 7, 0.5);
    }

    .connector-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .connector-info {
      flex: 1;
    }

    .connector-name {
      font-weight: bold;
      font-size: 16px;
      color: white;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .status-badge {
      font-size: 20px;
    }

    .status-badge.verified {
      color: #4caf50;
    }

    .status-badge.configured {
      color: #ffc107;
    }

    .status-badge.not-configured {
      color: #999;
    }

    .connector-description {
      color: rgba(255, 255, 255, 0.7);
      font-size: 13px;
      margin-top: 4px;
    }

    .connector-status {
      font-size: 12px;
      margin-top: 4px;
    }

    .status-text {
      padding: 2px 8px;
      border-radius: 4px;
      display: inline-block;
    }

    .status-text.verified {
      background: rgba(76, 175, 80, 0.2);
      color: #4caf50;
    }

    .status-text.configured {
      background: rgba(255, 193, 7, 0.2);
      color: #ffc107;
    }

    .status-text.not-configured {
      background: rgba(158, 158, 158, 0.2);
      color: #999;
    }

    .connector-actions {
      display: flex;
      gap: 8px;
    }

    .connector-actions button {
      padding: 6px 12px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      font-weight: bold;
      transition: opacity 0.2s;
    }

    .connector-actions button:hover {
      opacity: 0.8;
    }

    .connector-actions button.configure {
      background: #87ceeb;
      color: #100c14;
    }

    .connector-actions button.verify {
      background: #4caf50;
      color: white;
    }

    .connector-actions button.delete {
      background: #f44336;
      color: white;
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-weight: bold;
      color: white;
    }

    .form-group .help-text {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.6);
      margin-top: 4px;
    }

    .form-group input {
      width: 100%;
      padding: 8px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 4px;
      color: white;
      box-sizing: border-box;
    }

    .form-group input::placeholder {
      color: rgba(255, 255, 255, 0.4);
    }

    .form-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      margin-top: 16px;
    }

    .form-actions button {
      padding: 10px 20px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
    }

    .form-actions button.primary {
      background: #87ceeb;
      color: #100c14;
    }

    .form-actions button.secondary {
      background: rgba(255, 255, 255, 0.2);
      color: white;
    }

    .form-actions button.verify {
      background: #4caf50;
      color: white;
    }

    .form-actions button:hover {
      opacity: 0.8;
    }

    .form-actions button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .verification-message {
      padding: 12px;
      border-radius: 4px;
      margin-top: 16px;
      font-size: 14px;
    }

    .verification-message.success {
      background: rgba(76, 175, 80, 0.2);
      border: 1px solid rgba(76, 175, 80, 0.5);
      color: #4caf50;
    }

    .verification-message.error {
      background: rgba(244, 67, 54, 0.2);
      border: 1px solid rgba(244, 67, 54, 0.5);
      color: #f44336;
    }

    .back-button {
      margin-bottom: 16px;
      padding: 8px 16px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 4px;
      color: white;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .back-button:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: rgba(255, 255, 255, 0.5);
    }

    .empty-state-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }

    .oauth-button {
      width: 100%;
      padding: 12px 20px;
      background: #4285f4;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 14px;
      font-weight: bold;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-bottom: 16px;
    }

    .oauth-button:hover:not(:disabled) {
      background: #357ae8;
    }

    .oauth-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .oauth-divider {
      text-align: center;
      margin: 20px 0;
      color: rgba(255, 255, 255, 0.5);
      position: relative;
    }

    .oauth-divider::before,
    .oauth-divider::after {
      content: '';
      position: absolute;
      top: 50%;
      width: 45%;
      height: 1px;
      background: rgba(255, 255, 255, 0.2);
    }

    .oauth-divider::before {
      left: 0;
    }

    .oauth-divider::after {
      right: 0;
    }
  `;

  async connectedCallback() {
    super.connectedCallback();
    this.loadConfigs();
    
    // Subscribe to OAuth state changes
    this.oauthUnsubscribe = oauthService.subscribe(() => {
      this.checkOAuthStatus();
      this.requestUpdate();
    });
    
    // Initial OAuth status check
    this.checkOAuthStatus();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.oauthUnsubscribe) {
      this.oauthUnsubscribe();
    }
  }

  private async checkOAuthStatus() {
    if (!this.editingConnector) return;
    
    const authState = await oauthService.getConnectorAuthState(this.editingConnector);
    this.oauthConnected = authState.isConnected;
    
    // Handle connection success
    if (authState.isConnected && this.oauthLoading) {
      const config: ConnectorConfig = {
        id: this.editingConnector,
        name: AVAILABLE_CONNECTORS.find(c => c.id === this.editingConnector)?.name || this.editingConnector,
        configured: true,
        verified: true,
        lastVerified: new Date().toISOString(),
      };

      ConnectorConfigManager.updateConfig(config);
      this.loadConfigs();
      this.oauthLoading = false;
      
      const providerName = oauthService.getProviderName(authState.providerId);
      this.verificationMessage = `✅ ${providerName} account connected successfully!`;
      console.log(`[OAuth] Successfully connected ${providerName} account`);
      
      // Auto-close the form after successful connection
      setTimeout(() => {
        this.mode = 'list';
        this.editingConnector = null;
      }, 1500);
    }
    // Handle connection failure/cancellation
    else if (!authState.isConnected && this.oauthLoading) {
      this.oauthLoading = false;
      const providerName = authState.providerId !== 'none' 
        ? oauthService.getProviderName(authState.providerId)
        : 'OAuth';
      this.verificationMessage = `⚠️ ${providerName} authorization was cancelled or failed. Please try again.`;
      console.log(`[OAuth] Authorization cancelled or failed for ${providerName}`);
    }
  }

  private loadConfigs() {
    this.configs = ConnectorConfigManager.loadConfigs();
  }

  private getConnectorConfig(connectorId: string): ConnectorConfig | null {
    return this.configs.find(c => c.id === connectorId) || null;
  }

  private getStatusIcon(connectorId: string): string {
    const config = this.getConnectorConfig(connectorId);
    if (!config || !config.configured) return '⚪';
    if (config.verified) return '✅';
    return '⚠️';
  }

  private getStatusText(connectorId: string): { text: string; class: string } {
    const config = this.getConnectorConfig(connectorId);
    if (!config || !config.configured) {
      return { text: 'Not Configured', class: 'not-configured' };
    }
    if (config.verified) {
      const lastVerified = config.lastVerified 
        ? new Date(config.lastVerified).toLocaleDateString() 
        : 'Unknown';
      return { text: `Verified (${lastVerified})`, class: 'verified' };
    }
    return { text: 'Configured (Not Verified)', class: 'configured' };
  }

  private handleConfigure(connectorId: string) {
    this.editingConnector = connectorId;
    this.mode = 'configure';
    
    // Reset state to avoid stale UI
    this.formCredentials = {};
    this.verificationMessage = '';
    this.oauthLoading = false;
    this.oauthConnected = false;
    
    // Check initial OAuth status
    this.checkOAuthStatus();
  }

  private async handleVerify() {
    if (!this.editingConnector) return;

    this.verifying = true;
    this.verificationMessage = '';

    try {
      const fields = CONNECTOR_FIELDS[this.editingConnector] || [];
      const missingFields = fields.filter(f => f.required && !this.formCredentials[f.key]);
      
      if (missingFields.length > 0) {
        this.verificationMessage = `Please fill in all required fields: ${missingFields.map(f => f.label).join(', ')}`;
        this.verifying = false;
        return;
      }

      const response = await fetch('/api/connectors/configure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          connectorId: this.editingConnector,
          credentials: this.formCredentials,
        }),
      });

      const result = await response.json();

      if (result.success && result.verified) {
        const config: ConnectorConfig = {
          id: this.editingConnector,
          name: AVAILABLE_CONNECTORS.find(c => c.id === this.editingConnector)?.name || this.editingConnector,
          configured: true,
          verified: true,
          lastVerified: new Date().toISOString(),
        };
        
        ConnectorConfigManager.updateConfig(config);
        this.loadConfigs();
        this.verificationMessage = `✅ Connection verified successfully! Credentials stored securely on backend.`;
      } else {
        this.verificationMessage = `❌ Verification failed: ${result.error || 'Unknown error'}`;
      }
    } catch (error: any) {
      this.verificationMessage = `❌ Verification error: ${error.message}`;
    } finally {
      this.verifying = false;
    }
  }

  private getVerifyEndpoint(connectorId: string): string | null {
    const endpoints: Record<string, string> = {
      gmail: '/api/connectors/gmail/verify',
      google_calendar: '/api/connectors/calendar/verify',
      google_docs: '/api/connectors/googledocs/verify',
      google_sheets: '/api/connectors/googlesheets/verify',
      github: '/api/connectors/github/verify',
      notion: '/api/connectors/notion/verify',
      linear: '/api/connectors/linear/verify',
      slack: '/api/connectors/slack/verify',
      outlook: '/api/connectors/outlook/verify',
      jira: '/api/connectors/jira/verify',
      asana: '/api/connectors/asana/verify',
      confluence: '/api/connectors/confluence/verify',
      homeassistant: '/api/connectors/homeassistant/verify',
      frigate_events: '/api/connectors/frigate/verify',
    };
    
    return endpoints[connectorId] || null;
  }

  private handleSave() {
    if (!this.editingConnector) return;

    const config: ConnectorConfig = {
      id: this.editingConnector,
      name: AVAILABLE_CONNECTORS.find(c => c.id === this.editingConnector)?.name || this.editingConnector,
      configured: true,
      verified: false,
    };

    ConnectorConfigManager.updateConfig(config);
    
    // Store credentials separately in localStorage
    const credentialsKey = `connector_credentials_${this.editingConnector}`;
    localStorage.setItem(credentialsKey, JSON.stringify(this.formCredentials));
    
    this.loadConfigs();
    this.mode = 'list';
    this.editingConnector = null;
    this.formCredentials = {};
  }

  private handleDelete(connectorId: string) {
    if (confirm(`Are you sure you want to delete the configuration for ${connectorId}?`)) {
      ConnectorConfigManager.deleteConfig(connectorId);
      this.loadConfigs();
    }
  }

  private handleCancel() {
    this.mode = 'list';
    this.editingConnector = null;
    this.formCredentials = {};
    this.verificationMessage = '';
  }

  private isOAuthConnector(connectorId: string): boolean {
    return oauthService.isOAuthConnector(connectorId);
  }

  private async handleOAuth() {
    if (!this.editingConnector) return;

    const providerId = oauthService.getProviderForConnector(this.editingConnector);
    if (!providerId) {
      this.verificationMessage = '❌ No OAuth provider for this connector';
      return;
    }

    this.oauthLoading = true;
    this.verificationMessage = `Opening ${oauthService.getProviderName(providerId)} authorization window...`;
    
    try {
      // Use centralized oauth-service (opens popup and monitors)
      await oauthService.connectProvider(providerId);
      
      // OAuth service will handle popup and callback
      // Status will be updated via subscription → checkOAuthStatus() → automatic config save
      // No fixed timeout - we rely on the subscription callback to detect success
      
    } catch (error: any) {
      console.error('[OAuth] Error:', error);
      this.verificationMessage = `❌ OAuth error: ${error.message}`;
      this.oauthLoading = false;
    }
  }

  render() {
    if (this.mode === 'configure' && this.editingConnector) {
      return this.renderConfigureForm();
    }

    return this.renderList();
  }

  private renderList() {
    return html`
      <div class="panel-content">
        <div class="header">
          <h3>Connector Configuration</h3>
          <p>
            Configure your API credentials for each connector. Configured and verified connectors
            will be available for use by your PersonI agents.
          </p>
        </div>

        ${AVAILABLE_CONNECTORS.length === 0
          ? html`
              <div class="empty-state">
                <div class="empty-state-icon">🔌</div>
                <div>No connectors available</div>
              </div>
            `
          : html`
              <ul class="connector-list">
                ${AVAILABLE_CONNECTORS.map(connector => this.renderConnectorItem(connector))}
              </ul>
            `}
      </div>
    `;
  }

  private renderConnectorItem(connector: any) {
    const config = this.getConnectorConfig(connector.id);
    const statusIcon = this.getStatusIcon(connector.id);
    const status = this.getStatusText(connector.id);
    const itemClass = config?.verified ? 'verified' : config?.configured ? 'configured' : '';

    return html`
      <li class="connector-item ${itemClass}">
        <div class="connector-header">
          <div class="connector-info">
            <div class="connector-name">
              <span class="status-badge ${status.class}">${statusIcon}</span>
              <span>${connector.name}</span>
            </div>
            <div class="connector-description">${connector.description}</div>
            <div class="connector-status">
              <span class="status-text ${status.class}">${status.text}</span>
            </div>
          </div>
          <div class="connector-actions">
            <button class="configure" @click=${() => this.handleConfigure(connector.id)}>
              ${config?.configured ? 'Reconfigure' : 'Configure'}
            </button>
            ${config?.configured
              ? html`
                  <button class="delete" @click=${() => this.handleDelete(connector.id)}>
                    Delete
                  </button>
                `
              : ''}
          </div>
        </div>
      </li>
    `;
  }

  private renderConfigureForm() {
    const connector = AVAILABLE_CONNECTORS.find(c => c.id === this.editingConnector);
    const fields = CONNECTOR_FIELDS[this.editingConnector!] || [];

    if (!connector) {
      return html`<div>Connector not found</div>`;
    }

    const isOAuth = this.isOAuthConnector(this.editingConnector!);
    const providerId = isOAuth ? oauthService.getProviderForConnector(this.editingConnector!) : null;
    const providerName = providerId ? oauthService.getProviderName(providerId) : '';

    return html`
      <div class="panel-content">
        <button class="back-button" @click=${this.handleCancel}>
          <span>←</span>
          <span>Back to Connectors</span>
        </button>

        <div class="header">
          <h3>Configure ${connector.name}</h3>
          <p>${connector.description}</p>
        </div>

        ${isOAuth ? html`
          <button 
            class="oauth-button" 
            @click=${this.handleOAuth}
            ?disabled=${this.oauthLoading}
          >
            ${providerId === 'google' ? html`
              <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path fill="#4285F4" d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 01-1.8 2.71v2.26h2.92a8.78 8.78 0 002.68-6.61z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.83.86-3.04.86-2.34 0-4.32-1.58-5.02-3.71H.98v2.33A9 9 0 009 18z"/>
                <path fill="#FBBC05" d="M3.98 10.71a5.41 5.41 0 010-3.42V4.96H.98A9 9 0 000 9c0 1.45.35 2.82.98 4.04l2.99-2.33z"/>
                <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 009 0 9 9 0 00.98 4.96l3 2.33C4.68 5.16 6.66 3.58 9 3.58z"/>
              </svg>
            ` : '🔐'}
            ${this.oauthLoading ? 'Connecting...' : `Connect with ${providerName}`}
          </button>

          ${this.oauthConnected ? html`
            <div style="text-align: center; margin: 16px 0; color: #4caf50;">
              ✅ Connected to ${providerName}
            </div>
          ` : ''}

          <div class="oauth-divider">OR</div>
        ` : ''}

        ${fields.map(field => this.renderField(field))}

        ${this.verificationMessage
          ? html`
              <div class="verification-message ${this.verificationMessage.includes('✅') ? 'success' : 'error'}">
                ${this.verificationMessage}
              </div>
            `
          : ''}

        <div class="form-actions">
          <button class="secondary" @click=${this.handleCancel}>Cancel</button>
          ${!isOAuth ? html`
            <button class="primary" @click=${this.handleSave}>Save</button>
            <button 
              class="verify" 
              @click=${this.handleVerify}
              ?disabled=${this.verifying}
            >
              ${this.verifying ? 'Verifying...' : 'Verify Connection'}
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  private renderField(field: ConnectorFieldDefinition) {
    const value = this.formCredentials[field.key] || '';

    return html`
      <div class="form-group">
        <label>
          ${field.label}
          ${field.required ? html`<span style="color: #f44336;">*</span>` : ''}
        </label>
        <input
          type=${field.type}
          .value=${value}
          placeholder=${field.placeholder || ''}
          @input=${(e: Event) => {
            this.formCredentials[field.key] = (e.target as HTMLInputElement).value;
            this.requestUpdate();
          }}
        />
        ${field.helpText ? html`<div class="help-text">${field.helpText}</div>` : ''}
      </div>
    `;
  }
}
