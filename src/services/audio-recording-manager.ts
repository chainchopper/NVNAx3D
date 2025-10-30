/**
 * Audio Recording Manager
 * Stores and manages voice recordings and audio snippets in memory
 */

import { ragMemoryManager } from './memory/rag-memory-manager';

export interface AudioRecording {
  id: string;
  text: string;
  audioDataUrl: string;
  duration?: number;
  timestamp: Date;
  speaker: string;
  type: 'user_voice' | 'ai_voice' | 'environment' | 'phone_call';
}

export class AudioRecordingManager {
  async storeRecording(
    audioBlob: Blob,
    text: string,
    speaker: string,
    type: AudioRecording['type'],
    metadata?: Record<string, any>
  ): Promise<string> {
    const base64 = await this.blobToBase64(audioBlob);
    const duration = await this.getAudioDuration(audioBlob);

    const memoryId = await ragMemoryManager.addMemory(
      text,
      speaker,
      'audio_recording',
      speaker,
      4,
      {
        audioDataUrl: base64,
        audioSize: audioBlob.size,
        audioType: audioBlob.type,
        duration,
        recordingType: type,
        ...metadata
      }
    );

    console.log(`[AudioRecording] Stored ${type} recording: ${memoryId}`);
    return memoryId;
  }

  async retrieveRecordings(options: {
    speaker?: string;
    type?: AudioRecording['type'];
    dateRange?: { start: Date; end: Date };
    limit?: number;
  }): Promise<AudioRecording[]> {
    const results = await ragMemoryManager.retrieveRelevantMemories('audio', {
      limit: options.limit || 50,
      threshold: 0.1,
      speaker: options.speaker,
      memoryType: 'audio_recording',
    });

    return results.map(r => ({
      id: r.memory.id,
      text: r.memory.text,
      audioDataUrl: r.memory.metadata.audioDataUrl,
      duration: r.memory.metadata.duration,
      timestamp: new Date(r.memory.metadata.timestamp),
      speaker: r.memory.metadata.speaker,
      type: r.memory.metadata.recordingType,
    }));
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private async getAudioDuration(blob: Blob): Promise<number> {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.onloadedmetadata = () => {
        resolve(audio.duration);
        audio.remove();
      };
      audio.onerror = () => {
        resolve(0);
        audio.remove();
      };
      audio.src = URL.createObjectURL(blob);
    });
  }
}

export const audioRecordingManager = new AudioRecordingManager();
