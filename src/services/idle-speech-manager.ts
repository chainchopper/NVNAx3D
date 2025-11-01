/**
 * Idle Speech Manager
 * Generates contextual idle speech using LLM, RAG memory, and camera vision
 */

import { IdleSpeechConfig, DEFAULT_IDLE_SPEECH_CONFIG } from '../types/idle-speech';
import { ragMemoryManager } from './memory/rag-memory-manager';
import { PersoniConfig } from '../personas';
import { BaseProvider } from '../providers/base-provider';
import type { CameraFrame } from '../components/camera-manager';
import { userProfileManager } from './user-profile-manager';

const IDLE_SPEECH_CONFIG_KEY = 'idle-speech-config';

export class IdleSpeechManager {
  private timer: number | null = null;
  private config: IdleSpeechConfig;
  private isActive: boolean = false;
  private captureFrameCallback: (() => CameraFrame | null) | null = null;
  private cameraVisionEnabled: boolean = false;
  private lastCameraFrameHash: string | null = null;
  private lastIdleSpeeches: string[] = []; // Store last 10 idle speeches to prevent repeats
  private maxStoredSpeeches = 10;

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

      // Get user profile
      const userProfile = userProfileManager.getProfile();
      const userName = userProfile.name && userProfile.name !== 'User' ? userProfile.name : null;

      // Get current time
      const now = new Date();
      const currentTime = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      const currentHour = now.getHours();
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

      // Capture camera frame and check if it changed
      let cameraFrame: CameraFrame | null = null;
      let cameraChanged = false;
      if (this.cameraVisionEnabled && this.captureFrameCallback) {
        cameraFrame = this.captureFrameCallback();
        if (cameraFrame) {
          // Simple hash of camera frame to detect changes
          const frameHash = await this.hashCameraFrame(cameraFrame.dataUrl);
          cameraChanged = frameHash !== this.lastCameraFrameHash;
          
          if (!cameraChanged) {
            console.log('[IdleSpeech] Camera frame unchanged - skipping idle speech');
            return null;
          }
          
          this.lastCameraFrameHash = frameHash;
          console.log('[IdleSpeech] Camera frame changed - generating speech');
        }
      }

      // Get conversation memories
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

      // Build recent speeches context to avoid repeats
      const recentSpeechesContext = this.lastIdleSpeeches.length > 0
        ? `\n\nYou recently said:\n${this.lastIdleSpeeches.map(s => `- "${s}"`).join('\n')}\n\nNEVER repeat any of these exact phrases or say something too similar.`
        : '';

      const userNameContext = userName ? `You are speaking with ${userName}. ` : '';
      const systemPrompt = `You are ${personi.name}. ${personi.systemInstruction}

${userNameContext}It's currently ${currentTime} (${timeOfDay}). ${cameraFrame ? 'Based on what you see in the camera and our conversation history' : 'Based on our conversation history'}, make a brief, unique contextual observation or comment.

CRITICAL RULES:
- Keep it under ${this.config.maxWords} words
- Be natural, conversational, and thoughtful
- NEVER repeat yourself - every idle comment must be completely unique
- ${cameraFrame ? 'Reference what you SEE in the camera when relevant' : 'Make observations based on the time and conversation context'}
- ${userName ? `Feel free to use ${userName}'s name naturally in your comment` : 'Make personable observations'}
- Avoid generic questions like "is there anything I can help you with?" or "how can I help?"
- Sound like you're making a spontaneous observation or thinking out loud
- Reference the current time naturally if relevant (e.g., "It's nearly ${currentTime}")${recentSpeechesContext}

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
            { text: 'Generate a unique contextual idle observation based on what you see and our conversation history. Make it fresh and never repeat yourself.' },
            { inlineData: { mimeType: 'image/jpeg', data: imageData } }
          ]
        });
      } else {
        messages.push({
          role: 'user' as const,
          content: 'Generate a unique contextual idle observation. Make it fresh and never repeat yourself.'
        });
      }

      const response = await provider.sendMessage(messages);

      const responseText = typeof response === 'string' ? response : response.text;
      const cleanedResponse = responseText.trim().replace(/^["']|["']$/g, '');

      // Check if this is too similar to recent speeches
      if (this.isTooSimilarToRecent(cleanedResponse)) {
        console.log(`[IdleSpeech] Response too similar to recent speeches, skipping: "${cleanedResponse}"`);
        return null;
      }

      console.log(`[IdleSpeech] Generated: "${cleanedResponse}"`);

      // Store in recent speeches list
      this.lastIdleSpeeches.push(cleanedResponse);
      if (this.lastIdleSpeeches.length > this.maxStoredSpeeches) {
        this.lastIdleSpeeches.shift(); // Remove oldest
      }

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

  private async hashCameraFrame(dataUrl: string): Promise<string> {
    // Simple hash based on data length and sample pixels
    const length = dataUrl.length;
    const samples = dataUrl.substring(0, 1000) + dataUrl.substring(length - 1000);
    return `${length}-${samples.length}-${samples.substring(100, 120)}`;
  }

  private isTooSimilarToRecent(text: string): boolean {
    const normalized = text.toLowerCase().trim();
    for (const recent of this.lastIdleSpeeches) {
      const recentNormalized = recent.toLowerCase().trim();
      // Check for exact match or very high similarity (> 80% same words)
      if (normalized === recentNormalized) {
        return true;
      }
      
      const words1 = normalized.split(/\s+/);
      const words2 = recentNormalized.split(/\s+/);
      const commonWords = words1.filter(w => words2.includes(w)).length;
      const similarity = commonWords / Math.max(words1.length, words2.length);
      
      if (similarity > 0.8) {
        return true;
      }
    }
    return false;
  }

  isRunning(): boolean {
    return this.isActive && this.timer !== null;
  }
}
