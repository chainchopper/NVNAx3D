/**
 * Speech Output Service
 * 
 * Centralizes all TTS functionality:
 * - OpenAI TTS
 * - Google Gemini TTS
 * - Chatterbox custom TTS
 * - Browser Web Speech API fallback
 * 
 * Automatically falls back to browser TTS if configured providers fail
 */

import { BaseProvider } from '../providers/base-provider';
import { GoogleProvider } from '../providers/google-provider';
import { OpenAIProvider } from '../providers/openai-provider';
import { chatterboxTTS } from './chatterbox-tts';
import type { PersoniConfig } from '../personas';
import { Modality } from '@google/genai';

export interface SpeechOptions {
  voice?: string;
  pitch?: number;
  rate?: number;
}

export class SpeechOutputService {
  private audioContext: AudioContext | null = null;
  private sources: Set<AudioBufferSourceNode> = new Set();

  constructor() {
    // Initialize audio context on user gesture (handled by caller)
  }

  /**
   * Initialize audio context (call after user gesture)
   */
  async initializeAudioContext(): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log('[SpeechOutputService] Audio context initialized');
    }
  }

  /**
   * Speak text using configured provider, falling back to browser TTS
   */
  async speak(
    text: string,
    provider: BaseProvider | null,
    persona: PersoniConfig | null,
    options: SpeechOptions = {}
  ): Promise<void> {
    try {
      // Try TTS from PersonI's configured TTS model first (most specific)
      if (persona?.models?.textToSpeech && provider) {
        try {
          await this.speakWithCustomTTS(text, persona.models.textToSpeech, provider, persona);
          return;
        } catch (error) {
          console.warn('[SpeechOutputService] Custom TTS model failed, trying provider default:', error);
        }
      }

      // Try provider-based TTS (OpenAI, Google)
      if (provider) {
        if (provider instanceof OpenAIProvider) {
          await this.speakWithOpenAI(text, provider, persona);
          return;
        } else if (provider instanceof GoogleProvider) {
          await this.speakWithGoogle(text, provider as any, persona);
          return;
        }
      }

      // Try Chatterbox TTS if configured
      const chatterboxConfig = chatterboxTTS.getConfig();
      if (chatterboxConfig && persona?.voiceName) {
        try {
          await this.speakWithChatterbox(text, persona.voiceName);
          return;
        } catch (error) {
          console.warn('[SpeechOutputService] Chatterbox TTS failed, falling back to browser:', error);
        }
      }

      // Fallback to browser TTS
      await this.speakWithBrowserTTS(text, options);
    } catch (error) {
      console.error('[SpeechOutputService] All TTS methods failed:', error);
      // Last resort: browser TTS
      await this.speakWithBrowserTTS(text, options);
    }
  }

  /**
   * Use custom TTS model from OpenAI-compatible endpoints
   * Supports models like tts-1, tts-1-hd from LM Studio, vLLM, etc.
   */
  private async speakWithCustomTTS(
    text: string,
    ttsModelId: string | any,
    provider: BaseProvider,
    persona: PersoniConfig | null
  ): Promise<void> {
    // Normalize ttsModelId which may be:
    // - Composite format: "providerId:::modelId"
    // - Legacy string: "tts-1"
    // - Legacy object: { id: "tts-1" } or { providerId: "...", id: "tts-1" }
    let model: string;
    
    if (typeof ttsModelId === 'object' && ttsModelId !== null) {
      // Legacy object format - extract model ID
      model = ttsModelId.id || ttsModelId.modelId || String(ttsModelId);
      console.warn('[SpeechOutputService] Normalizing legacy TTS model object:', ttsModelId, '→', model);
    } else if (typeof ttsModelId === 'string' && ttsModelId.includes(':::')) {
      // Composite format - extract model part
      const parts = ttsModelId.split(':::');
      model = parts[1] || ttsModelId;
    } else {
      // Plain string - use as-is
      model = String(ttsModelId);
    }
    
    let voice = persona?.voiceName || 'alloy';

    // Check if provider supports OpenAI-compatible TTS endpoint
    if (provider instanceof OpenAIProvider) {
      const audioBuffer = await provider.generateSpeech(text, voice, model);
      const bytes = new Uint8Array(audioBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64Audio = btoa(binary);
      await this.playAudio(base64Audio);
    } else {
      // Try generic OpenAI-compatible endpoint for custom providers
      const config = (provider as any).config;
      if (config && config.endpoint) {
        const endpoint = config.endpoint.replace(/\/$/, '');
        const response = await fetch(`${endpoint}/audio/speech`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey || 'sk-dummy'}`
          },
          body: JSON.stringify({
            model,
            input: text,
            voice,
          }),
        });

        if (!response.ok) {
          throw new Error(`Custom TTS API error: ${response.statusText}`);
        }

        const audioBuffer = await response.arrayBuffer();
        const bytes = new Uint8Array(audioBuffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64Audio = btoa(binary);
        await this.playAudio(base64Audio);
      } else {
        throw new Error('Provider does not support TTS endpoint');
      }
    }
  }

  /**
   * OpenAI TTS
   */
  private async speakWithOpenAI(
    text: string,
    provider: OpenAIProvider,
    persona: PersoniConfig | null
  ): Promise<void> {
    const voice = persona?.voiceName || 'alloy';
    const audioBuffer = await provider.generateSpeech(text, voice, 'tts-1');

    // Convert ArrayBuffer to base64
    const bytes = new Uint8Array(audioBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64Audio = btoa(binary);

    await this.playAudio(base64Audio);
  }

  /**
   * Google Gemini TTS
   */
  private async speakWithGoogle(
    text: string,
    provider: any,
    persona: PersoniConfig | null
  ): Promise<void> {
    if (!provider.client) {
      await provider.verify();
    }
    const client = provider.client;

    if (client) {
      const response = await client.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: persona?.voiceName || 'Puck',
              },
            },
          },
        },
      });

      const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (audioData) {
        await this.playAudio(audioData);
      } else {
        throw new Error('No audio data received from Google TTS');
      }
    } else {
      throw new Error('Google client not initialized');
    }
  }

  /**
   * Chatterbox custom TTS
   */
  private async speakWithChatterbox(text: string, voiceId: string): Promise<void> {
    const audioBlob = await chatterboxTTS.synthesize(text, voiceId);

    // Convert Blob to base64
    const arrayBuffer = await audioBlob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64Audio = btoa(binary);

    await this.playAudio(base64Audio);
  }

  /**
   * Browser Web Speech API TTS (fallback)
   */
  private async speakWithBrowserTTS(
    text: string,
    options: SpeechOptions = {}
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        reject(new Error('Browser TTS not supported'));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);

      // Configure voice
      const voices = window.speechSynthesis.getVoices();
      if (options.voice) {
        const selectedVoice = voices.find(v => v.name === options.voice);
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
      } else {
        // Default to first English voice
        const englishVoice = voices.find(v => v.lang.startsWith('en'));
        if (englishVoice) {
          utterance.voice = englishVoice;
        }
      }

      utterance.pitch = options.pitch || 1.0;
      utterance.rate = options.rate || 1.0;

      utterance.onend = () => resolve();
      utterance.onerror = (e) => reject(e);

      window.speechSynthesis.speak(utterance);
      console.log('[SpeechOutputService] Speaking with browser TTS');
    });
  }

  /**
   * Play base64-encoded audio
   */
  private async playAudio(base64Audio: string): Promise<void> {
    if (!this.audioContext) {
      await this.initializeAudioContext();
    }

    const audioData = Uint8Array.from(atob(base64Audio), c => c.charCodeAt(0));
    const audioBuffer = await this.audioContext!.decodeAudioData(audioData.buffer);

    const source = this.audioContext!.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext!.destination);

    this.sources.add(source);

    source.onended = () => {
      this.sources.delete(source);
    };

    source.start();

    // Wait for playback to complete
    await new Promise<void>((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.sources.size === 0) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  /**
   * Stop all current audio playback
   */
  stopAll(): void {
    // Stop Web Audio API sources
    this.sources.forEach(source => {
      try {
        source.stop();
      } catch (e) {
        // Already stopped
      }
    });
    this.sources.clear();

    // Stop browser TTS
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    console.log('[SpeechOutputService] All audio stopped');
  }
}

export const speechOutputService = new SpeechOutputService();
