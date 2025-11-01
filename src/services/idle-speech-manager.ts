/**
 * Idle Speech Manager
 * Generates contextual idle speech using LLM, RAG memory, and camera vision
 */

import { IdleSpeechConfig, DEFAULT_IDLE_SPEECH_CONFIG } from '../types/idle-speech';
import { ragMemoryManager } from './memory/rag-memory-manager';
import { PersoniConfig } from '../personas';
import { BaseProvider } from '../providers/base-provider';
import type { CameraFrame } from '../components/camera-manager';

const IDLE_SPEECH_CONFIG_KEY = 'idle-speech-config';

export class IdleSpeechManager {
  private timer: number | null = null;
  private config: IdleSpeechConfig;
  private isActive: boolean = false;
  private captureFrameCallback: (() => CameraFrame | null) | null = null;
  private cameraVisionEnabled: boolean = false;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): IdleSpeechConfig {
    try {
      const saved = localStorage.getItem(IDLE_SPEECH_CONFIG_KEY);
      if (saved) {
        return { ...DEFAULT_IDLE_SPEECH_CONFIG, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.error('[IdleSpeech] Failed to load config:', error);
    }
    return { ...DEFAULT_IDLE_SPEECH_CONFIG };
  }

  private saveConfig(): void {
    try {
      localStorage.setItem(IDLE_SPEECH_CONFIG_KEY, JSON.stringify(this.config));
    } catch (error) {
      console.error('[IdleSpeech] Failed to save config:', error);
    }
  }

  getConfig(): IdleSpeechConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<IdleSpeechConfig>): void {
    this.config = { ...this.config, ...updates };
    this.saveConfig();
    console.log('[IdleSpeech] Configuration updated:', this.config);
  }

  start(
    personi: PersoniConfig,
    provider: BaseProvider | null,
    onSpeechGenerated: (text: string) => void,
    captureFrame?: () => CameraFrame | null
  ): void {
    if (!this.config.enabled) {
      console.log('[IdleSpeech] Idle speech is disabled');
      return;
    }

    if (!provider) {
      console.log('[IdleSpeech] No provider available, skipping idle speech');
      return;
    }

    this.captureFrameCallback = captureFrame || null;
    this.cameraVisionEnabled = !!captureFrame;

    console.log(`[IdleSpeech] Starting idle speech for ${personi.name} (camera vision: ${this.cameraVisionEnabled})`);
    this.isActive = true;
    this.scheduleNext(personi, provider, onSpeechGenerated);
  }

  stop(): void {
    console.log('[IdleSpeech] Stopping idle speech');
    this.isActive = false;
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  pause(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  resume(
    personi: PersoniConfig,
    provider: BaseProvider | null,
    onSpeechGenerated: (text: string) => void,
    captureFrame?: () => CameraFrame | null
  ): void {
    if (captureFrame) {
      this.captureFrameCallback = captureFrame;
      this.cameraVisionEnabled = true;
    }
    if (this.isActive && this.timer === null) {
      this.scheduleNext(personi, provider, onSpeechGenerated);
    }
  }

  private scheduleNext(
    personi: PersoniConfig,
    provider: BaseProvider | null,
    callback: (text: string) => void
  ): void {
    if (!this.isActive || !this.config.enabled) {
      return;
    }

    const delay =
      this.config.minIntervalMs +
      Math.random() * (this.config.maxIntervalMs - this.config.minIntervalMs);

    console.log(
      `[IdleSpeech] Next idle speech scheduled in ${Math.round(delay / 1000)}s`
    );

    this.timer = window.setTimeout(async () => {
      this.timer = null;

      if (!this.isActive || !this.config.enabled) {
        return;
      }

      try {
        const speech = await this.generateIdleSpeech(personi, provider);
        if (speech && this.isActive) {
          callback(speech);
        }
      } catch (error) {
        console.error('[IdleSpeech] Error generating idle speech:', error);
      }

      if (this.isActive) {
        this.scheduleNext(personi, provider, callback);
      }
    }, delay);
  }

  private async generateIdleSpeech(
    personi: PersoniConfig,
    provider: BaseProvider | null
  ): Promise<string | null> {
    if (!provider) {
      console.warn('[IdleSpeech] No provider available');
      return null;
    }

    try {
      console.log('[IdleSpeech] Generating contextual idle speech...');

      const currentHour = new Date().getHours();
      const timeOfDay =
        currentHour < 6
          ? 'late night'
          : currentHour < 12
          ? 'morning'
          : currentHour < 17
          ? 'afternoon'
          : currentHour < 21
          ? 'evening'
          : 'night';

      const memories = await ragMemoryManager.retrieveRelevantMemories(
        `recent conversation with ${personi.name} about topics discussed`,
        {
          limit: this.config.memoriesToRetrieve,
          threshold: 0.5,
          persona: personi.name,
        }
      );

      let memoryContext = '';
      if (memories.length > 0) {
        memoryContext = memories
          .slice(0, 5)
          .map((result) => {
            const { memory } = result;
            const time = new Date(memory.metadata.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });
            return `[${time}] ${memory.metadata.speaker}: ${memory.text}`;
          })
          .join('\n');
      } else {
        memoryContext = 'No recent conversation history found.';
      }

      let cameraFrame: CameraFrame | null = null;
      if (this.cameraVisionEnabled && this.captureFrameCallback) {
        cameraFrame = this.captureFrameCallback();
        if (cameraFrame) {
          console.log('[IdleSpeech] Using camera vision for contextual idle speech');
        }
      }

      const systemPrompt = `You are ${personi.name}. ${personi.systemInstruction}

It's currently ${timeOfDay}. ${cameraFrame ? 'Using camera vision and recent conversation history' : 'Based on our recent conversation history'}, make a brief, contextual observation or comment that shows awareness and thoughtfulness.

Guidelines:
- Keep it under ${this.config.maxWords} words
- Be natural and conversational
- Don't repeat what was already said verbatim
- Show awareness and thoughtfulness
${cameraFrame ? '- Use environmental observations from the camera view when relevant' : ''}
- If no recent context exists, make a general observation related to your personality
- Don't ask questions unless very natural to your thought
- Sound like you're thinking out loud

Recent conversation context:
${memoryContext}`;

      const messages: any[] = [
        { role: 'system' as const, content: systemPrompt }
      ];

      if (cameraFrame) {
        const imageData = cameraFrame.dataUrl.split(',')[1];
        messages.push({
          role: 'user' as const,
          content: [
            { text: 'Generate a brief contextual idle observation based on what you see in the camera and our conversation history.' },
            { inlineData: { mimeType: 'image/jpeg', data: imageData } }
          ]
        });
      } else {
        messages.push({
          role: 'user' as const,
          content: 'Generate a brief contextual idle observation.'
        });
      }

      const response = await provider.sendMessage(messages);

      const cleanedResponse = response.trim().replace(/^["']|["']$/g, '');

      console.log(`[IdleSpeech] Generated: "${cleanedResponse}"`);

      // Store idle speech in RAG memory
      try {
        await ragMemoryManager.addMemory(
          cleanedResponse,
          personi.name,
          'conversation',
          personi.name,
          3,
          { idleSpeech: true, cameraVision: this.cameraVisionEnabled }
        );
      } catch (error) {
        console.error('[IdleSpeech] Failed to store idle speech in RAG:', error);
      }

      return cleanedResponse;
    } catch (error) {
      console.error('[IdleSpeech] Failed to generate idle speech:', error);
      return null;
    }
  }

  isRunning(): boolean {
    return this.isActive && this.timer !== null;
  }
}
