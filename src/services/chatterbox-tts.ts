/**
 * Chatterbox TTS Service
 * Custom TTS API integration with voice cloning support
 */

import { ragMemoryManager } from './memory/rag-memory-manager';

export interface ChatterboxVoice {
  id: string;
  name: string;
  description?: string;
  language: string;
  gender?: 'male' | 'female' | 'neutral';
  isCloned: boolean;
  sampleAudioUrl?: string;
}

export interface ChatterboxTTSConfig {
  endpoint: string;
  apiKey?: string;
  defaultVoice: string;
  voices: ChatterboxVoice[];
}

export interface VoiceCloneRequest {
  voiceName: string;
  audioData: Blob;
  description?: string;
  personaId?: string;
}

export class ChatterboxTTSService {
  private config: ChatterboxTTSConfig | null = null;
  private audioCache: Map<string, Blob> = new Map();

  async loadConfig(): Promise<void> {
    try {
      const saved = localStorage.getItem('chatterbox-tts-config');
      if (saved) {
        this.config = JSON.parse(saved);
        console.log('[ChatterboxTTS] Config loaded');
      }
    } catch (error) {
      console.error('[ChatterboxTTS] Failed to load config:', error);
    }
  }

  async saveConfig(config: ChatterboxTTSConfig): Promise<void> {
    this.config = config;
    localStorage.setItem('chatterbox-tts-config', JSON.stringify(config));
    console.log('[ChatterboxTTS] Config saved');
  }

  async synthesize(text: string, voiceId: string): Promise<Blob> {
    if (!this.config) {
      throw new Error('Chatterbox TTS not configured');
    }

    const cacheKey = `${voiceId}:${text}`;
    if (this.audioCache.has(cacheKey)) {
      return this.audioCache.get(cacheKey)!;
    }

    const response = await fetch(`${this.config.endpoint}/tts/synthesize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
      },
      body: JSON.stringify({
        text,
        voice_id: voiceId,
      })
    });

    if (!response.ok) {
      throw new Error(`Chatterbox TTS error: ${response.statusText}`);
    }

    const audioBlob = await response.blob();
    
    this.audioCache.set(cacheKey, audioBlob);
    if (this.audioCache.size > 100) {
      const firstKey = this.audioCache.keys().next().value;
      this.audioCache.delete(firstKey);
    }

    await this.storeAudioInMemory(text, voiceId, audioBlob);

    return audioBlob;
  }

  async cloneVoice(request: VoiceCloneRequest): Promise<ChatterboxVoice> {
    if (!this.config) {
      throw new Error('Chatterbox TTS not configured');
    }

    const formData = new FormData();
    formData.append('audio', request.audioData, 'voice_sample.wav');
    formData.append('name', request.voiceName);
    if (request.description) {
      formData.append('description', request.description);
    }

    const response = await fetch(`${this.config.endpoint}/voice/clone`, {
      method: 'POST',
      headers: {
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Voice cloning error: ${response.statusText}`);
    }

    const clonedVoice: ChatterboxVoice = await response.json();

    if (!this.config.voices.some(v => v.id === clonedVoice.id)) {
      this.config.voices.push(clonedVoice);
      await this.saveConfig(this.config);
    }

    await this.storeVoiceCloneInMemory(request, clonedVoice);

    return clonedVoice;
  }

  async listVoices(): Promise<ChatterboxVoice[]> {
    if (!this.config) {
      return [];
    }

    try {
      const response = await fetch(`${this.config.endpoint}/voices/list`, {
        headers: {
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
        }
      });

      if (response.ok) {
        const voices = await response.json();
        this.config.voices = voices;
        await this.saveConfig(this.config);
      }
    } catch (error) {
      console.warn('[ChatterboxTTS] Failed to fetch voices:', error);
    }

    return this.config.voices;
  }

  private async storeAudioInMemory(text: string, voiceId: string, audioBlob: Blob): Promise<void> {
    try {
      const base64 = await this.blobToBase64(audioBlob);
      
      await ragMemoryManager.addMemory(
        text,
        'ChatterboxTTS',
        'audio_recording',
        voiceId,
        3,
        {
          audioDataUrl: base64,
          audioSize: audioBlob.size,
          audioType: audioBlob.type,
          synthesisTimestamp: new Date().toISOString(),
        }
      );
    } catch (error) {
      console.error('[ChatterboxTTS] Failed to store audio in memory:', error);
    }
  }

  private async storeVoiceCloneInMemory(request: VoiceCloneRequest, clonedVoice: ChatterboxVoice): Promise<void> {
    try {
      const base64 = await this.blobToBase64(request.audioData);
      
      await ragMemoryManager.addMemory(
        `Voice clone: ${request.voiceName} - ${request.description || 'No description'}`,
        'VoiceCloner',
        'voice_clone',
        request.personaId || 'system',
        5,
        {
          voiceId: clonedVoice.id,
          voiceName: request.voiceName,
          sampleAudioUrl: base64,
          cloneTimestamp: new Date().toISOString(),
        }
      );
    } catch (error) {
      console.error('[ChatterboxTTS] Failed to store voice clone in memory:', error);
    }
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  getConfig(): ChatterboxTTSConfig | null {
    return this.config;
  }
}

export const chatterboxTTS = new ChatterboxTTSService();
