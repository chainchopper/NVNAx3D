/**
 * PersonI Settings Panel Component
 * 
 * Comprehensive configuration for PersonI instances including:
 * - Identity (name, tagline, system instructions, avatar)
 * - AI Model assignments (conversation, vision, function calling, embedding, image generation)
 * - Voice configuration
 * - Capabilities (vision, image gen, web search, tools, MCP, audio I/O)
 * - Connectors & Tools (OAuth services, API endpoints)
 * - UI Plugins (per-PersonI plugin enablement)
 */

import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { PersoniConfig, PersoniCapabilities, AVAILABLE_CONNECTORS, DEFAULT_CAPABILITIES } from '../personas';
import { appStateService } from '../services/app-state-service';
import { activePersonasManager } from '../services/active-personas-manager';
import { providerManager } from '../services/provider-manager';
import { ModelInfo } from '../types/providers';
import { oauthService } from '../services/oauth-service';
import { pluginRegistry } from '../services/plugin-registry';
import type { Plugin } from '../types/plugin-types';
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
  @state() private capabilities: PersoniCapabilities = { ...DEFAULT_CAPABILITIES };
  @state() private enabledConnectors: string[] = [];
  @state() private enabledPlugins: string[] = [];
  @state() private availablePlugins: Plugin[] = [];
  @state() private oauthStatuses: Map<string, boolean> = new Map();
  
  private oauthUnsubscribe?: () => void;

  static styles = css`
    :host {
      display: block;
      height: 100%;
      overflow-y: auto;
      color: white;
      font-family: system-ui, -apple-system, sans-serif;
      background: rgba(10, 14, 26, 0.98);
    }

    .content {
      padding: 24px;
      max-width: 700px;
      margin: 0 auto;
    }

    .panel-header {
      margin-bottom: 32px;
      padding-bottom: 20px;
      border-bottom: 2px solid rgba(33, 150, 243, 0.3);
    }

    .panel-title {
      font-size: 28px;
      font-weight: 700;
      color: #2196f3;
      margin: 0 0 8px 0;
    }

    .panel-subtitle {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.6);
      margin: 0;
    }

    .section {
      margin-bottom: 32px;
      padding: 24px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
    }

    .section-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 20px;
      color: #2196f3;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .section-title::before {
      content: '';
      width: 4px;
      height: 24px;
      background: linear-gradient(180deg, #2196f3 0%, #64b5f6 100%);
      border-radius: 2px;
    }

    .field-group {
      margin-bottom: 20px;
    }

    .field-group:last-child {
      margin-bottom: 0;
    }

    .field-label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 8px;
      color: rgba(255, 255, 255, 0.85);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    input[type="text"],
    textarea,
    select {
      width: 100%;
      padding: 12px 14px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
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
      background: rgba(255, 255, 255, 0.10);
      box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.15);
    }

    select option {
      background: #1a1a2e;
      color: white;
      padding: 10px;
    }

    textarea {
      min-height: 120px;
      resize: vertical;
      line-height: 1.6;
    }

    .capabilities-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 12px;
    }

    .capability-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px;
      background: rgba(255, 255, 255, 0.04);
      border: 2px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .capability-item:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.2);
      transform: translateY(-2px);
    }

    .capability-item.active {
      background: rgba(33, 150, 243, 0.2);
      border-color: rgba(33, 150, 243, 0.6);
    }

    .checkbox {
      width: 22px;
      height: 22px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 5px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      flex-shrink: 0;
    }

    .capability-item.active .checkbox {
      background: #2196f3;
      border-color: #2196f3;
    }

    .checkbox::after {
      content: '✓';
      color: white;
      font-size: 15px;
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

    .connectors-list,
    .plugins-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .connector-item,
    .plugin-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 14px;
      background: rgba(255, 255, 255, 0.04);
      border: 2px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .connector-item:hover,
    .plugin-item:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.2);
    }

    .connector-item.active,
    .plugin-item.active {
      background: rgba(76, 175, 80, 0.15);
      border-color: rgba(76, 175, 80, 0.5);
    }

    .connector-info,
    .plugin-info {
      flex: 1;
    }

    .connector-name,
    .plugin-name {
      font-weight: 600;
      margin-bottom: 4px;
      font-size: 14px;
    }

    .connector-description,
    .plugin-description {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.6);
      line-height: 1.5;
    }

    .connector-badge {
      margin-left: auto;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .connector-badge.connected {
      background: rgba(76, 175, 80, 0.25);
      color: #4caf50;
      border: 1px solid rgba(76, 175, 80, 0.5);
    }

    .connector-badge.not-connected {
      background: rgba(255, 152, 0, 0.25);
      color: #ff9800;
      border: 1px solid rgba(255, 152, 0, 0.5);
    }

    .actions {
      position: sticky;
      bottom: 0;
      padding: 20px 24px;
      background: rgba(20, 20, 30, 0.98);
      backdrop-filter: blur(20px);
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      gap: 12px;
      margin: 0 -24px -24px;
    }

    .btn {
      flex: 1;
      padding: 14px 28px;
      border-radius: 8px;
      border: none;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .btn-primary {
      background: linear-gradient(135deg, #2196f3 0%, #1976d2 100%);
      color: white;
      box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
    }

    .btn-primary:hover:not(:disabled) {
      background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
      box-shadow: 0 6px 16px rgba(33, 150, 243, 0.4);
      transform: translateY(-2px);
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.08);
      color: white;
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.12);
    }

    .helper-text {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.5);
      margin-top: 8px;
      line-height: 1.5;
    }

    .no-models {
      padding: 16px;
      background: rgba(255, 152, 0, 0.1);
      border: 1px solid rgba(255, 152, 0, 0.3);
      border-radius: 8px;
      color: #ff9800;
      font-size: 13px;
      text-align: center;
    }

    .avatar-preview {
      position: relative;
      width: 100%;
      max-width: 350px;
      margin-bottom: 16px;
      border-radius: 12px;
      overflow: hidden;
      border: 2px solid rgba(33, 150, 243, 0.3);
      background: rgba(10, 14, 26, 0.6);
      backdrop-filter: blur(12px);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
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
      top: 10px;
      right: 10px;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(244, 67, 54, 0.3);
      backdrop-filter: blur(8px);
      border: 2px solid rgba(244, 67, 54, 0.6);
      color: #f44336;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      padding: 0;
    }

    .remove-avatar-btn:hover {
      background: rgba(244, 67, 54, 0.5);
      border-color: rgba(244, 67, 54, 0.8);
      transform: scale(1.1);
    }

    .avatar-upload-controls {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .upload-btn {
      padding: 12px 20px;
      background: rgba(33, 150, 243, 0.15);
      border: 1px solid rgba(33, 150, 243, 0.4);
      border-radius: 8px;
      color: #2196f3;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .upload-btn:hover {
      background: rgba(33, 150, 243, 0.25);
      border-color: rgba(33, 150, 243, 0.6);
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    
    // Initialize asynchronously - MUST sync provider models before loading PersonI data
    this.initializeAsync();
    
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

  private async initializeAsync() {
    // Step 1: Sync all provider models from their endpoints
    await this.loadProviderModels();
    
    // Step 2: Load PersonI data AFTER models are available
    this.loadPersoniData();
    
    // Step 3: Load supplemental data
    this.loadOAuthStatuses();
    this.loadAvailablePlugins();
  }

  private async loadProviderModels() {
    const allProviders = providerManager.getAllProviders();
    const enabledProviders = allProviders.filter(p => p.enabled);
    
    console.log('[PersonISettings] Syncing models from', enabledProviders.length, 'enabled providers');
    
    // Fetch models from all enabled providers in parallel
    await Promise.all(
      enabledProviders.map(provider => providerManager.syncProviderModels(provider.id))
    );
    
    // Update availableModels state after sync
    this.availableModels = providerManager.getAvailableModels();
    
    console.log('[PersonISettings] Loaded', this.availableModels.length, 'models total');
    
    // Force re-render to populate dropdowns
    this.requestUpdate();
  }

  private loadPersoniData(personConfig?: PersoniConfig) {
    const activePersoni = personConfig || appStateService.getActivePersoni();
    if (activePersoni) {
      this.personi = activePersoni;
      this.name = activePersoni.name;
      this.tagline = activePersoni.tagline;
      this.systemInstruction = activePersoni.systemInstruction;
      this.avatarUrl = activePersoni.avatarUrl || '';
      this.voiceName = activePersoni.voiceName || 'Puck';
      
      // Extract composite "providerId:::modelId" for dropdown binding
      const extractCompositeValue = (value: string | { providerId: string; modelId: string } | undefined): string => {
        if (!value) return '';
        if (typeof value === 'string') {
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
      
      this.capabilities = activePersoni.capabilities || { ...DEFAULT_CAPABILITIES };
      this.enabledConnectors = [...(activePersoni.enabledConnectors || [])];
      this.enabledPlugins = [...((activePersoni as any).enabledPlugins || [])];
      this.hasChanges = false;
    }
  }

  private loadAvailableModels() {
    this.availableModels = providerManager.getAvailableModels();
  }

  private loadAvailablePlugins() {
    this.availablePlugins = pluginRegistry.getAllPlugins().filter(p => p.enabled);
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
    this.requestUpdate(); // Force re-render after async load
  }

  private markChanged() {
    this.hasChanges = true;
  }

  private handleSave() {
    if (!this.personi) return;

    // Parse composite "providerId:::modelId" value
    const parseModelSelection = (compositeValue: string) => {
      if (!compositeValue) return undefined;
      const parts = compositeValue.split(':::');
      if (parts.length === 2) {
        return { providerId: parts[0], modelId: parts[1] };
      }
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
        ...this.personi.visuals, // Preserve existing visuals (not editable in this UI)
      },
    } as PersoniConfig & { enabledPlugins: string[] };

    // Add enabledPlugins (extended field)
    (updated as any).enabledPlugins = [...this.enabledPlugins];

    console.log('[PersonISettings] Saving PersonI config:', updated);

    // Persist to localStorage via appStateService (calls savePersonis internally)
    appStateService.updatePersoni(updated);
    
    // Update active personi reference
    appStateService.setActivePersoni(updated);
    
    // Update runtime active personas manager
    activePersonasManager.setPersona('primary', updated);

    // Verify round-trip persistence by reloading from localStorage
    setTimeout(() => {
      try {
        const personsisJSON = localStorage.getItem(PERSONIS_KEY);
        if (personsisJSON) {
          const personis: PersoniConfig[] = JSON.parse(personsisJSON);
          const reloaded = personis.find(p => p.id === updated.id);
          
          if (reloaded) {
            console.log('[PersonISettings] ✓ Verified round-trip persistence from localStorage:', reloaded);
            
            // Validate critical fields
            const validationErrors: string[] = [];
            const pluginsFromStorage = (reloaded as any).enabledPlugins || [];
            const connectorsFromStorage = reloaded.enabledConnectors || [];
            
            if (this.enabledPlugins.length > 0 && pluginsFromStorage.length === 0) {
              validationErrors.push('enabledPlugins lost');
            }
            if (this.enabledConnectors.length > 0 && connectorsFromStorage.length === 0) {
              validationErrors.push('enabledConnectors lost');
            }
            if (!reloaded.capabilities) {
              validationErrors.push('capabilities lost');
            }
            if (!reloaded.models) {
              validationErrors.push('models lost');
            }
            
            if (validationErrors.length > 0) {
              console.error('[PersonISettings] ⚠️ PERSISTENCE ERRORS:', validationErrors, {
                saved: updated,
                reloaded: reloaded
              });
            }
            
            // Rehydrate component state from localStorage data (not memory)
            this.loadPersoniData(reloaded);
            
            // Also update appStateService with reloaded data to ensure consistency
            appStateService.setActivePersoni(reloaded);
            activePersonasManager.setPersona('primary', reloaded);
            
            console.log('[PersonISettings] ✓ Rehydrated component and services from localStorage');
          } else {
            console.error('[PersonISettings] ⚠️ PersonI not found in localStorage after save');
          }
        }
      } catch (error) {
        console.error('[PersonISettings] ⚠️ Failed to verify persistence:', error);
      }
    }, 100);

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

  private togglePlugin(pluginId: string) {
    if (this.enabledPlugins.includes(pluginId)) {
      this.enabledPlugins = this.enabledPlugins.filter(id => id !== pluginId);
    } else {
      this.enabledPlugins = [...this.enabledPlugins, pluginId];
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

      if (urlObj.hostname.includes('youtube.com') && urlObj.pathname === '/watch') {
        videoId = urlObj.searchParams.get('v') || '';
      } else if (urlObj.hostname.includes('youtu.be')) {
        videoId = urlObj.pathname.substring(1);
      }

      if (videoId) {
        const params = new URLSearchParams();
        urlObj.searchParams.forEach((value, key) => {
          if (key !== 'v') {
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
    if (url.startsWith('data:video/')) {
      return true;
    }
    try {
      const urlObj = new URL(url);
      return /\.(mp4|webm|ogg)$/i.test(urlObj.pathname);
    } catch (e) {
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
    const filteredModels = providerManager.getModelsByCapability(capability);
    
    if (filteredModels.length === 0) {
      return html`
        <div class="field-group">
          <label class="field-label">${label}</label>
          <div class="no-models">
            No models with ${capability} capability found. Configure providers in the Models panel.
          </div>
        </div>
      `;
    }

    return html`
      <div class="field-group">
        <label class="field-label">${label}</label>
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
        <div class="panel-header">
          <h2 class="panel-title">⚙️ ${this.personi.name} Settings</h2>
          <p class="panel-subtitle">Configure your PersonI's identity, AI models, capabilities, and integrations</p>
        </div>

        <!-- Identity Section -->
        <div class="section">
          <h3 class="section-title">👤 Identity</h3>
          
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
              Core prompt that defines how this AI behaves and responds to user input
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
            
            <div class="helper-text">
              Upload a file or provide a URL (supports images, videos, and YouTube embeds)
            </div>
          </div>
        </div>

        <!-- AI Model Assignments Section -->
        <div class="section">
          <h3 class="section-title">🤖 AI Model Assignments</h3>
          
          ${this.renderModelDropdown(
            'Conversation Model',
            this.conversationModel,
            (value) => { this.conversationModel = value; },
            'conversation',
            'Primary model for text conversations and reasoning'
          )}
          
          ${this.renderModelDropdown(
            'Vision Model',
            this.visionModel,
            (value) => { this.visionModel = value; },
            'vision',
            'Model for processing images and visual inputs'
          )}
          
          ${this.renderModelDropdown(
            'Function Calling Model',
            this.functionCallingModel,
            (value) => { this.functionCallingModel = value; },
            'functionCalling',
            'Model for tool/function execution and structured outputs'
          )}
          
          ${this.renderModelDropdown(
            'Embedding Model',
            this.embeddingModel,
            (value) => { this.embeddingModel = value; },
            'embedding',
            'Model for RAG memory and semantic search'
          )}
          
          ${this.renderModelDropdown(
            'Image Generation Model',
            this.imageGenerationModel,
            (value) => { this.imageGenerationModel = value; },
            'imageGeneration',
            'Model for generating images from text prompts'
          )}
        </div>

        <!-- Voice Section -->
        <div class="section">
          <h3 class="section-title">🎤 Voice</h3>
          
          <div class="field-group">
            <label class="field-label">Voice Selection</label>
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
              Voice used for text-to-speech audio output
            </div>
          </div>
        </div>

        <!-- Capabilities Section -->
        <div class="section">
          <h3 class="section-title">✨ Capabilities</h3>
          
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
          
          <div class="helper-text" style="margin-top: 16px;">
            Enable or disable specific AI capabilities for this PersonI
          </div>
        </div>

        <!-- Connectors & Tools Section -->
        <div class="section">
          <h3 class="section-title">🔌 Connectors & Tools</h3>
          
          <div class="connectors-list">
            ${AVAILABLE_CONNECTORS.map(connector => {
              const isEnabled = this.enabledConnectors.includes(connector.id);
              const isOAuth = oauthService.isOAuthConnector(connector.id);
              const isConnected = isOAuth ? (this.oauthStatuses.get(connector.id) || false) : true;
              
              return html`
                <div 
                  class="connector-item ${isEnabled ? 'active' : ''}"
                  @click=${() => this.toggleConnector(connector.id)}
                >
                  <div class="checkbox"></div>
                  <div class="connector-info">
                    <div class="connector-name">${connector.name}</div>
                    <div class="connector-description">${connector.description}</div>
                  </div>
                  ${isOAuth ? html`
                    <span class="connector-badge ${isConnected ? 'connected' : 'not-connected'}">
                      ${isConnected ? 'Connected' : 'Not Connected'}
                    </span>
                  ` : ''}
                </div>
              `;
            })}
          </div>
          
          <div class="helper-text" style="margin-top: 16px;">
            Enable OAuth connectors and API tools for this PersonI. OAuth connectors require setup in the Connectors panel.
          </div>
        </div>

        <!-- UI Plugins Section -->
        <div class="section">
          <h3 class="section-title">🧩 UI Plugins</h3>
          
          <div class="plugins-list">
            ${this.availablePlugins.length > 0 ? this.availablePlugins.map(plugin => {
              const isEnabled = this.enabledPlugins.includes(plugin.metadata.id);
              
              return html`
                <div 
                  class="plugin-item ${isEnabled ? 'active' : ''}"
                  @click=${() => this.togglePlugin(plugin.metadata.id)}
                >
                  <div class="checkbox"></div>
                  <div class="plugin-info">
                    <div class="plugin-name">${plugin.metadata.name}</div>
                    <div class="plugin-description">${plugin.metadata.description}</div>
                  </div>
                </div>
              `;
            }) : html`
              <div class="helper-text">
                No UI plugins available. Import plugins via the Plugin Manager panel.
              </div>
            `}
          </div>
          
          <div class="helper-text" style="margin-top: 16px;">
            Enable UI plugins for this PersonI. Plugins add custom interface elements and functionality.
          </div>
        </div>

        <div class="actions">
          <button class="btn btn-secondary" @click=${this.handleCancel}>
            Cancel
          </button>
          <button 
            class="btn btn-primary" 
            @click=${this.handleSave}
            ?disabled=${!this.hasChanges}
          >
            Save Changes
          </button>
        </div>
      </div>
    `;
  }
}
