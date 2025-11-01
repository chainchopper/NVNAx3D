/**
 * Environmental Observer Service
 * Continuous camera monitoring with AI vision for contextual awareness
 */

import { ragMemoryManager } from './memory/rag-memory-manager';
import { notesManager } from './notes-manager';
import type { CameraFrame } from '../components/camera-manager';
import type { BaseProvider } from '../providers/base-provider';

export interface ObserverConfig {
  enabled: boolean;
  intervalSeconds: number;
  speechTriggers: ObservationType[];
  silentMode: boolean;
}

export type ObservationType = 
  | 'activity_change'
  | 'person_detected'
  | 'package_delivery'
  | 'safety_concern'
  | 'user_emotion'
  | 'general_observation';

export interface Observation {
  id: string;
  timestamp: Date;
  type: ObservationType;
  description: string;
  confidence: number;
  shouldSpeak: boolean;
  previousFrameComparison?: string;
}

const OBSERVER_CONFIG_KEY = 'environmental-observer-config';
const DEFAULT_CONFIG: ObserverConfig = {
  enabled: false,
  intervalSeconds: 30,
  speechTriggers: ['package_delivery', 'safety_concern'],
  silentMode: false,
};

export class EnvironmentalObserver {
  private config: ObserverConfig;
  private intervalTimer: number | null = null;
  private lastFrameDataUrl: string | null = null;
  private lastObservation: Observation | null = null;
  private captureFrameCallback: (() => CameraFrame | null) | null = null;
  private provider: BaseProvider | null = null;
  private personaName: string = 'System';
  private speakCallback: ((text: string) => void) | null = null;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): ObserverConfig {
    try {
      const saved = localStorage.getItem(OBSERVER_CONFIG_KEY);
      if (saved) {
        return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.error('[EnvironmentalObserver] Failed to load config:', error);
    }
    return { ...DEFAULT_CONFIG };
  }

  saveConfig(): void {
    try {
      localStorage.setItem(OBSERVER_CONFIG_KEY, JSON.stringify(this.config));
      console.log('[EnvironmentalObserver] Config saved:', this.config);
    } catch (error) {
      console.error('[EnvironmentalObserver] Failed to save config:', error);
    }
  }

  getConfig(): ObserverConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<ObserverConfig>): void {
    this.config = { ...this.config, ...updates };
    this.saveConfig();

    if (this.intervalTimer !== null) {
      this.stop();
      if (this.config.enabled) {
        this.start(
          this.captureFrameCallback!,
          this.provider!,
          this.personaName,
          this.speakCallback!
        );
      }
    }
  }

  start(
    captureFrame: () => CameraFrame | null,
    provider: BaseProvider,
    personaName: string,
    onSpeech: (text: string) => void
  ): void {
    if (!this.config.enabled) {
      console.log('[EnvironmentalObserver] Observer disabled in config');
      return;
    }

    this.captureFrameCallback = captureFrame;
    this.provider = provider;
    this.personaName = personaName;
    this.speakCallback = onSpeech;

    if (this.intervalTimer !== null) {
      clearInterval(this.intervalTimer);
    }

    console.log(`[EnvironmentalObserver] Starting observation every ${this.config.intervalSeconds}s`);

    // Initial observation
    setTimeout(() => this.observe(), 2000);

    // Periodic observations
    this.intervalTimer = window.setInterval(
      () => this.observe(),
      this.config.intervalSeconds * 1000
    );
  }

  stop(): void {
    if (this.intervalTimer !== null) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    console.log('[EnvironmentalObserver] Stopped observing');
  }

  private async observe(): Promise<void> {
    if (!this.captureFrameCallback || !this.provider) {
      console.warn('[EnvironmentalObserver] Missing dependencies for observation');
      return;
    }

    try {
      const frame = this.captureFrameCallback();
      if (!frame) {
        console.warn('[EnvironmentalObserver] Failed to capture frame');
        return;
      }

      const observation = await this.analyzeFrame(frame);
      
      if (observation) {
        await this.processObservation(observation);
        this.lastObservation = observation;
        this.lastFrameDataUrl = frame.dataUrl;
      }
    } catch (error) {
      console.error('[EnvironmentalObserver] Observation failed:', error);
    }
  }

  private async analyzeFrame(frame: CameraFrame): Promise<Observation | null> {
    if (!this.provider) return null;

    try {
      const systemPrompt = `You are an environmental observer for NIRVANA, an AI assistant. Analyze the camera frame and provide contextual observations.

Your task:
1. Identify what you see (objects, people count - not identities, activities)
2. Note any changes from the previous observation if provided
3. Determine if this is noteworthy enough to mention
4. Classify the observation type

Observation types:
- activity_change: User activity changed (typing → meeting, working → eating, etc.)
- person_detected: New person entered/left the frame
- package_delivery: Package or delivery detected
- safety_concern: Smoke, water leak, fire, or other safety issue
- user_emotion: User appears frustrated, tired, happy, etc.
- general_observation: Other noteworthy observations

Return JSON:
{
  "type": "observation_type",
  "description": "Brief natural description",
  "confidence": 0.0-1.0,
  "shouldSpeak": true/false,
  "comparison": "What changed since last frame (if applicable)"
}

Guidelines:
- shouldSpeak: true only for important changes, safety concerns, or significant events
- Keep descriptions natural and concise (under 20 words)
- Don't speak about every minor change
- Privacy: Count people, don't identify them
- Be helpful but not intrusive

${this.lastObservation ? `Previous observation: ${this.lastObservation.description}` : 'This is the first observation.'}`;

      const imageData = frame.dataUrl.split(',')[1];

      const messages = [
        { role: 'system' as const, content: systemPrompt },
        { 
          role: 'user' as const, 
          content: [
            { text: 'Analyze this camera frame and provide an observation in the JSON format specified above.' },
            { inlineData: { mimeType: 'image/jpeg', data: imageData } }
          ]
        },
      ];

      const response = await this.provider.sendMessage(messages);

      // Handle dual return type (string or {text, functionCalls})
      const responseText = typeof response === 'string' ? response : response.text;
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('[EnvironmentalObserver] No JSON in response');
        return null;
      }

      const parsed = JSON.parse(jsonMatch[0]);

      const observation: Observation = {
        id: `obs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        type: parsed.type || 'general_observation',
        description: parsed.description,
        confidence: parsed.confidence || 0.5,
        shouldSpeak: parsed.shouldSpeak && this.config.speechTriggers.includes(parsed.type),
        previousFrameComparison: parsed.comparison,
      };

      return observation;
    } catch (error) {
      console.error('[EnvironmentalObserver] Failed to analyze frame:', error);
      return null;
    }
  }

  private async processObservation(observation: Observation): Promise<void> {
    console.log(`[EnvironmentalObserver] Observation: ${observation.description} (${observation.type}, confidence: ${observation.confidence})`);

    // Store in RAG memory
    try {
      await ragMemoryManager.addMemory(
        observation.description,
        'EnvironmentalObserver',
        'note',
        this.personaName,
        Math.floor(observation.confidence * 5),
        {
          observationType: observation.type,
          observationId: observation.id,
          confidence: observation.confidence,
          shouldSpeak: observation.shouldSpeak,
        }
      );
    } catch (error) {
      console.error('[EnvironmentalObserver] Failed to store observation in RAG:', error);
    }

    // Create note for significant observations
    if (observation.confidence > 0.6) {
      try {
        const noteTitle = this.generateNoteTitle(observation);
        await notesManager.createNote({
          title: noteTitle,
          content: observation.description,
          tags: [observation.type, 'auto-observation'],
          persona: this.personaName,
          importance: Math.floor(observation.confidence * 10)
        });
      } catch (error) {
        console.error('[EnvironmentalObserver] Failed to create note:', error);
      }
    }

    // Speak if appropriate - DISABLED: Using idle-speech-manager.ts for all idle speech instead
    // if (observation.shouldSpeak && !this.config.silentMode && this.speakCallback) {
    //   const speechText = this.generateSpeech(observation);
    //   this.speakCallback(speechText);
    // }

    // Dispatch event
    window.dispatchEvent(
      new CustomEvent('environmental-observation', {
        detail: observation,
      })
    );
  }

  private generateNoteTitle(observation: Observation): string {
    const type = observation.type.replace(/_/g, ' ');
    const time = observation.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${type} at ${time}`;
  }

  private generateSpeech(observation: Observation): string {
    switch (observation.type) {
      case 'package_delivery':
        return `I noticed a package delivery. ${observation.description}`;
      case 'safety_concern':
        return `Safety alert: ${observation.description}`;
      case 'user_emotion':
        return `I noticed ${observation.description}. Is there anything I can help with?`;
      case 'activity_change':
        return observation.description;
      default:
        return observation.description;
    }
  }

  isRunning(): boolean {
    return this.intervalTimer !== null;
  }

  getLastObservation(): Observation | null {
    return this.lastObservation;
  }

  async clearObservationHistory(): Promise<void> {
    console.log('[EnvironmentalObserver] Clearing observation history from memory');
    // This would require a method to delete memories by type
    // For now, just reset local state
    this.lastObservation = null;
    this.lastFrameDataUrl = null;
  }
}

export const environmentalObserver = new EnvironmentalObserver();
