import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { comfyUIService } from '../../services/comfyui/comfyui-service';
import { comfyUIWorkflowRegistry } from '../../services/comfyui/comfyui-workflow-registry';
import type { ComfyUISettings, ComfyUIWorkflowConfig, ComfyUIMediaType } from '../../types/comfyui';

@customElement('comfyui-settings-panel')
export class ComfyUISettingsPanel extends LitElement {
  @state() private settings: ComfyUISettings = {
    baseURL: '',
    enabled: false,
    defaultWorkflows: {}
  };
  
  @state() private workflows: ComfyUIWorkflowConfig[] = [];
  @state() private testing = false;
  @state() private testResult: { success: boolean; error?: string } | null = null;
  @state() private discovering = false;

  static override styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      overflow-y: auto;
      padding: 24px;
      background: rgba(10, 14, 26, 0.95);
      color: #e0e0e0;
    }

    .header {
      margin-bottom: 32px;
    }

    .title {
      font-size: 28px;
      font-weight: 700;
      color: #87CEEB;
      margin-bottom: 8px;
    }

    .subtitle {
      font-size: 14px;
      color: #999;
      line-height: 1.6;
    }

    .section {
      margin-bottom: 32px;
    }

    .section-title {
      font-size: 16px;
      font-weight: 600;
      color: #87CEEB;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(135, 206, 250, 0.2);
    }

    .form-group {
      margin-bottom: 20px;
    }

    label {
      display: block;
      font-size: 13px;
      font-weight: 500;
      color: #bbb;
      margin-bottom: 8px;
    }

    input[type="text"],
    input[type="password"],
    select {
      width: 100%;
      padding: 12px 16px;
      background: rgba(20, 25, 40, 0.8);
      border: 1px solid rgba(135, 206, 250, 0.3);
      border-radius: 8px;
      color: #e0e0e0;
      font-size: 14px;
      font-family: inherit;
      transition: all 0.3s;
    }

    input[type="text"]:focus,
    input[type="password"]:focus,
    select:focus {
      outline: none;
      border-color: #87CEEB;
      box-shadow: 0 0 0 3px rgba(135, 206, 250, 0.1);
    }

    .checkbox-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    input[type="checkbox"] {
      width: 20px;
      height: 20px;
      cursor: pointer;
    }

    .btn {
      padding: 12px 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      border-radius: 8px;
      color: white;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: rgba(135, 206, 250, 0.15);
      border: 1px solid rgba(135, 206, 250, 0.3);
      color: #87CEEB;
    }

    .btn-secondary:hover:not(:disabled) {
      background: rgba(135, 206, 250, 0.25);
      box-shadow: 0 4px 12px rgba(135, 206, 250, 0.3);
    }

    .test-result {
      margin-top: 12px;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 13px;
    }

    .test-result.success {
      background: rgba(76, 175, 80, 0.15);
      border: 1px solid rgba(76, 175, 80, 0.3);
      color: #4CAF50;
    }

    .test-result.error {
      background: rgba(244, 67, 54, 0.15);
      border: 1px solid rgba(244, 67, 54, 0.3);
      color: #F44336;
    }

    .workflow-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .workflow-item {
      padding: 16px;
      background: rgba(20, 25, 40, 0.6);
      border: 1px solid rgba(135, 206, 250, 0.2);
      border-radius: 8px;
      transition: all 0.3s;
    }

    .workflow-item:hover {
      border-color: rgba(135, 206, 250, 0.4);
    }

    .workflow-name {
      font-weight: 600;
      color: #e0e0e0;
      margin-bottom: 4px;
    }

    .workflow-type {
      display: inline-block;
      padding: 4px 8px;
      background: rgba(102, 126, 234, 0.2);
      border-radius: 4px;
      font-size: 11px;
      color: #87CEEB;
      text-transform: uppercase;
    }

    .workflow-description {
      font-size: 12px;
      color: #999;
      margin-top: 8px;
    }

    .empty-state {
      text-align: center;
      padding: 48px 24px;
      color: #666;
    }

    .empty-state-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }

    .button-group {
      display: flex;
      gap: 12px;
      margin-top: 20px;
    }
  `;

  override connectedCallback(): void {
    super.connectedCallback();
    this.loadSettings();
  }

  private loadSettings(): void {
    this.settings = comfyUIService.getSettings();
    this.workflows = comfyUIWorkflowRegistry.getAllWorkflows();
  }

  private handleURLChange(e: Event): void {
    const input = e.target as HTMLInputElement;
    this.settings = { ...this.settings, baseURL: input.value };
  }

  private handleTokenChange(e: Event): void {
    const input = e.target as HTMLInputElement;
    this.settings = { ...this.settings, authToken: input.value };
  }

  private handleEnabledChange(e: Event): void {
    const checkbox = e.target as HTMLInputElement;
    this.settings = { ...this.settings, enabled: checkbox.checked };
    this.saveSettings();
  }

  private handleDefaultWorkflowChange(mediaType: ComfyUIMediaType, e: Event): void {
    const select = e.target as HTMLSelectElement;
    this.settings = {
      ...this.settings,
      defaultWorkflows: {
        ...this.settings.defaultWorkflows,
        [mediaType]: select.value || undefined
      }
    };
    this.saveSettings();
  }

  private saveSettings(): void {
    comfyUIService.updateSettings(this.settings);
  }

  private async handleTestConnection(): Promise<void> {
    this.testing = true;
    this.testResult = null;

    this.saveSettings();

    const result = await comfyUIService.testConnection();
    this.testResult = result;
    this.testing = false;
  }

  private async handleDiscoverWorkflows(): Promise<void> {
    alert('Workflow discovery requires ComfyUI Manager extension. Please import workflows manually using the Import button below.');
  }

  private handleImportWorkflow(): void {
    const name = prompt('Enter workflow name:');
    if (!name) return;

    const mediaType = prompt('Enter media type (image, video, or audio):')?.toLowerCase().trim();
    if (!mediaType || !['image', 'video', 'audio'].includes(mediaType)) {
      alert('Invalid media type. Please enter: image, video, or audio');
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const workflowJSON = JSON.parse(event.target?.result as string);
          
          if (!workflowJSON || typeof workflowJSON !== 'object') {
            alert('Invalid workflow JSON: must be an object');
            return;
          }

          const workflow: ComfyUIWorkflowConfig = {
            id: `custom_${Date.now()}`,
            name,
            mediaType: mediaType as ComfyUIMediaType,
            workflowJSON,
            requiredInputs: ['text'],
            outputNodes: []
          };

          comfyUIWorkflowRegistry.registerWorkflow(workflow);
          this.workflows = comfyUIWorkflowRegistry.getAllWorkflows();
          alert(`Workflow "${name}" imported successfully!`);
        } catch (error) {
          alert(`Import failed: ${(error as Error).message}`);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  override render() {
    return html`
      <div class="header">
        <div class="title">Image Generation</div>
        <div class="subtitle">
          Configure image and video generation providers. Currently: ComfyUI (Future: Gemini Imagen, Stable Diffusion, DALL-E, Google Veo)
        </div>
      </div>

      <div class="section">
        <div class="section-title">Connection Settings</div>
        
        <div class="form-group">
          <label for="comfyui-url">ComfyUI Base URL</label>
          <input
            type="text"
            id="comfyui-url"
            placeholder="http://localhost:8188"
            .value=${this.settings.baseURL}
            @input=${this.handleURLChange}
          />
        </div>

        <div class="form-group">
          <label for="comfyui-token">Authentication Token (Optional)</label>
          <input
            type="password"
            id="comfyui-token"
            placeholder="Enter auth token if required"
            .value=${this.settings.authToken || ''}
            @input=${this.handleTokenChange}
          />
        </div>

        <div class="form-group">
          <div class="checkbox-group">
            <input
              type="checkbox"
              id="comfyui-enabled"
              .checked=${this.settings.enabled}
              @change=${this.handleEnabledChange}
            />
            <label for="comfyui-enabled" style="margin: 0;">Enable ComfyUI Integration</label>
          </div>
        </div>

        <div class="button-group">
          <button
            class="btn btn-secondary"
            @click=${this.handleTestConnection}
            ?disabled=${this.testing || !this.settings.baseURL}
          >
            ${this.testing ? 'Testing...' : 'Test Connection'}
          </button>
        </div>

        ${this.testResult ? html`
          <div class="test-result ${this.testResult.success ? 'success' : 'error'}">
            ${this.testResult.success ? '✓ Connected successfully' : `✗ ${this.testResult.error}`}
          </div>
        ` : ''}
      </div>

      <div class="section">
        <div class="section-title">Workflows</div>

        ${this.workflows.length > 0 ? html`
          <div class="workflow-list">
            ${this.workflows.map(workflow => html`
              <div class="workflow-item">
                <div class="workflow-name">${workflow.name}</div>
                <span class="workflow-type">${workflow.mediaType}</span>
                ${workflow.description ? html`
                  <div class="workflow-description">${workflow.description}</div>
                ` : ''}
              </div>
            `)}
          </div>
        ` : html`
          <div class="empty-state">
            <div class="empty-state-icon">📋</div>
            <div>No workflows configured</div>
          </div>
        `}

        <div class="button-group">
          <button class="btn btn-secondary" @click=${this.handleImportWorkflow}>
            📁 Import Workflow JSON
          </button>
        </div>
        
        <div class="subtitle" style="margin-top: 12px; font-size: 12px; color: #999;">
          Import ComfyUI workflow JSON files (image, video, or audio generation)
        </div>
      </div>

      <div class="section">
        <div class="section-title">Default Workflows</div>

        <div class="form-group">
          <label for="default-image">Image Generation</label>
          <select
            id="default-image"
            @change=${(e: Event) => this.handleDefaultWorkflowChange('image', e)}
          >
            <option value="">None</option>
            ${this.workflows.filter(w => w.mediaType === 'image').map(w => html`
              <option value=${w.id} ?selected=${this.settings.defaultWorkflows.image === w.id}>
                ${w.name}
              </option>
            `)}
          </select>
        </div>

        <div class="form-group">
          <label for="default-video">Video Generation</label>
          <select
            id="default-video"
            @change=${(e: Event) => this.handleDefaultWorkflowChange('video', e)}
          >
            <option value="">None</option>
            ${this.workflows.filter(w => w.mediaType === 'video').map(w => html`
              <option value=${w.id} ?selected=${this.settings.defaultWorkflows.video === w.id}>
                ${w.name}
              </option>
            `)}
          </select>
        </div>

        <div class="form-group">
          <label for="default-audio">Audio Generation</label>
          <select
            id="default-audio"
            @change=${(e: Event) => this.handleDefaultWorkflowChange('audio', e)}
          >
            <option value="">None</option>
            ${this.workflows.filter(w => w.mediaType === 'audio').map(w => html`
              <option value=${w.id} ?selected=${this.settings.defaultWorkflows.audio === w.id}>
                ${w.name}
              </option>
            `)}
          </select>
        </div>
      </div>
    `;
  }
}
