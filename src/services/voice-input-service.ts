/**
 * Voice Input Service
 * Handles microphone recording → Whisper STT → text transcription
 * Integrates local-first speech-to-text with conversation flow
 */

import { localWhisperService, TranscriptionResult } from './local-whisper';
import { providerManager } from './provider-manager';
import type { WhisperModelSize } from '../types/stt-preferences';

export type VoiceInputState = 'idle' | 'loading-model' | 'ready' | 'recording' | 'processing' | 'error';

export interface VoiceInputEvent {
  state: VoiceInputState;
  text?: string;
  error?: string;
  progress?: number;
}

/**
 * VoiceInputService
 * Manages the complete flow: mic → audio → Whisper → text
 */
export class VoiceInputService extends EventTarget {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private state: VoiceInputState = 'idle';
  private audioContext: AudioContext | null = null;
  private modelLoaded = false;

  constructor() {
    super();
    this.initializeWhisperListeners();
  }

  getState(): VoiceInputState {
    return this.state;
  }

  /**
   * Initialize Whisper model (call once on app start or when STT config changes)
   */
  async initializeModel(): Promise<void> {
    if (this.modelLoaded) {
      console.log('[VoiceInput] Model already loaded');
      return;
    }

    try {
      this.updateState('loading-model');
      
      // TODO: Get model size from STTProvider config when modelSize property is added
      // For now, use default tiny model for fast transcription
      const modelSize: WhisperModelSize = 'whisper-tiny.en';
      
      console.log(`[VoiceInput] Loading Whisper model: ${modelSize}`);
      await localWhisperService.loadModel(modelSize);
      
      this.modelLoaded = true;
      this.updateState('ready');
      console.log('[VoiceInput] Whisper model ready');
    } catch (error: any) {
      console.error('[VoiceInput] Failed to load Whisper model:', error);
      this.updateState('error', undefined, error.message);
      
      // Auto-reset to idle after 3 seconds to allow retry
      setTimeout(() => {
        if (this.state === 'error') {
          this.updateState('idle');
        }
      }, 3000);
      
      throw error;
    }
  }

  /**
   * Start recording audio from microphone
   */
  async startRecording(): Promise<void> {
    if (this.state === 'recording') {
      console.warn('[VoiceInput] Already recording');
      return;
    }

    // Ensure model is loaded
    if (!this.modelLoaded) {
      await this.initializeModel();
    }

    try {
      // Check microphone permission status first
      const permissionStatus = await this.checkMicrophonePermission();
      
      if (permissionStatus === 'denied') {
        throw new Error('Microphone access denied. Please enable microphone permissions in your browser settings.');
      } else if (permissionStatus === 'prompt') {
        // Permission will be requested when getUserMedia is called
        console.log('[VoiceInput] Requesting microphone permission...');
      }
      
      // Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('[VoiceInput] ✅ Microphone access granted');
      
      // Initialize MediaRecorder
      this.audioChunks = [];
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.processRecording();
      };

      this.mediaRecorder.start();
      this.updateState('recording');
      console.log('[VoiceInput] Recording started');
    } catch (error: any) {
      console.error('[VoiceInput] Failed to start recording:', error);
      
      // Provide user-friendly error messages
      let errorMessage = error.message;
      if (error.name === 'NotAllowedError') {
        errorMessage = '🎤 Microphone access denied. Click the microphone icon in your browser\'s address bar to enable permissions.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = '🎤 No microphone found. Please connect a microphone and try again.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = '🎤 Microphone is already in use by another application.';
      }
      
      this.updateState('error', undefined, errorMessage);
      
      // Auto-reset to idle after 5 seconds to allow retry
      setTimeout(() => {
        if (this.state === 'error') {
          this.updateState('idle');
        }
      }, 5000);
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Check microphone permission status
   */
  private async checkMicrophonePermission(): Promise<PermissionState | 'unsupported'> {
    try {
      // Check if Permissions API is supported
      if (!navigator.permissions || !navigator.permissions.query) {
        return 'unsupported';
      }
      
      // @ts-ignore - microphone permission is not in all TypeScript definitions
      const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
      return permissionStatus.state;
    } catch (error) {
      // If permission check fails, assume we need to request permission
      console.warn('[VoiceInput] Permission check failed, will attempt getUserMedia');
      return 'prompt';
    }
  }

  /**
   * Stop recording and trigger transcription
   */
  stopRecording(): void {
    if (!this.mediaRecorder || this.state !== 'recording') {
      console.warn('[VoiceInput] Not currently recording');
      return;
    }

    this.mediaRecorder.stop();
    
    // Stop all tracks to release microphone
    this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    
    console.log('[VoiceInput] Recording stopped, processing...');
  }

  /**
   * Cancel current recording without transcription
   */
  cancel(): void {
    if (this.mediaRecorder && this.state === 'recording') {
      this.mediaRecorder.stop();
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
      this.audioChunks = [];
      this.updateState('ready');
      console.log('[VoiceInput] Recording cancelled');
    }
    
    // Also cancel any ongoing transcription
    localWhisperService.cancel();
  }

  /**
   * Toggle recording (start if idle, stop if recording)
   * Allows retry after errors by resetting state
   */
  async toggleRecording(): Promise<void> {
    if (this.state === 'recording') {
      this.stopRecording();
    } else if (this.state === 'ready' || this.state === 'idle') {
      await this.startRecording();
    } else if (this.state === 'error') {
      // Allow retry after error - reset and try again
      console.log('[VoiceInput] Retrying after error...');
      this.updateState('idle');
      await this.startRecording();
    }
  }

  /**
   * Reset service to idle state (useful for error recovery)
   */
  reset(): void {
    this.cancel();
    this.updateState('idle');
    console.log('[VoiceInput] Service reset to idle state');
  }

  /**
   * Process recorded audio and transcribe with Whisper
   */
  private async processRecording(): Promise<void> {
    if (this.audioChunks.length === 0) {
      console.warn('[VoiceInput] No audio data to process');
      this.updateState('ready');
      return;
    }

    try {
      this.updateState('processing');

      // Create audio blob
      const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm;codecs=opus' });
      console.log(`[VoiceInput] Processing audio blob: ${(audioBlob.size / 1024).toFixed(1)}KB`);

      // Convert blob to AudioBuffer
      const audioBuffer = await this.blobToAudioBuffer(audioBlob);
      
      // Convert to mono Float32Array for Whisper
      const audioData = this.audioBufferToFloat32(audioBuffer);
      const sampleRate = audioBuffer.sampleRate;

      console.log(`[VoiceInput] Transcribing ${audioData.length} samples at ${sampleRate}Hz`);

      // Transcribe with Whisper
      const result: TranscriptionResult = await localWhisperService.transcribe(audioData, sampleRate);

      if (result.text && result.text.trim()) {
        console.log(`[VoiceInput] Transcription: "${result.text}"`);
        this.updateState('ready', result.text);
        
        // Dispatch transcription event with text
        this.dispatchEvent(new CustomEvent('transcription', {
          detail: { text: result.text, segments: result.segments }
        }));
      } else {
        console.warn('[VoiceInput] Empty transcription result');
        this.updateState('ready');
      }

      // Clear audio chunks
      this.audioChunks = [];
    } catch (error: any) {
      console.error('[VoiceInput] Transcription failed:', error);
      this.updateState('error', undefined, error.message || 'Transcription failed');
      this.audioChunks = [];
      
      // Auto-reset to ready after 3 seconds (model already loaded)
      setTimeout(() => {
        if (this.state === 'error') {
          this.updateState('ready');
        }
      }, 3000);
    }
  }

  /**
   * Convert audio Blob to AudioBuffer
   */
  private async blobToAudioBuffer(blob: Blob): Promise<AudioBuffer> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    const arrayBuffer = await blob.arrayBuffer();
    return this.audioContext.decodeAudioData(arrayBuffer);
  }

  /**
   * Convert AudioBuffer to mono Float32Array
   */
  private audioBufferToFloat32(audioBuffer: AudioBuffer): Float32Array {
    if (audioBuffer.numberOfChannels === 1) {
      return audioBuffer.getChannelData(0);
    }

    // Mix to mono
    const length = audioBuffer.length;
    const mono = new Float32Array(length);
    
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        mono[i] += channelData[i] / audioBuffer.numberOfChannels;
      }
    }

    return mono;
  }

  /**
   * Initialize Whisper event listeners
   */
  private initializeWhisperListeners(): void {
    localWhisperService.addEventListener('loading', () => {
      this.updateState('loading-model');
    });

    localWhisperService.addEventListener('ready', () => {
      this.modelLoaded = true;
      this.updateState('ready');
    });

    localWhisperService.addEventListener('error', (event: any) => {
      this.updateState('error', undefined, event.detail?.error?.message || 'Model loading failed');
    });

    localWhisperService.addEventListener('progress', (event: any) => {
      const progress = event.detail?.progress || 0;
      this.dispatchEvent(new CustomEvent('model-progress', { detail: { progress } }));
    });
  }

  /**
   * Update state and dispatch event
   */
  private updateState(newState: VoiceInputState, text?: string, error?: string): void {
    this.state = newState;
    
    const event: VoiceInputEvent = { state: newState };
    if (text) event.text = text;
    if (error) event.error = error;

    this.dispatchEvent(new CustomEvent('state-change', { detail: event }));
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.cancel();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

export const voiceInputService = new VoiceInputService();
