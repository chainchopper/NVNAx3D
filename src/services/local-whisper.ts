/**
 * Local Whisper Speech-to-Text Service
 * Uses @xenova/transformers for browser-based transcription
 */

import { pipeline, AutomaticSpeechRecognitionPipeline, env } from '@xenova/transformers';
import { WhisperModelSize } from '../types/stt-preferences';

env.allowRemoteModels = true;
env.allowLocalModels = false;
env.useBrowserCache = true;
env.backends.onnx.wasm.proxy = false;

export interface TranscriptionResult {
  text: string;
  segments?: Array<{
    text: string;
    start: number;
    end: number;
  }>;
}

export type LoadingState = 'idle' | 'loading' | 'ready' | 'error';

export class LocalWhisperService extends EventTarget {
  private pipeline: AutomaticSpeechRecognitionPipeline | null = null;
  private currentModel: WhisperModelSize | null = null;
  private loadingState: LoadingState = 'idle';
  private abortController: AbortController | null = null;

  constructor() {
    super();
  }

  getLoadingState(): LoadingState {
    return this.loadingState;
  }

  getCurrentModel(): WhisperModelSize | null {
    return this.currentModel;
  }

  async loadModel(modelSize: WhisperModelSize): Promise<void> {
    if (this.currentModel === modelSize && this.pipeline && this.loadingState === 'ready') {
      return;
    }

    try {
      this.loadingState = 'loading';
      this.dispatchEvent(new CustomEvent('loading', { detail: { model: modelSize } }));

      const modelPath = `Xenova/${modelSize}`;
      
      console.log(`[Whisper] Loading model: ${modelPath}`);
      
      this.pipeline = await pipeline(
        'automatic-speech-recognition',
        modelPath,
        {
          quantized: false,
          revision: 'main',
          progress_callback: (progress) => {
            if (progress.status === 'progress') {
              console.log(`[Whisper] Downloading ${progress.file}: ${Math.round(progress.progress || 0)}%`);
              this.dispatchEvent(new CustomEvent('progress', {
                detail: {
                  file: progress.file,
                  progress: progress.progress,
                  loaded: progress.loaded,
                  total: progress.total,
                },
              }));
            }
            if (progress.status === 'done') {
              console.log(`[Whisper] Downloaded ${progress.file}`);
            }
          },
        }
      );

      this.currentModel = modelSize;
      this.loadingState = 'ready';
      console.log(`[Whisper] Model ${modelPath} loaded successfully`);
      this.dispatchEvent(new CustomEvent('ready', { detail: { model: modelSize } }));
    } catch (error) {
      this.loadingState = 'error';
      console.error(`[Whisper] Failed to load model: ${error?.message || error}`);
      this.dispatchEvent(new CustomEvent('error', { detail: { error } }));
      throw error;
    }
  }

  async transcribe(
    audio: Float32Array,
    sampleRate: number
  ): Promise<TranscriptionResult> {
    if (!this.pipeline) {
      throw new Error('Model not loaded. Call loadModel() first.');
    }

    if (this.loadingState !== 'ready') {
      throw new Error('Model is not ready for transcription.');
    }

    this.abortController = new AbortController();

    try {
      const audio16k = await this.resampleTo16kHz(audio, sampleRate);

      const result = await this.pipeline(audio16k, {
        return_timestamps: true,
        chunk_length_s: 30,
        stride_length_s: 5,
      });

      if (this.abortController.signal.aborted) {
        throw new Error('Transcription cancelled');
      }

      const output = Array.isArray(result) ? result[0] : result;

      return {
        text: output.text || '',
        segments: output.chunks?.map((chunk: any) => ({
          text: chunk.text,
          start: chunk.timestamp[0] || 0,
          end: chunk.timestamp[1] || 0,
        })),
      };
    } finally {
      this.abortController = null;
    }
  }

  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  async clearCache(): Promise<void> {
    try {
      const cacheNames = await caches.keys();
      for (const cacheName of cacheNames) {
        if (cacheName.includes('transformers')) {
          await caches.delete(cacheName);
        }
      }

      const databases = await indexedDB.databases();
      for (const db of databases) {
        if (db.name && db.name.includes('transformers')) {
          indexedDB.deleteDatabase(db.name);
        }
      }

      this.pipeline = null;
      this.currentModel = null;
      this.loadingState = 'idle';
      this.dispatchEvent(new CustomEvent('cache-cleared'));
    } catch (error) {
      console.error('Failed to clear cache:', error);
      throw error;
    }
  }

  private async resampleTo16kHz(
    audioData: Float32Array,
    originalSampleRate: number
  ): Promise<Float32Array> {
    if (originalSampleRate === 16000) {
      return audioData;
    }

    const ratio = originalSampleRate / 16000;
    const newLength = Math.round(audioData.length / ratio);
    const result = new Float32Array(newLength);

    for (let i = 0; i < newLength; i++) {
      const srcIndex = i * ratio;
      const srcIndexFloor = Math.floor(srcIndex);
      const srcIndexCeil = Math.min(srcIndexFloor + 1, audioData.length - 1);
      const t = srcIndex - srcIndexFloor;

      result[i] = audioData[srcIndexFloor] * (1 - t) + audioData[srcIndexCeil] * t;
    }

    return result;
  }

  private convertToMono(audioBuffer: AudioBuffer): Float32Array {
    if (audioBuffer.numberOfChannels === 1) {
      return audioBuffer.getChannelData(0);
    }

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
}

export const localWhisperService = new LocalWhisperService();
