/**
 * Speech-to-Text Preferences Types
 */

export type WhisperModelSize = 'whisper-tiny.en' | 'whisper-base' | 'whisper-small';

export interface SttPreferences {
  enabled: boolean;
  modelSize: WhisperModelSize;
}

export interface WhisperModelInfo {
  id: WhisperModelSize;
  name: string;
  size: string;
  description: string;
}

export const WHISPER_MODELS: WhisperModelInfo[] = [
  {
    id: 'whisper-tiny.en',
    name: 'Tiny (English)',
    size: '~75MB',
    description: 'Fastest, good for real-time transcription',
  },
  {
    id: 'whisper-base',
    name: 'Base',
    size: '~140MB',
    description: 'Balanced speed and accuracy',
  },
  {
    id: 'whisper-small',
    name: 'Small',
    size: '~466MB',
    description: 'Higher accuracy, slower processing',
  },
];

export const DEFAULT_STT_PREFERENCES: SttPreferences = {
  enabled: false,
  modelSize: 'whisper-tiny.en',
};
