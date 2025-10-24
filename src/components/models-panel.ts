/**
 * Models Configuration Panel Component
 */

import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { providerManager } from '../services/provider-manager';
import { ModelProvider, ProviderType } from '../types/providers';
import { ProviderFactory } from '../providers/provider-factory';

@customElement('models-panel')
export class ModelsPanel extends LitElement {
  @state() providers: ModelProvider[] = [];
  @state() editingProvider: ModelProvider | null = null;
  @state() showAddCustom = false;

  static styles = css`
    :host {
      display: block;
      position: fixed;
      right: 0;
      top: 0;
      bottom: 0;
      width: 400px;
      background: rgba(20, 20, 30, 0.98);
      backdrop-filter: blur(20px);
      box-shadow: -4px 0 20px rgba(0, 0, 0, 0.5);
      z-index: 1000;
      overflow-y: auto;
      color: white;
      font-family: system-ui, -apple-system, sans-serif;
      animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }

    .header {
      padding: 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header h2 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }

    .close-btn {
      background: none;
      border: none;
      color: white;
      font-size: 24px;
      cursor: pointer;
      padding: 8px;
      opacity: 0.7;
      transition: opacity 0.2s;
    }

    .close-btn:hover {
      opacity: 1;
    }

    .content {
      padding: 24px;
    }

    .section {
      margin-bottom: 32px;
    }

    .section-title {
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: rgba(255, 255, 255, 0.6);
      margin-bottom: 16px;
    }

    .provider-card {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 12px;
      transition: all 0.2s;
    }

    .provider-card:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.2);
    }

    .provider-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .provider-name {
      font-size: 16px;
      font-weight: 500;
    }

    .status-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }

    .status-verified {
      background: rgba(76, 175, 80, 0.2);
      color: #4caf50;
    }

    .status-unverified {
      background: rgba(255, 152, 0, 0.2);
      color: #ff9800;
    }

    .provider-actions {
      display: flex;
      gap: 8px;
      margin-top: 12px;
    }

    .btn {
      padding: 8px 16px;
      border-radius: 6px;
      border: none;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
      font-weight: 500;
    }

    .btn-primary {
      background: #2196f3;
      color: white;
    }

    .btn-primary:hover {
      background: #1976d2;
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.1);
      color: white;
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .btn-danger {
      background: rgba(244, 67, 54, 0.2);
      color: #f44336;
    }

    .btn-danger:hover {
      background: rgba(244, 67, 54, 0.3);
    }

    .input-group {
      margin-bottom: 16px;
    }

    .input-group label {
      display: block;
      font-size: 14px;
      margin-bottom: 8px;
      color: rgba(255, 255, 255, 0.8);
    }

    .input-group input {
      width: 100%;
      padding: 10px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px;
      color: white;
      font-size: 14px;
      box-sizing: border-box;
    }

    .input-group input:focus {
      outline: none;
      border-color: #2196f3;
    }

    .edit-form {
      background: rgba(0, 0, 0, 0.3);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
    }

    .add-custom-btn {
      width: 100%;
      padding: 12px;
      background: rgba(33, 150, 243, 0.2);
      border: 2px dashed rgba(33, 150, 243, 0.5);
      border-radius: 12px;
      color: #2196f3;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .add-custom-btn:hover {
      background: rgba(33, 150, 243, 0.3);
      border-color: rgba(33, 150, 243, 0.7);
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.loadProviders();
  }

  loadProviders() {
    this.providers = providerManager.getAllProviders();
  }

  handleClose() {
    this.dispatchEvent(new CustomEvent('close'));
  }

  async handleVerify(provider: ModelProvider) {
    if (!provider.apiKey) {
      alert('Please configure an API key first');
      return;
    }

    try {
      // Create provider instance and verify
      const providerInstance = ProviderFactory.createProvider(
        provider.type,
        provider.apiKey,
        'gemini-2.5-flash', // Default model for verification
        provider.endpoint
      );

      const verified = await providerInstance.verify();
      
      if (verified) {
        // Fetch available models
        const models = await providerInstance.getAvailableModels();
        
        providerManager.updateProvider(provider.id, {
          verified: true,
          models,
        });

        alert(`✓ ${provider.name} verified successfully! Found ${models.length} models.`);
      } else {
        providerManager.updateProvider(provider.id, {
          verified: false,
        });
        alert(`✗ Failed to verify ${provider.name}. Please check your API key.`);
      }
    } catch (error) {
      console.error('Verification error:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    this.loadProviders();
  }

  handleEdit(provider: ModelProvider) {
    this.editingProvider = provider;
  }

  handleSaveEdit() {
    if (!this.editingProvider) return;

    const form = this.shadowRoot?.querySelector('.edit-form') as HTMLFormElement;
    const apiKey = (form?.querySelector('[name="apiKey"]') as HTMLInputElement)?.value;
    const endpoint = (form?.querySelector('[name="endpoint"]') as HTMLInputElement)?.value;

    providerManager.updateProvider(this.editingProvider.id, {
      apiKey,
      endpoint: endpoint || undefined,
      enabled: !!apiKey,
    });

    this.editingProvider = null;
    this.loadProviders();
  }

  handleCancelEdit() {
    this.editingProvider = null;
  }

  handleAddCustom() {
    this.showAddCustom = true;
  }

  handleSaveCustom() {
    const form = this.shadowRoot?.querySelector('.edit-form') as HTMLFormElement;
    const name = (form?.querySelector('[name="name"]') as HTMLInputElement)?.value;
    const endpoint = (form?.querySelector('[name="endpoint"]') as HTMLInputElement)?.value;
    const apiKey = (form?.querySelector('[name="apiKey"]') as HTMLInputElement)?.value;

    if (!name || !endpoint) return;

    providerManager.addCustomProvider({
      name,
      type: 'custom',
      endpoint,
      apiKey,
      enabled: true,
      verified: false,
      models: [],
    });

    this.showAddCustom = false;
    this.loadProviders();
  }

  handleCancelCustom() {
    this.showAddCustom = false;
  }

  handleDelete(provider: ModelProvider) {
    if (confirm(`Delete ${provider.name}?`)) {
      providerManager.deleteProvider(provider.id);
      this.loadProviders();
    }
  }

  render() {
    return html`
      <div class="header">
        <h2>Models</h2>
        <button class="close-btn" @click=${this.handleClose}>×</button>
      </div>

      <div class="content">
        <div class="section">
          <div class="section-title">Model Providers</div>

          ${this.editingProvider ? this.renderEditForm() : ''}
          ${this.showAddCustom ? this.renderAddCustomForm() : ''}

          ${this.providers.map(provider => this.renderProviderCard(provider))}

          ${!this.showAddCustom ? html`
            <button class="add-custom-btn" @click=${this.handleAddCustom}>
              + Add Custom Provider (Ollama, OpenAI-compatible)
            </button>
          ` : ''}
        </div>

        <div class="section">
          <div class="section-title">Speech-to-Text</div>
          <div class="provider-card">
            <div class="provider-name">Local Whisper (On-Device)</div>
            <div style="font-size: 13px; opacity: 0.7; margin-top: 8px;">
              Default - Uses browser-based Whisper for privacy
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Text-to-Speech</div>
          <div class="provider-card">
            <div class="provider-name">Browser TTS</div>
            <div style="font-size: 13px; opacity: 0.7; margin-top: 8px;">
              Default - Uses system speech synthesis
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderProviderCard(provider: ModelProvider) {
    if (this.editingProvider?.id === provider.id) return '';

    return html`
      <div class="provider-card">
        <div class="provider-header">
          <div class="provider-name">${provider.name}</div>
          <div class="status-badge ${provider.verified ? 'status-verified' : 'status-unverified'}">
            ${provider.verified ? '✓ Verified' : 'Not Configured'}
          </div>
        </div>

        ${provider.apiKey ? html`
          <div style="font-size: 13px; opacity: 0.7;">
            API Key: ${provider.apiKey.substring(0, 8)}...
          </div>
        ` : ''}

        ${provider.endpoint ? html`
          <div style="font-size: 13px; opacity: 0.7; margin-top: 4px;">
            Endpoint: ${provider.endpoint}
          </div>
        ` : ''}

        <div class="provider-actions">
          <button class="btn btn-primary" @click=${() => this.handleEdit(provider)}>
            Configure
          </button>
          ${provider.apiKey && !provider.verified ? html`
            <button class="btn btn-secondary" @click=${() => this.handleVerify(provider)}>
              Verify
            </button>
          ` : ''}
          ${provider.type === 'custom' ? html`
            <button class="btn btn-danger" @click=${() => this.handleDelete(provider)}>
              Delete
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  renderEditForm() {
    if (!this.editingProvider) return '';

    return html`
      <div class="edit-form">
        <h3 style="margin-top: 0;">Configure ${this.editingProvider.name}</h3>

        <div class="input-group">
          <label>API Key</label>
          <input 
            type="password" 
            name="apiKey" 
            .value=${this.editingProvider.apiKey || ''}
            placeholder="Enter your API key"
          />
        </div>

        ${this.editingProvider.type === 'custom' ? html`
          <div class="input-group">
            <label>API Endpoint</label>
            <input 
              type="url" 
              name="endpoint" 
              .value=${this.editingProvider.endpoint || ''}
              placeholder="https://api.example.com/v1"
            />
          </div>
        ` : ''}

        <div style="display: flex; gap: 8px;">
          <button class="btn btn-primary" @click=${this.handleSaveEdit}>Save</button>
          <button class="btn btn-secondary" @click=${this.handleCancelEdit}>Cancel</button>
        </div>
      </div>
    `;
  }

  renderAddCustomForm() {
    return html`
      <div class="edit-form">
        <h3 style="margin-top: 0;">Add Custom Provider</h3>

        <div class="input-group">
          <label>Provider Name</label>
          <input 
            type="text" 
            name="name" 
            placeholder="e.g., Local Ollama"
          />
        </div>

        <div class="input-group">
          <label>API Endpoint</label>
          <input 
            type="url" 
            name="endpoint" 
            placeholder="http://localhost:11434/v1"
          />
        </div>

        <div class="input-group">
          <label>API Key (optional)</label>
          <input 
            type="password" 
            name="apiKey" 
            placeholder="Leave empty if not required"
          />
        </div>

        <div style="display: flex; gap: 8px;">
          <button class="btn btn-primary" @click=${this.handleSaveCustom}>Add Provider</button>
          <button class="btn btn-secondary" @click=${this.handleCancelCustom}>Cancel</button>
        </div>
      </div>
    `;
  }
}
