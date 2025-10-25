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
  getSharedMicrophone,
  AudioConsumer,
  AudioAnalysisData,
} from './utils';
import './visual-3d';
import './components/models-panel';
import './components/user-profile-panel';
import './components/notes-panel';
import './components/tasks-panel';
import './components/memory-panel';
import './components/game-of-life-bg';
import './components/constellation-map-bg';
import './components/code-flow-bg';
import './components/static-noise-bg';
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
import { localWhisperService } from './services/local-whisper';
import { SttPreferences, DEFAULT_STT_PREFERENCES } from './types/stt-preferences';
import { userProfileManager } from './services/user-profile-manager';
import { UserProfile } from './types/user-profile';
import { ragMemoryManager } from './services/memory/rag-memory-manager';
import { IdleSpeechManager } from './services/idle-speech-manager';
import { musicDetector, MusicDetectionResult, MusicDetectorConfig } from './services/music-detector';

const PERSONIS_KEY = 'gdm-personis';
const CONNECTORS_KEY = 'gdm-connectors';
const STT_PREFERENCES_KEY = 'stt-preferences';
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

const NIRVANA_HOURLY_COLORS = [
  '#0a0e27', // 00:00 - midnight blue
  '#0d1135', // 01:00 - deep night
  '#101442', // 02:00 - darkest before dawn
  '#1a1d4e', // 03:00 - pre-dawn
  '#2a2d5e', // 04:00 - early dawn
  '#3d4370', // 05:00 - dawn breaks
  '#ff6b4a', // 06:00 - sunrise red
  '#ff8c5a', // 07:00 - sunrise orange
  '#ffb347', // 08:00 - morning gold
  '#87ceeb', // 09:00 - morning sky blue
  '#7ec8e3', // 10:00 - bright morning
  '#6fb8d0', // 11:00 - late morning
  '#5dade2', // 12:00 - midday sky
  '#52a8d8', // 13:00 - afternoon
  '#48a3cf', // 14:00 - bright afternoon
  '#3d9ec5', // 15:00 - late afternoon
  '#ff9966', // 16:00 - pre-sunset
  '#ff7f50', // 17:00 - coral sunset
  '#ff6347', // 18:00 - tomato dusk
  '#dc143c', // 19:00 - crimson dusk
  '#9932cc', // 20:00 - dark orchid
  '#6a0dad', // 21:00 - purple night
  '#4b0082', // 22:00 - indigo
  '#2e0854', // 23:00 - late night
];

type ConfigPanelMode = 'list' | 'selectTemplate' | 'edit';
type ActiveSidePanel = 'none' | 'personis' | 'connectors' | 'models' | 'userProfile' | 'notes' | 'tasks' | 'memory';

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
  @state() sttPreferences: SttPreferences = DEFAULT_STT_PREFERENCES;
  @state() userProfile: UserProfile;
  @state() ragEnabled = true;
  @state() ragInitialized = false;
  
  // Music detection state
  @state() musicDetectionEnabled = true;
  @state() isMusicDetected = false;
  @state() musicBpm = 0;
  @state() musicBeatDetected = false;
  @state() musicConfidence = 0;
  @state() musicDetectorConfig: MusicDetectorConfig;

  private settingsTimeout: number | undefined;
  private idlePromptTimeout: number | undefined;
  private nirvanaGradientInterval: number | undefined;
  private idleSpeechManager = new IdleSpeechManager();
  
  private browserSttSupported = false;
  private useBrowserStt = false;
  private recognition: any = null;
  private recognitionActive = false;

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

    .background-gradient {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      z-index: 0;
      transition: background 1.5s ease-in-out;
    }

    .background-gradient.nirvana {
      background: linear-gradient(135deg, var(--nirvana-hour-color-1, #87ceeb), var(--nirvana-hour-color-2, #1e3a8a));
      transition: background 60s ease-in-out;
    }

    .background-gradient.athena {
      background: linear-gradient(135deg, #9932cc 0%, #ffd700 100%);
    }

    .background-gradient.adam {
      background: linear-gradient(135deg, #000000 0%, #004d00 100%);
    }

    .background-gradient.theo {
      background: linear-gradient(135deg, #ff4500 0%, #8b0000 100%);
    }

    .background-gradient.ghost {
      background: linear-gradient(135deg, #2c2c2c 0%, #e6e6fa 100%);
    }

    .background-gradient.default {
      background: linear-gradient(135deg, #100c14 0%, #1a1520 100%);
    }

    .music-indicator {
      position: absolute;
      bottom: 12vh;
      left: 50%;
      transform: translateX(-50%);
      z-index: 10;
      padding: 8px 16px;
      background: rgba(156, 39, 176, 0.3);
      border: 1px solid rgba(156, 39, 176, 0.6);
      border-radius: 20px;
      color: white;
      font-family: sans-serif;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 12px;
      opacity: 0;
      transition: opacity 0.5s ease-in-out;
      pointer-events: none;
    }
    
    .music-indicator.visible {
      opacity: 1;
    }
    
    .music-indicator-icon {
      font-size: 16px;
      animation: pulse 1s infinite;
    }
    
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.2); }
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
      background: rgba(25, 22, 30, 0.85);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      cursor: pointer;
      transition: transform 0.3s ease-out, opacity 0.3s ease-out, 
                  background 0.2s ease, border-color 0.2s ease, 
                  box-shadow 0.2s ease;
      opacity: 0;
      transform: translate(0, 0);
      outline: none;
    }

    .settings-menu.open .menu-item {
      opacity: 1;
    }

    .settings-menu .menu-item:hover {
      background: rgba(135, 206, 250, 0.2);
      border-color: rgba(135, 206, 250, 0.6);
      box-shadow: 0 0 15px rgba(135, 206, 250, 0.3);
      transform: scale(1.1);
    }

    .settings-menu .menu-item:focus {
      background: rgba(135, 206, 250, 0.25);
      border-color: rgba(135, 206, 250, 0.8);
      box-shadow: 0 0 20px rgba(135, 206, 250, 0.5);
    }

    .settings-menu .menu-item:active {
      transform: scale(0.95);
    }

    .settings-menu .menu-item.group-user {
      border-color: rgba(135, 206, 250, 0.3);
    }

    .settings-menu .menu-item.group-ai {
      border-color: rgba(156, 39, 176, 0.3);
    }

    .settings-menu .menu-item.group-productivity {
      border-color: rgba(76, 175, 80, 0.3);
    }

    /* Arc positions */
    .settings-menu.open .menu-item:nth-child(1) {
      transform: translate(-90px, -10px);
      transition-delay: 0.1s;
    }
    .settings-menu.open .menu-item:nth-child(2) {
      transform: translate(-70px, -70px);
      transition-delay: 0.2s;
    }
    .settings-menu.open .menu-item:nth-child(3) {
      transform: translate(-10px, -90px);
      transition-delay: 0.3s;
    }
    .settings-menu.open .menu-item:nth-child(4) {
      transform: translate(50px, -90px);
      transition-delay: 0.4s;
    }
    .settings-menu.open .menu-item:nth-child(5) {
      transform: translate(90px, -50px);
      transition-delay: 0.5s;
    }
    .settings-menu.open .menu-item:nth-child(6) {
      transform: translate(110px, 10px);
      transition-delay: 0.6s;
    }
    .settings-menu.open .menu-item:nth-child(7) {
      transform: translate(110px, 70px);
      transition-delay: 0.7s;
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
    this.userProfile = userProfileManager.getProfile();
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
    
    // Initialize music detector
    this.musicDetectorConfig = musicDetector.getConfig();
    this.setupMusicDetector();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('mousemove', this.handleUserActivity);
    window.removeEventListener('touchstart', this.handleUserActivity);
    if (this.settingsTimeout) clearTimeout(this.settingsTimeout);
    if (this.idlePromptTimeout) clearTimeout(this.idlePromptTimeout);
    this.stopNirvanaGradientUpdates();
    
    // Cleanup music detector
    const sharedMic = getSharedMicrophone();
    sharedMic.unregisterConsumer('music-detector');
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
    
    try {
      console.log('[RAG] Initializing memory system...');
      await ragMemoryManager.initialize();
      this.ragInitialized = true;
      const storageInfo = ragMemoryManager.getStorageInfo();
      console.log(`[RAG] ✅ Initialized with ${storageInfo.type} storage and ${storageInfo.embeddingType} embeddings`);
    } catch (error) {
      console.error('[RAG] ❌ Failed to initialize:', error);
      this.ragInitialized = false;
      this.ragEnabled = false;
    }
    
    // Check browser STT support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    this.browserSttSupported = !!SpeechRecognition;
    
    // Determine STT mode
    this.determineSttMode();
    
    await this.startListening();
    this.checkProviderStatus();
    
    if (this.sttPreferences.enabled) {
      localWhisperService.loadModel(this.sttPreferences.modelSize).catch(err => {
        console.error('Failed to load Whisper model on init:', err?.message || err?.toString() || err);
      });
    }
    
    if (this.providerStatus === 'unconfigured') {
      if (this.useBrowserStt) {
        this.showOnboarding = true;
        this.updateStatus('Browser-only mode (limited functionality) - Configure providers in Settings → Models for full AI');
      } else {
        this.showOnboarding = true;
        this.updateStatus('Welcome! Configure your AI providers in Settings → Models to get started');
      }
    } else if (this.providerStatus === 'missing') {
      this.updateStatus('Current provider not configured - go to Settings → Models');
    } else {
      this.updateStatus('Idle');
      this.resetIdlePromptTimer();
    }

    if (this.activePersoni?.name === 'NIRVANA') {
      this.startNirvanaGradientUpdates();
    }
  }
  
  private determineSttMode() {
    const hasProviders = this.activePersoni ? !!this.getProviderForPersoni(this.activePersoni) : false;
    const hasLocalWhisper = this.sttPreferences.enabled;
    this.useBrowserStt = !hasProviders && !hasLocalWhisper && this.browserSttSupported;
    
    if (this.useBrowserStt) {
      console.log('Using browser STT (real-time SpeechRecognition)');
    } else if (hasLocalWhisper) {
      console.log('Using local Whisper STT');
    } else if (hasProviders) {
      console.log('Using provider STT');
    }
  }
  
  private startBrowserSttRecognition() {
    if (!this.browserSttSupported || this.recognitionActive) {
      return;
    }
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!this.recognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'en-US';
      this.recognition.continuous = true;
      this.recognition.interimResults = false;
      this.recognition.maxAlternatives = 1;
      
      this.recognition.onstart = () => {
        this.recognitionActive = true;
        console.log('Browser STT recognition started');
      };
      
      this.recognition.onresult = async (event: any) => {
        const last = event.results.length - 1;
        const transcript = event.results[last][0].transcript.trim();
        
        if (transcript && transcript.length > 0) {
          console.log('Browser STT transcript:', transcript);
          this.isSpeaking = false;
          this.currentTranscript = transcript;
          await this.processTranscript(transcript);
        }
      };
      
      this.recognition.onerror = (event: any) => {
        console.error('Browser STT error:', event.error);
        this.recognitionActive = false;
        
        if (event.error === 'no-speech') {
          // Normal timeout, just restart
          this.updateStatus('No speech detected');
          setTimeout(() => {
            if (this.useBrowserStt && !this.isMuted) {
              this.startBrowserSttRecognition();
            }
          }, 1000);
        } else if (event.error === 'not-allowed') {
          this.updateError('Microphone access denied. Please allow microphone access.');
        } else {
          this.updateError(`Speech recognition error: ${event.error}`);
        }
      };
      
      this.recognition.onend = () => {
        this.recognitionActive = false;
        console.log('Browser STT recognition ended');
        
        // Auto-restart if still in browser STT mode and not muted
        if (this.useBrowserStt && !this.isMuted && !this.isAiSpeaking) {
          setTimeout(() => {
            this.startBrowserSttRecognition();
          }, 100);
        }
      };
      
      this.recognition.onspeechstart = () => {
        this.isSpeaking = true;
        this.status = 'Listening (browser microphone)...';
        clearTimeout(this.idlePromptTimeout);
        this.idleSpeechManager.pause();
      };
      
      this.recognition.onspeechend = () => {
        this.isSpeaking = false;
        if (this.activePersoni && !this.isMuted) {
          const provider = this.getProviderForPersoni(this.activePersoni);
          if (provider) {
            this.idleSpeechManager.resume(this.activePersoni, provider, (text) => {
              this.handleIdleSpeech(text);
            });
          }
        }
      };
    }
    
    try {
      this.recognition.start();
    } catch (e) {
      if (e.message?.includes('already started')) {
        console.warn('Recognition already started');
      } else {
        console.error('Error starting recognition:', e);
      }
    }
  }
  
  private stopBrowserSttRecognition() {
    if (this.recognition && this.recognitionActive) {
      try {
        this.recognition.stop();
      } catch (e) {
        console.warn('Error stopping recognition:', e);
      }
      this.recognitionActive = false;
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

    const storedSttPreferences = localStorage.getItem(STT_PREFERENCES_KEY);
    if (storedSttPreferences) {
      this.sttPreferences = JSON.parse(storedSttPreferences);
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

  private updateNirvanaGradient() {
    const hour = new Date().getHours();
    const currentColor = NIRVANA_HOURLY_COLORS[hour];
    const nextColor = NIRVANA_HOURLY_COLORS[(hour + 1) % 24];
    
    const root = document.documentElement;
    root.style.setProperty('--nirvana-hour-color-1', currentColor);
    root.style.setProperty('--nirvana-hour-color-2', nextColor);
  }

  private startNirvanaGradientUpdates() {
    this.updateNirvanaGradient();
    
    if (this.nirvanaGradientInterval) {
      clearInterval(this.nirvanaGradientInterval);
    }
    
    this.nirvanaGradientInterval = window.setInterval(() => {
      this.updateNirvanaGradient();
    }, 60000);
  }

  private stopNirvanaGradientUpdates() {
    if (this.nirvanaGradientInterval) {
      clearInterval(this.nirvanaGradientInterval);
      this.nirvanaGradientInterval = undefined;
    }
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

    this.stopNirvanaGradientUpdates();

    this.activePersoni = personi;
    this.updateStatus(`${personi.name} is now active.`);

    if (personi.name === 'NIRVANA') {
      this.startNirvanaGradientUpdates();
    }

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

    const provider = this.getProviderForPersoni(this.activePersoni);
    if (provider && !this.isMuted) {
      this.idleSpeechManager.start(this.activePersoni, provider, (text) => {
        this.handleIdleSpeech(text);
      });
    }
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

  private async convertBlobToFloat32Array(audioBlob: Blob): Promise<{ audio: Float32Array, sampleRate: number }> {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    try {
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const mono = audioBuffer.numberOfChannels === 1
        ? audioBuffer.getChannelData(0)
        : this.convertToMono(audioBuffer);
      
      return {
        audio: mono,
        sampleRate: audioBuffer.sampleRate,
      };
    } finally {
      await audioContext.close();
    }
  }

  private convertToMono(audioBuffer: AudioBuffer): Float32Array {
    const length = audioBuffer.length;
    const mono = new Float32Array(length);
    const numChannels = audioBuffer.numberOfChannels;
    
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        mono[i] += channelData[i] / numChannels;
      }
    }
    
    return mono;
  }

  private async transcribeAudio(audioBlob: Blob): Promise<string | null> {
    if (!this.activePersoni) {
      this.updateError('Please select a PersonI to continue');
      return null;
    }

    this.updateStatus('Transcribing...');
    
    try {
      if (this.sttPreferences.enabled) {
        const { audio, sampleRate } = await this.convertBlobToFloat32Array(audioBlob);
        const result = await localWhisperService.transcribe(audio, sampleRate);
        
        if (!result.text || result.text.trim().length === 0) {
          this.updateError('No transcription received');
          return null;
        }

        return result.text.trim();
      } else {
        const provider = this.getProviderForPersoni(this.activePersoni);
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
        
        // No fallback available - browser STT should be real-time only
        this.updateError('No transcription method available. Configure a provider or enable Local Whisper.');
        return null;
      }
    } catch (e) {
      console.error('Transcription error:', e);
      
      if (e.message?.includes('API key')) {
        this.updateError('Check your API key in Settings → Models');
      } else if (e.message?.includes('network') || e.message?.includes('fetch')) {
        this.updateError('Connection error - check your internet connection');
      } else if (e.message?.includes('Model not loaded')) {
        this.updateError('Whisper model not loaded - enable in Settings → Models');
      } else {
        console.warn('Transcription error, trying browser STT fallback:', e.message);
        // Try browser STT as final fallback
        return await this.transcribeWithBrowserSTT(audioBlob);
      }
      return null;
    }
  }

  private generateBrowserOnlyResponse(transcript: string): string {
    const lower = transcript.toLowerCase();
    const personiName = this.activePersoni?.name || 'NIRVANA';
    
    if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
      return `Hello! I'm ${personiName}. I'm running in browser-only mode. To unlock my full AI capabilities, please configure a provider in Settings → Models.`;
    }
    
    if (lower.includes('settings') || lower.includes('configure') || lower.includes('provider') || lower.includes('setup')) {
      return "Great! Click the gear icon in the bottom right corner to configure your AI providers. I support Google Gemini, OpenAI, Anthropic, and custom endpoints.";
    }
    
    if (lower.includes('help') || lower.includes('how') || lower.includes('what can you')) {
      return "I can hear you and speak, but I need an AI provider configured to respond intelligently. Please go to Settings → Models to configure Google Gemini, OpenAI, or another provider for full capabilities.";
    }
    
    return `I heard you, but I need an AI provider to respond intelligently. Please configure Google Gemini, OpenAI, or another provider in Settings → Models for full functionality.`;
  }

  private async processTranscript(transcript: string) {
    if (!this.activePersoni) return;
    
    const provider = this.getProviderForPersoni(this.activePersoni);
    const isProviderMode = !!provider;
    const isBrowserOnlyMode = !isProviderMode;
    
    this.transcriptHistory = [
      ...this.transcriptHistory,
      {speaker: 'user', text: transcript},
    ];
    this.currentTranscript = '';

    if (this.ragEnabled && this.ragInitialized) {
      try {
        console.log('[RAG] 💾 Storing user message as memory');
        await ragMemoryManager.addMemory(
          transcript,
          'user',
          'conversation',
          this.activePersoni.name,
          5
        );
      } catch (error) {
        console.error('[RAG] Failed to store user message:', error);
      }
    }

    if (isBrowserOnlyMode) {
      this.updateStatus('Processing (browser-only mode)...');
      const fallbackResponse = this.generateBrowserOnlyResponse(transcript);
      await this.speakText(fallbackResponse, 'system');
      return;
    }

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

      let memoryContext = '';
      if (this.ragEnabled && this.ragInitialized) {
        try {
          console.log('[RAG] 🔍 Retrieving relevant memories...');
          const relevantMemories = await ragMemoryManager.retrieveRelevantMemories(
            transcript,
            {
              limit: 10,
              threshold: 0.6,
              persona: this.activePersoni.name,
              memoryType: null
            }
          );
          
          if (relevantMemories.length > 0) {
            memoryContext = ragMemoryManager.formatMemoriesForContext(relevantMemories);
            console.log(`[RAG] 🧠 Found ${relevantMemories.length} relevant memories`);
          } else {
            console.log('[RAG] No relevant memories found');
          }
        } catch (error) {
          console.error('[RAG] Failed to retrieve memories:', error);
        }
      }

      if (provider instanceof GoogleProvider) {
        const googleProvider = provider as any;
        if (!googleProvider.client) {
          await googleProvider.verify();
        }

        const userContext = userProfileManager.getSystemPromptContext();
        let systemInstruction = userContext 
          ? `${this.activePersoni.systemInstruction}\n\n${userContext}`
          : this.activePersoni.systemInstruction;
        
        if (memoryContext) {
          systemInstruction = `${systemInstruction}\n\n## Relevant Past Context:\n${memoryContext}\n\nUse this context to provide more personalized and contextually aware responses.`;
        }

        const response = await googleProvider.client.models.generateContent({
          model: this.activePersoni.thinkingModel,
          contents: transcript,
          config: {
            systemInstruction,
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
        const userContext = userProfileManager.getSystemPromptContext();
        let systemInstruction = userContext 
          ? `${this.activePersoni.systemInstruction}\n\n${userContext}`
          : this.activePersoni.systemInstruction;
        
        if (memoryContext) {
          systemInstruction = `${systemInstruction}\n\n## Relevant Past Context:\n${memoryContext}\n\nUse this context to provide more personalized and contextually aware responses.`;
        }
          
        const messages = [
          { role: 'system' as const, content: systemInstruction },
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
        
        if (this.activePersoni && !this.isMuted) {
          const provider = this.getProviderForPersoni(this.activePersoni);
          if (provider) {
            this.idleSpeechManager.resume(this.activePersoni, provider, (text) => {
              this.handleIdleSpeech(text);
            });
          }
        }
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
        // Fallback to Web Speech API (browser TTS)
        await this.speakWithBrowserTTS(text, speaker);
      }

      if (speaker === 'ai' && this.ragEnabled && this.ragInitialized && this.activePersoni) {
        try {
          console.log('[RAG] 💾 Storing AI response as memory');
          await ragMemoryManager.addMemory(
            text,
            this.activePersoni.name,
            'conversation',
            this.activePersoni.name,
            5
          );
        } catch (error) {
          console.error('[RAG] Failed to store AI response:', error);
        }
      }
    } catch (e) {
      if (e.message?.includes('API key')) {
        this.updateError('Check your API key in Settings → Models');
      } else if (e.message?.includes('network') || e.message?.includes('fetch')) {
        this.updateError('Connection error - check your internet connection');
      } else {
        console.warn('TTS Error, falling back to browser voice:', e.message);
        await this.speakWithBrowserTTS(text, speaker);
      }
    }
  }

  private async transcribeWithBrowserSTT(audioBlob: Blob): Promise<string | null> {
    // This method should NOT be called anymore - browser STT is now real-time only
    // If we reach here, it means something went wrong with the STT mode detection
    console.error('transcribeWithBrowserSTT called but browser STT should be real-time only');
    this.updateError('Speech recognition error. Please configure a provider or enable Local Whisper.');
    return null;
  }

  private async speakWithBrowserTTS(text: string, speaker: 'ai' | 'system' = 'ai'): Promise<void> {
    // Check if Web Speech API is supported
    if (!('speechSynthesis' in window)) {
      console.error('Browser does not support Web Speech API');
      return;
    }

    return new Promise((resolve) => {
      this.isAiSpeaking = true;
      this.updateStatus('Speaking (browser voice)...');
      clearTimeout(this.idlePromptTimeout);

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Try to select an appropriate voice based on PersonI preferences
      if (speaker === 'ai' && this.activePersoni) {
        const voices = window.speechSynthesis.getVoices();
        
        // Map PersonI voice names to browser voice preferences
        const voicePreferences: { [key: string]: string[] } = {
          'Zephyr': ['female', 'woman', 'samantha', 'zira'],
          'Kore': ['female', 'woman', 'karen', 'heera'],
          'Puck': ['male', 'man', 'daniel', 'rishi'],
          'Charon': ['male', 'man', 'tom', 'james'],
          'Fenrir': ['male', 'man', 'george', 'david'],
        };

        const preferredTerms = voicePreferences[this.activePersoni.voiceName] || ['female'];
        
        // Find a voice that matches any of the preferred terms
        const matchedVoice = voices.find(voice => 
          preferredTerms.some(term => 
            voice.name.toLowerCase().includes(term) || 
            (voice.lang.startsWith('en') && voice.name.toLowerCase().includes(term))
          )
        );

        if (matchedVoice) {
          utterance.voice = matchedVoice;
        } else {
          // Fallback to any English voice
          const englishVoice = voices.find(v => v.lang.startsWith('en'));
          if (englishVoice) {
            utterance.voice = englishVoice;
          }
        }
      }

      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onend = () => {
        this.isAiSpeaking = false;
        this.updateStatus(this.isMuted ? 'Muted' : 'Idle');
        this.resetIdlePromptTimer();
        resolve();
      };

      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        this.isAiSpeaking = false;
        this.updateStatus(this.isMuted ? 'Muted' : 'Idle');
        this.resetIdlePromptTimer();
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
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

  /**
   * Set up music detector with SharedMicrophoneManager
   */
  private async setupMusicDetector() {
    try {
      const sharedMic = getSharedMicrophone();
      
      // Request microphone access
      const granted = await sharedMic.requestMicrophoneAccess();
      if (!granted) {
        console.warn('[MusicDetector] Microphone access not granted, music detection disabled');
        this.musicDetectionEnabled = false;
        return;
      }
      
      // Create consumer for music detector
      const musicConsumer: AudioConsumer = {
        id: 'music-detector',
        name: 'Music Detector',
        bufferSize: 4096,
        onAudioData: (data: Float32Array, timestamp: number) => {
          // We don't need raw audio data for music detection
        },
        onAnalysisData: (analysisData: AudioAnalysisData) => {
          // Feed analysis data to music detector
          if (this.musicDetectionEnabled) {
            const result = musicDetector.processAudioAnalysis(analysisData);
            this.updateMusicDetectionState(result);
          }
        }
      };
      
      // Register consumer
      sharedMic.registerConsumer(musicConsumer);
      console.log('[MusicDetector] Music detector consumer registered');
      
      // Set up event listeners for music detector
      musicDetector.addEventListener('musicstart', (event: any) => {
        console.log(`[MusicDetector] Music started, confidence: ${event.detail.confidence}`);
        
        // Mute idle speech if configured
        if (this.musicDetectorConfig.muteIdleSpeechOnMusic) {
          this.idleSpeechManager.pause();
        }
      });
      
      musicDetector.addEventListener('musicstop', () => {
        console.log('[MusicDetector] Music stopped');
        
        // Resume idle speech if configured and active
        if (this.musicDetectorConfig.muteIdleSpeechOnMusic && this.activePersoni) {
          const provider = this.getProviderForPersoni(this.activePersoni);
          this.idleSpeechManager.resume(this.activePersoni, provider, (text) => {
            this.speakIdleSpeech(text);
          });
        }
      });
      
      musicDetector.addEventListener('beat', (event: any) => {
        // Beat detected - visual feedback is handled in visual-3d
        this.musicBeatDetected = true;
        setTimeout(() => { this.musicBeatDetected = false; }, 100);
      });
      
    } catch (error) {
      console.error('[MusicDetector] Failed to set up music detector:', error);
      this.musicDetectionEnabled = false;
    }
  }
  
  /**
   * Update music detection state
   */
  private updateMusicDetectionState(result: MusicDetectionResult) {
    this.isMusicDetected = result.isMusic;
    this.musicConfidence = result.confidence;
    this.musicBpm = result.bpm;
    
    // Beat detection is handled by event listener for immediate feedback
  }

  private setupVadListeners() {
    this.vad.addEventListener('speech_start', () => {
      // Only use VAD for blob-based STT (provider/Whisper)
      if (this.useBrowserStt) return;
      
      clearTimeout(this.idlePromptTimeout);
      this.idleSpeechManager.pause();
      this.isSpeaking = true;
      this.status = 'Listening...';
      this.audioRecorder?.start();
    });

    this.vad.addEventListener('speech_end', async () => {
      // Only use VAD for blob-based STT (provider/Whisper)
      if (this.useBrowserStt) return;
      
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
      // If using browser STT, just start the recognition
      if (this.useBrowserStt) {
        console.log('Starting browser STT recognition mode');
        this.startBrowserSttRecognition();
        return;
      }
      
      // Otherwise, use blob-based recording with VAD
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
        if (this.isMuted || this.useBrowserStt) return;
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
      // Stop browser STT if active
      if (this.useBrowserStt) {
        this.stopBrowserSttRecognition();
      }
      this.vad.reset();
      this.isSpeaking = false;
      clearTimeout(this.idlePromptTimeout);
      this.idleSpeechManager.stop();
      this.updateStatus('Muted');
    } else {
      // Restart browser STT if using it
      if (this.useBrowserStt) {
        this.startBrowserSttRecognition();
      }
      this.updateStatus('Idle');
      this.resetIdlePromptTimer();
      
      if (this.activePersoni) {
        const provider = this.getProviderForPersoni(this.activePersoni);
        if (provider) {
          this.idleSpeechManager.start(this.activePersoni, provider, (text) => {
            this.handleIdleSpeech(text);
          });
        }
      }
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

  private async handleIdleSpeech(text: string) {
    if (this.isSpeaking || this.isAiSpeaking || this.isMuted) {
      console.log('[Idle Speech] Skipping - currently speaking or muted');
      return;
    }

    if (!this.activePersoni) {
      console.log('[Idle Speech] Skipping - no active persona');
      return;
    }

    console.log(`[Idle Speech] ${this.activePersoni.name}: "${text}"`);

    this.transcriptHistory = [
      ...this.transcriptHistory,
      {
        speaker: 'ai',
        text,
        personiName: this.activePersoni.name,
        personiColor: this.activePersoni.visuals.accentColor,
      },
    ];

    if (this.ragEnabled && this.ragInitialized) {
      try {
        await ragMemoryManager.addMemory(
          text,
          this.activePersoni.name,
          'conversation',
          this.activePersoni.name,
          4,
          { idle: true }
        );
        console.log('[Idle Speech] Stored in RAG memory');
      } catch (error) {
        console.error('[Idle Speech] Failed to store in RAG:', error);
      }
    }

    await this.speakText(text);
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
    
    // Re-determine STT mode in case settings changed
    const previousMode = this.useBrowserStt;
    this.determineSttMode();
    
    // If STT mode changed, restart listening
    if (previousMode !== this.useBrowserStt) {
      if (this.useBrowserStt) {
        // Switched to browser STT
        this.stopBrowserSttRecognition();
        if (!this.isMuted) {
          this.startBrowserSttRecognition();
        }
      } else {
        // Switched away from browser STT
        this.stopBrowserSttRecognition();
      }
    }
    
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

  private getBackgroundGradientClass(): string {
    if (!this.activePersoni) {
      return 'default';
    }
    return this.activePersoni.name.toLowerCase();
  }

  render() {
    const showControls =
      this.settingsButtonVisible || this.isAiSpeaking || this.isSpeaking;

    return html`
      <div>
        ${this.activePersoni?.name === 'ADAM'
          ? html`<game-of-life-bg></game-of-life-bg>`
          : this.activePersoni?.name === 'ATHENA'
          ? html`<constellation-map-bg></constellation-map-bg>`
          : this.activePersoni?.name === 'THEO'
          ? html`<code-flow-bg></code-flow-bg>`
          : this.activePersoni?.name === 'GHOST'
          ? html`<static-noise-bg></static-noise-bg>`
          : html`<div class="background-gradient ${this.getBackgroundGradientClass()}"></div>`}

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
            class="menu-item group-user"
            title="User Profile - Manage your personal information and preferences"
            aria-label="User Profile Settings"
            role="button"
            tabindex="0"
            @click=${() => this.openSidePanel('userProfile')}
            @keydown=${(e: KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.openSidePanel('userProfile');
              }
            }}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true">
              <circle cx="12" cy="12" r="10"></circle>
              <circle cx="12" cy="10" r="3"></circle>
              <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"></path>
            </svg>
          </div>
          <div
            class="menu-item group-ai"
            title="Models - Configure AI providers and speech-to-text"
            aria-label="Models Configuration"
            role="button"
            tabindex="0"
            @click=${() => this.openSidePanel('models')}
            @keydown=${(e: KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.openSidePanel('models');
              }
            }}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true">
              <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
              <path d="M2 17l10 5 10-5"></path>
              <path d="M2 12l10 5 10-5"></path>
            </svg>
          </div>
          <div
            class="menu-item group-ai"
            title="PersonI - Manage AI personas and their personalities"
            aria-label="PersonI Management"
            role="button"
            tabindex="0"
            @click=${() => this.openSidePanel('personis')}
            @keydown=${(e: KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.openSidePanel('personis');
              }
            }}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <div
            class="menu-item group-ai"
            title="Connectors - Enable external service integrations"
            aria-label="Connectors Configuration"
            role="button"
            tabindex="0"
            @click=${() => this.openSidePanel('connectors')}
            @keydown=${(e: KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.openSidePanel('connectors');
              }
            }}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72"></path>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72"></path>
            </svg>
          </div>
          <div
            class="menu-item group-productivity"
            title="Notes - Create and manage your notes"
            aria-label="Notes Manager"
            role="button"
            tabindex="0"
            @click=${() => this.openSidePanel('notes')}
            @keydown=${(e: KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.openSidePanel('notes');
              }
            }}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
          <div
            class="menu-item group-productivity"
            title="Tasks - Track and manage your tasks"
            aria-label="Tasks Manager"
            role="button"
            tabindex="0"
            @click=${() => this.openSidePanel('tasks')}
            @keydown=${(e: KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.openSidePanel('tasks');
              }
            }}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true">
              <path d="M9 11l3 3L22 4"></path>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
            </svg>
          </div>
          <div
            class="menu-item group-productivity"
            title="Memory - View and manage conversation memory"
            aria-label="Memory Manager"
            role="button"
            tabindex="0"
            @click=${() => this.openSidePanel('memory')}
            @keydown=${(e: KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.openSidePanel('memory');
              }
            }}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true">
              <path d="M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20z"></path>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
        </div>

        ${this.renderPersonisPanel()} 
        ${this.renderConnectorsPanel()}
        ${this.activeSidePanel === 'models' ? html`
          <models-panel 
            @close=${this.closeSidePanel}
            @stt-preferences-changed=${(e: CustomEvent) => {
              this.sttPreferences = e.detail;
              if (this.sttPreferences.enabled) {
                localWhisperService.loadModel(this.sttPreferences.modelSize).catch(err => {
                  console.error('Failed to load Whisper model:', err);
                });
              }
            }}
          ></models-panel>
        ` : ''}
        ${this.activeSidePanel === 'userProfile' ? html`
          <user-profile-panel
            @close=${this.closeSidePanel}
            @profile-saved=${(e: CustomEvent) => {
              this.userProfile = e.detail;
            }}
          ></user-profile-panel>
        ` : ''}
        ${this.activeSidePanel === 'notes' ? html`
          <notes-panel
            @close=${this.closeSidePanel}
          ></notes-panel>
        ` : ''}
        ${this.activeSidePanel === 'tasks' ? html`
          <tasks-panel
            @close=${this.closeSidePanel}
          ></tasks-panel>
        ` : ''}
        ${this.activeSidePanel === 'memory' ? html`
          <memory-panel
            @close=${this.closeSidePanel}
          ></memory-panel>
        ` : ''}

        <!-- Music Detection Indicator -->
        <div class="music-indicator ${this.isMusicDetected && this.musicDetectionEnabled ? 'visible' : ''}">
          <span class="music-indicator-icon">🎵</span>
          <span>Music Detected</span>
          ${this.musicBpm > 0 ? html`<span>${Math.round(this.musicBpm)} BPM</span>` : ''}
          <span>${Math.round(this.musicConfidence * 100)}%</span>
        </div>

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
          .isListening=${this.isSpeaking}
          .isAiSpeaking=${this.isAiSpeaking}
          .visuals=${this.activePersoni?.visuals}
          .isMusicDetected=${this.isMusicDetected}
          .musicBpm=${this.musicBpm}
          .musicBeatDetected=${this.musicBeatDetected}
          .musicConfidence=${this.musicConfidence}></gdm-live-audio-visuals-3d>
      </div>
    `;
  }
}