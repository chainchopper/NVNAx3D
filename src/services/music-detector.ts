/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AudioAnalysisData } from '../utils';

/**
 * Music detection result
 */
export interface MusicDetectionResult {
  isMusic: boolean;
  confidence: number;
  beatDetected: boolean;
  bpm: number;
  energyLevel: number;
  spectralComplexity: number;
  timestamp: number;
}

/**
 * Music detector configuration
 */
export interface MusicDetectorConfig {
  enabled: boolean;
  sensitivity: number; // 0-1, higher = more sensitive to music
  beatDetectionEnabled: boolean;
  muteIdleSpeechOnMusic: boolean;
}

export const DEFAULT_MUSIC_DETECTOR_CONFIG: MusicDetectorConfig = {
  enabled: true,
  sensitivity: 0.6,
  beatDetectionEnabled: true,
  muteIdleSpeechOnMusic: true,
};

/**
 * Music Detector Service
 * Analyzes audio to distinguish music from speech using:
 * - Frequency distribution analysis
 * - Temporal pattern recognition
 * - Spectral complexity measurement
 * - Beat detection
 */
export class MusicDetector extends EventTarget {
  private config: MusicDetectorConfig;
  private analysisHistory: AudioAnalysisData[] = [];
  private readonly historySize = 30; // Store last 30 frames (~0.5 seconds at 60fps)
  
  // Beat detection state
  private beatHistory: number[] = [];
  private lastBeatTime = 0;
  private bpmHistory: number[] = [];
  private readonly bpmHistorySize = 8;
  
  // Music detection state
  private musicScoreHistory: number[] = [];
  private readonly musicScoreHistorySize = 20;
  private currentMusicState = false;
  private musicStateChangedTime = 0;
  private readonly minStateChangeDuration = 2000; // 2 seconds hysteresis
  
  // Frequency band indices (for FFT size of 2048)
  private readonly SUB_BASS_RANGE = { start: 0, end: 4 }; // 0-80 Hz
  private readonly BASS_RANGE = { start: 4, end: 12 }; // 80-250 Hz
  private readonly LOW_MID_RANGE = { start: 12, end: 25 }; // 250-500 Hz
  private readonly MID_RANGE = { start: 25, end: 50 }; // 500-1000 Hz
  private readonly HIGH_MID_RANGE = { start: 50, end: 100 }; // 1000-2000 Hz
  private readonly PRESENCE_RANGE = { start: 100, end: 200 }; // 2000-4000 Hz
  private readonly BRILLIANCE_RANGE = { start: 200, end: 400 }; // 4000-8000 Hz

  constructor(config: Partial<MusicDetectorConfig> = {}) {
    super();
    this.config = { ...DEFAULT_MUSIC_DETECTOR_CONFIG, ...config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<MusicDetectorConfig>) {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): MusicDetectorConfig {
    return { ...this.config };
  }

  /**
   * Process audio analysis data and detect music
   */
  processAudioAnalysis(data: AudioAnalysisData): MusicDetectionResult {
    if (!this.config.enabled) {
      return this.createEmptyResult();
    }

    // Store analysis in history
    this.analysisHistory.push(data);
    if (this.analysisHistory.length > this.historySize) {
      this.analysisHistory.shift();
    }

    // Need minimum history for accurate detection
    if (this.analysisHistory.length < 10) {
      return this.createEmptyResult();
    }

    // Analyze frequency distribution
    const frequencyScore = this.analyzeFrequencyDistribution(data);
    
    // Analyze temporal patterns
    const temporalScore = this.analyzeTemporalPatterns();
    
    // Analyze spectral complexity
    const spectralComplexity = this.analyzeSpectralComplexity(data);
    
    // Detect beats
    const beatDetected = this.config.beatDetectionEnabled ? this.detectBeat(data) : false;
    const bpm = this.estimateBPM();
    
    // Combine scores with weights
    const musicScore = (
      frequencyScore * 0.35 +
      temporalScore * 0.25 +
      spectralComplexity * 0.25 +
      (beatDetected ? 0.15 : 0)
    );

    // Store music score in history
    this.musicScoreHistory.push(musicScore);
    if (this.musicScoreHistory.length > this.musicScoreHistorySize) {
      this.musicScoreHistory.shift();
    }

    // Calculate average music score for stability
    const avgMusicScore = this.musicScoreHistory.reduce((a, b) => a + b, 0) / this.musicScoreHistory.length;
    
    // Determine if music is playing with hysteresis to prevent flickering
    const threshold = this.config.sensitivity;
    const now = Date.now();
    let isMusic = this.currentMusicState;

    if (!this.currentMusicState && avgMusicScore > threshold) {
      if (now - this.musicStateChangedTime > this.minStateChangeDuration) {
        isMusic = true;
        this.currentMusicState = true;
        this.musicStateChangedTime = now;
        this.dispatchEvent(new CustomEvent('musicstart', { detail: { confidence: avgMusicScore } }));
      }
    } else if (this.currentMusicState && avgMusicScore < threshold * 0.7) {
      if (now - this.musicStateChangedTime > this.minStateChangeDuration) {
        isMusic = false;
        this.currentMusicState = false;
        this.musicStateChangedTime = now;
        this.dispatchEvent(new CustomEvent('musicstop'));
      }
    }

    const result: MusicDetectionResult = {
      isMusic,
      confidence: avgMusicScore,
      beatDetected,
      bpm,
      energyLevel: data.volume,
      spectralComplexity,
      timestamp: data.timestamp,
    };

    // Dispatch analysis event
    this.dispatchEvent(new CustomEvent('analysis', { detail: result }));

    return result;
  }

  /**
   * Analyze frequency distribution to distinguish music from speech
   * Music has more balanced energy across frequency bands
   */
  private analyzeFrequencyDistribution(data: AudioAnalysisData): number {
    const freq = data.frequencyData;
    
    // Calculate energy in each frequency band
    const subBassEnergy = this.getAverageInRange(freq, this.SUB_BASS_RANGE);
    const bassEnergy = this.getAverageInRange(freq, this.BASS_RANGE);
    const lowMidEnergy = this.getAverageInRange(freq, this.LOW_MID_RANGE);
    const midEnergy = this.getAverageInRange(freq, this.MID_RANGE);
    const highMidEnergy = this.getAverageInRange(freq, this.HIGH_MID_RANGE);
    const presenceEnergy = this.getAverageInRange(freq, this.PRESENCE_RANGE);
    const brillianceEnergy = this.getAverageInRange(freq, this.BRILLIANCE_RANGE);

    // Speech typically has concentrated energy in 300-3000 Hz (voice fundamental)
    // Music has more distributed energy across the spectrum
    
    const totalEnergy = subBassEnergy + bassEnergy + lowMidEnergy + midEnergy + 
                        highMidEnergy + presenceEnergy + brillianceEnergy;
    
    if (totalEnergy < 10) {
      return 0; // Too quiet to analyze
    }

    // Calculate energy distribution variance
    const energies = [subBassEnergy, bassEnergy, lowMidEnergy, midEnergy, 
                      highMidEnergy, presenceEnergy, brillianceEnergy];
    const mean = totalEnergy / energies.length;
    const variance = energies.reduce((sum, e) => sum + Math.pow(e - mean, 2), 0) / energies.length;
    const stdDev = Math.sqrt(variance);
    
    // Music has more balanced distribution (lower coefficient of variation)
    const coefficientOfVariation = mean > 0 ? stdDev / mean : 1;
    
    // Calculate bass presence (music often has strong bass)
    const bassPresence = (bassEnergy + subBassEnergy) / totalEnergy;
    
    // Calculate high frequency presence (music often has rich highs)
    const highPresence = (presenceEnergy + brillianceEnergy) / totalEnergy;
    
    // Music score: low variation + good bass + good highs
    let score = 0;
    
    // Lower coefficient of variation = more like music
    score += Math.max(0, 1 - coefficientOfVariation) * 0.4;
    
    // Bass presence (music typically 0.2-0.4)
    if (bassPresence > 0.15 && bassPresence < 0.5) {
      score += 0.3;
    }
    
    // High frequency presence (music typically 0.15-0.35)
    if (highPresence > 0.1 && highPresence < 0.4) {
      score += 0.3;
    }
    
    return Math.min(1, score);
  }

  /**
   * Analyze temporal patterns
   * Music has more consistent patterns over time
   */
  private analyzeTemporalPatterns(): number {
    if (this.analysisHistory.length < 15) {
      return 0;
    }

    // Calculate volume consistency over time
    const volumes = this.analysisHistory.map(d => d.volume);
    const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    
    if (avgVolume < 0.01) {
      return 0; // Too quiet
    }

    // Calculate variance in volume
    const volumeVariance = volumes.reduce((sum, v) => sum + Math.pow(v - avgVolume, 2), 0) / volumes.length;
    const volumeStdDev = Math.sqrt(volumeVariance);
    
    // Music has moderate, consistent variation (rhythm)
    // Speech has irregular, high variation
    const volumeConsistency = avgVolume > 0 ? Math.max(0, 1 - (volumeStdDev / avgVolume)) : 0;
    
    // Calculate frequency peak consistency
    const peaks = this.analysisHistory.map(d => d.peakFrequency);
    const avgPeak = peaks.reduce((a, b) => a + b, 0) / peaks.length;
    const peakVariance = peaks.reduce((sum, p) => sum + Math.pow(p - avgPeak, 2), 0) / peaks.length;
    const peakStdDev = Math.sqrt(peakVariance);
    
    // Music has more consistent peak frequencies
    const peakConsistency = avgPeak > 0 ? Math.max(0, 1 - (peakStdDev / avgPeak)) : 0;
    
    return (volumeConsistency * 0.5 + peakConsistency * 0.5);
  }

  /**
   * Analyze spectral complexity
   * Music typically has richer harmonics than speech
   */
  private analyzeSpectralComplexity(data: AudioAnalysisData): number {
    const freq = data.frequencyData;
    
    // Count number of significant peaks in spectrum
    let peakCount = 0;
    const threshold = 50; // Minimum amplitude to consider
    
    for (let i = 2; i < freq.length - 2; i++) {
      if (freq[i] > threshold && 
          freq[i] > freq[i - 1] && freq[i] > freq[i - 2] &&
          freq[i] > freq[i + 1] && freq[i] > freq[i + 2]) {
        peakCount++;
      }
    }
    
    // Music typically has more harmonic peaks (3-12 significant peaks)
    // Speech typically has fewer (1-4 peaks)
    const normalizedPeakCount = Math.min(1, peakCount / 10);
    
    // Calculate spectral centroid (brightness)
    let weightedSum = 0;
    let sum = 0;
    for (let i = 0; i < freq.length; i++) {
      weightedSum += freq[i] * i;
      sum += freq[i];
    }
    const spectralCentroid = sum > 0 ? weightedSum / sum : 0;
    const normalizedCentroid = spectralCentroid / freq.length;
    
    // Music often has higher spectral centroid than speech
    const centroidScore = Math.min(1, normalizedCentroid * 2);
    
    return normalizedPeakCount * 0.6 + centroidScore * 0.4;
  }

  /**
   * Detect beats in the audio
   */
  private detectBeat(data: AudioAnalysisData): boolean {
    const freq = data.frequencyData;
    
    // Focus on bass frequencies for beat detection (typically 60-250 Hz)
    const bassEnergy = this.getAverageInRange(freq, this.BASS_RANGE) +
                       this.getAverageInRange(freq, this.SUB_BASS_RANGE);
    
    // Store bass energy in history
    this.beatHistory.push(bassEnergy);
    if (this.beatHistory.length > 10) {
      this.beatHistory.shift();
    }

    if (this.beatHistory.length < 5) {
      return false;
    }

    // Calculate average and variance
    const avgBass = this.beatHistory.reduce((a, b) => a + b, 0) / this.beatHistory.length;
    const variance = this.beatHistory.reduce((sum, v) => sum + Math.pow(v - avgBass, 2), 0) / this.beatHistory.length;
    const threshold = avgBass + Math.sqrt(variance) * 1.5;

    // Detect beat if current bass energy exceeds threshold
    // and enough time has passed since last beat
    const now = Date.now();
    const timeSinceLastBeat = now - this.lastBeatTime;
    
    if (bassEnergy > threshold && timeSinceLastBeat > 250) { // Min 250ms between beats (max 240 BPM)
      this.lastBeatTime = now;
      
      // Update BPM estimate
      if (timeSinceLastBeat < 2000) { // Only count if within reasonable range
        const instantBPM = 60000 / timeSinceLastBeat;
        this.bpmHistory.push(instantBPM);
        if (this.bpmHistory.length > this.bpmHistorySize) {
          this.bpmHistory.shift();
        }
      }
      
      this.dispatchEvent(new CustomEvent('beat', { detail: { energy: bassEnergy } }));
      return true;
    }

    return false;
  }

  /**
   * Estimate BPM from beat history
   */
  private estimateBPM(): number {
    if (this.bpmHistory.length < 3) {
      return 0;
    }

    // Return median BPM to filter outliers
    const sorted = [...this.bpmHistory].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  /**
   * Get average value in frequency range
   */
  private getAverageInRange(data: Uint8Array, range: { start: number; end: number }): number {
    let sum = 0;
    let count = 0;
    for (let i = range.start; i < Math.min(range.end, data.length); i++) {
      sum += data[i];
      count++;
    }
    return count > 0 ? sum / count : 0;
  }

  /**
   * Create empty result when detector is disabled
   */
  private createEmptyResult(): MusicDetectionResult {
    return {
      isMusic: false,
      confidence: 0,
      beatDetected: false,
      bpm: 0,
      energyLevel: 0,
      spectralComplexity: 0,
      timestamp: Date.now(),
    };
  }

  /**
   * Reset detector state
   */
  reset() {
    this.analysisHistory = [];
    this.beatHistory = [];
    this.bpmHistory = [];
    this.musicScoreHistory = [];
    this.lastBeatTime = 0;
    this.currentMusicState = false;
    this.musicStateChangedTime = 0;
  }
}

/**
 * Global music detector instance
 */
export const musicDetector = new MusicDetector();
