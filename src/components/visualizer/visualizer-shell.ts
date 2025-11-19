/**
 * Visualizer Shell Component
 * 
 * Main container for Codrops-inspired 3D audio visualizer
 * Manages GSAP animations, Twilio panels, and audio-reactive visuals
 */

import { LitElement, html, css } from 'lit';
import { customElement, state, query } from 'lit/decorators.js';
import { gsap } from 'gsap';
import { Draggable } from 'gsap/Draggable';
import { providerManager } from '../../services/provider-manager';
import { getSharedMicrophone } from '../../utils';
import { Analyser } from '../../analyser';
import { appStateService, type ActiveSidePanel } from '../../services/app-state-service';
import { personaTemplates, DEFAULT_CAPABILITIES, type PersoniConfig } from '../../personas';
import { activePersonasManager } from '../../services/active-personas-manager';
import { dualPersonIManager } from '../../services/dual-personi-manager';
import type { MenuItem } from './settings-menu';
import './visualizer-3d';
import './visualizer-controls';
import './circular-menu-wheel';
import './settings-dock';
import './dual-mode-controls-hud';
import '../models-panel';
import '../user-profile-panel';
import '../notes-panel';
import '../tasks-panel';
import '../memory-panel';
import '../routines-panel';
import '../plugin-manager-panel';
import '../connector-config-panel';
import '../chatterbox-settings';
import '../personi-settings-panel';
import '../camera-controls';
import '../camera-manager';
import './camera-circular-menu';
import './camera-preview-box';
import './device-settings-panel';
import './personi-carousel';
import '../background-manager';
import './rag-settings-menu';
import '../object-detection-overlay';
import '../file-upload';
import '../simple-input-controls';
import { ragMemoryManager } from '../../services/memory/rag-memory-manager';
import { conversationOrchestrator } from '../../services/conversation-orchestrator';
import { speechOutputService } from '../../services/speech-output-service';
import { voiceInputService } from '../../services/voice-input-service';
import { cameraVisionService } from '../../services/camera-vision-service';
import { visionModelService } from '../../services/vision-model-service';
import { storageQuotaManager } from '../../services/storage-quota-manager';

// Register GSAP plugins
gsap.registerPlugin(Draggable);

// Import shared localStorage keys
import { PERSONIS_KEY } from '../../constants/storage.js';

@customElement('visualizer-shell')
export class VisualizerShell extends LitElement {
  @state() private audioContext: AudioContext | null = null;
  @state() private outputNode: GainNode | null = null;
  @state() private inputNode: GainNode | null = null;
  
  // Panel management
  @state() private activeSidePanel: ActiveSidePanel = 'none';
  @state() private settingsMenuVisible = false;
  @state() private fabPosition = { x: 0, y: 0 };
  
  // Twilio panels (Phase 4)
  @state() showTwilioSettings = false;
  @state() showSMSPanel = false;
  @state() showVoicePanel = false;
  
  // UI control state (from index.tsx)
  @state() isMuted = false;
  @state() isSpeaking = false;
  @state() isAiSpeaking = false;
  @state() inputMode: 'voice' | 'text' = 'voice';
  @state() textInput = '';
  @state() status = 'Initializing...';
  @state() providerStatus: 'configured' | 'missing' | 'unconfigured' = 'unconfigured';
  
  // Camera state
  @state() private cameraEnabled = false;
  @state() private cameraShowPreview = false;
  @state() private cameraHasPermission = false;
  @state() private cameraError: string | null = null;
  @state() private cameraStream: MediaStream | null = null;
  
  // RAG state
  @state() private ragEnabled = true;
  @state() private ragInitialized = false;
  @state() private lastRetrievedMemories = 0;
  
  // Object detection state
  @state() private objectDetectionEnabled = false;

  @query('visualizer-3d') private visualizer3d!: any;
  @query('settings-fab') private settingsFab!: any;
  @query('camera-manager') private cameraManager!: any;
  @query('background-manager') private backgroundManager!: any;
  @query('object-detection-overlay') private objectDetectionOverlay!: any;
  
  private outputAnalyser: Analyser | null = null;
  private inputAnalyser: Analyser | null = null;
  private unsubscribeAppState: (() => void) | null = null;

  static styles = css`
    :host {
      display: block;
      position: fixed;
      inset: 0;
      width: 100%;
      height: 100%;
      background: radial-gradient(ellipse at center, #0a0e27 0%, #000000 100%);
      overflow: hidden;
    }

    .visualizer-container {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10; /* Match visualizer-3d z-index */
      pointer-events: none; /* Allow clicks through to camera/controls */
    }

    .visualizer-container > * {
      pointer-events: auto; /* Re-enable events for visualizer content */
    }

    .intro-overlay {
      position: fixed;
      inset: 0;
      background: #000;
      z-index: 999;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
    }

    .intro-text {
      font-family: 'Segoe UI', sans-serif;
      font-size: 48px;
      font-weight: 300;
      color: rgba(255, 255, 255, 0);
      letter-spacing: 8px;
      text-transform: uppercase;
    }

    /* Panels will be absolutely positioned by GSAP Draggable */
    .panel {
      position: absolute;
      z-index: 100;
    }

    /* Hidden by default, shown via controls */
    .hidden {
      display: none;
    }
  `;

  // Event handlers for UI controls
  private toggleMute = async () => {
    // Toggle voice recording with Whisper STT
    try {
      await voiceInputService.toggleRecording();
    } catch (error) {
      console.error('[VisualizerShell] Voice recording error:', error);
      this.status = 'Voice input error';
    }
  };

  private handleInterrupt = () => {
    this.isAiSpeaking = false;
    speechOutputService.stopAll();
  };

  private handleVoiceInputToggle = async () => {
    console.log('[VisualizerShell] 🎤 Voice input toggle triggered');
    try {
      await voiceInputService.toggleRecording();
    } catch (error) {
      console.error('[VisualizerShell] Voice recording error:', error);
      this.status = error instanceof Error ? error.message : 'Voice input error';
      setTimeout(() => this.status = 'Ready', 3000);
    }
  };

  private handleTextInputSubmit = async (e: CustomEvent) => {
    const text = e.detail.text;
    console.log('[VisualizerShell] 📤 Text input submitted:', text);
    
    if (!text || !text.trim()) {
      return;
    }

    try {
      this.status = 'Thinking...';
      this.isAiSpeaking = true;

      const activePersona = conversationOrchestrator.getActivePersona();
      
      await conversationOrchestrator.handleUserInput(
        text,
        {},
        async (chunk) => {
          if (chunk.text) {
            console.log('[VisualizerShell] Response chunk:', chunk.text);
          }
        }
      );

      this.isAiSpeaking = false;
      this.status = 'Ready';
    } catch (error) {
      console.error('[VisualizerShell] Text input error:', error);
      this.status = error instanceof Error ? error.message : 'Error processing input';
      this.isAiSpeaking = false;
      setTimeout(() => this.status = 'Ready', 3000);
    }
  };

  private handleTextSubmit = async (e: CustomEvent) => {
    const text = e.detail.text;
    console.log('[VisualizerShell] Text submitted:', text);
    
    if (!text || !text.trim()) return;

    try {
      this.status = 'Processing...';
      
      // Disable RAG if not initialized (race condition guard)
      const ragEnabledForRequest = this.ragEnabled && this.ragInitialized;
      if (this.ragEnabled && !this.ragInitialized) {
        console.warn('[VisualizerShell] RAG requested but not initialized, disabling for this request');
      }
      
      // Send to ConversationOrchestrator with streaming
      let fullResponse = '';
      await conversationOrchestrator.handleUserInput(
        text,
        {
          ragEnabled: ragEnabledForRequest,
          enableTools: true,
        },
        (chunk) => {
          fullResponse += chunk.text;
          // Update UI with streaming text if needed
          console.log('[VisualizerShell] Streaming chunk:', chunk.text);
        }
      );

      // Speak the response
      this.isAiSpeaking = true;
      const activePersona = conversationOrchestrator.getActivePersona();
      const provider = activePersona
        ? providerManager.getProviderInstance(activePersona.thinkingModel)
        : null;

      await speechOutputService.speak(fullResponse, provider, activePersona);
      this.isAiSpeaking = false;
      
      this.status = 'Ready';
    } catch (error) {
      console.error('[VisualizerShell] Error processing input:', error);
      this.status = 'Error';
      this.isAiSpeaking = false;
    }
  };

  private handleFileUploaded = async (e: CustomEvent) => {
    console.log('[VisualizerShell] File uploaded:', e.detail);
    
    const uploadedFile = e.detail.file;
    
    // Check if it's an image file
    if (uploadedFile.type.startsWith('image/')) {
      try {
        this.status = 'Analyzing image...';
        console.log('[VisualizerShell] Analyzing uploaded image:', uploadedFile.name);
        
        // Get active PersonI to determine which vision model to use
        const activePersoni = conversationOrchestrator.getActivePersona();
        
        // Try vision model service first (for local models)
        let analysis = '';
        try {
          const result = await visionModelService.analyzeImage({
            imageDataUrl: uploadedFile.data as string,
            prompt: `Analyze this image in detail. Describe what you see, including objects, people, text, colors, and any notable features.`
          });
          analysis = result.text; // visionModelService returns { text, model, timestamp }
          console.log('[VisualizerShell] Local vision analysis:', analysis.substring(0, 100) + '...');
        } catch (visionError: any) {
          // Fallback: If vision model service fails, try using the main LLM provider with vision capability
          console.log('[VisualizerShell] Local vision model unavailable, trying provider vision...');
          
          if (activePersoni?.capabilities?.vision) {
            // Send to conversation orchestrator with vision data
            // Collect all streaming chunks before continuing
            const chunks: string[] = [];
            await conversationOrchestrator.handleUserInput(
              `I've uploaded an image (${uploadedFile.name}). Please analyze it.`,
              {
                visionData: {
                  image: (uploadedFile.data as string).split(',')[1], // Remove data URL prefix
                  mimeType: uploadedFile.type
                },
                enableTools: false
              },
              (chunk) => {
                if (chunk.text) {
                  chunks.push(chunk.text);
                }
                console.log('[VisualizerShell] Vision analysis chunk:', chunk.text);
              }
            );
            // Wait for streaming to complete, then join all chunks
            analysis = chunks.join('');
            console.log('[VisualizerShell] Provider vision analysis complete:', analysis.substring(0, 100) + '...');
          } else {
            throw new Error('No vision capability available. Configure a vision model in Settings → Vision or use a PersonI with vision capability.');
          }
        }
        
        if (analysis) {
          // Store analysis in RAG memory
          if (this.ragEnabled && this.ragInitialized) {
            const activePersoni = conversationOrchestrator.getActivePersona();
            await ragMemoryManager.addMemory(
              `Image Analysis of ${uploadedFile.name}: ${analysis}`,
              'user',
              'observation',
              activePersoni?.name || 'unknown',
              7, // High importance for image analysis
              {
                imageFile: uploadedFile.name,
                imageType: uploadedFile.type,
                analysisTimestamp: Date.now()
              }
            );
          }
          
          // Speak the analysis
          this.isAiSpeaking = true;
          const provider = activePersoni
            ? providerManager.getProviderInstance(activePersoni.thinkingModel)
            : null;
          
          await speechOutputService.speak(analysis, provider, activePersoni);
          this.isAiSpeaking = false;
          
          console.log('[VisualizerShell] ✓ Image analysis complete:', analysis.substring(0, 100) + '...');
        }
        
        this.status = 'Ready';
      } catch (error) {
        console.error('[VisualizerShell] Image analysis failed:', error);
        this.status = error instanceof Error ? error.message : 'Image analysis failed';
        
        // Auto-reset status after 3 seconds
        setTimeout(() => {
          if (this.status.includes('failed') || this.status.includes('unavailable')) {
            this.status = 'Ready';
          }
        }, 3000);
      }
    } else {
      // For non-image files, just log for now
      console.log('[VisualizerShell] Non-image file uploaded:', uploadedFile.name, uploadedFile.type);
    }
  };

  private handleToggleCameraControl = () => {
    this.cameraEnabled = !this.cameraEnabled;
    if (this.cameraEnabled) {
      this.cameraShowPreview = true;
    }
  };

  private handleToggleCameraPreview = () => {
    this.cameraShowPreview = !this.cameraShowPreview;
  };

  private handleSwitchCamera = () => {
    if (this.cameraManager) {
      (this.cameraManager as any).switchCamera?.();
    }
  };

  private handleCameraSnapshot = async () => {
    if (!this.cameraManager) return;

    try {
      // Capture frame from camera
      const frame = (this.cameraManager as any).captureFrame?.();
      if (!frame || !frame.dataUrl) {
        console.error('[VisualizerShell] Failed to capture snapshot');
        return;
      }

      console.log('[VisualizerShell] Snapshot captured, analyzing with Gemini Vision...');

      // Download the image
      const link = document.createElement('a');
      link.href = frame.dataUrl;
      link.download = `snapshot-${Date.now()}.jpg`;
      link.click();

      // Analyze with Gemini Vision
      const analysisPrompt = 'Analyze this image in detail. Describe what you see, identify any objects, people, text, or notable features. Provide a comprehensive description.';
      
      const analysisResult = await providerManager.processImageWithPrompt(
        frame.dataUrl,
        analysisPrompt
      );

      if (analysisResult) {
        console.log('[VisualizerShell] Gemini Vision analysis:', analysisResult);

        // Store snapshot and analysis in RAG
        await ragMemoryManager.storeMemory({
          content: `Camera Snapshot Analysis: ${analysisResult}`,
          type: 'vision_observation',
          metadata: {
            imageDataUrl: frame.dataUrl,
            timestamp: frame.timestamp,
            dimensions: `${frame.width}x${frame.height}`,
            source: 'camera_snapshot'
          }
        });

        console.log('[VisualizerShell] ✅ Snapshot saved, analyzed, and stored in RAG');
      }
    } catch (err) {
      console.error('[VisualizerShell] Snapshot processing failed:', err);
    }
  };

  private handleCameraPermissions = () => {
    this.cameraHasPermission = true;
    this.cameraError = null;
    this.updateCameraStream();
  };

  private updateCameraStream = () => {
    if (this.cameraManager) {
      const stream = (this.cameraManager as any).mediaStream;
      if (stream) {
        this.cameraStream = stream;
        console.log('[VisualizerShell] Camera stream updated:', stream);
        this.requestUpdate(); // Force re-render to pass stream to background-manager
      }
    }
  };

  private handleCameraPermissionsDenied = () => {
    this.cameraHasPermission = false;
    this.cameraError = 'Camera permissions denied';
  };

  private handleRAGToggle = () => {
    this.ragEnabled = !this.ragEnabled;
    console.log('[VisualizerShell] RAG toggled:', this.ragEnabled ? 'ENABLED' : 'DISABLED');
  };

  private handleToggleObjectDetection = async () => {
    this.objectDetectionEnabled = !this.objectDetectionEnabled;
    console.log('[ObjectDetection] Toggled:', this.objectDetectionEnabled ? 'ENABLED' : 'DISABLED');
    
    if (this.objectDetectionEnabled) {
      await this.startObjectDetection();
    } else {
      this.stopObjectDetection();
    }
  };

  private async startObjectDetection() {
    if (!this.cameraManager?.videoElement) {
      console.warn('[ObjectDetection] No video element available');
      return;
    }

    try {
      const { objectRecognitionService } = await import('../../services/object-recognition');
      await objectRecognitionService.initialize();
      
      objectRecognitionService.startContinuousDetection(
        this.cameraManager.videoElement,
        async (result) => {
          if (this.objectDetectionOverlay) {
            const videoEl = this.cameraManager.videoElement;
            this.objectDetectionOverlay.videoWidth = videoEl.videoWidth;
            this.objectDetectionOverlay.videoHeight = videoEl.videoHeight;
            this.objectDetectionOverlay.updateDetections(result);
          }
          
          if (this.ragEnabled && this.ragInitialized && result.objects.length > 0) {
            const objectsList = result.objects
              .map(obj => `${obj.class} (${Math.round(obj.score * 100)}%)`)
              .join(', ');
            
            try {
              const activePersoni = appStateService.getActivePersoni();
              if (activePersoni) {
                await ragMemoryManager.addMemory(
                  `Detected objects in camera view: ${objectsList}`,
                  activePersoni.name,
                  'camera_observation',
                  activePersoni.name,
                  3,
                  { 
                    detectionTimestamp: result.timestamp,
                    fps: result.fps,
                    objectCount: result.objects.length
                  }
                );
              }
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

  private async stopObjectDetection() {
    const { objectRecognitionService } = await import('../../services/object-recognition');
    objectRecognitionService.stopContinuousDetection();
    
    if (this.objectDetectionOverlay) {
      this.objectDetectionOverlay.clearDetections();
    }
    
    console.log('[ObjectDetection] Stopped continuous detection');
  }

  /**
   * Get a ready video element with retry logic for camera initialization
   * Defaults to 10 retries × 500ms = 5s total wait time to cover observed 2.8-3.2s camera init
   */
  private async getReadyVideoElement(maxRetries: number = 10, delayMs: number = 500): Promise<HTMLVideoElement | null> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      // Try camera-manager first
      let videoElement: HTMLVideoElement | null = null;
      
      if (this.cameraManager) {
        videoElement = this.cameraManager.getVideoElement();
      }
      
      // Fallback to background-manager
      if (!videoElement && this.backgroundManager && this.backgroundManager.videoRef) {
        videoElement = this.backgroundManager.videoRef as HTMLVideoElement;
      }
      
      // Check if video is ready with data
      if (videoElement && videoElement.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
          videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
        console.log(`[VisionAnalysis] Video element ready after ${attempt + 1} attempt(s)`);
        return videoElement;
      }
      
      // Wait before retry (except on last attempt)
      if (attempt < maxRetries - 1) {
        console.log(`[VisionAnalysis] Video not ready, retry ${attempt + 1}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    console.warn('[VisionAnalysis] Video element not ready after retries');
    return null;
  }

  private async handleAnalyzeCameraView(prompt: string): Promise<void> {
    try {
      // Check if vision model is configured
      const activeConfig = visionModelService.getActiveConfig();
      if (!activeConfig) {
        console.warn('[VisionAnalysis] No active vision model configured');
        this.status = 'No vision AI model configured. Please configure in Vision settings.';
        setTimeout(() => { this.status = 'Ready'; }, 3000);
        return;
      }

      // Wait for video element to be ready (with retries - up to 5s total to cover 2.8-3.2s typical init)
      this.status = 'Waiting for camera...';
      const videoElement = await this.getReadyVideoElement(10, 500);
      
      if (!videoElement) {
        console.warn('[VisionAnalysis] Camera not available after waiting ~5s');
        this.status = 'Camera not ready. Please ensure camera is enabled and try again.';
        setTimeout(() => { this.status = 'Ready'; }, 3000);
        return;
      }

      console.log('[VisionAnalysis] Capturing frame and analyzing with prompt:', prompt);
      this.status = 'Analyzing camera view...';

      // Capture frame
      const imageDataUrl = visionModelService.captureFrameFromVideo(videoElement);

      // Analyze image
      const result = await visionModelService.analyzeImage({
        imageDataUrl,
        prompt,
        maxTokens: 256,
        temperature: 0.7
      });

      console.log('[VisionAnalysis] Analysis complete:', result.text);
      
      // Speak the vision analysis result via conversation orchestrator
      await conversationOrchestrator.handleUserInput(
        `[System: Vision AI Analysis] ${result.text}`,
        { ragEnabled: false, enableTools: false },
        (chunk) => {
          if (chunk.isComplete) {
            console.log('[VisionAnalysis] Response spoken');
          }
        }
      );

      this.status = 'Vision analysis complete';
      setTimeout(() => { this.status = 'Ready'; }, 2000);

    } catch (error) {
      console.error('[VisionAnalysis] Failed:', error);
      this.status = `Vision analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      setTimeout(() => { this.status = 'Ready'; }, 3000);
    }
  }

  /**
   * Register command event handlers for voice/text commands
   */
  private registerCommandHandlers(): void {
    // Camera control commands
    window.addEventListener('command-toggle-camera', ((event: CustomEvent) => {
      const { enabled } = event.detail;
      if (enabled !== undefined) {
        this.cameraEnabled = enabled;
      } else {
        this.cameraEnabled = !this.cameraEnabled;
      }
      console.log('[Command] Camera toggled:', this.cameraEnabled);
    }) as EventListener);

    window.addEventListener('command-toggle-camera-preview', ((event: CustomEvent) => {
      const { visible } = event.detail;
      if (visible !== undefined) {
        this.cameraShowPreview = visible;
      } else {
        this.cameraShowPreview = !this.cameraShowPreview;
      }
      console.log('[Command] Camera preview toggled:', this.cameraShowPreview);
    }) as EventListener);

    window.addEventListener('command-toggle-object-detection', ((event: CustomEvent) => {
      const { enabled } = event.detail;
      if (enabled !== undefined) {
        if (enabled && !this.objectDetectionEnabled) {
          this.handleToggleObjectDetection();
        } else if (!enabled && this.objectDetectionEnabled) {
          this.handleToggleObjectDetection();
        }
      } else {
        this.handleToggleObjectDetection();
      }
      console.log('[Command] Object detection toggled:', enabled);
    }) as EventListener);

    window.addEventListener('command-analyze-camera-view', ((event: CustomEvent) => {
      const { prompt } = event.detail;
      this.handleAnalyzeCameraView(prompt).catch(error => {
        console.error('[Command] Vision analysis failed:', error);
      });
    }) as EventListener);

    // PersonI management commands
    window.addEventListener('command-switch-personi', ((event: CustomEvent) => {
      const { personaName } = event.detail;
      const personis = appStateService.getState().personis;
      const personi = personis.find(p => p.name.toUpperCase() === personaName.toUpperCase());
      if (personi) {
        appStateService.setActivePersoni(personi);
        console.log('[Command] Switched to persona:', personaName);
      } else {
        console.warn('[Command] Persona not found:', personaName);
      }
    }) as EventListener);

    window.addEventListener('command-enable-dual-mode', ((event: CustomEvent) => {
      const { primary, secondary, mode } = event.detail;
      const personis = appStateService.getState().personis;
      const primaryPersona = personis.find(p => p.name.toUpperCase() === primary);
      const secondaryPersona = personis.find(p => p.name.toUpperCase() === secondary);
      
      if (primaryPersona && secondaryPersona) {
        appStateService.setActivePersoni(primaryPersona);
        appStateService.setSecondaryPersoni(secondaryPersona);
        appStateService.setDualModeEnabled(true);
        console.log('[Command] Dual mode enabled:', primary, '+', secondary, mode);
      } else {
        console.warn('[Command] Personas not found for dual mode:', primary, secondary);
      }
    }) as EventListener);

    // RAG toggle command
    window.addEventListener('command-toggle-rag', ((event: CustomEvent) => {
      const { enabled } = event.detail;
      if (enabled !== undefined) {
        this.ragEnabled = enabled;
      } else {
        this.ragEnabled = !this.ragEnabled;
      }
      console.log('[Command] RAG toggled:', this.ragEnabled);
    }) as EventListener);

    console.log('[VisualizerShell] Command handlers registered');
  }

  async connectedCallback(): Promise<void> {
    super.connectedCallback();
    await this.initializeAudioContext();
    await this.initializeDefaultPlugins();
    await this.initializeServices();
    this.loadPersonIs();
    this.playIntroAnimation();
    this.subscribeToAppState();
    this.registerCommandHandlers();
    
    console.log('[VisualizerShell] Initialized');
  }

  /**
   * Load default plugins on first app launch
   */
  private async initializeDefaultPlugins(): Promise<void> {
    try {
      const { defaultPluginsLoader } = await import('../../services/default-plugins-loader');
      await defaultPluginsLoader.loadDefaultPlugins();
    } catch (error) {
      console.error('[VisualizerShell] Failed to load default plugins:', error);
    }
  }

  async firstUpdated(changedProperties: Map<string, any>) {
    super.firstUpdated(changedProperties);
    // Initialize camera vision after camera-manager is rendered
    this.initializeCameraVision();
  }

  /**
   * Initialize AI services
   */
  private async initializeServices(): Promise<void> {
    try {
      // Initialize speech output service audio context
      await speechOutputService.initializeAudioContext();
      
      // Set status callback for conversation orchestrator
      conversationOrchestrator.setStatusCallback((status) => {
        this.status = status;
      });
      
      // Initialize provider manager
      await providerManager.initialize();
      
      // Initialize RAG memory system (required before conversation orchestrator is used)
      try {
        console.log('[VisualizerShell] Initializing RAG memory system...');
        await ragMemoryManager.initialize();
        this.ragInitialized = true;
        console.log('[VisualizerShell] ✅ RAG memory system initialized');
      } catch (ragError) {
        console.error('[VisualizerShell] ⚠️  RAG initialization failed:', ragError);
        this.ragEnabled = false;
        this.ragInitialized = false;
      }

      // Initialize storage quota manager (monitors and auto-cleans localStorage)
      storageQuotaManager.logStorageUsage();
      console.log('[VisualizerShell] ✅ Storage quota manager initialized');
      
      // Initialize voice input service and listeners
      this.initializeVoiceInput();
      
      // Initialize routine executor
      try {
        const { routineExecutor } = await import('../../services/routine-executor');
        await routineExecutor.initialize();
        console.log('[VisualizerShell] ✅ Routine executor initialized');
      } catch (routineError) {
        console.error('[VisualizerShell] ⚠️  Routine executor initialization failed:', routineError);
      }
      
      console.log('[VisualizerShell] Services initialized');
    } catch (error) {
      console.error('[VisualizerShell] Failed to initialize services:', error);
    }
  }

  /**
   * Initialize voice input service (Whisper STT)
   */
  private initializeVoiceInput(): void {
    // Listen for transcription results
    voiceInputService.addEventListener('transcription', ((event: CustomEvent) => {
      const text = event.detail.text;
      console.log('[VisualizerShell] Voice transcription:', text);
      
      // Send transcribed text to conversation orchestrator
      if (text && text.trim()) {
        this.handleTextSubmit(new CustomEvent('text-submit', { detail: { text } }));
      }
    }) as EventListener);

    // Listen for voice input state changes
    voiceInputService.addEventListener('state-change', ((event: CustomEvent) => {
      const state = event.detail.state;
      
      // Update UI state based on voice input state
      this.isSpeaking = state === 'recording';
      
      switch (state) {
        case 'loading-model':
          this.status = 'Loading speech model...';
          break;
        case 'recording':
          this.status = 'Listening...';
          break;
        case 'processing':
          this.status = 'Transcribing...';
          break;
        case 'ready':
          this.status = 'Ready';
          break;
        case 'error':
          this.status = event.detail.error || 'Voice input error';
          console.error('[VisualizerShell] Voice input error:', event.detail.error);
          break;
      }
    }) as EventListener);

    console.log('[VisualizerShell] Voice input service initialized');
  }

  /**
   * Initialize camera vision integration
   * Wires camera-manager's frame-captured events to camera-vision-service
   */
  private initializeCameraVision(): void {
    if (!this.cameraManager) {
      console.warn('[VisualizerShell] Camera manager not available for vision integration');
      return;
    }

    // Listen for captured frames and analyze with vision service
    this.cameraManager.addEventListener('frame-captured', ((event: CustomEvent) => {
      const frame = event.detail;
      const activePersoni = activePersonasManager.getPrimaryPersona();
      
      // Only analyze if PersonI has vision capability enabled
      if (activePersoni?.capabilities?.vision) {
        console.log('[VisualizerShell] Analyzing captured frame with vision service');
        
        // Use local COCO-SSD for automatic periodic analysis (fast, free)
        // API-based vision models should be opt-in via conversation context
        cameraVisionService.analyzeFrame(frame, {
          modelType: 'local',
        }).catch((error) => {
          console.error('[VisualizerShell] Vision analysis error:', error);
        });
      }
    }) as EventListener);

    console.log('[VisualizerShell] Camera vision integration initialized');
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.audioContext) {
      this.audioContext.close();
    }
    if (this.unsubscribeAppState) {
      this.unsubscribeAppState();
    }
    
    // Cleanup voice input service
    voiceInputService.dispose();
    
    console.log('[VisualizerShell] Destroyed');
  }

  /**
   * Load PersonI from localStorage and hydrate default templates
   * Replicates index.tsx loadConfiguration() logic for PersonI
   */
  private loadPersonIs(): void {
    try {
      const storedPersonis = localStorage.getItem(PERSONIS_KEY);
      let personis: PersoniConfig[];
      
      if (storedPersonis) {
        personis = JSON.parse(storedPersonis);
        
        // Ensure all loaded PersonI have complete defaults from templates
        personis = personis.map(p => {
          const template = personaTemplates.find(t => t.templateName === p.templateName);
          return {
            ...p,
            capabilities: p.capabilities || { ...DEFAULT_CAPABILITIES },
            avatarUrl: p.avatarUrl || template?.avatarUrl,
            visuals: p.visuals || template?.visuals,
            voiceName: p.voiceName || template?.voiceName,
            thinkingModel: p.thinkingModel || template?.thinkingModel,
          };
        });
        
        // SYNC NEW TEMPLATES: Check if any templates are missing and add them
        const existingTemplateNames = personis.map(p => p.templateName);
        const missingTemplates = personaTemplates.filter(
          template => !existingTemplateNames.includes(template.templateName || template.name)
        );
        
        if (missingTemplates.length > 0) {
          console.log(`[VisualizerShell] Adding ${missingTemplates.length} new PersonI from templates:`, 
            missingTemplates.map(t => t.name).join(', '));
          
          const newPersonis = missingTemplates.map((template) => {
            return {
              id: crypto.randomUUID(),
              name: template.name,
              tagline: template.tagline,
              systemInstruction: template.systemInstruction,
              templateName: template.templateName || template.name,
              voiceName: template.voiceName,
              thinkingModel: template.thinkingModel,
              enabledConnectors: template.enabledConnectors,
              capabilities: template.capabilities || { ...DEFAULT_CAPABILITIES },
              avatarUrl: template.avatarUrl,
              visuals: template.visuals,
            };
          });
          
          personis = [...personis, ...newPersonis];
        }
        
        // Save with updated capabilities, avatarUrl, and new PersonI
        localStorage.setItem(PERSONIS_KEY, JSON.stringify(personis));
      } else {
        // First time setup: create PersonI from templates
        personis = personaTemplates.map((template) => {
          return {
            id: crypto.randomUUID(),
            name: template.name,
            tagline: template.tagline,
            systemInstruction: template.systemInstruction,
            templateName: template.templateName || template.name,
            voiceName: template.voiceName,
            thinkingModel: template.thinkingModel,
            enabledConnectors: template.enabledConnectors,
            capabilities: template.capabilities || { ...DEFAULT_CAPABILITIES },
            avatarUrl: template.avatarUrl,
            visuals: template.visuals,
          };
        });
        localStorage.setItem(PERSONIS_KEY, JSON.stringify(personis));
        console.log('[VisualizerShell] Created default PersonI from templates:', personis.map(p => p.name).join(', '));
      }
      
      // Update app state with loaded PersonI
      appStateService.setPersonis(personis);
      
      // Set active persona to first one if none selected
      if (personis.length > 0) {
        const activePersoni = appStateService.getActivePersoni() || personis[0];
        appStateService.setActivePersoni(activePersoni);
        
        // Sync with activePersonasManager (primary slot)
        activePersonasManager.setPersona('primary', activePersoni);
        console.log('[VisualizerShell] Set active PersonI:', activePersoni.name);
        
        // Sync secondary persona if dual mode was enabled
        const secondaryPersoni = appStateService.getSecondaryPersoni();
        if (secondaryPersoni) {
          activePersonasManager.setPersona('secondary', secondaryPersoni);
          console.log('[VisualizerShell] Restored secondary PersonI:', secondaryPersoni.name);
        }
      }
    } catch (error) {
      console.error('[VisualizerShell] Failed to load PersonI:', error);
    }
  }

  private subscribeToAppState(): void {
    // Subscribe to app state changes
    this.unsubscribeAppState = appStateService.subscribe(() => {
      const state = appStateService.getState();
      this.activeSidePanel = state.activeSidePanel;
      this.settingsMenuVisible = state.settingsMenuVisible;
      console.log('[VisualizerShell] AppState updated - settingsMenuVisible:', this.settingsMenuVisible, 'activeSidePanel:', this.activeSidePanel);
      this.requestUpdate();
    });
    
    // Log initial state
    const initialState = appStateService.getState();
    console.log('[VisualizerShell] Initial AppState - settingsMenuVisible:', initialState.settingsMenuVisible, 'activeSidePanel:', initialState.activeSidePanel);
  }

  private async initializeAudioContext(): Promise<void> {
    try {
      this.audioContext = new AudioContext();
      this.outputNode = this.audioContext.createGain();
      this.inputNode = this.audioContext.createGain();

      // Connect outputNode to destination for playback
      this.outputNode.connect(this.audioContext.destination);

      // Create analysers for audio visualizer
      this.outputAnalyser = new Analyser(this.outputNode);
      this.inputAnalyser = new Analyser(this.inputNode);

      console.log('[VisualizerShell] Audio context initialized (microphone will connect async)');

      // Request microphone ASYNC (fire-and-forget) so we don't block initialization
      this.initializeMicrophoneAsync();

    } catch (error) {
      console.error('[VisualizerShell] Audio context initialization failed:', error);
    }
  }

  /**
   * Initialize microphone asynchronously (non-blocking)
   * This allows the shell to continue initializing even if mic permission is pending
   */
  private async initializeMicrophoneAsync(): Promise<void> {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });

      if (!this.audioContext || !this.inputNode) return;

      // Create source from microphone stream
      const sourceNode = this.audioContext.createMediaStreamSource(mediaStream);
      
      // Connect microphone to inputNode (which feeds inputAnalyser)
      sourceNode.connect(this.inputNode);
      
      // Also connect to a muted output to keep graph alive without feedback
      const mutedGain = this.audioContext.createGain();
      mutedGain.gain.setValueAtTime(0, this.audioContext.currentTime);
      this.inputNode.connect(mutedGain);
      mutedGain.connect(this.audioContext.destination);

      console.log('[VisualizerShell] Microphone connected to audio analyser');

      // Wire analysers to visualizer component after it's rendered
      await this.updateComplete;
      if (this.visualizer3d) {
        this.visualizer3d.outputAnalyser = this.outputAnalyser;
        this.visualizer3d.inputAnalyser = this.inputAnalyser;
        console.log('[VisualizerShell] Analysers connected to visualizer-3d');
      }
    } catch (micError) {
      console.warn('[VisualizerShell] Microphone access denied:', micError);
      // Visualizer will use fallback animation without audio reactivity
    }
  }

  private playIntroAnimation(): void {
    // Wait for next frame to ensure DOM is ready
    requestAnimationFrame(() => {
      const overlay = this.shadowRoot?.querySelector('.intro-overlay');
      const text = this.shadowRoot?.querySelector('.intro-text');

      if (!overlay || !text) return;

      // GSAP timeline for entrance
      const timeline = gsap.timeline();

      // Fade in text
      timeline.to(text, {
        opacity: 1,
        duration: 1.5,
        ease: 'power2.inOut',
      });

      // Hold for a moment
      timeline.to(text, {
        opacity: 1,
        duration: 0.5,
      });

      // Fade out text and overlay
      timeline.to([text, overlay], {
        opacity: 0,
        duration: 1,
        ease: 'power2.inOut',
        onComplete: () => {
          if (overlay) {
            (overlay as HTMLElement).style.display = 'none';
          }
        },
      });

      console.log('[VisualizerShell] Intro animation started');
    });
  }

  // Settings FAB and Menu handlers
  private handleFabToggle(): void {
    const state = appStateService.getState();
    const newVisibility = !state.settingsMenuVisible;
    console.log('[VisualizerShell] FAB toggle clicked, setting radial menu visible:', newVisibility);
    appStateService.setSettingsMenuVisible(newVisibility);
  }

  private handleMenuItemClick(e: CustomEvent<{ item: MenuItem }>): void {
    const { item } = e.detail;
    
    // MenuItem is already the ActiveSidePanel type, just set it directly
    appStateService.setActiveSidePanel(item);
    appStateService.setSettingsMenuVisible(false); // Close menu after selection
  }

  private handleClosePanel(): void {
    appStateService.setActiveSidePanel('none');
  }

  // Twilio panel handlers (legacy - Phase 4)
  private handleShowTwilioSettings(): void {
    this.showTwilioSettings = !this.showTwilioSettings;
  }

  private handleShowSMSPanel(): void {
    this.showSMSPanel = !this.showSMSPanel;
  }

  private handleShowVoicePanel(): void {
    this.showVoicePanel = !this.showVoicePanel;
  }

  // Render panel based on activeSidePanel state
  private renderActivePanel() {
    // All panels are now managed by the settings-dock (opened via radial menu icons)
    // Don't render legacy center panels - everything goes in the dock
    const dockManagedPanels: ActiveSidePanel[] = [
      'models',
      'personis',
      'notes',
      'tasks',
      'memory',
      'userProfile',
      'routines',
      'plugins',
      'connectorConfig',
    ];
    
    // If panel is managed by dock, don't render legacy center panel
    if (dockManagedPanels.includes(this.activeSidePanel)) {
      return null;
    }
    
    // No legacy center panels - all panels open in dock
    return null;
  }

  render() {
    return html`
      <div class="visualizer-container">
        <!-- Background Manager (z-index: 1 - Full viewport background for camera/streams) -->
        <background-manager
          .source=${this.cameraEnabled ? 'camera' : 'none'}
          .stream=${this.cameraStream}
        ></background-manager>

        <!-- 3D Audio Visualizer with Codrops shaders (z-index: 10, pointer-events: none) -->
        <visualizer-3d
          .cameraVideoElement=${null}
          .cameraRenderMode=${'none'}
          .cameraActive=${this.cameraEnabled}
        ></visualizer-3d>

        <!-- PersonI Carousel (top-center quick switcher, z-index: 180) -->
        <personi-carousel></personi-carousel>

        <!-- Circular Menu Wheel (always-visible icon wheel, z-index: 170) -->
        <circular-menu-wheel
          @panel-selected=${(e: CustomEvent) => console.log('Panel selected:', e.detail.panelId)}
        ></circular-menu-wheel>

        <!-- Settings Dock (right-side docked panel with multi-layer nav) -->
        <settings-dock></settings-dock>

        <!-- Camera Circular Menu (z-index: 150 - above controls) -->
        <camera-circular-menu
          .cameraActive=${this.cameraEnabled}
          .previewVisible=${this.cameraShowPreview}
          .detectionActive=${this.objectDetectionEnabled}
          .hasPermission=${this.cameraHasPermission}
          .error=${this.cameraError}
          @request-camera-permission=${async () => {
            try {
              const stream = await navigator.mediaDevices.getUserMedia({ video: true });
              stream.getTracks().forEach(track => track.stop());
              this.cameraHasPermission = true;
              this.cameraError = null;
              
              if (!this.cameraEnabled) {
                this.cameraEnabled = true;
              }
            } catch (err: any) {
              this.cameraError = err?.message || 'Camera permission denied';
              this.cameraHasPermission = false;
            }
          }}
          @camera-start=${this.handleToggleCameraControl}
          @camera-toggle-preview=${this.handleToggleCameraPreview}
          @camera-switch=${this.handleSwitchCamera}
          @camera-toggle-detection=${this.handleToggleObjectDetection}
          @camera-snapshot=${this.handleCameraSnapshot}
        ></camera-circular-menu>

        <!-- Camera Manager (z-index: 1 - Background layer below 3D canvas) -->
        <camera-manager
          .enabled=${this.cameraEnabled}
          .showPreview=${true}
          .renderMode=${'texture'}
          @permissions-granted=${this.handleCameraPermissions}
          @permissions-denied=${this.handleCameraPermissionsDenied}
          @camera-started=${this.updateCameraStream}
        ></camera-manager>

        <!-- RAG Settings Menu (z-index: 150 - replaces brain icon) -->
        <rag-settings-menu
          .enabled=${this.ragEnabled}
          .initialized=${this.ragInitialized}
          .lastRetrievedCount=${this.lastRetrievedMemories}
          @rag-toggle=${this.handleRAGToggle}
          @rag-file-upload=${() => {
            console.log('[VisualizerShell] RAG menu file upload clicked');
            const simpleInput = this.shadowRoot?.querySelector('simple-input-controls');
            if (simpleInput) {
              // Access the file input from renderRoot (shadow DOM or light DOM)
              const fileInput = (simpleInput.renderRoot || simpleInput).querySelector('.file-input') as HTMLInputElement;
              if (fileInput) {
                fileInput.click();
              }
            }
          }}
          @rag-open-context-settings=${() => {
            console.log('[VisualizerShell] Opening RAG context settings panel');
            this.activeSidePanel = 'memory';
          }}
          @rag-toggle-history=${(e: CustomEvent) => {
            console.log('[VisualizerShell] Toggle RAG history:', e.detail.enabled);
            // TODO: Implement history toggle in RAG system
          }}
          @rag-toggle-events=${(e: CustomEvent) => {
            console.log('[VisualizerShell] Toggle RAG events:', e.detail.enabled);
            // TODO: Implement events toggle in RAG system
          }}
          @rag-toggle-system-context=${(e: CustomEvent) => {
            console.log('[VisualizerShell] Toggle system context:', e.detail.enabled);
            // TODO: Implement system context toggle in RAG system
          }}
        ></rag-settings-menu>

        <!-- Object Detection Overlay -->
        <object-detection-overlay
          .enabled=${this.objectDetectionEnabled}
          @toggle-detection=${this.handleToggleObjectDetection}
        ></object-detection-overlay>

        <!-- Simple Input Controls (unified input system - no mode switching, bottom-center, z-index: 200) -->
        <simple-input-controls
          .isRecording=${this.isSpeaking}
          @voice-input-toggle=${this.handleVoiceInputToggle}
          @text-input-submit=${this.handleTextInputSubmit}
          @file-uploaded=${this.handleFileUploaded}
        ></simple-input-controls>

        <!-- Active Side Panel (conditional render) -->
        ${this.activeSidePanel !== 'none'
          ? html`<div class="panel">${this.renderActivePanel()}</div>`
          : ''}
      </div>

      <!-- Intro Overlay with GSAP Animation -->
      <div class="intro-overlay">
        <div class="intro-text">VISUALIZER</div>
      </div>
    `;
  }
}
