/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { AVAILABLE_CONNECTORS } from '../personas';
import type { ConnectorConfig, ConnectorFieldDefinition } from '../types/connector-config';
import { ConnectorConfigManager, CONNECTOR_FIELDS } from '../types/connector-config';

type PanelMode = 'list' | 'configure';

@customElement('connector-config-panel')
export class ConnectorConfigPanel extends LitElement {
  @state() mode: PanelMode = 'list';
  @state() configs: ConnectorConfig[] = [];
  @state() editingConnector: string | null = null;
  @state() formCredentials: Record<string, string> = {};
  @state() verifying = false;
  @state() verificationMessage = '';

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
  `;

  async connectedCallback() {
    super.connectedCallback();
    this.loadConfigs();
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
    
    this.formCredentials = {};
    this.verificationMessage = '';
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
      credentials: this.formCredentials,
    };

    ConnectorConfigManager.updateConfig(config);
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
          <button class="primary" @click=${this.handleSave}>Save</button>
          <button 
            class="verify" 
            @click=${this.handleVerify}
            ?disabled=${this.verifying}
          >
            ${this.verifying ? 'Verifying...' : 'Verify Connection'}
          </button>
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
