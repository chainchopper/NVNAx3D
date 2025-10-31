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
import {customElement, state, query} from 'lit/decorators.js';
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
import './components/routines-panel';
import './components/connector-config-panel';
import './components/chatterbox-settings';
import './components/game-of-life-bg';
import './components/constellation-map-bg';
import './components/code-flow-bg';
import './components/static-noise-bg';
import './components/camera-manager';
import './components/camera-controls';
import './components/rag-toggle';
import './components/file-upload';
import './components/financial-dashboard';
import './components/transcription-log';
import './components/ui-controls';
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
import { MemoryType } from './types/memory';
import { IdleSpeechManager } from './services/idle-speech-manager';
import { musicDetector, MusicDetectionResult, MusicDetectorConfig } from './services/music-detector';
import { songIdentificationService, SongInfo, LyricsInfo, SongIdentificationConfig } from './services/song-identification-service';
import './components/song-info-bubble';
import { activePersonasManager, PersonaSlot } from './services/active-personas-manager';
import { connectorHandlers, ConnectorResult } from './services/connector-handlers';
import { routineExecutor } from './services/routine-executor';
import { routinePatternDetector } from './services/routine-pattern-detector';
import type { RoutinePattern } from './types/routine-types';
import { reminderManager } from './services/reminder-manager';
import { environmentalObserver } from './services/environmental-observer';
import { chatterboxTTS } from './services/chatterbox-tts';
import { audioRecordingManager } from './services/audio-recording-manager';
import { objectRecognitionService, DetectionResult } from './services/object-recognition';
import { voiceCommandSystem } from './services/voice-command-system';
import { dualPersonIManager } from './services/dual-personi-manager';
import './components/object-detection-overlay';
import './components/calendar-view';

const PERSONIS_KEY = 'gdm-personis';
const CONNECTORS_KEY = 'gdm-connectors';
const STT_PREFERENCES_KEY = 'stt-preferences';
const SETTINGS_FAB_POSITION_KEY = 'settings-fab-position';
const DUAL_MODE_KEY = 'dual-mode-settings';
const DETECTED_PATTERNS_KEY = 'detected-patterns';
const DISMISSED_PATTERNS_KEY = 'dismissed-patterns';
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
type ActiveSidePanel = 'none' | 'personis' | 'connectorConfig' | 'models' | 'userProfile' | 'notes' | 'tasks' | 'memory' | 'routines';

interface TranscriptEntry {
  speaker: 'user' | 'ai' | 'system';
  text: string;
  personiName?: string;
  personiColor?: string;
  slot?: PersonaSlot;
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
  @state() fabPosition = { x: 0, y: 0 };
  @state() isDraggingFab = false;

  // New state for unified config panel
  @state() activeSidePanel: ActiveSidePanel = 'none';
  @state() configPanelMode: ConfigPanelMode = 'list';
  @state() personis: PersoniConfig[] = [];
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
  
  // Routine pattern detection state
  @state() detectedPatterns: RoutinePattern[] = [];
  private dismissedPatternIds: Set<string> = new Set();
  
  // Dual PersonI mode state (opt-in feature)
  @state() dualModeEnabled = false;
  @state() currentSpeakerSlot: PersonaSlot | null = null;
  
  // Music detection state
  @state() musicDetectionEnabled = true;
  @state() isMusicDetected = false;
  @state() musicBpm = 0;
  @state() musicBeatDetected = false;
  @state() musicConfidence = 0;
  @state() musicDetectorConfig: MusicDetectorConfig;
  
  // Song identification state
  @state() songIdentificationEnabled = true;
  @state() currentSongInfo: SongInfo | null = null;
  @state() currentLyrics: LyricsInfo | null = null;
  @state() showSongBubble = false;
  @state() songIdentificationConfig: SongIdentificationConfig;
  
  // Camera and input mode state
  @state() cameraEnabled = false;
  @state() cameraShowPreview = false;
  @state() cameraHasPermission = false;
  
  // Financial dashboard state
  @state() showFinancialDashboard = false;
  @state() cameraError: string | null = null;
  @state() inputMode: 'voice' | 'text' = 'voice';
  @state() textInput = '';
  @state() lastRetrievedMemories = 0;
  
  // Object detection state
  @state() objectDetectionEnabled = false;
  @state() currentDetections: DetectionResult | null = null;
  
  // Calendar state
  @state() showCalendar = false;
  
  // Dual PersonI advanced controls
  @state() dualModeActive = false;
  @state() dualModeType: DualMode = 'collaborative';
  @state() secondaryPersoni: PersoniConfig | null = null;
  @state() showDualControls = false;
  
  @query('camera-manager') cameraManager?: any;
  @query('object-detection-overlay') objectDetectionOverlay?: any;
  
  private musicStartTime = 0;
  private identificationTimeout: number | undefined;

  private settingsTimeout: number | undefined;
  private idlePromptTimeout: number | undefined;
  private nirvanaGradientInterval: number | undefined;
  private idleSpeechManager = new IdleSpeechManager();
  
  private dragStartX = 0;
  private dragStartY = 0;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  
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

    .financial-dashboard-toggle {
      position: fixed;
      top: 120px;
      left: 20px;
      z-index: 999;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      border: 1px solid rgba(46, 139, 87, 0.4);
      background: rgba(46, 139, 87, 0.2);
      backdrop-filter: blur(10px);
      color: white;
      font-size: 24px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .financial-dashboard-toggle:hover {
      transform: scale(1.1);
      background: rgba(46, 139, 87, 0.3);
      border-color: rgba(46, 139, 87, 0.6);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
    }

    .financial-dashboard-toggle:active {
      transform: scale(0.95);
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
      position: fixed;
      z-index: 100;
      opacity: 0;
      transition: opacity 0.5s ease-in-out;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      cursor: move;
      user-select: none;
    }

    .settings-fab.visible {
      opacity: 1;
    }

    .settings-fab.dragging {
      opacity: 0.7;
      cursor: grabbing;
    }

    .settings-fab.dragging button {
      pointer-events: none;
    }

    .settings-fab.dragging .provider-status-indicator {
      pointer-events: none;
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
      position: fixed;
      z-index: 99;
      pointer-events: none;
    }

    .settings-menu .menu-item {
      pointer-events: all;
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
    .settings-menu.open .menu-item:nth-child(8) {
      transform: translate(90px, 130px);
      transition-delay: 0.8s;
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

    .connector-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 8px;
      margin-top: 12px;
    }

    .connector-checkbox-item {
      display: flex;
      align-items: center;
      padding: 8px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.2s ease;
      font-size: 13px;
    }

    .connector-checkbox-item:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .connector-checkbox-item input[type="checkbox"] {
      margin-right: 8px;
      cursor: pointer;
    }

    .connector-name {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
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
    
    // Initialize voice command system
    this.initializeVoiceCommands();
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

  protected firstUpdated() {
    console.log('[Lifecycle] firstUpdated called, ensuring dual mode system is initialized');
    // Ensure dual mode system is initialized after first render
    // This is a safety net in case init() hasn't completed yet
    if (this.activePersoni) {
      this.initializeDualModeSystem();
    } else {
      console.warn('[DualMode] firstUpdated: activePersoni not yet set, will initialize when available');
    }
    
    // Initialize reminder notification checks
    reminderManager.startNotificationChecks((message) => {
      this.speakText(message);
    });
    
    // Request notification permission for reminders
    reminderManager.requestNotificationPermission();
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
      
      console.log('[ChatterboxTTS] Initializing...');
      await chatterboxTTS.loadConfig();
      console.log('[ChatterboxTTS] ✅ Service initialized');
      
      console.log('[Routines] Initializing routine executor...');
      await routineExecutor.initialize();
      console.log('[Routines] ✅ Routine executor initialized');
      
      console.log('[Routines] Initializing pattern detector...');
      await routinePatternDetector.initialize();
      this.loadDetectedPatterns();
      routinePatternDetector.onPatternDetected((pattern) => {
        console.log('[Routines] Pattern detected:', pattern);
        this.handlePatternDetected(pattern);
      });
      console.log('[Routines] ✅ Pattern detector initialized');
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
    
    // Initialize song identification
    this.setupSongIdentification();
    
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
    
    // Initialize dual mode system AFTER all async initialization is complete
    this.initializeDualModeSystem();
  }
  
  private initializeDualModeSystem() {
    console.log('[DualMode] Initializing dual mode system...');
    
    this.loadDualModeSettings();
    
    if (this.activePersoni) {
      activePersonasManager.setPersona('primary', this.activePersoni);
      console.log(`[DualMode] Synced primary slot with ${this.activePersoni.name}`);
    }
    
    if (this.dualModeEnabled && this.secondaryPersoni) {
      activePersonasManager.setPersona('secondary', this.secondaryPersoni);
      console.log(`[DualMode] Dual mode enabled with secondary: ${this.secondaryPersoni.name}`);
    }
    
    activePersonasManager.addEventListener((event) => {
      this.handlePersonaEvent(event);
    });
  }
  
  private loadDualModeSettings() {
    const stored = localStorage.getItem(DUAL_MODE_KEY);
    if (stored) {
      try {
        const settings = JSON.parse(stored);
        this.dualModeEnabled = settings.enabled || false;
        
        if (settings.secondaryPersoniId && this.personis.length > 0) {
          this.secondaryPersoni = this.personis.find(p => p.id === settings.secondaryPersoniId) || null;
        }
      } catch (error) {
        console.error('[DualMode] Failed to load settings:', error);
      }
    }
  }
  
  private saveDualModeSettings() {
    try {
      const settings = {
        enabled: this.dualModeEnabled,
        secondaryPersoniId: this.secondaryPersoni?.id || null,
      };
      localStorage.setItem(DUAL_MODE_KEY, JSON.stringify(settings));
      console.log('[DualMode] Settings saved:', settings);
    } catch (error) {
      console.error('[DualMode] Failed to save settings:', error);
    }
  }
  
  private loadDetectedPatterns() {
    try {
      const stored = localStorage.getItem(DETECTED_PATTERNS_KEY);
      if (stored) {
        this.detectedPatterns = JSON.parse(stored);
        console.log(`[Routines] Loaded ${this.detectedPatterns.length} detected patterns`);
      }
      
      const dismissedStored = localStorage.getItem(DISMISSED_PATTERNS_KEY);
      if (dismissedStored) {
        this.dismissedPatternIds = new Set(JSON.parse(dismissedStored));
        console.log(`[Routines] Loaded ${this.dismissedPatternIds.size} dismissed patterns`);
      }
    } catch (error) {
      console.error('[Routines] Failed to load detected patterns:', error);
    }
  }
  
  private saveDetectedPatterns() {
    try {
      localStorage.setItem(DETECTED_PATTERNS_KEY, JSON.stringify(this.detectedPatterns));
      localStorage.setItem(DISMISSED_PATTERNS_KEY, JSON.stringify([...this.dismissedPatternIds]));
      console.log('[Routines] Saved detected patterns');
    } catch (error) {
      console.error('[Routines] Failed to save detected patterns:', error);
    }
  }
  
  private handlePatternDetected(pattern: RoutinePattern) {
    const patternId = this.getPatternId(pattern);
    
    if (this.dismissedPatternIds.has(patternId)) {
      console.log('[Routines] Pattern already dismissed, skipping:', patternId);
      return;
    }
    
    const existingIndex = this.detectedPatterns.findIndex(p => this.getPatternId(p) === patternId);
    if (existingIndex >= 0) {
      this.detectedPatterns[existingIndex] = pattern;
      console.log('[Routines] Updated existing pattern:', patternId);
    } else {
      this.detectedPatterns.push(pattern);
      console.log('[Routines] Added new pattern:', patternId);
      
      this.showPatternNotification(pattern);
    }
    
    this.saveDetectedPatterns();
    this.requestUpdate();
  }
  
  private getPatternId(pattern: RoutinePattern): string {
    return `${pattern.type}_${pattern.description.substring(0, 50)}`;
  }
  
  private showPatternNotification(pattern: RoutinePattern) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🤖 Routine Pattern Detected', {
        body: `${pattern.description}\nConfidence: ${Math.round(pattern.confidence * 100)}%`,
        icon: '/public/avatars/nirvana.png',
        tag: 'routine-pattern',
      });
    } else {
      console.log(`[Routines] 💡 SUGGESTION: ${pattern.description} (${Math.round(pattern.confidence * 100)}% confidence)`);
    }
  }
  
  dismissPattern(patternId: string) {
    this.dismissedPatternIds.add(patternId);
    this.detectedPatterns = this.detectedPatterns.filter(p => this.getPatternId(p) !== patternId);
    this.saveDetectedPatterns();
    this.requestUpdate();
    console.log('[Routines] Pattern dismissed:', patternId);
  }
  
  getActivePatterns(): RoutinePattern[] {
    return this.detectedPatterns.filter(p => !this.dismissedPatternIds.has(this.getPatternId(p)));
  }
  
  private async handlePersonaEvent(event: any) {
    console.log(`[DualMode] Event from ${event.slot}:`, event.type, event.data);
    
    if (event.type === 'speaking' && event.data?.text) {
      this.currentSpeakerSlot = event.slot;
      
      const persona = event.slot === 'primary' ? this.activePersoni : this.secondaryPersoni;
      if (persona) {
        await this.speakTextForSlot(event.slot, event.data.text, persona);
      }
    } else if (event.type === 'statusChange' && event.data?.status === 'idle') {
      if (this.currentSpeakerSlot === event.slot) {
        this.currentSpeakerSlot = null;
      }
    }
  }
  
  private async speakTextForSlot(slot: PersonaSlot, text: string, persona: PersoniConfig) {
    if (!text || this.isMuted) return;
    
    try {
      this.isAiSpeaking = true;
      this.updateStatus(`${persona.name} is speaking...`);
      
      const provider = this.getProviderForSlot(slot);
      if (!provider || persona.voiceName === 'none') {
        await this.speakWithBrowserTTS(text, 'ai');
        return;
      }
      
      if (provider instanceof GoogleProvider) {
        const googleProvider = provider as any;
        if (!googleProvider.client) {
          await googleProvider.verify();
        }
        
        const response = await googleProvider.client.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: { parts: [{ text }] },
          config: {
            response_modalities: ['AUDIO'],
            speech_config: {
              voice_config: { prebuilt_voice_config: { voice_name: persona.voiceName } },
            },
          },
        });
        
        const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
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
        await this.speakWithBrowserTTS(text, 'ai');
      }
    } catch (error) {
      console.error(`[DualMode] Speech error for ${slot}:`, error);
      await this.speakWithBrowserTTS(text, 'ai');
    } finally {
      this.isAiSpeaking = false;
      this.updateStatus(this.isMuted ? 'Muted' : 'Idle');
    }
  }
  
  private queueSpeechForSlot(slot: PersonaSlot, text: string, priority: number = 0) {
    if (this.dualModeEnabled) {
      console.log(`[DualMode] Queueing speech for ${slot}: "${text}"`);
      activePersonasManager.queueAudio(slot, text, priority);
    } else {
      this.speakText(text, 'ai');
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

    const storedSttPreferences = localStorage.getItem(STT_PREFERENCES_KEY);
    if (storedSttPreferences) {
      this.sttPreferences = JSON.parse(storedSttPreferences);
    }

    const storedFabPosition = localStorage.getItem(SETTINGS_FAB_POSITION_KEY);
    if (storedFabPosition) {
      this.fabPosition = JSON.parse(storedFabPosition);
    } else {
      this.fabPosition = { x: window.innerWidth - 104, y: window.innerHeight - 104 };
    }
  }

  private savePersonis() {
    localStorage.setItem(PERSONIS_KEY, JSON.stringify(this.personis));
    this.personis = [...this.personis];
  }

  private saveFabPosition() {
    localStorage.setItem(SETTINGS_FAB_POSITION_KEY, JSON.stringify(this.fabPosition));
  }

  private handleFabMouseDown = (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('.provider-status-indicator')) {
      return;
    }
    
    e.preventDefault();
    this.isDraggingFab = true;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    this.dragOffsetX = this.fabPosition.x;
    this.dragOffsetY = this.fabPosition.y;
    
    document.addEventListener('mousemove', this.handleFabMouseMove);
    document.addEventListener('mouseup', this.handleFabMouseUp);
  };

  private handleFabMouseMove = (e: MouseEvent) => {
    if (!this.isDraggingFab) return;
    
    e.preventDefault();
    
    const deltaX = e.clientX - this.dragStartX;
    const deltaY = e.clientY - this.dragStartY;
    
    let newX = this.dragOffsetX + deltaX;
    let newY = this.dragOffsetY + deltaY;
    
    const menuWidth = 120;
    const menuHeight = 120;
    const fabSize = 80;
    
    const minX = menuWidth - 50;
    const maxX = window.innerWidth - fabSize - 10;
    const minY = menuHeight - 50;
    const maxY = window.innerHeight - fabSize - 10;
    
    newX = Math.max(minX, Math.min(maxX, newX));
    newY = Math.max(minY, Math.min(maxY, newY));
    
    this.fabPosition = { x: newX, y: newY };
  };

  private handleFabMouseUp = (e: MouseEvent) => {
    if (!this.isDraggingFab) return;
    
    e.preventDefault();
    this.isDraggingFab = false;
    this.saveFabPosition();
    
    document.removeEventListener('mousemove', this.handleFabMouseMove);
    document.removeEventListener('mouseup', this.handleFabMouseUp);
  };

  private handleUserActivity() {
    this.settingsButtonVisible = true;
    if (this.settingsTimeout) clearTimeout(this.settingsTimeout);
    this.settingsTimeout = window.setTimeout(() => {
      this.settingsButtonVisible = false;
      this.settingsMenuVisible = false;
    }, 4000);
  }
  
  private async setupSongIdentification() {
    try {
      if (this.ragInitialized) {
        songIdentificationService.setRAGMemoryManager(ragMemoryManager);
      }
      
      if (this.activePersoni) {
        const provider = this.getProviderForPersoni(this.activePersoni);
        if (provider) {
          songIdentificationService.setProvider(provider);
        }
        songIdentificationService.setPersona(this.activePersoni.name);
      }
      
      const initialized = await songIdentificationService.initialize();
      if (!initialized) {
        console.warn('[SongIdentification] Failed to initialize');
        return;
      }
      
      console.log('[SongIdentification] Service initialized');
      
      musicDetector.addEventListener('musicstart', ((event: CustomEvent) => {
        this.handleMusicStart(event.detail);
      }) as EventListener);
      
      musicDetector.addEventListener('musicstop', (() => {
        this.handleMusicStop();
      }) as EventListener);
      
      songIdentificationService.addEventListener('identified', ((event: CustomEvent) => {
        this.handleSongIdentified(event.detail);
      }) as EventListener);
      
      songIdentificationService.addEventListener('lyricsfetched', ((event: CustomEvent) => {
        this.handleLyricsFetched(event.detail);
      }) as EventListener);
      
      songIdentificationService.addEventListener('commentary', ((event: CustomEvent) => {
        this.handleSongCommentary(event.detail);
      }) as EventListener);
      
      songIdentificationService.addEventListener('cleared', (() => {
        this.showSongBubble = false;
        this.currentSongInfo = null;
        this.currentLyrics = null;
      }) as EventListener);
    } catch (error) {
      console.error('[SongIdentification] Setup error:', error);
    }
  }
  
  private handleMusicStart(detail: { confidence: number }) {
    if (!this.songIdentificationEnabled) return;
    
    console.log('[SongIdentification] Music detected, scheduling identification...');
    this.musicStartTime = Date.now();
    
    clearTimeout(this.identificationTimeout);
    
    const config = songIdentificationService.getConfig();
    this.identificationTimeout = window.setTimeout(() => {
      if (this.isMusicDetected) {
        songIdentificationService.startCapture();
      }
    }, config.identificationDelayMs);
  }
  
  private handleMusicStop() {
    console.log('[SongIdentification] Music stopped');
    clearTimeout(this.identificationTimeout);
    
    setTimeout(() => {
      this.showSongBubble = false;
      songIdentificationService.clearCurrent();
    }, 5000);
  }
  
  private async handleSongIdentified(songInfo: SongInfo) {
    console.log('[SongIdentification] Song identified:', songInfo.title, 'by', songInfo.artist);
    
    this.currentSongInfo = songInfo;
    this.showSongBubble = true;
  }
  
  private handleLyricsFetched(lyricsInfo: LyricsInfo) {
    console.log('[SongIdentification] Lyrics fetched from', lyricsInfo.source);
    this.currentLyrics = lyricsInfo;
  }
  
  private async handleSongCommentary(detail: { songInfo: SongInfo; commentary: string; timesHeard: number; isRepeated: boolean }) {
    console.log('[SongIdentification] Commentary generated:', detail.commentary);
    
    if (!this.activePersoni || this.isAiSpeaking || this.isSpeaking) return;
    
    this.transcriptHistory = [
      ...this.transcriptHistory,
      {
        speaker: 'ai',
        text: detail.commentary,
        personiName: this.activePersoni.name,
        personiColor: this.activePersoni.visuals.accentColor,
        slot: this.dualModeEnabled ? 'primary' : undefined,
      },
    ];
    
    if (!this.isMuted && this.activePersoni.voiceName !== 'none') {
      await this.speakText(detail.commentary, 'ai');
    }
  }
  
  private handleCloseSongBubble() {
    this.showSongBubble = false;
    songIdentificationService.clearCurrent();
  }

  private handleCameraPermissions(e: CustomEvent) {
    this.cameraEnabled = true;
    this.cameraHasPermission = true;
    this.cameraError = null;
    console.log('[Camera] Permissions granted, camera enabled');
    
    if (this.cameraEnabled && this.activePersoni) {
      const provider = this.getProviderForPersoni(this.activePersoni);
      if (provider) {
        environmentalObserver.start(
          () => this.cameraManager?.captureFrame() || null,
          provider,
          this.activePersoni.name,
          (text) => this.speakText(text)
        );
      }
    }
  }

  private handleCameraPermissionsDenied(e: CustomEvent) {
    this.cameraHasPermission = false;
    this.cameraEnabled = false;
    this.cameraError = 'Camera permission denied';
    console.log('[Camera] Permissions denied');
  }

  private async handleRequestCameraPermission() {
    console.log('[Camera] Browser will request permission automatically');
    if (this.cameraManager) {
      const granted = await this.cameraManager.requestPermissions();
      if (granted) {
        this.cameraHasPermission = true;
        this.cameraError = null;
        console.log('[Camera] Permission granted via controls');
      } else {
        this.cameraHasPermission = false;
        this.cameraError = 'Camera permission denied';
        console.log('[Camera] Permission denied via controls');
      }
    }
  }

  private handleToggleCameraControl() {
    this.cameraEnabled = !this.cameraEnabled;
    console.log('[Camera] Camera toggled:', this.cameraEnabled ? 'ON' : 'OFF');
  }

  private handleToggleCameraPreview() {
    this.cameraShowPreview = !this.cameraShowPreview;
    console.log('[Camera] Preview toggled:', this.cameraShowPreview ? 'VISIBLE' : 'HIDDEN');
  }

  private handleFrameCaptured(e: CustomEvent) {
    console.log('[Camera] Frame captured:', e.detail);
  }

  private async handleToggleObjectDetection(e: CustomEvent) {
    this.objectDetectionEnabled = !this.objectDetectionEnabled;
    console.log('[ObjectDetection] Toggled:', this.objectDetectionEnabled ? 'ENABLED' : 'DISABLED');
    
    if (this.objectDetectionEnabled) {
      await this.startObjectDetection();
    } else {
      this.stopObjectDetection();
    }
  }

  private async startObjectDetection() {
    if (!this.cameraManager?.videoElement) {
      console.warn('[ObjectDetection] No video element available');
      return;
    }

    try {
      await objectRecognitionService.initialize();
      
      objectRecognitionService.startContinuousDetection(
        this.cameraManager.videoElement,
        async (result) => {
          this.currentDetections = result;
          
          if (this.objectDetectionOverlay) {
            const videoEl = this.cameraManager.videoElement;
            this.objectDetectionOverlay.videoWidth = videoEl.videoWidth;
            this.objectDetectionOverlay.videoHeight = videoEl.videoHeight;
            this.objectDetectionOverlay.updateDetections(result);
          }
          
          if (this.ragEnabled && this.ragInitialized && this.activePersoni && result.objects.length > 0) {
            const objectsList = result.objects
              .map(obj => `${obj.class} (${Math.round(obj.score * 100)}%)`)
              .join(', ');
            
            try {
              await ragMemoryManager.addMemory(
                `Detected objects in camera view: ${objectsList}`,
                this.activePersoni.name,
                'camera_observation',
                this.activePersoni.name,
                3,
                { 
                  detectionTimestamp: result.timestamp,
                  fps: result.fps,
                  objectCount: result.objects.length
                }
              );
            } catch (error) {
              console.error('[ObjectDetection] Failed to store detection in RAG:', error);
            }
          }
        },
        500
      );
      
      console.log('[ObjectDetection] Started continuous detection');
    } catch (error) {
      console.error('[ObjectDetection] Failed to start:', error);
      this.objectDetectionEnabled = false;
    }
  }

  private stopObjectDetection() {
    objectRecognitionService.stopContinuousDetection();
    this.currentDetections = null;
    
    if (this.objectDetectionOverlay) {
      this.objectDetectionOverlay.clearDetections();
    }
    
    console.log('[ObjectDetection] Stopped continuous detection');
  }

  // Dual PersonI Methods
  private handleToggleDualMode() {
    this.dualModeActive = !this.dualModeActive;
    
    if (this.dualModeActive && this.secondaryPersoni) {
      // Activate dual mode with current primary and selected secondary
      dualPersonIManager.activateDualMode(
        this.personis[this.selectedPersoniIndex],
        this.secondaryPersoni,
        this.dualModeType
      );
      console.log('[DualPersonI] Activated dual mode');
    } else {
      // Deactivate dual mode, restore primary
      dualPersonIManager.deactivateDualMode();
      console.log('[DualPersonI] Deactivated dual mode');
    }
  }
  
  private handleDualModeTypeChange(mode: DualMode) {
    this.dualModeType = mode;
    
    if (this.dualModeActive && this.secondaryPersoni) {
      // Re-activate with new mode
      dualPersonIManager.activateDualMode(
        this.personis[this.selectedPersoniIndex],
        this.secondaryPersoni,
        mode
      );
      console.log('[DualPersonI] Changed mode to:', mode);
    }
  }
  
  private handleSecondaryPersonISelect(personi: PersoniConfig) {
    this.secondaryPersoni = personi;
    
    if (this.dualModeActive) {
      // Re-activate with new secondary
      dualPersonIManager.activateDualMode(
        this.personis[this.selectedPersoniIndex],
        personi,
        this.dualModeType
      );
      console.log('[DualPersonI] Changed secondary to:', personi.name);
    }
  }

  private handleModeChange(e: CustomEvent) {
    this.inputMode = e.detail.mode;
    console.log('[InputMode] Mode changed to:', this.inputMode);
  }

  private async handleTextSubmit(e: CustomEvent) {
    const text = e.detail.text;
    console.log('[TextInput] Text submitted:', text);
    
    if (text && text.trim()) {
      this.textInput = '';
      await this.processTranscript(text);
    }
  }

  private handleRAGToggle(e: CustomEvent) {
    this.ragEnabled = e.detail.enabled;
    console.log('[RAG] Memory context toggled:', this.ragEnabled ? 'ENABLED' : 'DISABLED');
    
    if (!this.ragEnabled) {
      this.lastRetrievedMemories = 0;
    }
  }

  private async handleFileUploaded(e: CustomEvent) {
    const { file } = e.detail;
    console.log('[FileUpload] Processing uploaded file:', file.name, file.type);

    if (!this.ragInitialized || !this.activePersoni) {
      console.warn('[FileUpload] RAG not initialized or no active PersonI');
      return;
    }

    try {
      let content = '';
      let metadata: Record<string, any> = {
        filename: file.name,
        fileType: file.type,
        fileSize: file.size,
        uploadedAt: new Date(file.timestamp).toISOString(),
      };

      if (file.type.startsWith('image/')) {
        content = `[Image: ${file.name}] Uploaded image file. Size: ${this.formatBytes(file.size)}`;
        metadata.imageData = file.data;
        
        if (this.activePersoni.capabilities?.vision) {
          const provider = this.getProviderForPersoni(this.activePersoni);
          if (provider) {
            try {
              const analysisPrompt = `Analyze this image and describe what you see in detail. Include objects, people, text, colors, and any notable features.`;
              const messages = [
                { role: 'system' as const, content: 'You are a helpful image analysis assistant.' },
                { role: 'user' as const, content: [
                  { type: 'text' as const, text: analysisPrompt },
                  { type: 'image' as const, data: file.data as string }
                ]}
              ];
              const analysis = await provider.sendMessage(messages);
              content += `\n\nImage Analysis:\n${analysis}`;
              metadata.analysis = analysis;
            } catch (error) {
              console.error('[FileUpload] Image analysis failed:', error);
            }
          }
        }
      } else if (file.type.startsWith('audio/')) {
        content = `[Audio: ${file.name}] Uploaded audio file. Size: ${this.formatBytes(file.size)}`;
        metadata.audioData = file.data;
      } else if (file.type.startsWith('video/')) {
        content = `[Video: ${file.name}] Uploaded video file. Size: ${this.formatBytes(file.size)}`;
        metadata.videoData = file.data;
      } else if (file.type.includes('pdf')) {
        content = `[PDF: ${file.name}] Uploaded PDF document. Size: ${this.formatBytes(file.size)}`;
      } else if (file.type.includes('json')) {
        try {
          const jsonData = JSON.parse(file.data as string);
          content = `[JSON: ${file.name}]\n${JSON.stringify(jsonData, null, 2)}`;
          metadata.parsedData = jsonData;
        } catch (error) {
          content = `[JSON: ${file.name}] ${file.data}`;
        }
      } else if (file.type.includes('csv')) {
        const csvContent = file.data as string;
        const lines = csvContent.split('\n').slice(0, 50);
        content = `[CSV: ${file.name}] ${lines.length} rows\n${lines.join('\n')}`;
        metadata.rowCount = csvContent.split('\n').length;
      } else if (file.type.includes('text') || file.type.includes('markdown')) {
        content = `[${file.type.includes('markdown') ? 'Markdown' : 'Text'}: ${file.name}]\n${file.data}`;
      } else if (file.type.includes('xml')) {
        content = `[XML: ${file.name}]\n${file.data}`;
      } else {
        content = `[File: ${file.name}] Uploaded file of type ${file.type}. Size: ${this.formatBytes(file.size)}`;
      }

      await ragMemoryManager.addMemory(
        content,
        'user',
        'file_upload',
        this.activePersoni.name,
        7,
        metadata
      );

      console.log('[FileUpload] File stored in RAG memory:', file.name);
      await this.speakText(`I've received and analyzed your file: ${file.name}`);
      
    } catch (error) {
      console.error('[FileUpload] Failed to process file:', error);
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
    activePersonasManager.setPersona('primary', personi);
    this.updateStatus(`${personi.name} is now active.`);

    if (personi.name === 'NIRVANA') {
      this.startNirvanaGradientUpdates();
    }

    const provider = this.getProviderForPersoni(personi);
    if (provider) {
      songIdentificationService.setProvider(provider);
    }
    songIdentificationService.setPersona(personi.name);

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
  
  private getProviderForSlot(slot: PersonaSlot): BaseProvider | null {
    if (this.dualModeEnabled) {
      return activePersonasManager.getProvider(slot);
    } else {
      if (slot === 'primary' && this.activePersoni) {
        return this.getProviderForPersoni(this.activePersoni);
      }
      return null;
    }
  }
  
  private getActiveProvider(): BaseProvider | null {
    if (this.dualModeEnabled) {
      return activePersonasManager.getProvider('primary');
    } else if (this.activePersoni) {
      return this.getProviderForPersoni(this.activePersoni);
    }
    return null;
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
    
    // Check for voice commands first
    const commandResult = voiceCommandSystem.processTranscript(transcript);
    if (commandResult.matched) {
      console.log('[VoiceCommand] Command executed:', commandResult.action, commandResult.params);
      // Voice command was handled, don't process as regular transcript
      return;
    }
    
    const provider = this.getProviderForPersoni(this.activePersoni);
    const isProviderMode = !!provider;
    const isBrowserOnlyMode = !isProviderMode;
    
    this.transcriptHistory = [
      ...this.transcriptHistory,
      {
        speaker: 'user', 
        text: transcript,
        slot: undefined,
      },
    ];
    this.currentTranscript = '';

    if (this.ragEnabled && this.ragInitialized) {
      try {
        console.log('[RAG] 💾 Storing user message as memory');
        
        let memoryType: MemoryType = 'conversation';
        let importance = 5;
        let additionalMetadata: Record<string, any> = {};
        
        if (this.activePersoni.name === 'BILLY') {
          const financialContext = this.analyzeFinancialContext(transcript, 'user');
          memoryType = financialContext.type;
          importance = financialContext.importance;
          if (financialContext.tags.length > 0) {
            additionalMetadata.tags = financialContext.tags;
          }
          console.log(`[RAG] 💰 Financial context detected: type=${memoryType}, importance=${importance}, tags=${financialContext.tags.join(', ')}`);
        }
        
        await ragMemoryManager.addMemory(
          transcript,
          'user',
          memoryType,
          this.activePersoni.name,
          importance,
          additionalMetadata
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

      if (this.activePersoni.enabledConnectors && this.activePersoni.enabledConnectors.length > 0) {
        for (const connectorId of this.activePersoni.enabledConnectors) {
          const connector = AVAILABLE_CONNECTORS.find(
            (c) => c.id === connectorId,
          );
          if (connector) {
            enabledDeclarations.push(connector.functionDeclaration);
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
            this.lastRetrievedMemories = relevantMemories.length;
            console.log(`[RAG] 🧠 Found ${relevantMemories.length} relevant memories`);
          } else {
            this.lastRetrievedMemories = 0;
            console.log('[RAG] No relevant memories found');
          }
        } catch (error) {
          this.lastRetrievedMemories = 0;
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
    console.log('[FunctionCall] Received:', fc.name, fc.args);

    if (fc.name === 'switchPersona') {
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
      return;
    }

    let result: ConnectorResult | null = null;

    switch (fc.name) {
      case 'searchGmailEmails':
        result = await connectorHandlers.handleGmail(fc.args as any);
        break;
      case 'getCalendarEvents':
        result = await connectorHandlers.handleGoogleCalendar(fc.args as any);
        break;
      case 'readGoogleDoc':
        result = await connectorHandlers.handleGoogleDocs(fc.args as any);
        break;
      case 'readGoogleSheet':
        result = await connectorHandlers.handleGoogleSheets(fc.args as any);
        break;
      case 'searchNotionPages':
        result = await connectorHandlers.handleNotion(fc.args as any);
        break;
      case 'getLinearIssues':
        result = await connectorHandlers.handleLinear(fc.args as any);
        break;
      case 'sendSlackMessage':
        result = await connectorHandlers.handleSlack(fc.args as any);
        break;
      case 'getGithubRepoDetails':
        result = await connectorHandlers.handleGitHub(fc.args as any);
        break;
      case 'searchOutlookEmails':
        result = await connectorHandlers.handleOutlook(fc.args as any);
        break;
      case 'searchJiraIssues':
        result = await connectorHandlers.handleJira(fc.args as any);
        break;
      case 'getAsanaTasks':
        result = await connectorHandlers.handleAsana(fc.args as any);
        break;
      case 'searchConfluencePages':
        result = await connectorHandlers.handleConfluence(fc.args as any);
        break;
      case 'getHomeAssistantDevices':
        result = await connectorHandlers.handleHomeassistant(fc.args as any);
        break;
      case 'getHomeAssistantState':
        result = await connectorHandlers.handleHomeassistantState(fc.args as any);
        break;
      case 'controlHomeAssistantDevice':
        result = await connectorHandlers.handleHomeassistantControl(fc.args as any);
        break;
      case 'getFrigateEvents':
        result = await connectorHandlers.handleFrigateEvents(fc.args as any);
        break;
      case 'getFrigateSnapshot':
        result = await connectorHandlers.handleFrigateSnapshot(fc.args as any);
        break;
      case 'getFrigateCameraState':
        result = await connectorHandlers.handleFrigateCameraState(fc.args as any);
        break;
      case 'detectObjectsCodeProjectAI':
        result = await connectorHandlers.handleCodeprojectaiDetect(fc.args as any);
        break;
      case 'detectObjectsYOLO':
        result = await connectorHandlers.handleYoloDetect(fc.args as any);
        break;
      case 'setReminder':
        result = await connectorHandlers.handleSetReminder(fc.args as any);
        break;
      case 'listReminders':
        result = await connectorHandlers.handleListReminders(fc.args as any);
        break;
      case 'completeReminder':
        result = await connectorHandlers.handleCompleteReminder(fc.args as any);
        break;
      case 'deleteReminder':
        result = await connectorHandlers.handleDeleteReminder(fc.args as any);
        break;
      case 'getStockQuote':
        result = await connectorHandlers.handleGetStockQuote(fc.args as any);
        break;
      case 'getCryptoPrice':
        result = await connectorHandlers.handleGetCryptoPrice(fc.args as any);
        break;
      case 'analyzePortfolio':
        result = await connectorHandlers.handleAnalyzePortfolio(fc.args as any);
        break;
      case 'getMarketNews':
        result = await connectorHandlers.handleGetMarketNews(fc.args as any);
        break;
      case 'analyzeSpending':
        result = await connectorHandlers.handleAnalyzeSpending(fc.args as any);
        break;
      case 'createBudget':
        result = await connectorHandlers.handleCreateBudget(fc.args as any);
        break;
      case 'getAccountBalance':
        result = await connectorHandlers.handleGetAccountBalance(fc.args as any);
        break;
      case 'getTransactions':
        result = await connectorHandlers.handleGetTransactions(fc.args as any);
        break;
      default:
        await this.speakText(
          `I received a request to use the tool "${fc.name}", but I'm not fully equipped to handle that yet.`,
          'system',
        );
        return;
    }

    if (result) {
      await this.handleConnectorResult(fc.name, result);
    }
  }

  private async handleConnectorResult(
    functionName: string,
    result: ConnectorResult,
  ) {
    console.log('[ConnectorResult]', functionName, result);

    if (result.success && result.data) {
      const responseText = this.formatConnectorResponse(functionName, result.data);
      await this.speakText(responseText, 'system');
    } else if (result.requiresSetup && result.setupInstructions) {
      await this.speakText(result.setupInstructions, 'system');
    } else if (result.error) {
      await this.speakText(
        `I encountered an error: ${result.error}`,
        'system',
      );
    } else {
      await this.speakText(
        `I couldn't complete that action. Please try again.`,
        'system',
      );
    }
  }

  private formatConnectorResponse(functionName: string, data: any): string {
    switch (functionName) {
      case 'searchGmailEmails':
        if (data.emails && data.emails.length > 0) {
          const emailList = data.emails
            .map(
              (email: any, i: number) =>
                `${i + 1}. From ${email.from}: "${email.subject}"`,
            )
            .join(', ');
          return `I found ${data.resultCount} email${data.resultCount !== 1 ? 's' : ''} matching "${data.query}". Here are the first few: ${emailList}`;
        }
        return `I didn't find any emails matching "${data.query}".`;

      case 'getCalendarEvents':
        if (data.events && data.events.length > 0) {
          const eventList = data.events
            .map(
              (event: any) =>
                `"${event.summary}" on ${new Date(event.start).toLocaleDateString()}`,
            )
            .join(', ');
          return `I found ${data.eventCount} upcoming event${data.eventCount !== 1 ? 's' : ''}: ${eventList}`;
        }
        return `You don't have any upcoming events in the specified time range.`;

      case 'searchNotionPages':
        if (data.pages && data.pages.length > 0) {
          const pageList = data.pages
            .map((page: any, i: number) => `${i + 1}. ${page.title}`)
            .join(', ');
          return `I found ${data.resultCount} Notion page${data.resultCount !== 1 ? 's' : ''} matching "${data.query}": ${pageList}`;
        }
        return `I didn't find any Notion pages matching "${data.query}".`;

      case 'getLinearIssues':
        if (data.issues && data.issues.length > 0) {
          const issueList = data.issues
            .map(
              (issue: any) =>
                `${issue.id}: ${issue.title} (${issue.state})`,
            )
            .join(', ');
          return `I found ${data.issueCount} Linear issue${data.issueCount !== 1 ? 's' : ''}: ${issueList}`;
        }
        return `I didn't find any Linear issues.`;

      case 'sendSlackMessage':
        return `Message sent to Slack channel ${data.channel} successfully.`;

      case 'getGithubRepoDetails':
        return `Repository ${data.fullName}: ${data.description || 'No description'}. It has ${data.stars} stars, ${data.forks} forks, ${data.openIssues} open issues, and ${data.openPullRequests} open pull requests.`;

      case 'getStockQuote':
        if (data.symbol) {
          const changeSymbol = data.change >= 0 ? '+' : '';
          return `${data.symbol} is currently trading at $${data.price.toFixed(2)}, ${changeSymbol}${data.change.toFixed(2)} (${changeSymbol}${data.changePercent.toFixed(2)}%) today. Today's range: $${data.low.toFixed(2)} - $${data.high.toFixed(2)}. Volume: ${(data.volume / 1000000).toFixed(2)}M shares.`;
        }
        return 'Unable to retrieve stock quote.';

      case 'getCryptoPrice':
        if (data.symbol) {
          const changeSymbol = data.change24h >= 0 ? '+' : '';
          return `${data.name} (${data.symbol}) is currently at $${data.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}, ${changeSymbol}${data.changePercent24h.toFixed(2)}% in the last 24 hours. Market cap: $${(data.marketCap / 1000000000).toFixed(2)}B. 24h volume: $${(data.volume24h / 1000000000).toFixed(2)}B.`;
        }
        return 'Unable to retrieve cryptocurrency price.';

      case 'analyzePortfolio':
        if (data.holdings) {
          const gainSymbol = data.totalGainLoss >= 0 ? '+' : '';
          let response = `Your portfolio is worth $${data.totalValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} with a total ${gainSymbol}$${Math.abs(data.totalGainLoss).toFixed(2)} (${gainSymbol}${data.totalGainLossPercent.toFixed(2)}%) gain/loss. `;
          response += `Asset allocation: ${data.assetAllocation.stocks.toFixed(1)}% stocks, ${data.assetAllocation.crypto.toFixed(1)}% crypto. `;
          
          if (data.topPerformers && data.topPerformers.length > 0) {
            const top = data.topPerformers[0];
            response += `Top performer: ${top.symbol} at +${top.gainLossPercent.toFixed(2)}%.`;
          }
          
          return response;
        }
        return 'Unable to analyze portfolio.';

      case 'getMarketNews':
        if (data.articles && data.articles.length > 0) {
          const newsList = data.articles.map((article: any, i: number) => 
            `${i + 1}. "${article.title}" from ${article.source} (${article.sentiment})`
          ).join('. ');
          return `Here are the latest market news headlines: ${newsList}`;
        }
        return 'No market news available at the moment.';

      case 'analyzeSpending':
        if (data.breakdown) {
          let response = `You've spent $${data.totalSpent.toFixed(2)} in the analyzed period. `;
          response += `Top categories: ${data.breakdown.slice(0, 3).map((c: any) => `${c.category} ($${c.amount.toFixed(2)})`).join(', ')}. `;
          
          if (data.trends && data.trends.vsLastPeriod !== undefined) {
            const trendWord = data.trends.vsLastPeriod > 0 ? 'up' : 'down';
            response += `Spending is ${trendWord} ${Math.abs(data.trends.vsLastPeriod).toFixed(1)}% compared to the previous period.`;
          }
          
          return response;
        }
        return 'Unable to analyze spending.';

      case 'createBudget':
        if (data.message) {
          return data.message;
        }
        return 'Budget created successfully.';

      case 'getAccountBalance':
        if (data.accounts) {
          const totalBalance = data.accounts.reduce((sum: number, acc: any) => sum + acc.balance, 0);
          let response = `Total across all accounts: $${totalBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}. `;
          response += data.accounts.map((acc: any) => 
            `${acc.name}: $${acc.balance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
          ).join(', ');
          return response;
        }
        return 'Unable to retrieve account balance.';

      case 'getTransactions':
        if (data.transactions && data.transactions.length > 0) {
          const txList = data.transactions.slice(0, 5).map((tx: any) => {
            const amountStr = tx.amount < 0 ? `-$${Math.abs(tx.amount).toFixed(2)}` : `+$${tx.amount.toFixed(2)}`;
            return `${tx.description} (${amountStr})`;
          }).join(', ');
          return `Found ${data.count} recent transactions. Recent ones: ${txList}. Total debits: $${data.totalDebits.toFixed(2)}, credits: $${data.totalCredits.toFixed(2)}.`;
        }
        return 'No recent transactions found.';

      default:
        return JSON.stringify(data, null, 2);
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

  private analyzeFinancialContext(text: string, speaker: 'user' | 'ai'): { type: MemoryType; importance: number; tags: string[] } {
    const lowerText = text.toLowerCase();
    const tags: string[] = [];
    
    const goalKeywords = ['goal', 'target', 'save for', 'retirement', 'house', 'college', 'education fund', 'emergency fund', 'nest egg'];
    const preferenceKeywords = ['risk tolerance', 'aggressive', 'conservative', 'moderate', 'diversif', 'invest in', 'prefer', 'strategy', 'allocation'];
    const transactionKeywords = ['bought', 'sold', 'purchase', 'transaction', 'spent', 'withdraw', 'deposit', 'transfer'];
    const insightKeywords = ['recommend', 'suggest', 'analysis', 'performance', 'projection', 'forecast', 'advise', 'you should', 'you might', 'you could', 'i recommend'];
    
    const hasGoal = goalKeywords.some(kw => lowerText.includes(kw));
    const hasPreference = preferenceKeywords.some(kw => lowerText.includes(kw));
    const hasTransaction = transactionKeywords.some(kw => lowerText.includes(kw));
    const hasInsight = insightKeywords.some(kw => lowerText.includes(kw));
    
    const isQuestion = lowerText.includes('?') || lowerText.startsWith('should i') || lowerText.startsWith('can i') || lowerText.startsWith('how do i') || lowerText.startsWith('what should') || lowerText.includes('should i ');
    
    if (lowerText.includes('risk tolerance') || lowerText.includes('conservative') || lowerText.includes('aggressive')) {
      tags.push('risk_profile');
    }
    if (lowerText.includes('retirement')) tags.push('retirement_planning');
    if (lowerText.includes('tax')) tags.push('tax_planning');
    if (lowerText.includes('budget')) tags.push('budgeting');
    if (lowerText.includes('stock') || lowerText.includes('etf') || lowerText.includes('fund')) tags.push('equities');
    if (lowerText.includes('crypto') || lowerText.includes('bitcoin') || lowerText.includes('ethereum')) tags.push('cryptocurrency');
    if (lowerText.includes('bond')) tags.push('fixed_income');
    
    if (speaker === 'user') {
      if (hasGoal) {
        return { type: 'financial_goal', importance: 9, tags: [...tags, 'goal'] };
      } else if (hasPreference) {
        return { type: 'financial_preference', importance: 8, tags: [...tags, 'preference'] };
      } else if (hasTransaction) {
        return { type: 'financial_transaction', importance: 7, tags: [...tags, 'transaction'] };
      } else {
        return { type: 'conversation', importance: 5, tags };
      }
    } else {
      if (hasGoal && !hasInsight && !isQuestion) {
        return { type: 'financial_goal', importance: 9, tags: [...tags, 'goal'] };
      } else if (hasPreference && !hasInsight) {
        return { type: 'financial_preference', importance: 8, tags: [...tags, 'preference'] };
      } else if (hasTransaction) {
        return { type: 'financial_transaction', importance: 7, tags: [...tags, 'transaction'] };
      } else if (hasInsight) {
        return { type: 'financial_insight', importance: 6, tags: [...tags, 'insight'] };
      } else {
        return { type: 'conversation', importance: 5, tags };
      }
    }
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
        slot: this.dualModeEnabled && speaker === 'ai' ? 'primary' : undefined,
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
          
          let memoryType: MemoryType = 'conversation';
          let importance = 5;
          let additionalMetadata: Record<string, any> = {};
          
          if (this.activePersoni.name === 'BILLY') {
            const financialContext = this.analyzeFinancialContext(text, 'ai');
            memoryType = financialContext.type;
            importance = financialContext.importance;
            if (financialContext.tags.length > 0) {
              additionalMetadata.tags = financialContext.tags;
            }
            console.log(`[RAG] 💰 Financial context detected in response: type=${memoryType}, importance=${importance}, tags=${financialContext.tags.join(', ')}`);
          }
          
          await ragMemoryManager.addMemory(
            text,
            this.activePersoni.name,
            memoryType,
            this.activePersoni.name,
            importance,
            additionalMetadata
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
            this.speakText(text, 'ai');
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

  private initializeVoiceCommands() {
    voiceCommandSystem.startListening((action, params) => {
      console.log('[VoiceCommand] Executing:', action, params);
      
      // PersonI switching
      if (action === 'switch_personi' && params.personiName) {
        const target = this.personis.find(p => p.name.toLowerCase() === params.personiName.toLowerCase());
        if (target) {
          this.requestPersoniSwitch(target);
        } else {
          this.speakText(`I don't recognize a PersonI named ${params.personiName}`);
        }
      }
      
      // Camera controls
      if (action === 'toggle_camera') {
        if (params.state !== undefined) {
          this.cameraEnabled = params.state;
        } else {
          this.cameraEnabled = !this.cameraEnabled;
        }
        this.speakText(`Camera ${this.cameraEnabled ? 'enabled' : 'disabled'}`);
      }
      if (action === 'toggle_preview') {
        if (params.state !== undefined) {
          this.cameraShowPreview = params.state;
        } else {
          this.cameraShowPreview = !this.cameraShowPreview;
        }
        this.speakText(`Preview ${this.cameraShowPreview ? 'visible' : 'hidden'}`);
      }
      
      // Object detection
      if (action === 'toggle_detection') {
        this.objectDetectionEnabled = !this.objectDetectionEnabled;
        if (this.objectDetectionEnabled) {
          this.startObjectDetection();
          this.speakText('Starting object detection');
        } else {
          this.stopObjectDetection();
          this.speakText('Stopping object detection');
        }
      }
      
      // Panel management
      if (action === 'open_panel' && params.panelName) {
        const panelMap: Record<string, ActiveSidePanel> = {
          'notes': 'notes',
          'tasks': 'tasks',
          'memory': 'memory',
          'settings': 'models',
          'financial': 'personis', // Financial is shown when BILLY is active
          'routines': 'routines',
          'profile': 'userProfile'
        };
        const panel = panelMap[params.panelName];
        if (panel) {
          this.activeSidePanel = panel;
          this.speakText(`Opening ${params.panelName} panel`);
        }
      }
      if (action === 'close_panels') {
        this.activeSidePanel = 'none';
        this.speakText('Closing panels');
      }
      
      // RAG memory
      if (action === 'toggle_rag') {
        if (params.state !== undefined) {
          this.ragEnabled = params.state;
        } else {
          this.ragEnabled = !this.ragEnabled;
        }
        this.speakText(`Memory context ${this.ragEnabled ? 'enabled' : 'disabled'}`);
      }
      
      // Volume control
      if (action === 'adjust_volume') {
        if (params.direction === 'up') {
          this.outputNode.gain.value = Math.min(1, this.outputNode.gain.value + 0.1);
        } else if (params.direction === 'down') {
          this.outputNode.gain.value = Math.max(0, this.outputNode.gain.value - 0.1);
        }
      }
      
      // Vision requests
      if (action === 'analyze_vision') {
        if (this.cameraManager && this.activePersoni?.capabilities?.vision) {
          const frame = this.cameraManager.captureFrame();
          if (frame) {
            this.processVisionRequest(frame);
          }
        }
      }
      
      // Photo capture
      if (action === 'take_photo') {
        if (this.cameraManager) {
          const frame = this.cameraManager.captureFrame();
          if (frame) {
            this.speakText('Photo captured!');
            // Could trigger download or storage
          }
        }
      }
      
      // Audio recording is handled via voice activity detection automatically
      // Voice commands can trigger manual captures if needed
      
      // Notes and tasks
      if (action === 'create_note' && params.content) {
        this.activeSidePanel = 'notes';
        // Note creation would be handled by the notes panel
      }
      if (action === 'create_task' && params.content) {
        this.activeSidePanel = 'tasks';
        // Task creation would be handled by the tasks panel
      }
      
      // Song identification (automatic - no public API to trigger manually)
      if (action === 'identify_song') {
        this.speakText('Song identification runs automatically when I detect music playing. Just let me listen for a few seconds.');
      }
      
      // Routine execution
      if (action === 'execute_routine' && params.routineName) {
        routineExecutor.getRoutines().then(routines => {
          const routine = routines.find(r => 
            r.name.toLowerCase() === params.routineName.toLowerCase()
          );
          if (routine) {
            routineExecutor.executeRoutine(routine.id, true);
            this.speakText(`Executing routine: ${routine.name}`);
          } else {
            this.speakText(`I couldn't find a routine named ${params.routineName}`);
          }
        });
      }
      
      // Mute toggle
      if (action === 'toggle_mute') {
        this.toggleMute();
      }
      
      // Calendar
      if (action === 'open_calendar') {
        this.showCalendar = !this.showCalendar;
      }
      
      // Financial dashboard
      if (action === 'open_financial') {
        this.showFinancialDashboard = !this.showFinancialDashboard;
      }
    });
    
    console.log('[VoiceCommands] System initialized with command handlers');
  }

  private async processVisionRequest(frame: any) {
    if (!this.activePersoni?.capabilities?.vision) return;
    
    const provider = this.getProviderForPersoni(this.activePersoni);
    if (!provider) return;
    
    try {
      const analysisPrompt = `Analyze this image and describe what you see in detail.`;
      const messages = [
        { role: 'system' as const, content: 'You are a helpful visual assistant.' },
        { role: 'user' as const, content: [
          { type: 'text' as const, text: analysisPrompt },
          { type: 'image' as const, data: frame.dataUrl }
        ]}
      ];
      const analysis = await provider.sendMessage(messages);
      await this.speakText(analysis);
    } catch (error) {
      console.error('[Vision] Analysis failed:', error);
    }
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
        slot: this.dualModeEnabled ? 'primary' : undefined,
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
      activePersonasManager.setPersona('primary', this.editingPersoni);
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
      activePersonasManager.setPersona('primary', this.activePersoni);
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

  private getVerifiedConnectors(): Connector[] {
    try {
      const configsJson = localStorage.getItem('connectorConfigs');
      if (!configsJson) return [];
      
      const configs = JSON.parse(configsJson);
      const verifiedIds = configs
        .filter((c: any) => c.verified)
        .map((c: any) => c.id);
      
      return AVAILABLE_CONNECTORS.filter(conn => verifiedIds.includes(conn.id));
    } catch (error) {
      console.error('[PersonI] Failed to load verified connectors:', error);
      return AVAILABLE_CONNECTORS; // Fallback to all connectors if there's an error
    }
  }

  private getConnectorStatusIndicator(connectorId: string): string {
    const connectorIntegrationMap: Record<string, string> = {
      'gmail': 'Google Mail',
      'google_calendar': 'Google Calendar',
      'google_drive': 'Google Drive',
      'google_docs': 'Google Docs',
      'google_sheets': 'Google Sheets',
      'github': 'GitHub',
      'notion': 'Notion',
      'linear': 'Linear',
      'slack': 'Slack',
      'jira': 'Jira',
      'asana': 'Asana',
      'confluence': 'Confluence',
      'hubspot': 'HubSpot',
      'youtube': 'YouTube',
      'dropbox': 'Dropbox',
      'box': 'Box',
      'onedrive': 'OneDrive',
      'sharepoint': 'SharePoint',
      'discord': 'Discord',
      'spotify': 'Spotify',
      'outlook': 'Outlook',
      'twilio': 'Twilio',
      'sendgrid': 'SendGrid',
      'resend': 'Resend',
    };
    
    const implementedConnectors = ['gmail', 'google_calendar', 'notion', 'linear', 'slack', 'github'];
    
    if (implementedConnectors.includes(connectorId)) {
      return '✓';
    } else {
      return '⚠';
    }
  }

  private renderConnectorsPanel() {
    return html`
      ${this.activeSidePanel === 'connectorConfig' ? html`
        <div class="side-panel visible">
          <div class="panel-header">
            <span>Connector Configuration</span>
            <button @click=${this.closeSidePanel}>&times;</button>
          </div>
          <connector-config-panel></connector-config-panel>
        </div>
      ` : ''}
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
      
      <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid rgba(255, 255, 255, 0.2);">
        <h3>Dual PersonI Mode (Beta)</h3>
        <div class="form-group">
          <label class="form-group-inline">
            <input
              type="checkbox"
              .checked=${this.dualModeEnabled}
              @change=${(e: Event) => {
                this.dualModeEnabled = (e.target as HTMLInputElement).checked;
                this.saveDualModeSettings();
                if (!this.dualModeEnabled) {
                  activePersonasManager.setPersona('secondary', null);
                  this.secondaryPersoni = null;
                } else if (this.secondaryPersoni) {
                  activePersonasManager.setPersona('secondary', this.secondaryPersoni);
                }
                this.requestUpdate();
              }}
            />
            <span>Enable Dual PersonI Mode</span>
          </label>
          <p style="font-size: 12px; opacity: 0.7; margin-top: 8px;">
            Run two PersonI simultaneously for collaborative conversations
          </p>
        </div>
        
        ${this.dualModeEnabled ? html`
          <div class="form-group" style="margin-top: 16px;">
            <label>Primary PersonI</label>
            <select
              .value=${this.activePersoni?.id || ''}
              @change=${(e: Event) => {
                const personiId = (e.target as HTMLSelectElement).value;
                const personi = this.personis.find(p => p.id === personiId);
                if (personi) {
                  this.activePersoni = personi;
                  activePersonasManager.setPersona('primary', personi);
                  this.requestUpdate();
                }
              }}>
              ${this.personis.map(p => html`
                <option value=${p.id} ?selected=${this.activePersoni?.id === p.id}>
                  ${p.name}
                </option>
              `)}
            </select>
          </div>
          
          <div class="form-group" style="margin-top: 16px;">
            <label>Secondary PersonI</label>
            <select
              .value=${this.secondaryPersoni?.id || ''}
              @change=${(e: Event) => {
                const personiId = (e.target as HTMLSelectElement).value;
                const personi = this.personis.find(p => p.id === personiId);
                if (personi) {
                  this.secondaryPersoni = personi;
                  activePersonasManager.setPersona('secondary', personi);
                  this.saveDualModeSettings();
                  this.requestUpdate();
                }
              }}>
              <option value="">None</option>
              ${this.personis.filter(p => p.id !== this.activePersoni?.id).map(p => html`
                <option value=${p.id} ?selected=${this.secondaryPersoni?.id === p.id}>
                  ${p.name}
                </option>
              `)}
            </select>
          </div>
          
          ${this.currentSpeakerSlot ? html`
            <div style="margin-top: 16px; padding: 12px; background: rgba(135, 206, 250, 0.2); border-radius: 4px; border: 1px solid rgba(135, 206, 250, 0.4);">
              <div style="font-size: 12px; opacity: 0.8;">Currently Speaking:</div>
              <div style="font-weight: bold; margin-top: 4px;">
                ${this.currentSpeakerSlot === 'primary' 
                  ? this.activePersoni?.name 
                  : this.secondaryPersoni?.name} 
                (${this.currentSpeakerSlot})
              </div>
            </div>
          ` : ''}
        ` : ''}
      </div>
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
        <p style="font-size: 12px; opacity: 0.7; margin-bottom: 8px;">
          Select which verified connectors this PersonI can use during conversations.
          ${this.getVerifiedConnectors().length === 0 ? html`
            <br/><span style="color: #FFA726;">⚠️ No verified connectors. Configure connectors in the Connector Configuration panel.</span>
          ` : ''}
        </p>
        <div class="capabilities-grid">
          ${this.getVerifiedConnectors().map(
            (c) => html`
              <div class="capability-item">
                <input
                  type="checkbox"
                  id="conn-${c.id}"
                  .checked=${this.editingPersoni?.enabledConnectors?.includes(
                    c.id,
                  )}
                  @change=${(e: Event) => handleCapabilityToggle(e, c.id)} />
                <label for="conn-${c.id}">✅ ${c.name}</label>
              </div>
            `,
          )}
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
          class="settings-fab ${this.settingsButtonVisible ? 'visible' : ''} ${this.isDraggingFab ? 'dragging' : ''}"
          style="left: ${this.fabPosition.x}px; top: ${this.fabPosition.y}px;"
          @mousedown=${this.handleFabMouseDown}>
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

        <div 
          class="settings-menu ${this.settingsMenuVisible ? 'open' : ''}"
          style="left: ${this.fabPosition.x}px; top: ${this.fabPosition.y}px;">
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
            title="Connectors - Configure API credentials for external services"
            aria-label="Connectors Configuration"
            role="button"
            tabindex="0"
            @click=${() => this.openSidePanel('connectorConfig')}
            @keydown=${(e: KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.openSidePanel('connectorConfig');
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
          <div
            class="menu-item group-productivity"
            title="Routines - Create and manage automation routines"
            aria-label="Routines Manager"
            role="button"
            tabindex="0"
            @click=${() => this.openSidePanel('routines')}
            @keydown=${(e: KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.openSidePanel('routines');
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
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"></path>
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
        ${this.activeSidePanel === 'routines' ? html`
          <div class="side-panel visible">
            <div class="panel-header">
              <span>Routines</span>
              <button @click=${this.closeSidePanel}>&times;</button>
            </div>
            <routines-panel></routines-panel>
          </div>
        ` : ''}

        <!-- Music Detection Indicator -->
        <div class="music-indicator ${this.isMusicDetected && this.musicDetectionEnabled ? 'visible' : ''}">
          <span class="music-indicator-icon">🎵</span>
          <span>Music Detected</span>
          ${this.musicBpm > 0 ? html`<span>${Math.round(this.musicBpm)} BPM</span>` : ''}
          <span>${Math.round(this.musicConfidence * 100)}%</span>
        </div>

        <!-- Song Identification Bubble -->
        <song-info-bubble
          .songInfo=${this.currentSongInfo}
          .lyricsInfo=${this.currentLyrics}
          .visible=${this.showSongBubble && this.songIdentificationEnabled}
          .showLyrics=${songIdentificationService.getConfig().fetchLyrics}
          .playbackTime=${this.musicStartTime > 0 ? (Date.now() - this.musicStartTime) / 1000 : 0}
          @close=${this.handleCloseSongBubble}
        ></song-info-bubble>

        <!-- RAG Memory Toggle -->
        <rag-toggle
          .enabled=${this.ragEnabled}
          .initialized=${this.ragInitialized}
          .lastRetrievedCount=${this.lastRetrievedMemories}
          @rag-toggle=${this.handleRAGToggle}
        ></rag-toggle>

        <!-- Camera Controls -->
        <camera-controls
          .hasPermission=${this.cameraHasPermission}
          .isActive=${this.cameraEnabled}
          .showPreview=${this.cameraShowPreview}
          .error=${this.cameraError}
          @toggle-camera=${this.handleToggleCameraControl}
          @toggle-preview=${this.handleToggleCameraPreview}
        ></camera-controls>

        <!-- Camera Manager -->
        <camera-manager
          .enabled=${this.cameraEnabled}
          .showPreview=${this.cameraShowPreview}
          @permissions-granted=${this.handleCameraPermissions}
          @permissions-denied=${this.handleCameraPermissionsDenied}
        ></camera-manager>

        <!-- Object Detection Overlay -->
        <object-detection-overlay
          .enabled=${this.objectDetectionEnabled}
          @toggle-detection=${this.handleToggleObjectDetection}
        ></object-detection-overlay>

        <!-- File Upload -->
        <file-upload
          @file-uploaded=${this.handleFileUploaded}
        ></file-upload>

        <!-- Financial Dashboard -->
        <financial-dashboard
          .visible=${this.showFinancialDashboard}
          @close=${() => this.showFinancialDashboard = false}
        ></financial-dashboard>

        <!-- Financial Dashboard Toggle Button -->
        ${this.activePersoni?.name === 'BILLY' ? html`
          <button
            class="financial-dashboard-toggle"
            @click=${() => this.showFinancialDashboard = !this.showFinancialDashboard}
            title="Toggle Financial Dashboard"
          >
            💰
          </button>
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