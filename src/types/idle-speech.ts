/**
 * Idle Speech System Types
 * Defines configuration for contextual LLM-generated idle speech
 */

export interface IdleSpeechConfig {
  enabled: boolean;
  minIntervalMs: number;
  maxIntervalMs: number;
  memoriesToRetrieve: number;
  maxWords: number;
}

export const DEFAULT_IDLE_SPEECH_CONFIG: IdleSpeechConfig = {
  enabled: true,
  minIntervalMs: 120000, // 2 minutes
  maxIntervalMs: 300000, // 5 minutes
  memoriesToRetrieve: 8,
  maxWords: 30,
};
