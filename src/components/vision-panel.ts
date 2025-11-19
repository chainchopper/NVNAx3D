/**
 * Vision Panel Component
 * Configuration UI for local vision-language models
 */

import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { visionModelService, type VisionModelConfig } from '../services/vision-model-service';

@customElement('vision-panel')
export class VisionPanel extends LitElement {
  @state() private configs: VisionModelConfig[] = [];
  @state() private editingConfig: Partial<VisionModelConfig> | null = null;
  @state() private testingConfigId: string | null = null;
  @state() private testResult: { success: boolean; error?: string } | null = null;
  @state() private availableModels: string[] = [];
  @state() private fetchingModels = false;

  static styles = css`
    :host {
      display: block;
      position: fixed;
      right: 0;
      top: 0;
      height: 100vh;
      width: 420px;
      background: rgba(0, 0, 0, 0.95);
      backdrop-filter: blur(20px);
      border-left: 1px solid rgba(255, 255, 255, 0.1);
      z-index: 1000;
      overflow-y: auto;
      animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
      }
      to {
        transform: translateX(0);
      }
    }

    .panel-header {
      position: sticky;
      top: 0;
      background: rgba(0, 0, 0, 0.98);
      backdrop-filter: blur(20px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding: 24px;
      z-index: 10;
    }

    .panel-title {
      font-size: 24px;
      font-weight: 600;
      color: white;
      margin: 0 0 8px 0;
    }

    .panel-subtitle {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.6);
      margin: 0;
    }

    .close-button {
      position: absolute;
      top: 24px;
      right: 24px;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.1);
      border: none;
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      transition: all 0.2s;
    }

    .close-button:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: scale(1.1);
    }

    .panel-content {
      padding: 24px;
    }

    .section {
      margin-bottom: 32px;
    }

    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.9);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 16px;
    }

    .config-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .config-card {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 16px;
      transition: all 0.2s;
    }

    .config-card:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.2);
    }

    .config-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .config-name {
      font-size: 16px;
      font-weight: 600;
      color: white;
    }

    .config-status {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .status-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-badge.enabled {
      background: rgba(76, 175, 80, 0.2);
      color: #4CAF50;
    }

    .status-badge.disabled {
      background: rgba(158, 158, 158, 0.2);
      color: #9E9E9E;
    }

    .config-details {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.6);
      margin-bottom: 12px;
    }

    .config-actions {
      display: flex;
      gap: 8px;
    }

    .btn {
      padding: 8px 16px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      background: rgba(255, 255, 255, 0.1);
      color: white;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn:hover {
      background: rgba(255, 255, 255, 0.15);
      border-color: rgba(255, 255, 255, 0.3);
    }

    .btn-primary {
      background: rgba(100, 200, 255, 0.2);
      border-color: rgba(100, 200, 255, 0.4);
      color: #64C8FF;
    }

    .btn-primary:hover {
      background: rgba(100, 200, 255, 0.3);
    }

    .btn-success {
      background: rgba(76, 175, 80, 0.2);
      border-color: rgba(76, 175, 80, 0.4);
      color: #4CAF50;
    }

    .btn-danger {
      background: rgba(244, 67, 54, 0.2);
      border-color: rgba(244, 67, 54, 0.4);
      color: #F44336;
    }

    .add-button {
      width: 100%;
      padding: 16px;
      border-radius: 12px;
      border: 2px dashed rgba(255, 255, 255, 0.2);
      background: transparent;
      color: rgba(255, 255, 255, 0.6);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .add-button:hover {
      border-color: rgba(255, 255, 255, 0.4);
      background: rgba(255, 255, 255, 0.05);
      color: white;
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-label {
      display: block;
      font-size: 13px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.8);
      margin-bottom: 8px;
    }

    .form-input {
      width: 100%;
      padding: 12px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      background: rgba(255, 255, 255, 0.05);
      color: white;
      font-size: 14px;
      font-family: inherit;
      box-sizing: border-box;
    }

    .form-input:focus {
      outline: none;
      border-color: rgba(100, 200, 255, 0.5);
      background: rgba(255, 255, 255, 0.08);
    }

    .checkbox-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .checkbox {
      width: 20px;
      height: 20px;
      cursor: pointer;
    }

    .test-result {
      margin-top: 12px;
      padding: 12px;
      border-radius: 8px;
      font-size: 13px;
    }

    .test-result.success {
      background: rgba(76, 175, 80, 0.1);
      border: 1px solid rgba(76, 175, 80, 0.3);
      color: #4CAF50;
    }

    .test-result.error {
      background: rgba(244, 67, 54, 0.1);
      border: 1px solid rgba(244, 67, 54, 0.3);
      color: #F44336;
    }

    .helper-text {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.5);
      margin-top: 4px;
    }

    .preset-buttons {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }

    .preset-btn {
      padding: 6px 12px;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      background: rgba(255, 255, 255, 0.05);
      color: rgba(255, 255, 255, 0.7);
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .preset-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: white;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.loadConfigs();
    visionModelService.addEventListener('configs-changed', this.loadConfigs);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    visionModelService.removeEventListener('configs-changed', this.loadConfigs);
  }

  private loadConfigs = () => {
    this.configs = visionModelService.getAllConfigs();
  };

  private handleClose() {
    this.dispatchEvent(new CustomEvent('close'));
  }

  private handleAddNew() {
    this.editingConfig = {
      id: crypto.randomUUID(),
      name: '',
      endpoint: 'http://localhost:1234',
      modelName: 'moondream',
      enabled: true
    };
    this.testResult = null;
  }

  private handleCancel() {
    this.editingConfig = null;
    this.testResult = null;
  }

  private async handleSave() {
    if (!this.editingConfig || !this.editingConfig.name || !this.editingConfig.endpoint || !this.editingConfig.modelName) {
      alert('Please fill in all required fields');
      return;
    }

    const config: VisionModelConfig = {
      id: this.editingConfig.id!,
      name: this.editingConfig.name,
      endpoint: this.editingConfig.endpoint,
      apiKey: this.editingConfig.apiKey,
      modelName: this.editingConfig.modelName,
      enabled: this.editingConfig.enabled ?? true
    };

    visionModelService.addConfig(config);
    this.editingConfig = null;
    this.testResult = null;
  }

  private handleToggleEnabled(id: string) {
    const config = visionModelService.getConfig(id);
    if (config) {
      visionModelService.updateConfig(id, { enabled: !config.enabled });
      this.loadConfigs();
    }
  }

  private async handleTest() {
    if (!this.editingConfig || !this.editingConfig.id) return;

    const config: VisionModelConfig = {
      id: this.editingConfig.id,
      name: this.editingConfig.name || 'Test',
      endpoint: this.editingConfig.endpoint || '',
      apiKey: this.editingConfig.apiKey,
      modelName: this.editingConfig.modelName || '',
      enabled: true
    };

    this.testingConfigId = config.id;
    this.testResult = null;

    const result = await visionModelService.testConnection(config);
    this.testResult = result;
    this.testingConfigId = null;
  }

  private handleDelete(id: string) {
    if (confirm('Delete this vision model configuration?')) {
      visionModelService.removeConfig(id);
      this.loadConfigs();
    }
  }

  private async handleFetchModels() {
    if (!this.editingConfig?.endpoint) {
      alert('Please enter an endpoint first');
      return;
    }

    this.fetchingModels = true;
    this.availableModels = [];

    try {
      const endpoint = this.editingConfig.endpoint.replace(/\/$/, '');
      const url = endpoint.includes('/v1') ? `${endpoint}/models` : `${endpoint}/v1/models`;
      
      const response = await fetch(url, {
        headers: this.editingConfig.apiKey ? { 'Authorization': `Bearer ${this.editingConfig.apiKey}` } : {}
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const models = data.data || [];
      this.availableModels = models.map((m: any) => m.id).filter((id: string) => id);
      
      if (this.availableModels.length === 0) {
        alert('No models found at this endpoint');
      }
    } catch (error) {
      console.error('[VisionPanel] Failed to fetch models:', error);
      alert(`Failed to fetch models: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      this.fetchingModels = false;
    }
  }

  private applyPreset(preset: 'lm-studio' | 'vllm' | 'windows-ai') {
    const presets = {
      'lm-studio': {
        name: 'LM Studio (Vision)',
        endpoint: 'http://localhost:1234',
        modelName: ''
      },
      'vllm': {
        name: 'vLLM (Vision)',
        endpoint: 'http://localhost:8000',
        modelName: ''
      },
      'windows-ai': {
        name: 'Windows AI Dev Gallery',
        endpoint: 'http://localhost:5272',
        modelName: ''
      }
    };

    const selected = presets[preset];
    this.editingConfig = {
      ...this.editingConfig,
      name: selected.name,
      endpoint: selected.endpoint,
      modelName: selected.modelName
    };
    this.availableModels = [];
  }

  render() {
    return html`
      <div class="panel-header">
        <h2 class="panel-title">Vision Models</h2>
        <p class="panel-subtitle">Configure local vision-language models</p>
        <button class="close-button" @click=${this.handleClose}>×</button>
      </div>

      <div class="panel-content">
        ${this.editingConfig ? this.renderForm() : this.renderList()}
      </div>
    `;
  }

  private renderList() {
    return html`
      <div class="section">
        <div class="section-title">Configured Models</div>
        <div class="config-list">
          ${this.configs.map(config => html`
            <div class="config-card">
              <div class="config-header">
                <div class="config-name">${config.name}</div>
                <div class="config-status">
                  <span class="status-badge ${config.enabled ? 'enabled' : 'disabled'}">
                    ${config.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
              <div class="config-details">
                <div>${config.endpoint}</div>
                <div>Model: ${config.modelName}</div>
              </div>
              <div class="config-actions">
                <button class="btn" @click=${() => this.handleToggleEnabled(config.id)}>
                  ${config.enabled ? 'Disable' : 'Enable'}
                </button>
                <button class="btn btn-danger" @click=${() => this.handleDelete(config.id)}>
                  Delete
                </button>
              </div>
            </div>
          `)}
        </div>
        <button class="add-button" @click=${this.handleAddNew}>
          <span>➕</span>
          <span>Add Vision Model</span>
        </button>
      </div>
    `;
  }

  private renderForm() {
    return html`
      <div class="section">
        <div class="section-title">
          ${this.editingConfig?.id && visionModelService.getConfig(this.editingConfig.id) ? 'Edit' : 'Add'} Vision Model
        </div>

        <div class="preset-buttons">
          <button class="preset-btn" @click=${() => this.applyPreset('lm-studio')}>
            LM Studio Preset
          </button>
          <button class="preset-btn" @click=${() => this.applyPreset('vllm')}>
            vLLM Preset
          </button>
          <button class="preset-btn" @click=${() => this.applyPreset('windows-ai')}>
            Windows AI Preset
          </button>
        </div>

        <div class="form-group">
          <label class="form-label">Name *</label>
          <input
            type="text"
            class="form-input"
            .value=${this.editingConfig?.name || ''}
            @input=${(e: Event) => {
              if (this.editingConfig) {
                this.editingConfig = { ...this.editingConfig, name: (e.target as HTMLInputElement).value };
              }
            }}
            placeholder="e.g., LM Studio Moondream"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Endpoint URL *</label>
          <div style="display: flex; gap: 8px;">
            <input
              type="text"
              class="form-input"
              style="flex: 1;"
              .value=${this.editingConfig?.endpoint || ''}
              @input=${(e: Event) => {
                if (this.editingConfig) {
                  this.editingConfig = { ...this.editingConfig, endpoint: (e.target as HTMLInputElement).value };
                }
              }}
              placeholder="http://localhost:1234"
            />
            <button 
              class="btn" 
              @click=${this.handleFetchModels}
              ?disabled=${this.fetchingModels || !this.editingConfig?.endpoint}
              style="white-space: nowrap;"
            >
              ${this.fetchingModels ? 'Fetching...' : 'Fetch Models'}
            </button>
          </div>
          <div class="helper-text">OpenAI-compatible endpoint (e.g., LM Studio, vLLM)</div>
        </div>

        <div class="form-group">
          <label class="form-label">Model Name *</label>
          ${this.availableModels.length > 0 ? html`
            <select
              class="form-input"
              .value=${this.editingConfig?.modelName || ''}
              @change=${(e: Event) => {
                if (this.editingConfig) {
                  this.editingConfig = { ...this.editingConfig, modelName: (e.target as HTMLSelectElement).value };
                }
              }}
            >
              <option value="">Select a model...</option>
              ${this.availableModels.map(model => html`
                <option value=${model} ?selected=${model === this.editingConfig?.modelName}>
                  ${model}
                </option>
              `)}
            </select>
            <div class="helper-text">✅ ${this.availableModels.length} models fetched from endpoint</div>
          ` : html`
            <input
              type="text"
              class="form-input"
              .value=${this.editingConfig?.modelName || ''}
              @input=${(e: Event) => {
                if (this.editingConfig) {
                  this.editingConfig = { ...this.editingConfig, modelName: (e.target as HTMLInputElement).value };
                }
              }}
              placeholder="Click 'Fetch Models' or enter manually"
            />
            <div class="helper-text">Use 'Fetch Models' button to load from endpoint, or enter manually</div>
          `}
        </div>

        <div class="form-group">
          <label class="form-label">API Key (Optional)</label>
          <input
            type="password"
            class="form-input"
            .value=${this.editingConfig?.apiKey || ''}
            @input=${(e: Event) => {
              if (this.editingConfig) {
                this.editingConfig = { ...this.editingConfig, apiKey: (e.target as HTMLInputElement).value };
              }
            }}
            placeholder="Leave blank for local servers"
          />
        </div>

        <div class="form-group">
          <div class="checkbox-group">
            <input
              type="checkbox"
              class="checkbox"
              .checked=${this.editingConfig?.enabled ?? true}
              @change=${(e: Event) => {
                if (this.editingConfig) {
                  this.editingConfig = { ...this.editingConfig, enabled: (e.target as HTMLInputElement).checked };
                }
              }}
            />
            <label class="form-label" style="margin: 0;">Enable this model</label>
          </div>
        </div>

        ${this.testResult ? html`
          <div class="test-result ${this.testResult.success ? 'success' : 'error'}">
            ${this.testResult.success ? '✓ Connection successful!' : `✗ ${this.testResult.error}`}
          </div>
        ` : ''}

        <div class="config-actions" style="margin-top: 24px;">
          <button class="btn" @click=${this.handleCancel}>Cancel</button>
          <button 
            class="btn btn-primary" 
            @click=${this.handleTest}
            ?disabled=${this.testingConfigId !== null}
          >
            ${this.testingConfigId ? 'Testing...' : 'Test Connection'}
          </button>
          <button class="btn btn-success" @click=${this.handleSave}>Save</button>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'vision-panel': VisionPanel;
  }
}
