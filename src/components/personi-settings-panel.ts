/**
 * PersonI Settings Panel Component
 * 
 * Comprehensive configuration for PersonI instances including:
 * - Identity (name, tagline, system instructions)
 * - Model assignments from configured providers
 * - Voice configuration
 * - Visual identity (shape, color, texture, animation)
 * - Capabilities (vision, image gen, web search, tools, MCP, audio)
 * - Connector/tool assignments
 */

import { LitElement, css, html, PropertyValues } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { PersoniConfig, PersoniCapabilities, TextureName, IdleAnimation, AVAILABLE_CONNECTORS, DEFAULT_CAPABILITIES } from '../personas';
import { appStateService } from '../services/app-state-service';
import { activePersonasManager } from '../services/active-personas-manager';
import { providerManager } from '../services/provider-manager';
import { ModelInfo } from '../types/providers';
import { oauthService } from '../services/oauth-service';
import { PERSONIS_KEY } from '../constants/storage.js';

const VOICE_OPTIONS = [
  { id: 'Puck', name: 'Puck (Mature Male, US)' },
  { id: 'Charon', name: 'Charon (Mature Male, US)' },
  { id: 'Kore', name: 'Kore (Young Female, US)' },
  { id: 'Fenrir', name: 'Fenrir (Mature Male, UK)' },
  { id: 'Aoede', name: 'Aoede (Young Female, UK)' },
];

@customElement('personi-settings-panel')
export class PersoniSettingsPanel extends LitElement {
  @state() private personi: PersoniConfig | null = null;
  @state() private availableModels: ModelInfo[] = [];
  @state() private hasChanges = false;

  // Editable state
  @state() private name = '';
  @state() private tagline = '';
  @state() private systemInstruction = '';
  @state() private avatarUrl = '';
  @state() private voiceName = 'Puck';
  @state() private conversationModel = '';
  @state() private visionModel = '';
  @state() private embeddingModel = '';
  @state() private functionCallingModel = '';
  @state() private imageGenerationModel = '';
  @state() private shape: 'Icosahedron' | 'TorusKnot' = 'Icosahedron';
  @state() private accentColor = '#87ceeb';
  @state() private textureName: TextureName = 'none';
  @state() private idleAnimation: IdleAnimation = 'subtle_breath';
  @state() private capabilities: PersoniCapabilities = { ...DEFAULT_CAPABILITIES };
  @state() private enabledConnectors: string[] = [];
  @state() private oauthStatuses: Map<string, boolean> = new Map();
  
  private oauthUnsubscribe?: () => void;

  static styles = css`
    :host {
      display: block;
      height: 100%;
      overflow-y: auto;
      color: white;
      font-family: system-ui, -apple-system, sans-serif;
    }

    .content {
      padding: 24px;
      max-width: 600px;
    }

    .section {
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .section:last-child {
      border-bottom: none;
    }

    .section-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 16px;
      color: rgba(255, 255, 255, 0.9);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .section-title::before {
      content: '';
      width: 4px;
      height: 20px;
      background: #2196f3;
      border-radius: 2px;
    }

    .field-group {
      margin-bottom: 20px;
    }

    .field-label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 8px;
      color: rgba(255, 255, 255, 0.8);
    }

    input[type="text"],
    textarea,
    select {
      width: 100%;
      padding: 10px 12px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      color: white;
      font-size: 14px;
      font-family: inherit;
      box-sizing: border-box;
      transition: all 0.2s;
    }

    input[type="text"]:focus,
    textarea:focus,
    select:focus {
      outline: none;
      border-color: #2196f3;
      background: rgba(255, 255, 255, 0.12);
    }

    select option {
      background: #1a1a2e;
      color: white;
      padding: 10px;
    }

    select option:hover {
      background: #2a2a3e;
    }

    textarea {
      min-height: 120px;
      resize: vertical;
      line-height: 1.5;
    }

    .color-picker-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    input[type="color"] {
      width: 60px;
      height: 40px;
      padding: 4px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      cursor: pointer;
    }

    .color-value {
      flex: 1;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      color: rgba(255, 255, 255, 0.7);
    }

    .capabilities-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    .capability-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .capability-item:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.2);
    }

    .capability-item.active {
      background: rgba(33, 150, 243, 0.15);
      border-color: rgba(33, 150, 243, 0.4);
    }

    .checkbox {
      width: 20px;
      height: 20px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .capability-item.active .checkbox {
      background: #2196f3;
      border-color: #2196f3;
    }

    .checkbox::after {
      content: '✓';
      color: white;
      font-size: 14px;
      font-weight: bold;
      opacity: 0;
      transition: opacity 0.2s;
    }

    .capability-item.active .checkbox::after {
      opacity: 1;
    }

    .capability-label {
      flex: 1;
      font-size: 14px;
      font-weight: 500;
    }

    .connectors-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .connector-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .connector-item:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.2);
    }

    .connector-item.active {
      background: rgba(76, 175, 80, 0.15);
      border-color: rgba(76, 175, 80, 0.4);
    }

    .connector-info {
      flex: 1;
    }

    .connector-name {
      font-weight: 500;
      margin-bottom: 4px;
    }

    .connector-description {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.6);
      line-height: 1.4;
    }

    .connector-badge {
      margin-left: auto;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .connector-badge.connected {
      background: rgba(76, 175, 80, 0.2);
      color: #4caf50;
      border: 1px solid rgba(76, 175, 80, 0.4);
    }

    .connector-badge.not-connected {
      background: rgba(255, 152, 0, 0.2);
      color: #ff9800;
      border: 1px solid rgba(255, 152, 0, 0.4);
    }

    .actions {
      position: sticky;
      bottom: 0;
      padding: 20px 24px;
      background: rgba(20, 20, 30, 0.98);
      backdrop-filter: blur(10px);
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      gap: 12px;
      margin: 0 -24px -24px;
    }

    .btn {
      flex: 1;
      padding: 12px 24px;
      border-radius: 8px;
      border: none;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary {
      background: #2196f3;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #1976d2;
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.1);
      color: white;
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.15);
    }

    .helper-text {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.5);
      margin-top: 6px;
      line-height: 1.4;
    }

    .model-select {
      position: relative;
    }

    .model-select select {
      padding-right: 32px;
    }

    .no-models {
      padding: 16px;
      background: rgba(255, 152, 0, 0.1);
      border: 1px solid rgba(255, 152, 0, 0.3);
      border-radius: 8px;
      color: #ff9800;
      font-size: 14px;
      text-align: center;
    }

    .avatar-preview {
      position: relative;
      width: 100%;
      max-width: 300px;
      margin-bottom: 16px;
      border-radius: 16px;
      overflow: hidden;
      border: 2px solid rgba(135, 206, 250, 0.3);
      background: rgba(10, 14, 26, 0.6);
      backdrop-filter: blur(12px);
      box-shadow: 
        0 4px 16px rgba(0, 0, 0, 0.3),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
    }

    .avatar-preview img,
    .avatar-preview video,
    .avatar-preview iframe {
      width: 100%;
      height: auto;
      display: block;
    }

    .avatar-preview iframe {
      aspect-ratio: 16/9;
    }

    .remove-avatar-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(244, 67, 54, 0.25);
      backdrop-filter: blur(8px);
      border: 2px solid rgba(244, 67, 54, 0.5);
      color: #F44336;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      padding: 0;
      box-shadow: 0 2px 8px rgba(244, 67, 54, 0.2);
    }

    .remove-avatar-btn:hover {
      background: rgba(244, 67, 54, 0.4);
      border-color: rgba(244, 67, 54, 0.7);
      transform: scale(1.1);
      box-shadow: 0 4px 12px rgba(244, 67, 54, 0.3);
    }

    .avatar-upload-controls {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .upload-btn {
      padding: 12px 20px;
      background: rgba(33, 150, 243, 0.2);
      border: 1px solid rgba(33, 150, 243, 0.4);
      border-radius: 12px;
      color: #2196f3;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .upload-btn:hover {
      background: rgba(33, 150, 243, 0.3);
      border-color: rgba(33, 150, 243, 0.6);
      transform: translateY(-2px);
    }

    .url-input-group {
      width: 100%;
    }

    .url-input-group input {
      width: 100%;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    // Load available models FIRST before loading personi data
    // so legacy string IDs can be converted to composite format
    this.loadAvailableModels();
    this.loadPersoniData();
    this.loadOAuthStatuses();
    
    // Subscribe to OAuth status changes
    this.oauthUnsubscribe = oauthService.subscribe(() => {
      this.loadOAuthStatuses();
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.oauthUnsubscribe) {
      this.oauthUnsubscribe();
    }
  }

  private loadPersoniData() {
    const activePersoni = appStateService.getActivePersoni();
    if (activePersoni) {
      this.personi = activePersoni;
      this.name = activePersoni.name;
      this.tagline = activePersoni.tagline;
      this.systemInstruction = activePersoni.systemInstruction;
      this.avatarUrl = activePersoni.avatarUrl || '';
      this.voiceName = activePersoni.voiceName || 'Puck';
      
      // Extract composite "providerId:::modelId" for dropdown binding (handles both formats)
      const extractCompositeValue = (value: string | { providerId: string; modelId: string } | undefined): string => {
        if (!value) return '';
        if (typeof value === 'string') {
          // Legacy format: try to find matching model in available models
          const model = this.availableModels.find(m => m.id === value);
          return model ? `${model.providerId}:::${model.id}` : value;
        }
        return `${value.providerId}:::${value.modelId}`;
      };
      
      this.conversationModel = extractCompositeValue(activePersoni.models?.conversation);
      this.visionModel = extractCompositeValue(activePersoni.models?.vision);
      this.embeddingModel = extractCompositeValue(activePersoni.models?.embedding);
      this.functionCallingModel = extractCompositeValue(activePersoni.models?.functionCalling);
      this.imageGenerationModel = extractCompositeValue(activePersoni.models?.imageGeneration);
      
      this.shape = activePersoni.visuals.shape;
      this.accentColor = activePersoni.visuals.accentColor;
      this.textureName = activePersoni.visuals.textureName || 'none';
      this.idleAnimation = activePersoni.visuals.idleAnimation || 'subtle_breath';
      this.capabilities = activePersoni.capabilities || { ...DEFAULT_CAPABILITIES };
      this.enabledConnectors = [...(activePersoni.enabledConnectors || [])];
      this.hasChanges = false;
    }
  }

  private loadAvailableModels() {
    this.availableModels = providerManager.getAvailableModels();
  }

  private async loadOAuthStatuses() {
    const statuses = new Map<string, boolean>();
    
    for (const connector of AVAILABLE_CONNECTORS) {
      if (oauthService.isOAuthConnector(connector.id)) {
        const authState = await oauthService.getConnectorAuthState(connector.id);
        statuses.set(connector.id, authState.isConnected);
      }
    }
    
    this.oauthStatuses = statuses;
  }

  private markChanged() {
    this.hasChanges = true;
  }

  private handleSave() {
    if (!this.personi) return;

    // Helper to parse composite "providerId:::modelId" value
    const parseModelSelection = (compositeValue: string) => {
      if (!compositeValue) return undefined;
      const parts = compositeValue.split(':::');
      if (parts.length === 2) {
        return { providerId: parts[0], modelId: parts[1] };
      }
      // Legacy: plain model ID without provider - try to find it
      const model = this.availableModels.find(m => m.id === compositeValue);
      return model ? { providerId: model.providerId, modelId: model.id } : undefined;
    };

    const updated: PersoniConfig = {
      ...this.personi,
      name: this.name,
      tagline: this.tagline,
      systemInstruction: this.systemInstruction,
      avatarUrl: this.avatarUrl || undefined,
      voiceName: this.voiceName,
      models: {
        conversation: parseModelSelection(this.conversationModel),
        vision: parseModelSelection(this.visionModel),
        embedding: parseModelSelection(this.embeddingModel),
        functionCalling: parseModelSelection(this.functionCallingModel),
        imageGeneration: parseModelSelection(this.imageGenerationModel),
      },
      capabilities: { ...this.capabilities },
      enabledConnectors: [...this.enabledConnectors],
      visuals: {
        shape: this.shape,
        accentColor: this.accentColor,
        textureName: this.textureName,
        idleAnimation: this.idleAnimation,
      },
    };

    // Update personi in app state (updates array + saves to localStorage)
    appStateService.updatePersoni(updated);
    
    // Update active personi reference
    appStateService.setActivePersoni(updated);
    
    // Update active personas manager (primary slot)
    activePersonasManager.setPersona('primary', updated);

    this.hasChanges = false;
    this.dispatchEvent(new CustomEvent('close'));
  }

  private handleCancel() {
    this.loadPersoniData();
    this.dispatchEvent(new CustomEvent('close'));
  }

  private toggleCapability(capability: keyof PersoniCapabilities) {
    this.capabilities = {
      ...this.capabilities,
      [capability]: !this.capabilities[capability],
    };
    this.markChanged();
  }

  private toggleConnector(connectorId: string) {
    if (this.enabledConnectors.includes(connectorId)) {
      this.enabledConnectors = this.enabledConnectors.filter(id => id !== connectorId);
    } else {
      this.enabledConnectors = [...this.enabledConnectors, connectorId];
    }
    this.markChanged();
  }

  private isYouTubeUrl(url: string): boolean {
    return url.includes('youtube.com') || url.includes('youtu.be');
  }

  private normalizeYouTubeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      let videoId = '';

      // Handle youtube.com/watch?v=ABC
      if (urlObj.hostname.includes('youtube.com') && urlObj.pathname === '/watch') {
        videoId = urlObj.searchParams.get('v') || '';
      }
      // Handle youtu.be/ABC
      else if (urlObj.hostname.includes('youtu.be')) {
        videoId = urlObj.pathname.substring(1); // Remove leading /
      }

      if (videoId) {
        // Preserve other query parameters
        const params = new URLSearchParams();
        urlObj.searchParams.forEach((value, key) => {
          if (key !== 'v') { // Don't include 'v' param in embed URL
            params.set(key, value);
          }
        });
        const queryString = params.toString();
        return `https://www.youtube.com/embed/${videoId}${queryString ? '?' + queryString : ''}`;
      }
    } catch (e) {
      // If URL parsing fails, return original
    }
    return url;
  }

  private isVideoUrl(url: string): boolean {
    // Check for data URL videos
    if (url.startsWith('data:video/')) {
      return true;
    }
    // Check for video file extensions (before query/hash)
    try {
      const urlObj = new URL(url);
      return /\.(mp4|webm|ogg)$/i.test(urlObj.pathname);
    } catch (e) {
      // Fallback to simple regex for relative paths
      return /\.(mp4|webm|ogg)(?:[?#]|$)/i.test(url);
    }
  }

  private renderModelDropdown(
    label: string, 
    value: string, 
    onChange: (value: string) => void, 
    capability: 'conversation' | 'vision' | 'embedding' | 'functionCalling' | 'imageGeneration',
    helpText?: string
  ) {
    // Filter models by capability
    const filteredModels = providerManager.getModelsByCapability(capability);
    
    if (filteredModels.length === 0) {
      return html`
        <div class="field-group">
          <label class="field-label">${label}</label>
          <div class="no-models">
            No models with ${capability} capability found. Configure providers in the Models menu.
          </div>
        </div>
      `;
    }

    return html`
      <div class="field-group">
        <label class="field-label">${label}</label>
        <div class="model-select">
          <select
            .value=${value}
            @change=${(e: Event) => {
              const target = e.target as HTMLSelectElement;
              onChange(target.value);
              this.markChanged();
            }}
          >
            <option value="">None</option>
            ${filteredModels.map(model => {
              const compositeValue = `${model.providerId}:::${model.id}`;
              return html`
                <option value="${compositeValue}">${model.name} (${model.providerId})</option>
              `;
            })}
          </select>
        </div>
        ${helpText ? html`<div class="helper-text">${helpText}</div>` : ''}
      </div>
    `;
  }

  render() {
    if (!this.personi) {
      return html`
        <div class="content">
          <p>No PersonI selected</p>
        </div>
      `;
    }

    return html`
      <div class="content">
        <!-- Identity Section -->
        <div class="section">
          <h3 class="section-title">Identity</h3>
          
          <div class="field-group">
            <label class="field-label">Name</label>
            <input
              type="text"
              .value=${this.name}
              @input=${(e: Event) => {
                this.name = (e.target as HTMLInputElement).value;
                this.markChanged();
              }}
              placeholder="e.g., NIRVANA"
            />
          </div>

          <div class="field-group">
            <label class="field-label">Tagline</label>
            <input
              type="text"
              .value=${this.tagline}
              @input=${(e: Event) => {
                this.tagline = (e.target as HTMLInputElement).value;
                this.markChanged();
              }}
              placeholder="e.g., Multi-modal AI Orchestrator"
            />
          </div>

          <div class="field-group">
            <label class="field-label">System Instructions</label>
            <textarea
              .value=${this.systemInstruction}
              @input=${(e: Event) => {
                this.systemInstruction = (e.target as HTMLTextAreaElement).value;
                this.markChanged();
              }}
              placeholder="Define the PersonI's personality, behavior, and response style..."
            ></textarea>
            <div class="helper-text">
              This is the core prompt that defines how the AI behaves and responds
            </div>
          </div>

          <div class="field-group">
            <label class="field-label">Avatar Image/Video</label>
            
            ${this.avatarUrl ? html`
              <div class="avatar-preview">
                ${this.isYouTubeUrl(this.avatarUrl) ? html`
                  <iframe 
                    src="${this.normalizeYouTubeUrl(this.avatarUrl)}" 
                    frameborder="0" 
                    allow="autoplay; encrypted-media"
                    allowfullscreen
                  ></iframe>
                ` : this.isVideoUrl(this.avatarUrl) ? html`
                  <video src="${this.avatarUrl}" controls loop muted playsinline></video>
                ` : html`
                  <img src="${this.avatarUrl}" alt="Avatar" />
                `}
                <button 
                  class="remove-avatar-btn"
                  @click=${() => {
                    this.avatarUrl = '';
                    this.markChanged();
                  }}
                  title="Remove avatar"
                >✕</button>
              </div>
            ` : ''}

            <div class="avatar-upload-controls">
              <input
                type="file"
                id="avatar-file-input"
                accept="image/*,video/*"
                @change=${(e: Event) => {
                  const input = e.target as HTMLInputElement;
                  const file = input.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      this.avatarUrl = event.target?.result as string;
                      this.markChanged();
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                style="display: none;"
              />
              <button 
                class="upload-btn"
                @click=${() => {
                  const input = this.shadowRoot?.getElementById('avatar-file-input') as HTMLInputElement;
                  input?.click();
                }}
              >
                📁 Upload Image/Video
              </button>
              
              <div class="url-input-group">
                <input
                  type="text"
                  .value=${this.avatarUrl && !this.avatarUrl.startsWith('data:') ? this.avatarUrl : ''}
                  @input=${(e: Event) => {
                    this.avatarUrl = (e.target as HTMLInputElement).value;
                    this.markChanged();
                  }}
                  placeholder="Or paste image/video/YouTube URL"
                />
              </div>
            </div>
            
            <div class="helper-text">
              Upload an image or video file, or provide a URL (supports images, videos, and YouTube)
            </div>
          </div>
        </div>

        <!-- Model Assignments Section -->
        <div class="section">
          <h3 class="section-title">Model Assignments</h3>
          
          ${this.renderModelDropdown(
            'Conversation Model',
            this.conversationModel,
            (value) => { this.conversationModel = value; },
            'conversation',
            'Primary model for text conversations'
          )}
          
          ${this.renderModelDropdown(
            'Vision Model',
            this.visionModel,
            (value) => { this.visionModel = value; },
            'vision',
            'Model for processing images and visual input'
          )}
          
          ${this.renderModelDropdown(
            'Function Calling Model',
            this.functionCallingModel,
            (value) => { this.functionCallingModel = value; },
            'functionCalling',
            'Model for tool/function execution'
          )}
          
          ${this.renderModelDropdown(
            'Embedding Model',
            this.embeddingModel,
            (value) => { this.embeddingModel = value; },
            'embedding',
            'Model for RAG memory embeddings'
          )}
          
          ${this.renderModelDropdown(
            'Image Generation Model',
            this.imageGenerationModel,
            (value) => { this.imageGenerationModel = value; },
            'imageGeneration',
            'Model for generating images'
          )}
        </div>

        <!-- Voice Section -->
        <div class="section">
          <h3 class="section-title">Voice</h3>
          
          <div class="field-group">
            <label class="field-label">Voice Name</label>
            <select
              .value=${this.voiceName}
              @change=${(e: Event) => {
                this.voiceName = (e.target as HTMLSelectElement).value;
                this.markChanged();
              }}
            >
              ${VOICE_OPTIONS.map(voice => html`
                <option value="${voice.id}">${voice.name}</option>
              `)}
            </select>
            <div class="helper-text">
              Voice used for text-to-speech output
            </div>
          </div>
        </div>

        <!-- Visual Identity Section -->
        <div class="section">
          <h3 class="section-title">Visual Identity</h3>
          
          <div class="field-group">
            <label class="field-label">Shape</label>
            <select
              .value=${this.shape}
              @change=${(e: Event) => {
                this.shape = (e.target as HTMLSelectElement).value as 'Icosahedron' | 'TorusKnot';
                this.markChanged();
              }}
            >
              <option value="Icosahedron">Icosahedron</option>
              <option value="TorusKnot">Torus Knot</option>
            </select>
          </div>

          <div class="field-group">
            <label class="field-label">Accent Color</label>
            <div class="color-picker-group">
              <input
                type="color"
                .value=${this.accentColor}
                @input=${(e: Event) => {
                  this.accentColor = (e.target as HTMLInputElement).value;
                  this.markChanged();
                }}
              />
              <span class="color-value">${this.accentColor}</span>
            </div>
          </div>

          <div class="field-group">
            <label class="field-label">Texture</label>
            <select
              .value=${this.textureName}
              @change=${(e: Event) => {
                this.textureName = (e.target as HTMLSelectElement).value as TextureName;
                this.markChanged();
              }}
            >
              <option value="none">None</option>
              <option value="lava">Lava</option>
              <option value="water">Water</option>
              <option value="slime">Slime</option>
              <option value="stone_orchid">Stone Orchid</option>
              <option value="bio_green">Bio Green</option>
              <option value="rock_gray">Rock Gray</option>
              <option value="metallic_brushed">Metallic Brushed</option>
              <option value="crystal_blue">Crystal Blue</option>
              <option value="organic_glow">Organic Glow</option>
            </select>
          </div>

          <div class="field-group">
            <label class="field-label">Idle Animation</label>
            <select
              .value=${this.idleAnimation}
              @change=${(e: Event) => {
                this.idleAnimation = (e.target as HTMLSelectElement).value as IdleAnimation;
                this.markChanged();
              }}
            >
              <option value="none">None</option>
              <option value="glow">Glow</option>
              <option value="particles">Particles</option>
              <option value="code">Code</option>
              <option value="subtle_breath">Subtle Breath</option>
              <option value="contemplative">Contemplative</option>
              <option value="energetic">Energetic</option>
              <option value="meditative">Meditative</option>
            </select>
          </div>
        </div>

        <!-- Dual Mode Section -->
        <div class="section">
          <h3 class="section-title">🤝 Dual PersonI Mode</h3>
          <div class="helper-text" style="margin-bottom: 16px;">
            Collaborate with two PersonI simultaneously for richer conversations. Use the carousel at the top of the screen to switch between PersonI.
          </div>
          
          <div class="field-group">
            <label class="field-label">Collaboration Mode</label>
            <select
              @change=${(e: Event) => {
                const mode = (e.target as HTMLSelectElement).value;
                const event = new CustomEvent('dual-mode-changed', {
                  detail: { mode },
                  bubbles: true,
                  composed: true
                });
                this.dispatchEvent(event);
              }}
            >
              <option value="single">Single PersonI (Default)</option>
              <option value="collaborative">Collaborative Discussion</option>
              <option value="debate">Debate & Contrast</option>
              <option value="teaching">Teaching & Examples</option>
            </select>
          </div>
        </div>

        <!-- Capabilities Section -->
        <div class="section">
          <h3 class="section-title">Capabilities</h3>
          
          <div class="capabilities-grid">
            <div
              class="capability-item ${this.capabilities.vision ? 'active' : ''}"
              @click=${() => this.toggleCapability('vision')}
            >
              <div class="checkbox"></div>
              <span class="capability-label">Vision</span>
            </div>

            <div
              class="capability-item ${this.capabilities.imageGeneration ? 'active' : ''}"
              @click=${() => this.toggleCapability('imageGeneration')}
            >
              <div class="checkbox"></div>
              <span class="capability-label">Image Generation</span>
            </div>

            <div
              class="capability-item ${this.capabilities.webSearch ? 'active' : ''}"
              @click=${() => this.toggleCapability('webSearch')}
            >
              <div class="checkbox"></div>
              <span class="capability-label">Web Search</span>
            </div>

            <div
              class="capability-item ${this.capabilities.tools ? 'active' : ''}"
              @click=${() => this.toggleCapability('tools')}
            >
              <div class="checkbox"></div>
              <span class="capability-label">Tools</span>
            </div>

            <div
              class="capability-item ${this.capabilities.mcp ? 'active' : ''}"
              @click=${() => this.toggleCapability('mcp')}
            >
              <div class="checkbox"></div>
              <span class="capability-label">MCP</span>
            </div>

            <div
              class="capability-item ${this.capabilities.audioInput ? 'active' : ''}"
              @click=${() => this.toggleCapability('audioInput')}
            >
              <div class="checkbox"></div>
              <span class="capability-label">Audio Input</span>
            </div>

            <div
              class="capability-item ${this.capabilities.audioOutput ? 'active' : ''}"
              @click=${() => this.toggleCapability('audioOutput')}
            >
              <div class="checkbox"></div>
              <span class="capability-label">Audio Output</span>
            </div>
          </div>
          
          <div class="helper-text" style="margin-top: 12px;">
            Toggle capabilities to enable/disable features for this PersonI
          </div>
        </div>

        <!-- OAuth Connectors Section -->
        <div class="section">
          <h3 class="section-title">OAuth Connectors</h3>
          <div class="helper-text" style="margin-bottom: 12px;">
            External services requiring OAuth authentication
          </div>
          
          <div class="connectors-list">
            ${AVAILABLE_CONNECTORS.filter(c => c.type === 'oauth').map(connector => {
              const isConnected = this.oauthStatuses.get(connector.id) || false;
              
              return html`
                <div
                  class="connector-item ${this.enabledConnectors.includes(connector.id) ? 'active' : ''}"
                  @click=${() => this.toggleConnector(connector.id)}
                >
                  <div class="checkbox"></div>
                  <div class="connector-info">
                    <div class="connector-name">${connector.name}</div>
                    <div class="connector-description">${connector.description}</div>
                  </div>
                  <div class="connector-badge ${isConnected ? 'connected' : 'not-connected'}">
                    ${isConnected ? '✓ Connected' : 'OAuth Required'}
                  </div>
                </div>
              `;
            })}
          </div>
        </div>

        <!-- API Tools Section -->
        <div class="section">
          <h3 class="section-title">API Tools & Commands</h3>
          <div class="helper-text" style="margin-bottom: 12px;">
            Built-in tools and external APIs (configure API keys in Settings)
          </div>
          
          <div class="connectors-list">
            ${AVAILABLE_CONNECTORS.filter(c => c.type === 'api_tool').map(connector => {
              return html`
                <div
                  class="connector-item ${this.enabledConnectors.includes(connector.id) ? 'active' : ''}"
                  @click=${() => this.toggleConnector(connector.id)}
                >
                  <div class="checkbox"></div>
                  <div class="connector-info">
                    <div class="connector-name">${connector.name}</div>
                    <div class="connector-description">${connector.description}</div>
                  </div>
                </div>
              `;
            })}
          </div>
        </div>
      </div>

      <!-- Sticky Actions -->
      <div class="actions">
        <button class="btn btn-secondary" @click=${this.handleCancel}>
          Cancel
        </button>
        <button
          class="btn btn-primary"
          ?disabled=${!this.hasChanges}
          @click=${this.handleSave}
        >
          Save Changes
        </button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'personi-settings-panel': PersoniSettingsPanel;
  }
}
