/* tslint:disable */
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  FunctionCall,
  GoogleGenAI,
  Modality,
} from '@google/genai';
import {LitElement, css, html, nothing, PropertyValueMap} from 'lit';
import {customElement, state} from 'lit/decorators.js';
import {
  AudioRecorder,
  VoiceActivityDetector,
  blobToBase64,
  decode,
  decodeAudioData,
} from './utils';
import './visual-3d';
import './components/models-panel';
import {
  AVAILABLE_CONNECTORS,
  Connector,
  IdleAnimation,
  PersoniConfig,
  personaTemplates,
  switchPersonaDeclaration,
  TextureName,
  DEFAULT_CAPABILITIES,
} from './personas';
import { providerManager } from './services/provider-manager';
import { ProviderFactory } from './providers/provider-factory';
import { BaseProvider } from './providers/base-provider';
import { GoogleProvider } from './providers/google-provider';

const PERSONIS_KEY = 'gdm-personis';
const CONNECTORS_KEY = 'gdm-connectors';
const AVAILABLE_VOICES = ['Zephyr', 'Kore', 'Puck', 'Charon', 'Fenrir'];
const AVAILABLE_MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro'];
const AVAILABLE_SHAPES = ['Icosahedron', 'TorusKnot', 'Box'];
const AVAILABLE_TEXTURES: TextureName[] = [
  'none',
  'lava',
  'water',
  'stone_orchid',
  'bio_green',
  'rock_gray',
  'metallic_brushed',
  'crystal_blue',
  'organic_glow',
];
const AVAILABLE_IDLE_ANIMATIONS: IdleAnimation[] = [
  'none',
  'glow',
  'particles',
  'code',
];

type ConfigPanelMode = 'list' | 'selectTemplate' | 'edit';
type ActiveSidePanel = 'none' | 'personis' | 'connectors' | 'models';

interface TranscriptEntry {
  speaker: 'user' | 'ai' | 'system';
  text: string;
  personiName?: string;
  personiColor?: string;
}

@customElement('gdm-live-audio')
export class GdmLiveAudio extends LitElement {
  @state() isMuted = false;
  @state() isSpeaking = false;
  @state() isAiSpeaking = false;
  @state() status = 'Initializing...';
  @state() error = '';
  @state() settingsButtonVisible = false;
  @state() settingsMenuVisible = false;

  // New state for unified config panel
  @state() activeSidePanel: ActiveSidePanel = 'none';
  @state() configPanelMode: ConfigPanelMode = 'list';
  @state() personis: PersoniConfig[] = [];
  @state() connectors: {[id: string]: {enabled: boolean}} = {};
  @state() activePersoni: PersoniConfig | null = null;
  @state() editingPersoni: PersoniConfig | null = null;

  @state() isSwitchingPersona = false;
  @state() transcriptHistory: TranscriptEntry[] = [];
  @state() currentTranscript = '';
  @state() providerStatus: 'configured' | 'missing' | 'unconfigured' = 'unconfigured';
  @state() showOnboarding = false;

  private settingsTimeout: number | undefined;
  private idlePromptTimeout: number | undefined;

  private client: GoogleGenAI;
  private inputAudioContext = new (window.AudioContext ||
    (window as any).webkitAudioContext)();
  private outputAudioContext = new (window.AudioContext ||
    (window as any).webkitAudioContext)({sampleRate: 24000});
  @state() inputNode = this.inputAudioContext.createGain();
  @state() outputNode = this.outputAudioContext.createGain();
  private nextStartTime = 0;
  private mediaStream: MediaStream;
  private sourceNode: MediaStreamAudioSourceNode;
  private scriptProcessorNode: ScriptProcessorNode;
  private sources = new Set<AudioBufferSourceNode>();

  private vad: VoiceActivityDetector;
  private audioRecorder: AudioRecorder;

  static styles = css`
    :host {
      display: block;
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }

    #status {
      position: absolute;
      bottom: 5vh;
      left: 0;
      right: 0;
      z-index: 10;
      text-align: center;
      color: white;
      font-family: sans-serif;
      text-shadow: 0 0 4px black;
      transition: opacity 0.5s ease-in-out;
      padding: 0 20px;
      min-height: 25px;
    }

    .controls {
      z-index: 10;
      position: absolute;
      bottom: 10vh;
      left: 0;
      right: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: row; /* Changed to row for side-by-side buttons */
      gap: 20px; /* Added gap between buttons */
      transition: opacity 0.5s ease-in-out;

      button {
        outline: none;
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: white;
        border-radius: 50%; /* Make buttons circular */
        background: rgba(255, 255, 255, 0.1);
        width: 64px;
        height: 64px;
        cursor: pointer;
        font-size: 24px;
        padding: 0;
        margin: 0;
        display: flex; /* Center SVG inside button */
        align-items: center;
        justify-content: center;
        transition: background-color 0.2s ease-in-out;

        &:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      }
    }

    .persona-carousel-container {
      position: absolute;
      bottom: 20vh; /* Position it above the main controls */
      left: 0;
      right: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10;
      opacity: 0;
      transition: opacity 0.5s ease-in-out;
      pointer-events: none;
    }

    .persona-carousel-container.visible {
      opacity: 1;
      pointer-events: all;
    }

    .persona-carousel {
      display: flex;
      gap: 16px;
      padding: 10px;
      overflow-x: auto;
      scrollbar-width: none; /* Firefox */
      -ms-overflow-style: none; /* IE and Edge */
    }

    .persona-carousel::-webkit-scrollbar {
      display: none; /* Chrome, Safari, and Opera */
    }

    .persona-card {
      flex-shrink: 0;
      width: 140px;
      height: 160px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 12px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      text-align: center;
      color: white;
      font-family: sans-serif;
      font-size: 14px;
      transition: all 0.3s ease;
      padding: 12px;
      box-sizing: border-box;
      gap: 8px;
    }

    .persona-card:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: translateY(-5px);
    }

    .persona-card.active {
      background: rgba(135, 206, 250, 0.3);
      border-color: rgba(135, 206, 250, 0.8);
      box-shadow: 0 0 15px rgba(135, 206, 250, 0.5);
    }

    .persona-card-avatar {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid rgba(255, 255, 255, 0.3);
      background: rgba(0, 0, 0, 0.2);
      flex-shrink: 0;
    }

    .persona-card-name {
      font-weight: bold;
      margin-bottom: 2px;
      font-size: 13px;
    }

    .persona-card-desc {
      font-size: 10px;
      opacity: 0.8;
      line-height: 1.2;
    }

    .settings-fab {
      position: absolute;
      bottom: 24px;
      right: 24px;
      z-index: 100;
      opacity: 0;
      transition: opacity 0.5s ease-in-out;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .settings-fab.visible {
      opacity: 1;
    }

    .provider-status-indicator {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(25, 22, 30, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      cursor: pointer;
      position: relative;
    }

    .provider-status-indicator.configured {
      background: rgba(34, 139, 34, 0.2);
      border-color: rgba(34, 139, 34, 0.5);
    }

    .provider-status-indicator.missing {
      background: rgba(255, 165, 0, 0.2);
      border-color: rgba(255, 165, 0, 0.5);
      animation: pulse-warning 2s infinite;
    }

    @keyframes pulse-warning {
      0% {
        box-shadow: 0 0 0 0 rgba(255, 165, 0, 0.4);
      }
      70% {
        box-shadow: 0 0 5px 10px rgba(255, 165, 0, 0);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(255, 165, 0, 0);
      }
    }

    .provider-status-tooltip {
      position: absolute;
      bottom: 100%;
      right: 0;
      margin-bottom: 8px;
      background: rgba(25, 22, 30, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 4px;
      padding: 8px 12px;
      white-space: nowrap;
      font-size: 12px;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s;
    }

    .provider-status-indicator:hover .provider-status-tooltip {
      opacity: 1;
    }

    .settings-fab button {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: rgba(25, 22, 30, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 20px rgba(135, 206, 250, 0);
      animation: pulse-off 2s infinite;
    }

    .settings-fab button:hover,
    .settings-fab button.active {
      animation: pulse-on 2s infinite;
    }

    @keyframes pulse-on {
      0% {
        box-shadow: 0 0 0 0 rgba(135, 206, 250, 0.4);
      }
      70% {
        box-shadow: 0 0 10px 20px rgba(135, 206, 250, 0);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(135, 206, 250, 0);
      }
    }

    .settings-menu {
      position: absolute;
      bottom: 24px;
      right: 24px;
      z-index: 99;
    }

    .settings-menu .menu-item {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: rgba(25, 22, 30, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      cursor: pointer;
      transition: transform 0.3s ease-out, opacity 0.3s ease-out;
      opacity: 0;
      transform: translate(0, 0);
    }

    .settings-menu.open .menu-item {
      opacity: 1;
    }

    /* Arc positions */
    .settings-menu.open .menu-item:nth-child(1) {
      transform: translate(-80px, 0px);
      transition-delay: 0.1s;
    }
    .settings-menu.open .menu-item:nth-child(2) {
      transform: translate(-56px, -56px);
      transition-delay: 0.2s;
    }
    .settings-menu.open .menu-item:nth-child(3) {
      transform: translate(0px, -80px);
      transition-delay: 0.3s;
    }

    .side-panel {
      position: fixed;
      top: 0;
      right: -450px; /* Start off-screen */
      width: 400px;
      height: 100%;
      background: rgba(25, 22, 30, 0.9);
      backdrop-filter: blur(10px);
      border-left: 1px solid rgba(255, 255, 255, 0.2);
      color: white;
      font-family: sans-serif;
      z-index: 200;
      transition: right 0.5s ease-in-out;
      display: flex;
      flex-direction: column;
    }

    .side-panel.visible {
      right: 0;
    }

    .panel-header {
      padding: 16px;
      font-size: 20px;
      font-weight: bold;
      border-bottom: 1px solid rgba(255, 255, 255, 0.2);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .panel-header button {
      background: none;
      border: none;
      color: white;
      font-size: 24px;
      cursor: pointer;
    }

    .panel-content {
      flex-grow: 1;
      overflow-y: auto;
      padding: 16px;
    }

    .panel-content h3 {
      margin-top: 0;
      margin-bottom: 16px;
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-weight: bold;
    }

    .form-group input,
    .form-group select,
    .form-group textarea {
      width: 100%;
      padding: 8px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 4px;
      color: white;
      box-sizing: border-box;
    }

    .form-group textarea {
      min-height: 150px;
      resize: vertical;
    }

    .form-group-inline {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .form-group-inline input[type='color'] {
      padding: 0;
      height: 40px;
      width: 60px;
      border-radius: 4px;
      border: 1px solid rgba(255, 255, 255, 0.3);
      cursor: pointer;
    }

    .panel-content button.primary {
      background: #87ceeb;
      color: #100c14;
      border: none;
      padding: 10px 15px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
      width: 100%;
      margin-top: 10px;
    }

    .capabilities-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 10px;
    }

    .capability-item {
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(255, 255, 255, 0.05);
      padding: 8px;
      border-radius: 4px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .capability-item input {
      width: auto;
    }
    .capability-item label {
      margin: 0;
      font-weight: normal;
    }

    .template-list,
    .personi-list,
    .connector-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .template-list-item,
    .personi-list-item,
    .connector-list-item {
      padding: 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .template-list-item,
    .personi-list-item {
      cursor: pointer;
    }

    .template-list-item:hover,
    .personi-list-item:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .personi-list-item .actions button {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      margin-left: 8px;
      padding: 4px;
    }

    .personi-list-item .actions button.delete {
      color: #c80000;
    }

    .connector-list-item .info {
      flex-grow: 1;
      margin-right: 10px;
    }
    .connector-list-item .info strong {
      display: block;
      margin-bottom: 4px;
    }
    .connector-list-item .info p {
      font-size: 12px;
      opacity: 0.7;
      margin: 0;
    }

    /* Simple toggle switch */
    .toggle-switch {
      position: relative;
      display: inline-block;
      width: 40px;
      height: 24px;
    }
    .toggle-switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #333;
      transition: 0.4s;
      border-radius: 24px;
    }
    .slider:before {
      position: absolute;
      content: '';
      height: 16px;
      width: 16px;
      left: 4px;
      bottom: 4px;
      background-color: white;
      transition: 0.4s;
      border-radius: 50%;
    }
    input:checked + .slider {
      background-color: #87ceeb;
    }
    input:checked + .slider:before {
      transform: translateX(16px);
    }

    .transcription-log-container {
      position: absolute;
      top: 5vh;
      left: 50%;
      transform: translateX(-50%);
      width: 80%;
      max-width: 800px;
      max-height: 40vh;
      overflow-y: auto;
      z-index: 5;
      padding: 10px;
      font-family: sans-serif;
      color: white;
      text-shadow: 0 0 4px black;
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
    }

    .transcription-log-container::-webkit-scrollbar {
      width: 5px;
    }
    .transcription-log-container::-webkit-scrollbar-track {
      background: transparent;
    }
    .transcription-log-container::-webkit-scrollbar-thumb {
      background-color: rgba(255, 255, 255, 0.3);
      border-radius: 20px;
      border: 3px solid transparent;
    }

    .log-entry {
      margin-bottom: 12px;
      opacity: 0;
      animation: fadeIn 0.5s forwards;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .log-speaker {
      font-weight: bold;
      margin-bottom: 4px;
      font-size: 14px;
    }

    .log-speaker.user {
      color: #87ceeb; /* Light Blue */
    }

    .log-speaker.system {
      color: #cccccc; /* Light Grey */
      font-style: italic;
    }

    .log-text {
      font-size: 16px;
      line-height: 1.4;
    }
  `;

  constructor() {
    super();
    // Initialize legacy client as fallback (provider system is now primary)
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;
    if (apiKey) {
      this.client = new GoogleGenAI({apiKey});
    }
    this.vad = new VoiceActivityDetector();
    this.handleUserActivity = this.handleUserActivity.bind(this);
    this.setupVadListeners();
    this.init();
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('mousemove', this.handleUserActivity);
    window.addEventListener('touchstart', this.handleUserActivity);
    this.handleUserActivity();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('mousemove', this.handleUserActivity);
    window.removeEventListener('touchstart', this.handleUserActivity);
    if (this.settingsTimeout) clearTimeout(this.settingsTimeout);
    if (this.idlePromptTimeout) clearTimeout(this.idlePromptTimeout);
  }

  protected updated(
    changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>,
  ) {
    if (changedProperties.has('transcriptHistory')) {
      const logContainer =
        this.renderRoot.querySelector('.transcription-log-container');
      if (logContainer) {
        // A short delay to allow the new element to be rendered and animated
        setTimeout(() => {
          logContainer.scrollTop = logContainer.scrollHeight;
        }, 100);
      }
    }
  }

  private async init() {
    this.outputNode.connect(this.outputAudioContext.destination);
    this.loadConfiguration();
    await this.startListening();
    this.checkProviderStatus();
    
    if (this.providerStatus === 'unconfigured') {
      this.showOnboarding = true;
      this.updateStatus('Welcome! Configure your AI providers in Settings → Models to get started');
    } else if (this.providerStatus === 'missing') {
      this.updateStatus('Current provider not configured - go to Settings → Models');
    } else {
      this.updateStatus('Idle');
      this.resetIdlePromptTimer();
    }
  }

  private checkProviderStatus() {
    const availableModels = providerManager.getAvailableModels();
    
    if (availableModels.length === 0) {
      this.providerStatus = 'unconfigured';
      return;
    }

    if (this.activePersoni) {
      const provider = this.getProviderForPersoni(this.activePersoni);
      this.providerStatus = provider ? 'configured' : 'missing';
    } else {
      this.providerStatus = availableModels.length > 0 ? 'configured' : 'unconfigured';
    }
  }

  private getProviderStatusTooltip(): string {
    switch (this.providerStatus) {
      case 'configured':
        return 'Provider configured and ready';
      case 'missing':
        return `Provider for ${this.activePersoni?.thinkingModel || 'current model'} not configured`;
      case 'unconfigured':
        return 'No providers configured - click to configure';
      default:
        return 'Unknown status';
    }
  }

  private loadConfiguration() {
    const storedPersonis = localStorage.getItem(PERSONIS_KEY);
    if (storedPersonis) {
      this.personis = JSON.parse(storedPersonis);
      // Ensure all loaded PersonI have capabilities and avatarUrl from templates
      this.personis = this.personis.map(p => {
        const template = personaTemplates.find(t => t.templateName === p.templateName);
        return {
          ...p,
          capabilities: p.capabilities || { ...DEFAULT_CAPABILITIES },
          avatarUrl: p.avatarUrl || template?.avatarUrl,
        };
      });
      this.savePersonis(); // Save with updated capabilities and avatarUrl
    } else {
      // First time setup: create Personis from templates
      this.personis = personaTemplates.map((template) => {
        return {
          id: crypto.randomUUID(),
          name: template.name,
          tagline: template.tagline,
          systemInstruction: template.systemInstruction,
          templateName: template.name,
          voiceName: template.voiceName,
          thinkingModel: template.thinkingModel,
          enabledConnectors: template.enabledConnectors,
          capabilities: { ...DEFAULT_CAPABILITIES },
          avatarUrl: template.avatarUrl,
          visuals: template.visuals,
        };
      });
      this.savePersonis();
    }

    if (this.personis.length > 0) {
      this.activePersoni = this.personis[0];
    }

    const storedConnectors = localStorage.getItem(CONNECTORS_KEY);
    if (storedConnectors) {
      this.connectors = JSON.parse(storedConnectors);
    } else {
      // Initialize all connectors as disabled
      this.connectors = AVAILABLE_CONNECTORS.reduce((acc, conn) => {
        acc[conn.id] = {enabled: false};
        return acc;
      }, {});
      this.saveConnectors();
    }
  }

  private savePersonis() {
    localStorage.setItem(PERSONIS_KEY, JSON.stringify(this.personis));
    this.personis = [...this.personis];
  }

  private saveConnectors() {
    localStorage.setItem(CONNECTORS_KEY, JSON.stringify(this.connectors));
    this.connectors = {...this.connectors};
  }

  private handleUserActivity() {
    this.settingsButtonVisible = true;
    if (this.settingsTimeout) clearTimeout(this.settingsTimeout);
    this.settingsTimeout = window.setTimeout(() => {
      this.settingsButtonVisible = false;
      this.settingsMenuVisible = false;
    }, 4000);
  }

  private toggleSettingsMenu() {
    this.settingsMenuVisible = !this.settingsMenuVisible;
  }

  private async requestPersoniSwitch(personi: PersoniConfig) {
    if (this.isSwitchingPersona || this.activePersoni?.id === personi.id) {
      return;
    }

    clearTimeout(this.idlePromptTimeout);
    this.isSwitchingPersona = true;
    this.updateStatus(`Switching to ${personi.name}...`);

    const handoffMessages = [
      `Certainly. Handing over to ${personi.name}.`,
      `Of course. Connecting you with ${personi.name} now.`,
      `One moment. ${personi.name} will be with you shortly.`,
      `Transferring you to ${personi.name}.`,
    ];
    const handoff =
      handoffMessages[Math.floor(Math.random() * handoffMessages.length)];
    await this.speakText(handoff, 'system');
    this.updateStatus(`Summoning ${personi.name}...`);

    await new Promise((resolve) => setTimeout(resolve, 4000));

    this.activePersoni = personi;
    this.updateStatus(`${personi.name} is now active.`);

    const template = personaTemplates.find(
      (t) => t.name === this.activePersoni?.templateName,
    );
    if (template && template.introductions.length > 0) {
      const intro =
        template.introductions[
          Math.floor(Math.random() * template.introductions.length)
        ];
      await this.speakText(intro);
    }

    this.isSwitchingPersona = false;
    this.checkProviderStatus();
    this.updateStatus(this.isMuted ? 'Muted' : 'Idle');
    this.resetIdlePromptTimer();
  }

  private getAvailableModelsForDropdown(): Array<{ id: string; name: string }> {
    const models = providerManager.getAvailableModels();
    
    return models.map(m => ({
      id: m.id,
      name: `${m.name} ${m.capabilities?.vision ? '👁️' : ''}${m.capabilities?.functionCalling ? '🔧' : ''}`.trim(),
    }));
  }

  private getProviderForPersoni(personi: PersoniConfig): BaseProvider | null {
    const modelId = personi.thinkingModel;
    
    const availableModels = providerManager.getAvailableModels();
    const modelInfo = availableModels.find(m => m.id === modelId);
    
    if (!modelInfo) {
      console.warn(`Model "${modelId}" not found in any configured provider`);
      return null;
    }
    
    return providerManager.getProviderInstance(modelInfo.providerId, modelId);
  }

  private async transcribeAudio(audioBlob: Blob): Promise<string | null> {
    if (!this.activePersoni) {
      this.updateError('Please select a PersonI to continue');
      return null;
    }

    const provider = this.getProviderForPersoni(this.activePersoni);
    
    this.updateStatus('Transcribing...');
    try {
      const base64Audio = await blobToBase64(audioBlob);
      
      if (provider instanceof GoogleProvider) {
        const googleProvider = provider as any;
        if (!googleProvider.client) {
          this.updateStatus('Verifying provider...');
          await googleProvider.verify();
        }
        
        const response = await googleProvider.client.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: {
            parts: [
              {
                inlineData: {
                  data: base64Audio,
                  mimeType: audioBlob.type,
                },
              },
              {text: 'Transcribe this audio.'},
            ],
          },
        });
        return response.text.trim();
      }
      
      if (this.client) {
        console.warn('Using legacy Google client for transcription (provider is not Google)');
        const response = await this.client.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: {
            parts: [
              {
                inlineData: {
                  data: base64Audio,
                  mimeType: audioBlob.type,
                },
              },
              {text: 'Transcribe this audio.'},
            ],
          },
        });
        return response.text.trim();
      }
      
      this.updateError('Configure a Google Gemini provider in Settings → Models to enable voice transcription');
      return null;
    } catch (e) {
      if (e.message?.includes('API key')) {
        this.updateError('Check your API key in Settings → Models');
      } else if (e.message?.includes('network') || e.message?.includes('fetch')) {
        this.updateError('Connection error - check your internet connection');
      } else {
        this.updateError(`Unable to transcribe audio - ${e.message}`);
      }
      return null;
    }
  }

  private async processTranscript(transcript: string) {
    if (!this.activePersoni) return;
    
    const provider = this.getProviderForPersoni(this.activePersoni);
    
    if (!provider) {
      this.updateError(`Configure ${this.activePersoni.thinkingModel} provider in Settings → Models`);
      return;
    }

    this.transcriptHistory = [
      ...this.transcriptHistory,
      {speaker: 'user', text: transcript},
    ];
    this.currentTranscript = '';

    this.updateStatus('Thinking...');

    try {
      const enabledDeclarations = [switchPersonaDeclaration];

      if (this.activePersoni.enabledConnectors) {
        for (const connectorId of this.activePersoni.enabledConnectors) {
          if (this.connectors[connectorId]?.enabled) {
            const connector = AVAILABLE_CONNECTORS.find(
              (c) => c.id === connectorId,
            );
            if (connector) {
              enabledDeclarations.push(connector.functionDeclaration);
            }
          }
        }
      }

      if (provider instanceof GoogleProvider) {
        const googleProvider = provider as any;
        if (!googleProvider.client) {
          await googleProvider.verify();
        }

        const response = await googleProvider.client.models.generateContent({
          model: this.activePersoni.thinkingModel,
          contents: transcript,
          config: {
            systemInstruction: this.activePersoni.systemInstruction,
            tools: [{functionDeclarations: enabledDeclarations}],
          },
        });

        const functionCalls = response.functionCalls;
        if (functionCalls && functionCalls.length > 0) {
          for (const fc of functionCalls) {
            await this.handleFunctionCall(fc);
          }
        } else {
          const responseText = response.text;
          await this.speakText(responseText);
        }
      } else {
        const messages = [
          { role: 'system' as const, content: this.activePersoni.systemInstruction },
          { role: 'user' as const, content: transcript },
        ];

        const responseText = await provider.sendMessage(messages);
        await this.speakText(responseText);
      }
    } catch (e) {
      if (e.message?.includes('API key')) {
        this.updateError('Check your API key in Settings → Models');
      } else if (e.message?.includes('network') || e.message?.includes('fetch')) {
        this.updateError('Connection error - check your internet connection');
      } else {
        this.updateError(`Unable to process request - ${e.message}`);
      }
    } finally {
      if (!this.isAiSpeaking) {
        this.updateStatus('Idle');
        this.resetIdlePromptTimer();
      }
    }
  }

  private async handleFunctionCall(fc: FunctionCall) {
    switch (fc.name) {
      case 'switchPersona': {
        const targetName = (fc.args.personaName as string).toLowerCase();
        const targetPersoni = this.personis.find(
          (p) => p.name.toLowerCase() === targetName,
        );

        if (targetPersoni) {
          this.requestPersoniSwitch(targetPersoni);
        } else {
          this.speakText(
            `I'm sorry, I don't know any Personi named ${fc.args.personaName}.`,
          );
        }
        break;
      }
      case 'getYoutubeVideoDetails': {
        const url = fc.args.url as string;
        await this.speakText(
          `Okay, I'm looking at that YouTube video for you. Based on the transcript, it seems to be about the future of AI.`,
          'system',
        );
        break;
      }
      case 'readFileFromGoogleDrive': {
        const fileName = fc.args.fileName as string;
        await this.speakText(
          `Accessing Google Drive... I've found the file "${fileName}". The document outlines a new strategy for Q3.`,
          'system',
        );
        break;
      }
      case 'getGithubRepoDetails': {
        const repoName = fc.args.repoName as string;
        await this.speakText(
          `Checking the GitHub repository "${repoName}". It looks like there are 5 new pull requests that need review.`,
          'system',
        );
        break;
      }
      default:
        await this.speakText(
          `I received a request to use the tool "${fc.name}", but I'm not fully equipped to handle that yet.`,
          'system',
        );
        break;
    }
  }

  private async playAudio(base64Audio: string) {
    this.isAiSpeaking = true;
    this.updateStatus('Speaking...');
    clearTimeout(this.idlePromptTimeout);

    this.nextStartTime = Math.max(
      this.nextStartTime,
      this.outputAudioContext.currentTime,
    );
    const audioBuffer = await decodeAudioData(
      decode(base64Audio),
      this.outputAudioContext,
      24000,
      1,
    );
    const source = this.outputAudioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.outputNode);
    source.addEventListener('ended', () => {
      this.sources.delete(source);
      if (this.sources.size === 0) {
        this.isAiSpeaking = false;
        this.updateStatus(this.isMuted ? 'Muted' : 'Idle');
        this.resetIdlePromptTimer();
      }
    });

    source.start(this.nextStartTime);
    this.nextStartTime = this.nextStartTime + audioBuffer.duration;
    this.sources.add(source);
  }

  private async speakText(text: string, speaker: 'ai' | 'system' = 'ai') {
    if (!this.activePersoni && speaker === 'ai') return;
    if (!text.trim()) return;
    
    const provider = speaker === 'ai' && this.activePersoni 
      ? this.getProviderForPersoni(this.activePersoni)
      : null;

    this.transcriptHistory = [
      ...this.transcriptHistory,
      {
        speaker,
        text,
        personiName: speaker === 'ai' ? this.activePersoni!.name : undefined,
        personiColor:
          speaker === 'ai'
            ? this.activePersoni!.visuals.accentColor
            : undefined,
      },
    ];

    try {
      let client = null;
      
      if (provider instanceof GoogleProvider) {
        const googleProvider = provider as any;
        if (!googleProvider.client) {
          await googleProvider.verify();
        }
        client = googleProvider.client;
      } 
      else if (this.client) {
        console.warn('Using legacy Google client for TTS (provider is not Google)');
        client = this.client;
      }

      if (client) {
        const response = await client.models.generateContent({
          model: 'gemini-2.5-flash-preview-tts',
          contents: [{parts: [{text}]}],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName:
                    speaker === 'ai'
                      ? this.activePersoni!.voiceName
                      : AVAILABLE_VOICES[0],
                },
              },
            },
          },
        });
        const audioData =
          response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (audioData) {
          await this.playAudio(audioData);
          await new Promise((resolve) => {
            const checkInterval = setInterval(() => {
              if (this.sources.size === 0) {
                clearInterval(checkInterval);
                resolve(null);
              }
            }, 100);
          });
        }
      } else {
        console.warn('TTS unavailable: requires Google Gemini provider or VITE_GEMINI_API_KEY');
      }
    } catch (e) {
      if (e.message?.includes('API key')) {
        this.updateError('Check your API key in Settings → Models');
      } else if (e.message?.includes('network') || e.message?.includes('fetch')) {
        this.updateError('Connection error - check your internet connection');
      } else {
        console.warn('TTS Error:', e.message);
      }
    }
  }

  private updateStatus(msg: string) {
    if (this.isSpeaking) return;
    this.status = msg;
    this.error = '';
  }

  private updateError(msg: string) {
    this.error = msg;
    setTimeout(() => {
      if (this.error === msg) {
        this.updateStatus('Idle');
      }
    }, 5000);
  }

  private setupVadListeners() {
    this.vad.addEventListener('speech_start', () => {
      clearTimeout(this.idlePromptTimeout);
      this.isSpeaking = true;
      this.status = 'Listening...';
      this.audioRecorder?.start();
    });

    this.vad.addEventListener('speech_end', async () => {
      this.isSpeaking = false;
      const audioBlob = await this.audioRecorder?.stop();

      if (audioBlob && audioBlob.size > 1000) {
        const transcript = await this.transcribeAudio(audioBlob);
        if (transcript) {
          this.currentTranscript = transcript;
          await this.processTranscript(transcript);
        } else {
          this.updateStatus('Idle');
          this.resetIdlePromptTimer();
        }
      } else {
        this.updateStatus('No speech detected.');
        setTimeout(() => {
          this.updateStatus('Idle');
          this.resetIdlePromptTimer();
        }, 2000);
      }
    });
  }

  private async startListening() {
    if (this.mediaStream) return;

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      this.inputAudioContext.resume();

      this.sourceNode = this.inputAudioContext.createMediaStreamSource(
        this.mediaStream,
      );
      this.sourceNode.connect(this.inputNode);
      this.audioRecorder = new AudioRecorder(this.sourceNode);

      const bufferSize = 4096;
      this.scriptProcessorNode = this.inputAudioContext.createScriptProcessor(
        bufferSize,
        1,
        1,
      );

      this.scriptProcessorNode.onaudioprocess = (audioProcessingEvent) => {
        if (this.isMuted) return;
        const pcmData = audioProcessingEvent.inputBuffer.getChannelData(0);
        this.vad.process(new Float32Array(pcmData));
      };

      this.sourceNode.connect(this.scriptProcessorNode);
      // Connect to a muted gain node to keep the processor alive without feedback
      const mutedGain = this.inputAudioContext.createGain();
      mutedGain.gain.setValueAtTime(0, this.inputAudioContext.currentTime);
      this.scriptProcessorNode.connect(mutedGain);
      mutedGain.connect(this.inputAudioContext.destination);
    } catch (err) {
      console.error('Error starting listening:', err);
      this.updateError('Please allow microphone access to use voice features');
    }
  }

  private toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.vad.reset();
      this.isSpeaking = false;
      clearTimeout(this.idlePromptTimeout);
      this.updateStatus('Muted');
    } else {
      this.updateStatus('Idle');
      this.resetIdlePromptTimer();
    }
  }

  private handleInterrupt() {
    for (const source of this.sources.values()) {
      source.stop();
    }
    this.sources.clear();
    this.nextStartTime = 0;
    this.isAiSpeaking = false;
    this.updateStatus(this.isMuted ? 'Muted' : 'Idle');
    this.resetIdlePromptTimer();
  }

  // Idle Prompt Logic
  private resetIdlePromptTimer() {
    clearTimeout(this.idlePromptTimeout);

    if (this.isMuted || this.isSpeaking || this.isAiSpeaking) {
      return;
    }

    const randomDelay = 20000 + Math.random() * 10000; // 20-30 seconds
    this.idlePromptTimeout = window.setTimeout(() => {
      this.triggerIdlePrompt();
    }, randomDelay);
  }

  private async triggerIdlePrompt() {
    if (
      this.isMuted ||
      this.isSpeaking ||
      this.isAiSpeaking ||
      !this.activePersoni
    ) {
      this.resetIdlePromptTimer();
      return;
    }

    const template = personaTemplates.find(
      (t) => t.name === this.activePersoni.templateName,
    );
    if (
      !template ||
      !template.idlePrompts ||
      template.idlePrompts.length === 0
    ) {
      this.resetIdlePromptTimer();
      return;
    }

    const prompt =
      template.idlePrompts[
        Math.floor(Math.random() * template.idlePrompts.length)
      ];
    await this.speakText(prompt);
  }

  // Side Panel Logic
  private openSidePanel(panel: ActiveSidePanel) {
    this.activeSidePanel = panel;
    if (panel === 'personis') {
      this.configPanelMode = 'list';
      this.editingPersoni = null;
    }
  }

  private closeSidePanel() {
    this.activeSidePanel = 'none';
    this.editingPersoni = null;
    this.checkProviderStatus();
    
    if (this.showOnboarding && this.providerStatus !== 'unconfigured') {
      this.showOnboarding = false;
      this.updateStatus('Idle');
      this.resetIdlePromptTimer();
    }
  }

  private startCreatePersoniFlow() {
    this.configPanelMode = 'selectTemplate';
  }

  private createPersoniFromTemplate(templateName: string) {
    const template = personaTemplates.find((t) => t.name === templateName);
    if (!template) return;

    this.editingPersoni = {
      id: crypto.randomUUID(),
      name: `My ${template.name}`,
      tagline: template.tagline,
      systemInstruction: template.systemInstruction,
      templateName: template.name,
      voiceName: template.voiceName,
      thinkingModel: template.thinkingModel,
      enabledConnectors: [...template.enabledConnectors],
      capabilities: { ...DEFAULT_CAPABILITIES },
      visuals: {...template.visuals},
    };
    this.configPanelMode = 'edit';
  }

  private editPersoni(personi: PersoniConfig) {
    // Deep copy for safe editing
    this.editingPersoni = JSON.parse(JSON.stringify(personi));
    this.configPanelMode = 'edit';
  }

  private handleSavePersoni() {
    if (!this.editingPersoni) return;

    const index = this.personis.findIndex(
      (p) => p.id === this.editingPersoni!.id,
    );
    if (index > -1) {
      // Update existing
      this.personis[index] = this.editingPersoni;
    } else {
      // Add new
      this.personis.push(this.editingPersoni);
    }
    this.savePersonis();

    // If the active personi was edited, update it
    if (this.activePersoni?.id === this.editingPersoni.id) {
      this.activePersoni = this.editingPersoni;
      this.checkProviderStatus();
    }

    this.configPanelMode = 'list';
    this.editingPersoni = null;
  }

  private handleDeletePersoni(personiId: string) {
    if (this.personis.length <= 1) {
      this.updateError('Cannot delete the last Personi.');
      return;
    }
    if (this.activePersoni?.id === personiId) {
      this.activePersoni =
        this.personis.find((p) => p.id !== personiId) || null;
    }
    this.personis = this.personis.filter((p) => p.id !== personiId);
    this.savePersonis();
  }

  private renderPersonisPanel() {
    const renderContent = () => {
      switch (this.configPanelMode) {
        case 'edit':
          return this.renderEditPersoniForm();
        case 'selectTemplate':
          return this.renderTemplateSelector();
        case 'list':
        default:
          return this.renderPersoniList();
      }
    };

    const title =
      this.configPanelMode === 'edit'
        ? this.personis.some((p) => p.id === this.editingPersoni?.id)
          ? 'Edit Personi'
          : 'Create Personi'
        : this.configPanelMode === 'selectTemplate'
        ? 'Select a Template'
        : 'Personis';

    return html`
      <div class="side-panel ${this.activeSidePanel === 'personis' ? 'visible' : ''}">
        <div class="panel-header">
          <span>${title}</span>
          <button @click=${this.closeSidePanel}>&times;</button>
        </div>
        <div class="panel-content">${renderContent()}</div>
      </div>
    `;
  }

  private renderConnectorsPanel() {
    return html`
      <div class="side-panel ${this.activeSidePanel === 'connectors' ? 'visible' : ''}">
        <div class="panel-header">
          <span>Connectors</span>
          <button @click=${this.closeSidePanel}>&times;</button>
        </div>
        <div class="panel-content">
          <h3>Manage Integrations</h3>
          <ul class="connector-list">
            ${AVAILABLE_CONNECTORS.map(
              (connector) => html`
                <li class="connector-list-item">
                  <div class="info">
                    <strong>${connector.name}</strong>
                    <p>${connector.description}</p>
                  </div>
                  <label class="toggle-switch">
                    <input
                      type="checkbox"
                      .checked=${this.connectors[connector.id]?.enabled}
                      @change=${(e: Event) => {
                        this.connectors[connector.id].enabled = (
                          e.target as HTMLInputElement
                        ).checked;
                        this.saveConnectors();
                      }} />
                    <span class="slider"></span>
                  </label>
                </li>
              `,
            )}
          </ul>
        </div>
      </div>
    `;
  }

  private renderPersoniList() {
    return html`
      <h3>Your Personis</h3>
      <ul class="personi-list">
        ${this.personis.map(
          (p) => html`
            <li class="personi-list-item">
              <span>${p.name}</span>
              <span class="actions">
                <button @click=${() => this.editPersoni(p)} title="Edit">
                  ✏️
                </button>
                <button
                  @click=${() => this.handleDeletePersoni(p.id)}
                  title="Delete"
                  class="delete">
                  🗑️
                </button>
              </span>
            </li>
          `,
        )}
      </ul>
      <button class="primary" @click=${this.startCreatePersoniFlow}>
        Create New Personi
      </button>
    `;
  }

  private renderTemplateSelector() {
    return html`
      <h3>Create a New Personi</h3>
      <p>Start by selecting a base template to customize.</p>
      <ul class="template-list">
        ${personaTemplates.map(
          (t) => html`
            <li
              class="template-list-item"
              @click=${() => this.createPersoniFromTemplate(t.name)}>
              <div>
                <strong>${t.name}</strong>
                <div style="font-size: 12px; opacity: 0.8;">${t.tagline}</div>
              </div>
              <span>&rsaquo;</span>
            </li>
          `,
        )}
      </ul>
    `;
  }

  private renderEditPersoniForm() {
    if (!this.editingPersoni) return nothing;

    const handleCapabilityToggle = (e: Event, connectorId: string) => {
      const isChecked = (e.target as HTMLInputElement).checked;
      const currentConnectors = this.editingPersoni?.enabledConnectors || [];
      if (isChecked) {
        if (!currentConnectors.includes(connectorId)) {
          this.editingPersoni!.enabledConnectors = [
            ...currentConnectors,
            connectorId,
          ];
        }
      } else {
        this.editingPersoni!.enabledConnectors = currentConnectors.filter(
          (id) => id !== connectorId,
        );
      }
      this.requestUpdate();
    };

    const activeConnectors = AVAILABLE_CONNECTORS.filter(
      (c) => this.connectors[c.id]?.enabled,
    );

    return html`
      <div class="form-group">
        <label for="p-name">Name</label>
        <input
          id="p-name"
          type="text"
          .value=${this.editingPersoni.name}
          @input=${(e: Event) =>
            (this.editingPersoni!.name = (e.target as HTMLInputElement).value)} />
      </div>
      <div class="form-group">
        <label for="p-tagline">Tagline</label>
        <input
          id="p-tagline"
          type="text"
          .value=${this.editingPersoni.tagline}
          @input=${(e: Event) =>
            (this.editingPersoni!.tagline = (
              e.target as HTMLInputElement
            ).value)} />
      </div>
      <div class="form-group">
        <label for="p-sys-instruct">System Instruction</label>
        <textarea
          id="p-sys-instruct"
          .value=${this.editingPersoni.systemInstruction}
          @input=${(e: Event) =>
            (this.editingPersoni!.systemInstruction = (
              e.target as HTMLTextAreaElement
            ).value)}></textarea>
      </div>
      <div class="form-group">
        <label for="p-voice">Voice</label>
        <select
          id="p-voice"
          .value=${this.editingPersoni.voiceName}
          @change=${(e: Event) =>
            (this.editingPersoni!.voiceName = (
              e.target as HTMLSelectElement
            ).value)}>
          ${AVAILABLE_VOICES.map((v) => html`<option .value=${v}>${v}</option>`)}
        </select>
      </div>
      <div class="form-group">
        <label for="p-model">Thinking Model</label>
        <select
          id="p-model"
          .value=${this.editingPersoni.thinkingModel}
          @change=${(e: Event) =>
            (this.editingPersoni!.thinkingModel = (
              e.target as HTMLSelectElement
            ).value)}>
          ${this.getAvailableModelsForDropdown().length > 0
            ? this.getAvailableModelsForDropdown().map(
                (m) => html`<option .value=${m.id}>${m.name}</option>`,
              )
            : html`<option disabled>No providers configured - Go to Settings → Models</option>`}
        </select>
      </div>
      <div class="form-group">
        <label>Visuals</label>
        <div class="form-group-inline">
          <select
            .value=${this.editingPersoni.visuals.shape}
            @change=${(e: Event) =>
              (this.editingPersoni!.visuals.shape = (
                e.target as HTMLSelectElement
              ).value as any)}>
            ${AVAILABLE_SHAPES.map(
              (s) => html`<option .value=${s}>${s}</option>`,
            )}
          </select>
          <input
            type="color"
            .value=${this.editingPersoni.visuals.accentColor}
            @input=${(e: Event) =>
              (this.editingPersoni!.visuals.accentColor = (
                e.target as HTMLInputElement
              ).value)} />
        </div>
      </div>
      <div class="form-group">
        <label for="p-texture">Texture</label>
        <select
          id="p-texture"
          .value=${this.editingPersoni.visuals.textureName || 'none'}
          @change=${(e: Event) =>
            (this.editingPersoni!.visuals.textureName = (
              e.target as HTMLSelectElement
            ).value as any)}>
          ${AVAILABLE_TEXTURES.map((t) => {
            const label = t.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
            return html`<option .value=${t}>${label}</option>`;
          })}
        </select>
      </div>
      <div class="form-group">
        <label for="p-idle-anim">Idle Animation</label>
        <select
          id="p-idle-anim"
          .value=${this.editingPersoni.visuals.idleAnimation || 'none'}
          @change=${(e: Event) =>
            (this.editingPersoni!.visuals.idleAnimation = (
              e.target as HTMLSelectElement
            ).value as any)}>
          ${AVAILABLE_IDLE_ANIMATIONS.map((a) => {
            const label = a.replace(/\b\w/g, (l) => l.toUpperCase());
            return html`<option .value=${a}>${label}</option>`;
          })}
        </select>
      </div>
      <div class="form-group">
        <label>Capabilities</label>
        <div class="capabilities-grid">
          <div class="capability-item">
            <input
              type="checkbox"
              id="cap-vision"
              .checked=${this.editingPersoni?.capabilities?.vision ?? false}
              @change=${(e: Event) => {
                if (!this.editingPersoni!.capabilities) {
                  this.editingPersoni!.capabilities = {
                    vision: false,
                    imageGeneration: false,
                    webSearch: false,
                    tools: false,
                    mcp: false,
                    audioInput: true,
                    audioOutput: true,
                  };
                }
                this.editingPersoni!.capabilities.vision = (e.target as HTMLInputElement).checked;
              }} />
            <label for="cap-vision">👁️ Vision (Image Understanding)</label>
          </div>
          <div class="capability-item">
            <input
              type="checkbox"
              id="cap-image-gen"
              .checked=${this.editingPersoni?.capabilities?.imageGeneration ?? false}
              @change=${(e: Event) => {
                if (!this.editingPersoni!.capabilities) {
                  this.editingPersoni!.capabilities = {
                    vision: false,
                    imageGeneration: false,
                    webSearch: false,
                    tools: false,
                    mcp: false,
                    audioInput: true,
                    audioOutput: true,
                  };
                }
                this.editingPersoni!.capabilities.imageGeneration = (e.target as HTMLInputElement).checked;
              }} />
            <label for="cap-image-gen">🎨 Image Generation</label>
          </div>
          <div class="capability-item">
            <input
              type="checkbox"
              id="cap-web-search"
              .checked=${this.editingPersoni?.capabilities?.webSearch ?? false}
              @change=${(e: Event) => {
                if (!this.editingPersoni!.capabilities) {
                  this.editingPersoni!.capabilities = {
                    vision: false,
                    imageGeneration: false,
                    webSearch: false,
                    tools: false,
                    mcp: false,
                    audioInput: true,
                    audioOutput: true,
                  };
                }
                this.editingPersoni!.capabilities.webSearch = (e.target as HTMLInputElement).checked;
              }} />
            <label for="cap-web-search">🌐 Web Search</label>
          </div>
          <div class="capability-item">
            <input
              type="checkbox"
              id="cap-tools"
              .checked=${this.editingPersoni?.capabilities?.tools ?? false}
              @change=${(e: Event) => {
                if (!this.editingPersoni!.capabilities) {
                  this.editingPersoni!.capabilities = {
                    vision: false,
                    imageGeneration: false,
                    webSearch: false,
                    tools: false,
                    mcp: false,
                    audioInput: true,
                    audioOutput: true,
                  };
                }
                this.editingPersoni!.capabilities.tools = (e.target as HTMLInputElement).checked;
              }} />
            <label for="cap-tools">🔧 Function Calling / Tools</label>
          </div>
          <div class="capability-item">
            <input
              type="checkbox"
              id="cap-mcp"
              .checked=${this.editingPersoni?.capabilities?.mcp ?? false}
              @change=${(e: Event) => {
                if (!this.editingPersoni!.capabilities) {
                  this.editingPersoni!.capabilities = {
                    vision: false,
                    imageGeneration: false,
                    webSearch: false,
                    tools: false,
                    mcp: false,
                    audioInput: true,
                    audioOutput: true,
                  };
                }
                this.editingPersoni!.capabilities.mcp = (e.target as HTMLInputElement).checked;
              }} />
            <label for="cap-mcp">🔌 MCP (Model Context Protocol)</label>
          </div>
        </div>
      </div>
      <div class="form-group">
        <label>Connectors</label>
        <div class="capabilities-grid">
          ${activeConnectors.length > 0
            ? activeConnectors.map(
                (c) => html`
                  <div class="capability-item">
                    <input
                      type="checkbox"
                      id="conn-${c.id}"
                      .checked=${this.editingPersoni?.enabledConnectors?.includes(
                        c.id,
                      )}
                      @change=${(e: Event) => handleCapabilityToggle(e, c.id)} />
                    <label for="conn-${c.id}">${c.name}</label>
                  </div>
                `,
              )
            : html`<p style="font-size: 12px; opacity: 0.7;">
                No connectors are active. Enable them in the Connectors menu.
              </p>`}
        </div>
      </div>
      <button class="primary" @click=${this.handleSavePersoni}>
        Save Personi
      </button>
    `;
  }

  render() {
    const showControls =
      this.settingsButtonVisible || this.isAiSpeaking || this.isSpeaking;

    return html`
      <div>
        <div class="transcription-log-container">
          ${this.transcriptHistory.map(
            (entry) => html`
              <div class="log-entry">
                <div
                  class="log-speaker ${entry.speaker}"
                  style=${entry.personiColor
                    ? `color: ${entry.personiColor}`
                    : ''}>
                  ${entry.speaker === 'user'
                    ? 'You'
                    : entry.personiName || 'System'}
                </div>
                <div class="log-text">${entry.text}</div>
              </div>
            `,
          )}
        </div>

        <div
          class="persona-carousel-container ${showControls ? 'visible' : ''}">
          <div class="persona-carousel">
            ${this.personis.map((personi) => {
              return html`
                <div
                  class="persona-card ${this.activePersoni?.id === personi.id
                    ? 'active'
                    : ''}"
                  @click=${() => this.requestPersoniSwitch(personi)}
                  title="Switch to ${personi.name}"
                  style="--accent-color: ${personi.visuals.accentColor}">
                  ${personi.avatarUrl
                    ? html`<img
                        class="persona-card-avatar"
                        src="${personi.avatarUrl}"
                        alt="${personi.name} avatar" />`
                    : nothing}
                  <div class="persona-card-name">${personi.name}</div>
                  <div class="persona-card-desc">${personi.tagline}</div>
                </div>
              `;
            })}
          </div>
        </div>

        <div class="controls" style="opacity: ${showControls ? 1 : 0}">
          ${this.isAiSpeaking
            ? html`<button
                id="interruptButton"
                @click=${this.handleInterrupt}
                title="Interrupt">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  height="32px"
                  viewBox="0 -960 960 960"
                  width="32px"
                  fill="#ffffff">
                  <path d="M320-320v-320h320v320H320Z" />
                </svg>
              </button>`
            : nothing}
          <button
            id="muteButton"
            @click=${this.toggleMute}
            title=${this.isMuted ? 'Unmute' : 'Mute'}>
            ${this.isMuted
              ? html`<svg
                  xmlns="http://www.w3.org/2000/svg"
                  height="40px"
                  viewBox="0 -960 960 960"
                  width="40px"
                  fill="#c80000">
                  <path
                    d="M528-480q0-20-14-34t-34-14q-20 0-34 14t-14 34q0 20 14 34t34 14q20 0 34-14t14-34Zm-82-208-46-46q-27-21-52.5-31.5T280-780v-80q52 0 101.5 15T470-798l50 50-42 42ZM312-320 80-552v-168h168l232-232v126l-84 84-46-46v-50L182-668h-62v88l198 198 42-42Zm398 230L560-240v-86l-46-46-42 42v126l232 232h-40l-98-98-254-254-152-152 42-42 628 628-42 42Zm-78-230-94-94 94-94v188Z" />
                </svg>`
              : html`<svg
                  xmlns="http://www.w3.org/2000/svg"
                  height="40px"
                  viewBox="0 -960 960 960"
                  width="40px"
                  fill="#ffffff">
                  <path
                    d="M280-560v-168h168l232-232v798L448-392H280v-168Zm400 80h80v-240h-80v240Zm-88-288q70 20 115 75t45 133q0 78-45 133t-115 75v80q104-20 172-95t68-193q0-118-68-193t-172-95v80Z" />
                </svg>`}
          </button>
        </div>

        <div
          class="settings-fab ${this.settingsButtonVisible ? 'visible' : ''}">
          <div
            class="provider-status-indicator ${this.providerStatus}"
            @click=${() => this.openSidePanel('models')}
            title="Provider Status">
            ${this.providerStatus === 'configured' ? '✓' : '⚠️'}
            <div class="provider-status-tooltip">
              ${this.getProviderStatusTooltip()}
            </div>
          </div>
          <button
            @click=${this.toggleSettingsMenu}
            class=${this.settingsMenuVisible ? 'active' : ''}
            title="Settings">
            <svg
              height="24px"
              viewBox="0 -960 960 960"
              width="24px"
              fill="#ffffff">
              <path
                d="m382-120-42-105q-19-8-37-18.5t-35-23.5l-101 44-99-171 85-64q-2-9-3.5-20t-1.5-21.5q0-10.5 1.5-21.5t3.5-20l-85-64 99-171 101 44q17-13 35-23.5t37-18.5l42-105h196l42 105q19 8 37 18.5t35 23.5l101-44 99 171-85 64q2 9 3.5 20t1.5 21.5q0 10.5-1.5 21.5t-3.5-20l85 64-99 171-101-44q-17 13-35 23.5T578-225l-42 105H382Zm98-260q83 0 141.5-58.5T680-580q0-83-58.5-141.5T480-780q-83 0-141.5 58.5T280-580q0 83 58.5 141.5T480-380Z" />
            </svg>
          </button>
        </div>

        <div class="settings-menu ${this.settingsMenuVisible ? 'open' : ''}">
          <div
            class="menu-item"
            title="Personis"
            @click=${() => this.openSidePanel('personis')}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <div
            class="menu-item"
            title="Connectors"
            @click=${() => this.openSidePanel('connectors')}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72"></path>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72"></path>
            </svg>
          </div>
          <div
            class="menu-item"
            title="Models"
            @click=${() => this.openSidePanel('models')}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
              <path d="M2 17l10 5 10-5"></path>
              <path d="M2 12l10 5 10-5"></path>
            </svg>
          </div>
        </div>

        ${this.renderPersonisPanel()} 
        ${this.renderConnectorsPanel()}
        ${this.activeSidePanel === 'models' ? html`
          <models-panel @close=${this.closeSidePanel}></models-panel>
        ` : ''}

        <div
          id="status"
          style="opacity: ${this.settingsButtonVisible ||
          this.error ||
          this.currentTranscript
            ? 1
            : 0}">
          ${this.error || this.currentTranscript || this.status}
        </div>
        <gdm-live-audio-visuals-3d
          .inputNode=${this.inputNode}
          .outputNode=${this.outputNode}
          .isSwitchingPersona=${this.isSwitchingPersona}
          .visuals=${this.activePersoni?.visuals}></gdm-live-audio-visuals-3d>
      </div>
    `;
  }
}