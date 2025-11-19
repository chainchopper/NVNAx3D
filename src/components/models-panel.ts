/**
 * Models Configuration Panel Component
 */

import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { providerManager } from '../services/provider-manager';
import { ModelProvider, ProviderType } from '../types/providers';
import { ProviderFactory } from '../providers/provider-factory';
import { localWhisperService, LoadingState } from '../services/local-whisper';
import { SttPreferences, WHISPER_MODELS, DEFAULT_STT_PREFERENCES, WhisperModelSize } from '../types/stt-preferences';

const STT_PREFERENCES_KEY = 'stt-preferences';

@customElement('models-panel')
export class ModelsPanel extends LitElement {
  @state() providers: ModelProvider[] = [];
  @state() editingProvider: ModelProvider | null = null;
  @state() showAddCustom = false;
  @state() sttPreferences: SttPreferences = DEFAULT_STT_PREFERENCES;
  @state() whisperLoadingState: LoadingState = 'idle';
  @state() whisperLoadingProgress = 0;

  static styles = css`
    :host {
      display: block;
      height: 100%;
      overflow-y: auto;
      color: white;
      font-family: system-ui, -apple-system, sans-serif;
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

    .toggle-switch {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 24px;
    }

    .toggle-switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .toggle-slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(255, 255, 255, 0.2);
      transition: 0.3s;
      border-radius: 24px;
    }

    .toggle-slider:before {
      position: absolute;
      content: '';
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: 0.3s;
      border-radius: 50%;
    }

    input:checked + .toggle-slider {
      background-color: #2196f3;
    }

    input:checked + .toggle-slider:before {
      transform: translateX(20px);
    }

    .input-group select {
      width: 100%;
      padding: 10px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px;
      color: white;
      font-size: 14px;
      box-sizing: border-box;
      cursor: pointer;
    }

    .input-group select:focus {
      outline: none;
      border-color: #2196f3;
    }

    .input-group select option {
      background: #1a1a24;
      color: white;
    }

    .loading-bar {
      width: 100%;
      height: 4px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 2px;
      overflow: hidden;
      margin-top: 12px;
    }

    .loading-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #2196f3, #64b5f6);
      transition: width 0.3s ease;
    }

    .stt-controls {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 12px;
    }

    .stt-control-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .model-size-info {
      font-size: 12px;
      opacity: 0.6;
      margin-top: 4px;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.loadProviders();
    this.loadSttPreferences();
    this.setupWhisperListeners();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    localWhisperService.removeEventListener('loading', this.handleWhisperLoading);
    localWhisperService.removeEventListener('progress', this.handleWhisperProgress);
    localWhisperService.removeEventListener('ready', this.handleWhisperReady);
    localWhisperService.removeEventListener('error', this.handleWhisperError);
  }

  loadProviders() {
    this.providers = providerManager.getAllProviders();
  }

  loadSttPreferences() {
    const saved = localStorage.getItem(STT_PREFERENCES_KEY);
    if (saved) {
      this.sttPreferences = JSON.parse(saved);
    }
    this.whisperLoadingState = localWhisperService.getLoadingState();
  }

  saveSttPreferences() {
    localStorage.setItem(STT_PREFERENCES_KEY, JSON.stringify(this.sttPreferences));
    this.dispatchEvent(new CustomEvent('stt-preferences-changed', { 
      detail: this.sttPreferences 
    }));
  }

  setupWhisperListeners = () => {
    localWhisperService.addEventListener('loading', this.handleWhisperLoading as EventListener);
    localWhisperService.addEventListener('progress', this.handleWhisperProgress as EventListener);
    localWhisperService.addEventListener('ready', this.handleWhisperReady as EventListener);
    localWhisperService.addEventListener('error', this.handleWhisperError as EventListener);
  };

  handleWhisperLoading = (event: CustomEvent) => {
    this.whisperLoadingState = 'loading';
    this.whisperLoadingProgress = 0;
  };

  handleWhisperProgress = (event: CustomEvent) => {
    const { progress } = event.detail;
    this.whisperLoadingProgress = progress || 0;
  };

  handleWhisperReady = (event: CustomEvent) => {
    this.whisperLoadingState = 'ready';
    this.whisperLoadingProgress = 100;
  };

  handleWhisperError = (event: CustomEvent) => {
    this.whisperLoadingState = 'error';
    console.error('Whisper error:', event.detail.error);
  };

  handleToggleStt(enabled: boolean) {
    this.sttPreferences = { ...this.sttPreferences, enabled };
    this.saveSttPreferences();

    if (enabled) {
      localWhisperService.loadModel(this.sttPreferences.modelSize).catch(err => {
        console.error('Failed to load Whisper model:', err);
      });
    }
  }

  handleModelSizeChange(modelSize: WhisperModelSize) {
    this.sttPreferences = { ...this.sttPreferences, modelSize };
    this.saveSttPreferences();

    if (this.sttPreferences.enabled) {
      localWhisperService.loadModel(modelSize).catch(err => {
        console.error('Failed to load Whisper model:', err);
      });
    }
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
        provider.endpoint,
        provider.id
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

  async handleSaveCustom() {
    const form = this.shadowRoot?.querySelector('.edit-form') as HTMLFormElement;
    const name = (form?.querySelector('[name="name"]') as HTMLInputElement)?.value;
    const endpoint = (form?.querySelector('[name="endpoint"]') as HTMLInputElement)?.value;
    const apiKey = (form?.querySelector('[name="apiKey"]') as HTMLInputElement)?.value;

    if (!name || !endpoint) return;

    // Show loading state
    const saveBtn = form?.querySelector('.save-btn');
    if (saveBtn) {
      saveBtn.textContent = 'Discovering models...';
      (saveBtn as HTMLButtonElement).disabled = true;
    }

    // Use discovery method to automatically detect and verify models
    const result = await providerManager.addCustomProviderWithDiscovery({
      name,
      baseUrl: endpoint,
      apiKey,
      capabilities: {
        streaming: true,
        functionCalling: false,
        vision: false,
      }
    });

    if (!result.success) {
      alert(`Failed to add provider: ${result.error}`);
      if (saveBtn) {
        saveBtn.textContent = 'Save';
        (saveBtn as HTMLButtonElement).disabled = false;
      }
      return;
    }

    console.log(`[ModelsPanel] Custom provider added with ${result.providerId}`);
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
            <div class="provider-header">
              <div class="provider-name">Local Whisper (On-Device)</div>
              <label class="toggle-switch">
                <input 
                  type="checkbox" 
                  .checked=${this.sttPreferences.enabled}
                  @change=${(e: Event) => this.handleToggleStt((e.target as HTMLInputElement).checked)}
                />
                <span class="toggle-slider"></span>
              </label>
            </div>

            ${this.sttPreferences.enabled ? html`
              <div class="stt-controls">
                <div class="input-group">
                  <label>Model Size</label>
                  <select 
                    .value=${this.sttPreferences.modelSize}
                    @change=${(e: Event) => this.handleModelSizeChange((e.target as HTMLSelectElement).value as WhisperModelSize)}
                  >
                    ${WHISPER_MODELS.map(model => html`
                      <option value=${model.id}>
                        ${model.name} - ${model.size}
                      </option>
                    `)}
                  </select>
                  <div class="model-size-info">
                    ${WHISPER_MODELS.find(m => m.id === this.sttPreferences.modelSize)?.description || ''}
                  </div>
                </div>

                ${this.whisperLoadingState === 'loading' ? html`
                  <div>
                    <div style="font-size: 13px; margin-bottom: 8px;">
                      Downloading model... ${Math.round(this.whisperLoadingProgress * 100)}%
                    </div>
                    <div class="loading-bar">
                      <div class="loading-bar-fill" style="width: ${this.whisperLoadingProgress * 100}%"></div>
                    </div>
                  </div>
                ` : this.whisperLoadingState === 'ready' ? html`
                  <div style="font-size: 13px; color: #4caf50;">
                    ✓ Model loaded and ready
                  </div>
                ` : this.whisperLoadingState === 'error' ? html`
                  <div style="font-size: 13px; color: #f44336;">
                    ✗ Failed to load model
                  </div>
                ` : ''}
              </div>
            ` : html`
              <div style="font-size: 13px; opacity: 0.7; margin-top: 8px;">
                Enable to use browser-based speech recognition for privacy
              </div>
            `}
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
              type="text" 
              name="endpoint" 
              .value=${this.editingProvider.endpoint || ''}
              placeholder="http://localhost:11434 or https://api.example.com"
            />
            <small style="color: #888; font-size: 12px; margin-top: 4px; display: block;">
              Any URL, IP address, http or https accepted
            </small>
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
            type="text" 
            name="endpoint" 
            placeholder="http://localhost:11434 or http://172.24.160.1:8189"
          />
          <small style="color: #888; font-size: 12px; margin-top: 4px; display: block;">
            Any URL, IP address, http or https accepted. For LM Studio, Ollama, or OpenAI-compatible APIs.
          </small>
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
