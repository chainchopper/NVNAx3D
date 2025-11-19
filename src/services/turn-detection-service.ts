/**
 * Turn Detection Service
 * AI-powered turn completion detection combining VAD + content analysis
 * Based on Vision Agents SDK patterns: https://visionagents.ai/ai-technologies/turn-detection
 */

import { localWhisperService } from './local-whisper';

export interface TurnDetectionConfig {
  enabled: boolean;
  vadSilenceThreshold: number; // ms of silence before considering turn complete
  contentAnalysis: boolean;    // Use AI to analyze if turn is complete
  minTurnDuration: number;      // ms - minimum duration for a valid turn
}

export interface TurnDetectionResult {
  turnComplete: boolean;
  confidence: number;  // 0-1
  reason: 'silence' | 'content' | 'pattern' | 'hybrid';
  transcript?: string;
}

const TURN_DETECTION_CONFIG_KEY = 'nirvana_turn_detection_config';
const DEFAULT_CONFIG: TurnDetectionConfig = {
  enabled: true,
  vadSilenceThreshold: 1200, // 1.2 seconds (more conservative than simple VAD)
  contentAnalysis: true,
  minTurnDuration: 500
};

class TurnDetectionService extends EventTarget {
  private config: TurnDetectionConfig;
  private audioBuffer: Float32Array[] = [];
  private lastSpeechTime: number = 0;
  private turnStartTime: number = 0;
  private isAnalyzing: boolean = false;

  // Pattern markers for turn completion
  private readonly COMPLETION_PATTERNS = [
    // Sentence endings
    /[.!?]$/,
    // Common complete phrases
    /(thank you|thanks|okay|alright|got it|that's all|that is all)$/i,
    // Question completions
    /(right\?|okay\?|correct\?)$/i
  ];

  // Patterns that suggest continuation (incomplete turn)
  private readonly CONTINUATION_PATTERNS = [
    // Incomplete connectors
    /\b(and|but|so|because|however|therefore|although|while|since)\s*$/i,
    // Trailing prepositions
    /\b(to|from|with|in|on|at|by|for)\s*$/i,
    // Incomplete comparisons
    /\b(than|like|as)\s*$/i,
    // Trailing commas
    /,\s*$/
  ];

  constructor() {
    super();
    this.config = this.loadConfig();
  }

  private loadConfig(): TurnDetectionConfig {
    const saved = localStorage.getItem(TURN_DETECTION_CONFIG_KEY);
    if (saved) {
      try {
        return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
      } catch (error) {
        console.error('[TurnDetection] Failed to load config:', error);
      }
    }
    return DEFAULT_CONFIG;
  }

  saveConfig(updates: Partial<TurnDetectionConfig>): void {
    this.config = { ...this.config, ...updates };
    localStorage.setItem(TURN_DETECTION_CONFIG_KEY, JSON.stringify(this.config));
    this.dispatchEvent(new CustomEvent('config-changed', { detail: this.config }));
  }

  getConfig(): TurnDetectionConfig {
    return { ...this.config };
  }

  /**
   * Reset turn detection state (call when starting new turn)
   */
  reset(): void {
    this.audioBuffer = [];
    this.turnStartTime = Date.now();
    this.lastSpeechTime = Date.now();
  }

  /**
   * Process audio chunk and update turn state
   * @param audioData Float32Array from microphone
   * @param isSpeaking Whether VAD detected speech
   */
  processAudio(audioData: Float32Array, isSpeaking: boolean): void {
    if (!this.config.enabled) return;

    if (isSpeaking) {
      this.lastSpeechTime = Date.now();
      this.audioBuffer.push(new Float32Array(audioData));
      
      // Limit buffer size (keep last 30 seconds at 16kHz)
      const maxSamples = 16000 * 30;
      const totalSamples = this.audioBuffer.reduce((sum, buf) => sum + buf.length, 0);
      
      while (totalSamples > maxSamples && this.audioBuffer.length > 0) {
        this.audioBuffer.shift();
      }
    }
  }

  /**
   * Detect if turn is complete
   * @param isSpeaking Current VAD state
   * @returns Detection result or null if not ready
   */
  async detectTurnCompletion(isSpeaking: boolean): Promise<TurnDetectionResult | null> {
    if (!this.config.enabled) {
      // Fall back to simple VAD-based detection
      const silenceDuration = Date.now() - this.lastSpeechTime;
      return {
        turnComplete: !isSpeaking && silenceDuration > 800,
        confidence: 1.0,
        reason: 'silence'
      };
    }

    // Still speaking - turn not complete
    if (isSpeaking) {
      return {
        turnComplete: false,
        confidence: 1.0,
        reason: 'silence'
      };
    }

    const silenceDuration = Date.now() - this.lastSpeechTime;
    const turnDuration = Date.now() - this.turnStartTime;

    // Too short to be a valid turn
    if (turnDuration < this.config.minTurnDuration) {
      return null;
    }

    // Not enough silence yet
    if (silenceDuration < this.config.vadSilenceThreshold) {
      return null;
    }

    // Simple silence-based detection
    if (!this.config.contentAnalysis) {
      return {
        turnComplete: true,
        confidence: 0.8,
        reason: 'silence'
      };
    }

    // AI-powered content analysis
    return await this.analyzeContent();
  }

  /**
   * Analyze audio content to determine turn completion
   */
  private async analyzeContent(): Promise<TurnDetectionResult> {
    if (this.isAnalyzing || this.audioBuffer.length === 0) {
      return {
        turnComplete: false,
        confidence: 0.5,
        reason: 'content'
      };
    }

    this.isAnalyzing = true;

    try {
      // Concatenate audio buffers
      const totalLength = this.audioBuffer.reduce((sum, buf) => sum + buf.length, 0);
      const combinedAudio = new Float32Array(totalLength);
      let offset = 0;
      
      for (const buffer of this.audioBuffer) {
        combinedAudio.set(buffer, offset);
        offset += buffer.length;
      }

      // Get partial transcript if Whisper is available
      const loadingState = localWhisperService.getLoadingState();
      const whisperReady = loadingState === 'ready';
      
      if (whisperReady) {
        const result = await localWhisperService.transcribe(combinedAudio, 16000);
        const trimmedTranscript = result.text.trim();

        console.log(`[TurnDetection] Content analysis: "${trimmedTranscript}"`);

        // Check for completion patterns
        for (const pattern of this.COMPLETION_PATTERNS) {
          if (pattern.test(trimmedTranscript)) {
            return {
              turnComplete: true,
              confidence: 0.95,
              reason: 'pattern',
              transcript: trimmedTranscript
            };
          }
        }

        // Check for continuation patterns
        for (const pattern of this.CONTINUATION_PATTERNS) {
          if (pattern.test(trimmedTranscript)) {
            return {
              turnComplete: false,
              confidence: 0.9,
              reason: 'pattern',
              transcript: trimmedTranscript
            };
          }
        }

        // Heuristic: Short utterances are likely complete
        const wordCount = trimmedTranscript.split(/\s+/).length;
        if (wordCount <= 3) {
          return {
            turnComplete: true,
            confidence: 0.85,
            reason: 'content',
            transcript: trimmedTranscript
          };
        }

        // Default: Rely on silence duration if no clear pattern
        return {
          turnComplete: true,
          confidence: 0.75,
          reason: 'hybrid',
          transcript: trimmedTranscript
        };
      }

      // Whisper not available - fall back to silence-based detection
      return {
        turnComplete: true,
        confidence: 0.7,
        reason: 'silence'
      };
    } catch (error) {
      console.error('[TurnDetection] Content analysis failed:', error);
      return {
        turnComplete: true,
        confidence: 0.6,
        reason: 'silence'
      };
    } finally {
      this.isAnalyzing = false;
    }
  }

  /**
   * Get metrics for debugging
   */
  getMetrics(): {
    silenceDuration: number;
    turnDuration: number;
    bufferSize: number;
  } {
    return {
      silenceDuration: Date.now() - this.lastSpeechTime,
      turnDuration: Date.now() - this.turnStartTime,
      bufferSize: this.audioBuffer.length
    };
  }
}

export const turnDetectionService = new TurnDetectionService();
