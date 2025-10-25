/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result as string;
      // remove the data:audio/wav;base64, prefix
      resolve(base64data.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function decode(base64) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

/**
 * Manages recording audio from a source node.
 */
export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private sourceNode: AudioNode;

  constructor(sourceNode: AudioNode) {
    this.sourceNode = sourceNode;
  }

  start() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      return;
    }
    // FIX: Cast context to AudioContext as createMediaStreamDestination is not on BaseAudioContext.
    const destination = (
      this.sourceNode.context as AudioContext
    ).createMediaStreamDestination();
    this.sourceNode.connect(destination);

    this.mediaRecorder = new MediaRecorder(destination.stream, {
      mimeType: 'audio/webm;codecs=opus',
    });

    this.mediaRecorder.ondataavailable = (event) => {
      this.audioChunks.push(event.data);
    };

    this.audioChunks = [];
    this.mediaRecorder.start();
  }

  async stop(): Promise<Blob | null> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, {type: 'audio/webm'});
        this.sourceNode.disconnect();
        this.mediaRecorder = null;
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }
}

/**
 * A simple Voice Activity Detector (VAD).
 * Analyzes audio chunks and emits events when speech starts and stops.
 */
export class VoiceActivityDetector extends EventTarget {
  private speaking = false;
  private silenceTimeout: number | undefined;
  private readonly silenceDelay = 1000; // 1 second of silence to trigger 'speech_end'
  private readonly energyThreshold = 0.01; // Sensitivity for detecting speech

  process(pcmData: Float32Array) {
    const energy =
      pcmData.reduce((acc, val) => acc + val * val, 0) / pcmData.length;

    if (energy > this.energyThreshold) {
      if (!this.speaking) {
        this.speaking = true;
        this.dispatchEvent(new CustomEvent('speech_start'));
      }
      clearTimeout(this.silenceTimeout);
      this.silenceTimeout = window.setTimeout(() => {
        this.handleSilence();
      }, this.silenceDelay);
    }
  }

  private handleSilence() {
    if (this.speaking) {
      this.speaking = false;
      this.dispatchEvent(new CustomEvent('speech_end'));
    }
  }

  reset() {
    this.speaking = false;
    clearTimeout(this.silenceTimeout);
  }
}

// ============================================================================
// Enhanced Audio Recording System
// ============================================================================

/**
 * Configuration options for EnhancedAudioRecorder
 * NOTE: Only mono (1 channel) recording is currently supported
 */
export interface EnhancedAudioRecorderConfig {
  /** Buffer size for audio processing (default: 4096). Must be power of 2 between 256 and 16384 */
  bufferSize?: number;
  /** Sample rate (default: uses device sample rate) */
  sampleRate?: number;
  /** Number of channels - MUST be 1 (mono only). Multi-channel not supported. */
  channels?: number;
  /** Enable automatic recording based on VAD (default: false) */
  vadEnabled?: boolean;
  /** Maximum recording duration in seconds (0 = unlimited) */
  maxDuration?: number;
  /** Enable real-time audio analysis (default: true) */
  enableAnalysis?: boolean;
}

/**
 * Audio export format options
 */
export type AudioExportFormat = 'blob' | 'audiobuffer' | 'pcm' | 'all';

/**
 * Audio analysis data
 */
export interface AudioAnalysisData {
  /** Current volume level (0-1) */
  volume: number;
  /** Frequency data (FFT) */
  frequencyData: Uint8Array;
  /** Time domain data */
  timeDomainData: Uint8Array;
  /** Average frequency across spectrum */
  averageFrequency: number;
  /** Peak frequency */
  peakFrequency: number;
  /** Timestamp of analysis */
  timestamp: number;
}

/**
 * Exported audio data in multiple formats
 */
export interface ExportedAudioData {
  blob?: Blob;
  audioBuffer?: AudioBuffer;
  pcmData?: Float32Array[];
  duration: number;
  sampleRate: number;
  channels: number;
}

/**
 * Audio consumer interface for shared microphone access
 */
export interface AudioConsumer {
  id: string;
  name: string;
  bufferSize: number;
  onAudioData: (data: Float32Array, timestamp: number) => void;
  onAnalysisData?: (data: AudioAnalysisData) => void;
}

/**
 * Shared microphone manager - allows multiple consumers to access the same microphone
 * This is a singleton to ensure only one microphone stream is active
 * 
 * ARCHITECTURAL DESIGN:
 * - Maintains a SINGLE AudioContext that is reused across all recorders
 * - Sample rate is determined once at initialization (device default)
 * - Buffer size changes are blocked during active recording sessions
 * - Tracks active recordings to prevent config conflicts
 */
class SharedMicrophoneManager {
  private static instance: SharedMicrophoneManager | null = null;
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private consumers: Map<string, AudioConsumer> = new Map();
  private activeRecordings: Set<string> = new Set();
  private isActive = false;
  private permissionGranted = false;

  private constructor() {}

  static getInstance(): SharedMicrophoneManager {
    if (!SharedMicrophoneManager.instance) {
      SharedMicrophoneManager.instance = new SharedMicrophoneManager();
    }
    return SharedMicrophoneManager.instance;
  }

  /**
   * Request microphone access and initialize AudioContext
   * IMPORTANT: AudioContext is created ONCE and reused across all recorders
   * Sample rate is determined by device capabilities, not requested by recorders
   */
  async requestMicrophoneAccess(): Promise<boolean> {
    // If already initialized and context is valid, return true
    if (this.permissionGranted && this.stream && this.audioContext && this.audioContext.state !== 'closed') {
      return true;
    }

    // If context was closed, clean up and reinitialize
    if (this.audioContext && this.audioContext.state === 'closed') {
      console.warn('[SharedMicrophone] AudioContext was closed, reinitializing...');
      await this.cleanup();
    }

    try {
      // Request microphone stream without specifying sample rate - use device default
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Get device's native sample rate
      const deviceSampleRate = this.stream.getAudioTracks()[0].getSettings().sampleRate || 48000;
      
      // Create AudioContext ONCE with device sample rate
      this.audioContext = new AudioContext({ sampleRate: deviceSampleRate });

      this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;

      this.sourceNode.connect(this.analyser);

      this.permissionGranted = true;
      console.log(`[SharedMicrophone] Microphone access granted, sample rate: ${this.audioContext.sampleRate}Hz`);
      return true;
    } catch (error) {
      console.error('[SharedMicrophone] Failed to access microphone:', error);
      this.permissionGranted = false;
      return false;
    }
  }

  /**
   * Get the actual sample rate of the AudioContext
   * This is the sample rate that will be used for all recordings
   */
  getSampleRate(): number | null {
    return this.audioContext?.sampleRate || null;
  }

  /**
   * Mark a consumer as actively recording
   * This prevents buffer size changes during recording
   */
  markRecordingStart(consumerId: string): void {
    this.activeRecordings.add(consumerId);
    console.log(`[SharedMicrophone] Recording started for consumer ${consumerId}. Active recordings: ${this.activeRecordings.size}`);
  }

  /**
   * Mark a consumer as stopped recording
   */
  markRecordingStop(consumerId: string): void {
    this.activeRecordings.delete(consumerId);
    console.log(`[SharedMicrophone] Recording stopped for consumer ${consumerId}. Active recordings: ${this.activeRecordings.size}`);
  }

  /**
   * Check if any consumer is actively recording
   */
  private hasActiveRecordings(): boolean {
    return this.activeRecordings.size > 0;
  }

  registerConsumer(consumer: AudioConsumer): boolean {
    if (this.consumers.has(consumer.id)) {
      console.warn(`[SharedMicrophone] Consumer ${consumer.id} already registered`);
      return false;
    }

    this.consumers.set(consumer.id, consumer);
    console.log(`[SharedMicrophone] Registered consumer: ${consumer.name} (${consumer.id}) with bufferSize: ${consumer.bufferSize}`);

    if (!this.isActive && this.consumers.size > 0) {
      this.startProcessing();
    } else if (this.isActive) {
      this.restartProcessingIfNeeded();
    }

    return true;
  }

  unregisterConsumer(consumerId: string): boolean {
    const removed = this.consumers.delete(consumerId);
    if (removed) {
      console.log(`[SharedMicrophone] Unregistered consumer: ${consumerId}`);
      // Also remove from active recordings if present
      this.activeRecordings.delete(consumerId);
    }

    if (this.consumers.size === 0 && this.isActive) {
      this.stopProcessing();
    } else if (this.consumers.size > 0 && this.isActive) {
      this.restartProcessingIfNeeded();
    }

    return removed;
  }

  private getOptimalBufferSize(): number {
    if (this.consumers.size === 0) {
      return 4096;
    }
    const bufferSizes = Array.from(this.consumers.values()).map(c => c.bufferSize);
    return Math.min(...bufferSizes);
  }

  /**
   * Restart processing if buffer size changed
   * IMPORTANT: Does NOT restart if any consumer is actively recording
   * This prevents buffer size mismatches during active recording sessions
   */
  private restartProcessingIfNeeded() {
    if (!this.isActive) return;
    
    // CRITICAL: Don't change buffer size if any consumer is actively recording
    if (this.hasActiveRecordings()) {
      console.log(`[SharedMicrophone] Active recordings in progress (${this.activeRecordings.size}), ignoring buffer size change request`);
      return;
    }
    
    const currentBufferSize = this.scriptProcessor?.bufferSize;
    const optimalBufferSize = this.getOptimalBufferSize();
    
    if (currentBufferSize !== optimalBufferSize) {
      console.log(`[SharedMicrophone] Buffer size changed from ${currentBufferSize} to ${optimalBufferSize}, restarting...`);
      this.stopProcessing();
      this.startProcessing();
    }
  }

  private startProcessing() {
    if (!this.audioContext || !this.sourceNode || !this.analyser) {
      console.error('[SharedMicrophone] Cannot start processing - audio context not initialized');
      return;
    }

    const bufferSize = this.getOptimalBufferSize();
    this.scriptProcessor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
    
    this.scriptProcessor.onaudioprocess = (event) => {
      const inputData = event.inputBuffer.getChannelData(0);
      const timestamp = this.audioContext!.currentTime;

      // Send audio data to all consumers
      for (const consumer of this.consumers.values()) {
        try {
          consumer.onAudioData(new Float32Array(inputData), timestamp);
        } catch (error) {
          console.error(`[SharedMicrophone] Error in consumer ${consumer.id}:`, error);
        }
      }

      // Generate analysis data if any consumer wants it
      const needsAnalysis = Array.from(this.consumers.values()).some(c => c.onAnalysisData);
      if (needsAnalysis) {
        const analysisData = this.generateAnalysisData(timestamp);
        for (const consumer of this.consumers.values()) {
          if (consumer.onAnalysisData) {
            try {
              consumer.onAnalysisData(analysisData);
            } catch (error) {
              console.error(`[SharedMicrophone] Error in consumer analysis ${consumer.id}:`, error);
            }
          }
        }
      }
    };

    this.analyser.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.audioContext.destination);
    this.isActive = true;
    console.log(`[SharedMicrophone] Audio processing started with bufferSize: ${bufferSize}`);
  }

  private stopProcessing() {
    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor.onaudioprocess = null;
      this.scriptProcessor = null;
    }
    this.isActive = false;
    console.log('[SharedMicrophone] Audio processing stopped');
  }

  private generateAnalysisData(timestamp: number): AudioAnalysisData {
    if (!this.analyser) {
      return {
        volume: 0,
        frequencyData: new Uint8Array(0),
        timeDomainData: new Uint8Array(0),
        averageFrequency: 0,
        peakFrequency: 0,
        timestamp,
      };
    }

    const frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
    const timeDomainData = new Uint8Array(this.analyser.frequencyBinCount);
    
    this.analyser.getByteFrequencyData(frequencyData);
    this.analyser.getByteTimeDomainData(timeDomainData);

    // Calculate volume from time domain data
    const volume = timeDomainData.reduce((sum, val) => sum + Math.abs(val - 128), 0) / timeDomainData.length / 128;

    // Calculate average frequency
    const averageFrequency = frequencyData.reduce((sum, val) => sum + val, 0) / frequencyData.length;

    // Find peak frequency
    let peakIndex = 0;
    let peakValue = 0;
    for (let i = 0; i < frequencyData.length; i++) {
      if (frequencyData[i] > peakValue) {
        peakValue = frequencyData[i];
        peakIndex = i;
      }
    }
    const peakFrequency = (peakIndex * this.audioContext!.sampleRate) / (2 * frequencyData.length);

    return {
      volume,
      frequencyData,
      timeDomainData,
      averageFrequency,
      peakFrequency,
      timestamp,
    };
  }

  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  getSourceNode(): MediaStreamAudioSourceNode | null {
    return this.sourceNode;
  }

  async cleanup() {
    this.stopProcessing();
    this.consumers.clear();
    this.activeRecordings.clear();

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }

    this.permissionGranted = false;
    this.isActive = false;
    console.log('[SharedMicrophone] Cleanup complete');
  }
}

/**
 * Enhanced Audio Recorder with advanced features:
 * - Direct microphone input management
 * - Configurable audio buffering system
 * - Multiple export formats (blob, audiobuffer, pcm)
 * - Shared microphone device access
 * - VAD (Voice Activity Detection) integration
 * - Real-time audio analysis
 * - Comprehensive event system
 * 
 * IMPORTANT CONSTRAINTS:
 * - MONO ONLY: Only 1-channel (mono) recording is supported
 *   Multi-channel recording would require complex channel interleaving
 *   which is not implemented. Attempts to use channels > 1 will throw an error.
 * 
 * - BUFFER SIZE: Must be a power of 2 between 256 and 16384
 *   Common values: 256, 512, 1024, 2048, 4096, 8192, 16384
 *   Smaller buffers = lower latency, higher CPU usage
 *   Larger buffers = higher latency, lower CPU usage
 * 
 * USAGE EXAMPLE:
 * ```typescript
 * const recorder = new EnhancedAudioRecorder({
 *   bufferSize: 2048,      // Custom buffer size (default: 4096)
 *   channels: 1,           // Must be 1 (mono only)
 *   vadEnabled: true,      // Enable voice activity detection
 *   enableAnalysis: true   // Enable real-time audio analysis
 * });
 * 
 * await recorder.start();
 * // ... recording happens ...
 * await recorder.stop();
 * 
 * const audioData = await recorder.export('blob');
 * // audioData.blob contains WAV file
 * // audioData.channels will always be 1 (mono)
 * ```
 */
export class EnhancedAudioRecorder extends EventTarget {
  private config: Required<EnhancedAudioRecorderConfig>;
  private micManager: SharedMicrophoneManager;
  private consumerId: string;
  private isRecording = false;
  private isPaused = false;
  private audioBuffer: Float32Array[] = [];
  private recordingStartTime = 0;
  private recordingDuration = 0;
  private maxDurationTimer: number | undefined;
  private vad: VoiceActivityDetector | null = null;
  private vadAutoStop = false;
  private latestAnalysisData: AudioAnalysisData | null = null;
  
  // Session-specific values locked at recording start
  // These values are captured from the AudioContext when recording starts
  // and remain constant for the duration of the recording session
  private sessionSampleRate: number | null = null;
  private sessionBufferSize: number | null = null;

  constructor(config: EnhancedAudioRecorderConfig = {}) {
    super();
    
    const channels = config.channels || 1;
    if (channels !== 1) {
      throw new Error(
        `EnhancedAudioRecorder only supports mono (1 channel) recording. ` +
        `Requested ${channels} channels. Multi-channel audio capture is not currently supported.`
      );
    }

    const bufferSize = config.bufferSize || 4096;
    if (!this.isValidBufferSize(bufferSize)) {
      throw new Error(
        `Invalid bufferSize: ${bufferSize}. Must be a power of 2 between 256 and 16384. ` +
        `Valid values: 256, 512, 1024, 2048, 4096, 8192, 16384.`
      );
    }
    
    this.config = {
      bufferSize,
      sampleRate: config.sampleRate || 44100,
      channels: 1,
      vadEnabled: config.vadEnabled || false,
      maxDuration: config.maxDuration || 0,
      enableAnalysis: config.enableAnalysis !== false,
    };

    this.micManager = SharedMicrophoneManager.getInstance();
    this.consumerId = `recorder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    if (this.config.vadEnabled) {
      this.initializeVAD();
    }
  }

  private isValidBufferSize(size: number): boolean {
    return (
      size >= 256 &&
      size <= 16384 &&
      (size & (size - 1)) === 0
    );
  }

  private initializeVAD() {
    this.vad = new VoiceActivityDetector();
    
    this.vad.addEventListener('speech_start', () => {
      this.dispatchEvent(new CustomEvent('vad_speech_start'));
      if (this.vadAutoStop && !this.isRecording) {
        this.start().catch(err => console.error('[EnhancedAudioRecorder] VAD auto-start failed:', err));
      }
    });

    this.vad.addEventListener('speech_end', () => {
      this.dispatchEvent(new CustomEvent('vad_speech_end'));
      if (this.vadAutoStop && this.isRecording) {
        this.stop().catch(err => console.error('[EnhancedAudioRecorder] VAD auto-stop failed:', err));
      }
    });
  }

  /**
   * Enable automatic start/stop based on voice activity
   */
  enableVADAutoControl(enabled = true) {
    if (!this.vad) {
      this.initializeVAD();
    }
    this.vadAutoStop = enabled;
    this.dispatchEvent(new CustomEvent('vad_auto_control_changed', { detail: { enabled } }));
  }

  /**
   * Request microphone permissions
   * NOTE: Sample rate is NOT requested - it's determined by the device
   */
  async requestPermissions(): Promise<boolean> {
    const granted = await this.micManager.requestMicrophoneAccess();
    this.dispatchEvent(new CustomEvent('permissions_changed', { detail: { granted } }));
    return granted;
  }

  /**
   * Start recording
   * CRITICAL: Captures the actual sample rate from AudioContext and locks buffer size
   * These values remain constant for the duration of this recording session
   */
  async start(): Promise<void> {
    if (this.isRecording) {
      console.warn('[EnhancedAudioRecorder] Already recording');
      return;
    }

    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      throw new Error('Microphone permission denied');
    }

    // Capture the ACTUAL sample rate from the AudioContext
    // This is critical for correct WAV export later
    const actualSampleRate = this.micManager.getSampleRate();
    if (!actualSampleRate) {
      throw new Error('Audio context not initialized - microphone access may have failed');
    }
    
    // Lock session values - these will NOT change during this recording
    this.sessionSampleRate = actualSampleRate;
    this.sessionBufferSize = this.config.bufferSize;

    console.log(`[EnhancedAudioRecorder] Starting recording with sample rate: ${this.sessionSampleRate}Hz, buffer size: ${this.sessionBufferSize}`);

    // Reset buffer
    this.audioBuffer = [];
    this.recordingStartTime = Date.now();
    this.recordingDuration = 0;
    this.isPaused = false;

    // Register as consumer
    const consumer: AudioConsumer = {
      id: this.consumerId,
      name: 'EnhancedAudioRecorder',
      bufferSize: this.config.bufferSize,
      onAudioData: (data, timestamp) => this.handleAudioData(data, timestamp),
      onAnalysisData: this.config.enableAnalysis ? (data) => this.handleAnalysisData(data) : undefined,
    };

    this.micManager.registerConsumer(consumer);
    
    // Mark this recorder as actively recording - prevents buffer size changes
    this.micManager.markRecordingStart(this.consumerId);
    
    this.isRecording = true;

    // Set max duration timer if configured
    if (this.config.maxDuration > 0) {
      this.maxDurationTimer = window.setTimeout(() => {
        this.stop().catch(err => console.error('[EnhancedAudioRecorder] Max duration stop failed:', err));
      }, this.config.maxDuration * 1000);
    }

    this.dispatchEvent(new CustomEvent('recording_started', {
      detail: { 
        timestamp: this.recordingStartTime,
        sampleRate: this.sessionSampleRate,
        bufferSize: this.sessionBufferSize,
      },
    }));
  }

  /**
   * Pause recording (keeps buffer)
   */
  pause() {
    if (!this.isRecording || this.isPaused) {
      return;
    }
    this.isPaused = true;
    this.dispatchEvent(new CustomEvent('recording_paused', {
      detail: { duration: this.recordingDuration },
    }));
  }

  /**
   * Resume recording
   */
  resume() {
    if (!this.isRecording || !this.isPaused) {
      return;
    }
    this.isPaused = false;
    this.dispatchEvent(new CustomEvent('recording_resumed', {
      detail: { duration: this.recordingDuration },
    }));
  }

  /**
   * Stop recording
   * Unregisters consumer and unlocks buffer size for other recorders
   */
  async stop(): Promise<void> {
    if (!this.isRecording) {
      console.warn('[EnhancedAudioRecorder] Not recording');
      return;
    }

    // Mark as stopped FIRST - this allows buffer size changes again
    this.micManager.markRecordingStop(this.consumerId);
    
    // Unregister consumer
    this.micManager.unregisterConsumer(this.consumerId);
    
    this.isRecording = false;
    this.isPaused = false;

    if (this.maxDurationTimer) {
      clearTimeout(this.maxDurationTimer);
      this.maxDurationTimer = undefined;
    }

    this.recordingDuration = (Date.now() - this.recordingStartTime) / 1000;

    this.dispatchEvent(new CustomEvent('recording_stopped', {
      detail: { 
        duration: this.recordingDuration, 
        bufferSize: this.audioBuffer.length,
        sampleRate: this.sessionSampleRate,
      },
    }));
  }

  private handleAudioData(data: Float32Array, timestamp: number) {
    if (!this.isRecording || this.isPaused) {
      return;
    }

    // Store audio data in buffer
    this.audioBuffer.push(new Float32Array(data));

    // Process with VAD if enabled
    if (this.vad) {
      this.vad.process(data);
    }

    // Emit data available event
    this.dispatchEvent(new CustomEvent('data_available', {
      detail: { 
        data: new Float32Array(data),
        timestamp,
        bufferSize: this.audioBuffer.length,
      },
    }));
  }

  private handleAnalysisData(data: AudioAnalysisData) {
    this.latestAnalysisData = data;
    this.dispatchEvent(new CustomEvent('analysis_data', { detail: data }));
  }

  /**
   * Get latest audio analysis data
   */
  getAnalysisData(): AudioAnalysisData | null {
    return this.latestAnalysisData;
  }

  /**
   * Get current recording duration in seconds
   */
  getDuration(): number {
    if (this.isRecording) {
      return (Date.now() - this.recordingStartTime) / 1000;
    }
    return this.recordingDuration;
  }

  /**
   * Get recording state
   */
  getState(): 'inactive' | 'recording' | 'paused' {
    if (!this.isRecording) return 'inactive';
    if (this.isPaused) return 'paused';
    return 'recording';
  }

  /**
   * Export recorded audio in specified format(s)
   * CRITICAL: Uses session sample rate, not current AudioContext sample rate
   * This ensures correct playback even if AudioContext was reinitialized after recording
   */
  async export(format: AudioExportFormat = 'blob'): Promise<ExportedAudioData> {
    if (this.audioBuffer.length === 0) {
      throw new Error('No audio data to export');
    }

    // Use session sample rate if available (preferred), fall back to current context
    let sampleRate = this.sessionSampleRate;
    if (!sampleRate) {
      const audioContext = this.micManager.getAudioContext();
      if (!audioContext) {
        throw new Error('Audio context not available and no session sample rate stored');
      }
      sampleRate = audioContext.sampleRate;
      console.warn(
        '[EnhancedAudioRecorder] No session sample rate found, using current context sample rate. ' +
        'This may produce incorrect audio if the AudioContext was reinitialized after recording.'
      );
    }

    const audioContext = this.micManager.getAudioContext();
    if (!audioContext) {
      throw new Error('Audio context not available');
    }

    const channels = 1;

    const exportData: ExportedAudioData = {
      duration: this.recordingDuration,
      sampleRate,
      channels,
    };

    // Calculate total samples
    const totalSamples = this.audioBuffer.reduce((sum, chunk) => sum + chunk.length, 0);

    if (format === 'pcm' || format === 'all') {
      exportData.pcmData = [new Float32Array(totalSamples)];
      let offset = 0;
      for (const chunk of this.audioBuffer) {
        exportData.pcmData[0].set(chunk, offset);
        offset += chunk.length;
      }
    }

    if (format === 'audiobuffer' || format === 'all') {
      const audioBuffer = audioContext.createBuffer(channels, totalSamples, sampleRate);
      const channelData = audioBuffer.getChannelData(0);
      let offset = 0;
      for (const chunk of this.audioBuffer) {
        channelData.set(chunk, offset);
        offset += chunk.length;
      }
      exportData.audioBuffer = audioBuffer;
    }

    if (format === 'blob' || format === 'all') {
      exportData.blob = await this.exportAsBlob(totalSamples, sampleRate, channels);
    }

    return exportData;
  }

  private async exportAsBlob(totalSamples: number, sampleRate: number, channels: number): Promise<Blob> {
    // Create WAV file from PCM data
    const wavBuffer = this.createWavBuffer(totalSamples, sampleRate, channels);
    return new Blob([wavBuffer], { type: 'audio/wav' });
  }

  private createWavBuffer(totalSamples: number, sampleRate: number, channels: number): ArrayBuffer {
    if (channels !== 1) {
      throw new Error(`WAV export only supports mono (1 channel). Attempted to export ${channels} channels.`);
    }

    const bytesPerSample = 2; // 16-bit PCM
    const blockAlign = channels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = totalSamples * bytesPerSample;
    const bufferSize = 44 + dataSize;

    const buffer = new ArrayBuffer(bufferSize);
    const view = new DataView(buffer);

    // WAV header
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    this.writeString(view, 8, 'WAVE');
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true); // bits per sample
    this.writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // Write PCM data (mono)
    let offset = 44;
    for (const chunk of this.audioBuffer) {
      for (let i = 0; i < chunk.length; i++) {
        const sample = Math.max(-1, Math.min(1, chunk[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }

    return buffer;
  }

  private writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  /**
   * Clear the audio buffer
   */
  clearBuffer() {
    this.audioBuffer = [];
    this.dispatchEvent(new CustomEvent('buffer_cleared'));
  }

  /**
   * Get buffer size (number of chunks)
   */
  getBufferSize(): number {
    return this.audioBuffer.length;
  }

  /**
   * Get total samples in buffer
   */
  getTotalSamples(): number {
    return this.audioBuffer.reduce((sum, chunk) => sum + chunk.length, 0);
  }

  /**
   * Get the current configuration
   */
  getConfig(): Readonly<Required<EnhancedAudioRecorderConfig>> {
    return { ...this.config };
  }

  /**
   * Cleanup and release resources
   */
  async cleanup() {
    if (this.isRecording) {
      await this.stop();
    }
    
    this.audioBuffer = [];
    this.vad = null;
    
    if (this.maxDurationTimer) {
      clearTimeout(this.maxDurationTimer);
    }

    this.dispatchEvent(new CustomEvent('cleanup_complete'));
  }
}

/**
 * Utility function to get shared microphone manager instance
 */
export function getSharedMicrophone(): SharedMicrophoneManager {
  return SharedMicrophoneManager.getInstance();
}