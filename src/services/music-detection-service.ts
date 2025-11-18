/**
 * Music Detection Service
 * Lightweight background service for detecting music vs other audio
 * and identifying songs for RAG/idle commentary
 */

import { ragMemoryManager } from './memory/rag-memory-manager';
import { AudioAnalysisData, AudioConsumer } from '../utils';

interface MusicDetectionEvent {
  timestamp: number;
  audioLevel: number;
  isMusicLikely: boolean;
  songIdentified?: {
    title: string;
    artist: string;
    album?: string;
  };
}

class MusicDetectionService {
  private consumerId = 'music-detection-service';
  private detectionInterval: number | null = null;
  private isRegistered = false;
  private lastMusicEvent: MusicDetectionEvent | null = null;
  
  // Audio analysis parameters
  private readonly SAMPLE_RATE = 1000; // Check every second
  private readonly MUSIC_FREQUENCY_THRESHOLD = 0.3; // 30% energy in music frequencies
  private readonly MIN_VOLUME_THRESHOLD = 0.1; // Minimum volume to consider
  private readonly BUFFER_SIZE = 4096; // Power of 2 between 256-16384
  
  register(sharedMic: any): void {
    if (this.isRegistered) {
      console.warn('[MusicDetectionService] Already registered');
      return;
    }
    
    const consumer: AudioConsumer = {
      id: this.consumerId,
      name: 'Music Detection Service',
      bufferSize: this.BUFFER_SIZE,
      onAudioData: () => {
        // We don't need raw audio data, only analysis
      },
      onAnalysisData: (data: AudioAnalysisData) => {
        this.analyzeAudio(data);
      }
    };
    
    const registered = sharedMic.registerConsumer(consumer);
    if (registered) {
      this.isRegistered = true;
      this.startDetection();
      console.log('[MusicDetectionService] Registered with SharedMicrophoneManager');
    }
  }
  
  unregister(sharedMic: any): void {
    if (!this.isRegistered) return;
    
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }
    
    sharedMic.unregisterConsumer(this.consumerId);
    this.isRegistered = false;
    console.log('[MusicDetectionService] Unregistered from SharedMicrophoneManager');
  }
  
  private startDetection(): void {
    if (this.detectionInterval) return;
    
    this.detectionInterval = window.setInterval(() => {
      // Detection happens via onAnalysisData callback
    }, this.SAMPLE_RATE);
  }
  
  private analyzeAudio(analysisData: AudioAnalysisData): void {
    const { frequencyData, volume } = analysisData;
    
    // Skip if volume too low
    if (volume < this.MIN_VOLUME_THRESHOLD) {
      return;
    }
    
    // Analyze frequency distribution to detect music vs speech
    const isMusicLikely = this.detectMusicPattern(frequencyData);
    
    if (isMusicLikely && (!this.lastMusicEvent || Date.now() - this.lastMusicEvent.timestamp > 30000)) {
      // Music detected, create event
      const event: MusicDetectionEvent = {
        timestamp: Date.now(),
        audioLevel: volume,
        isMusicLikely: true
      };
      
      this.lastMusicEvent = event;
      this.handleMusicDetected(event);
    }
  }
  
  private detectMusicPattern(frequencyData: Uint8Array): boolean {
    // Music typically has more consistent energy across wider frequency range
    // Speech tends to concentrate in mid-range frequencies
    
    const lowFreqEnergy = this.calculateBandEnergy(frequencyData, 0, frequencyData.length / 4);
    const midFreqEnergy = this.calculateBandEnergy(frequencyData, frequencyData.length / 4, frequencyData.length / 2);
    const highFreqEnergy = this.calculateBandEnergy(frequencyData, frequencyData.length / 2, frequencyData.length);
    
    const totalEnergy = lowFreqEnergy + midFreqEnergy + highFreqEnergy;
    
    // Music has more balanced distribution, speech is mid-heavy
    const midDominance = midFreqEnergy / totalEnergy;
    const balance = Math.min(lowFreqEnergy, highFreqEnergy) / Math.max(lowFreqEnergy, highFreqEnergy);
    
    // If mid-range is dominant (>60%) and extremes are imbalanced, likely speech
    if (midDominance > 0.6 && balance < 0.3) {
      return false;
    }
    
    // More balanced distribution suggests music
    return balance > 0.4 || (lowFreqEnergy > 0 && highFreqEnergy > 0);
  }
  
  private calculateBandEnergy(data: Uint8Array, startIndex: number, endIndex: number): number {
    let sum = 0;
    for (let i = startIndex; i < endIndex; i++) {
      sum += data[i];
    }
    return sum / (endIndex - startIndex);
  }
  
  private async handleMusicDetected(event: MusicDetectionEvent): Promise<void> {
    console.log('[MusicDetectionService] Music detected, marking for identification');
    
    // Store event in RAG for context-aware suggestions
    try {
      await ragMemoryManager.addMemory(
        `Music detected at ${new Date(event.timestamp).toLocaleTimeString()}`,
        'environmental',
        {
          audioLevel: event.audioLevel,
          timestamp: event.timestamp,
          type: 'music_detection'
        }
      );
    } catch (error) {
      console.error('[MusicDetectionService] Failed to store music event:', error);
    }
    
    // TODO: In the future, integrate with AudD API for song identification
    // For now, just log the event for idle commentary
    this.dispatchMusicEvent(event);
  }
  
  private dispatchMusicEvent(event: MusicDetectionEvent): void {
    window.dispatchEvent(new CustomEvent('music-detected', {
      detail: event
    }));
  }
  
  getLastDetection(): MusicDetectionEvent | null {
    return this.lastMusicEvent;
  }
  
  isRunning(): boolean {
    return this.isRegistered;
  }
}

export const musicDetectionService = new MusicDetectionService();
