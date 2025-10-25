/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getSharedMicrophone, AudioConsumer, AudioAnalysisData, blobToBase64 } from '../utils';
import { RAGMemoryManager } from './memory/rag-memory-manager';
import { BaseProvider } from '../providers/base-provider';

/**
 * Song identification result
 */
export interface SongInfo {
  title: string;
  artist: string;
  album: string;
  year?: number;
  genre?: string;
  albumArtUrl?: string;
  duration?: number;
  confidence: number;
  identifiedAt: number;
  externalIds?: {
    spotify?: string;
    youtube?: string;
    deezer?: string;
  };
}

/**
 * Synchronized lyric line
 */
export interface LyricLine {
  time: number;
  text: string;
}

/**
 * Lyrics result
 */
export interface LyricsInfo {
  syncedLyrics?: LyricLine[];
  plainLyrics?: string;
  source: string;
}

/**
 * Song identification configuration
 */
export interface SongIdentificationConfig {
  enabled: boolean;
  autoIdentify: boolean;
  identificationDelayMs: number;
  apiProvider: 'acrcloud' | 'audd' | 'auto';
  lyricsProvider: 'genius' | 'musixmatch' | 'auto';
  fetchLyrics: boolean;
  personiCommentary: boolean;
  showBubble: boolean;
  apiKeys: {
    acrcloud?: {
      accessKey: string;
      accessSecret: string;
      host?: string;
    };
    audd?: {
      apiToken: string;
    };
    genius?: {
      accessToken: string;
    };
    musixmatch?: {
      apiKey: string;
    };
  };
}

export const DEFAULT_SONG_IDENTIFICATION_CONFIG: SongIdentificationConfig = {
  enabled: true,
  autoIdentify: true,
  identificationDelayMs: 7000,
  apiProvider: 'auto',
  lyricsProvider: 'auto',
  fetchLyrics: true,
  personiCommentary: true,
  showBubble: true,
  apiKeys: {},
};

/**
 * Song Identification Service
 * Captures audio, identifies songs, and fetches lyrics
 */
export class SongIdentificationService extends EventTarget {
  private config: SongIdentificationConfig;
  private audioConsumerId = 'song-identification-consumer';
  private isCapturing = false;
  private capturedAudioChunks: Float32Array[] = [];
  private captureStartTime = 0;
  private readonly captureBufferSize = 4096;
  private readonly captureDurationMs = 10000;
  private identificationInProgress = false;
  private currentSong: SongInfo | null = null;
  private currentLyrics: LyricsInfo | null = null;
  private identificationCache = new Map<string, { song: SongInfo; timestamp: number }>();
  private readonly cacheDuration = 1000 * 60 * 60;
  private ragMemoryManager: RAGMemoryManager | null = null;
  private provider: BaseProvider | null = null;
  private currentPersona = 'NIRVANA';

  constructor(
    config: Partial<SongIdentificationConfig> = {},
    ragMemoryManager?: RAGMemoryManager,
    provider?: BaseProvider
  ) {
    super();
    this.config = { ...DEFAULT_SONG_IDENTIFICATION_CONFIG, ...config };
    this.ragMemoryManager = ragMemoryManager || null;
    this.provider = provider || null;
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<boolean> {
    if (!this.config.enabled) {
      console.log('[SongIdentification] Service disabled');
      return false;
    }

    const micManager = getSharedMicrophone();
    const hasAccess = await micManager.requestMicrophoneAccess();
    
    if (!hasAccess) {
      console.error('[SongIdentification] Failed to access microphone');
      return false;
    }

    const consumer: AudioConsumer = {
      id: this.audioConsumerId,
      name: 'Song Identification',
      bufferSize: this.captureBufferSize,
      onAudioData: this.handleAudioData.bind(this),
    };

    const registered = micManager.registerConsumer(consumer);
    if (registered) {
      console.log('[SongIdentification] Service initialized');
      return true;
    }

    return false;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SongIdentificationConfig>) {
    this.config = { ...this.config, ...config };
    this.dispatchEvent(new CustomEvent('configupdate', { detail: this.config }));
  }

  /**
   * Get current configuration
   */
  getConfig(): SongIdentificationConfig {
    return { ...this.config };
  }

  /**
   * Start capturing audio for identification
   */
  startCapture() {
    if (!this.config.enabled || this.isCapturing) {
      return;
    }

    console.log('[SongIdentification] Starting audio capture...');
    this.isCapturing = true;
    this.capturedAudioChunks = [];
    this.captureStartTime = Date.now();
    
    const micManager = getSharedMicrophone();
    micManager.markRecordingStart(this.audioConsumerId);

    setTimeout(() => {
      if (this.isCapturing) {
        this.stopCaptureAndIdentify();
      }
    }, this.captureDurationMs);
  }

  /**
   * Stop capturing and trigger identification
   */
  private async stopCaptureAndIdentify() {
    if (!this.isCapturing) {
      return;
    }

    this.isCapturing = false;
    const micManager = getSharedMicrophone();
    micManager.markRecordingStop(this.audioConsumerId);

    console.log(`[SongIdentification] Captured ${this.capturedAudioChunks.length} audio chunks`);

    if (this.capturedAudioChunks.length === 0) {
      console.warn('[SongIdentification] No audio captured');
      return;
    }

    await this.identifySong();
  }

  /**
   * Handle incoming audio data
   */
  private handleAudioData(data: Float32Array, timestamp: number) {
    if (!this.isCapturing) {
      return;
    }

    this.capturedAudioChunks.push(new Float32Array(data));
  }

  /**
   * Identify song from captured audio
   */
  private async identifySong() {
    if (this.identificationInProgress) {
      console.log('[SongIdentification] Identification already in progress');
      return;
    }

    this.identificationInProgress = true;
    this.dispatchEvent(new CustomEvent('identificationstart'));

    try {
      const audioBlob = await this.createAudioBlob();
      const audioSignature = await this.generateAudioSignature(audioBlob);

      const cached = this.identificationCache.get(audioSignature);
      if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
        console.log('[SongIdentification] Using cached result');
        await this.handleIdentificationResult(cached.song);
        return;
      }

      let songInfo: SongInfo | null = null;

      if (this.config.apiProvider === 'acrcloud' && this.config.apiKeys.acrcloud) {
        songInfo = await this.identifyWithACRCloud(audioBlob);
      } else if (this.config.apiProvider === 'audd' && this.config.apiKeys.audd) {
        songInfo = await this.identifyWithAudD(audioBlob);
      } else if (this.config.apiProvider === 'auto') {
        if (this.config.apiKeys.audd) {
          songInfo = await this.identifyWithAudD(audioBlob);
        } else if (this.config.apiKeys.acrcloud) {
          songInfo = await this.identifyWithACRCloud(audioBlob);
        }
      }

      if (songInfo) {
        this.identificationCache.set(audioSignature, {
          song: songInfo,
          timestamp: Date.now(),
        });
        await this.handleIdentificationResult(songInfo);
      } else {
        console.warn('[SongIdentification] Failed to identify song');
        this.dispatchEvent(new CustomEvent('identificationfailed'));
      }
    } catch (error) {
      console.error('[SongIdentification] Identification error:', error);
      this.dispatchEvent(new CustomEvent('identificationerror', { detail: error }));
    } finally {
      this.identificationInProgress = false;
    }
  }

  /**
   * Handle successful identification
   */
  private async handleIdentificationResult(songInfo: SongInfo) {
    this.currentSong = songInfo;
    console.log('[SongIdentification] Identified:', songInfo.title, 'by', songInfo.artist);

    await this.storeIdentification(songInfo);

    this.dispatchEvent(new CustomEvent('identified', { detail: songInfo }));

    if (this.config.fetchLyrics) {
      await this.fetchLyrics(songInfo);
    }

    if (this.config.personiCommentary) {
      await this.generatePersonICommentary(songInfo);
    }
  }

  /**
   * Fetch lyrics for identified song
   */
  private async fetchLyrics(songInfo: SongInfo) {
    try {
      let lyrics: LyricsInfo | null = null;

      if (this.config.lyricsProvider === 'genius' && this.config.apiKeys.genius) {
        lyrics = await this.fetchGeniusLyrics(songInfo);
      } else if (this.config.lyricsProvider === 'musixmatch' && this.config.apiKeys.musixmatch) {
        lyrics = await this.fetchMusixmatchLyrics(songInfo);
      } else if (this.config.lyricsProvider === 'auto') {
        if (this.config.apiKeys.genius) {
          lyrics = await this.fetchGeniusLyrics(songInfo);
        }
      }

      if (lyrics) {
        this.currentLyrics = lyrics;
        this.dispatchEvent(new CustomEvent('lyricsfetched', { detail: lyrics }));
      }
    } catch (error) {
      console.error('[SongIdentification] Lyrics fetch error:', error);
    }
  }

  /**
   * Create audio blob from captured chunks
   */
  private async createAudioBlob(): Promise<Blob> {
    const micManager = getSharedMicrophone();
    const sampleRate = micManager.getSampleRate() || 48000;

    const totalLength = this.capturedAudioChunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const concatenated = new Float32Array(totalLength);
    
    let offset = 0;
    for (const chunk of this.capturedAudioChunks) {
      concatenated.set(chunk, offset);
      offset += chunk.length;
    }

    const wavBlob = this.encodeWAV(concatenated, sampleRate);
    return wavBlob;
  }

  /**
   * Encode PCM data as WAV blob
   */
  private encodeWAV(samples: Float32Array, sampleRate: number): Blob {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, samples.length * 2, true);

    const volume = 0.8;
    let offset = 44;
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i] * volume));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }

  /**
   * Generate simple audio signature for caching
   */
  private async generateAudioSignature(blob: Blob): Promise<string> {
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    let hash = 0;
    const step = Math.floor(uint8Array.length / 1000);
    for (let i = 0; i < uint8Array.length; i += step) {
      hash = ((hash << 5) - hash) + uint8Array[i];
      hash = hash & hash;
    }
    
    return hash.toString(36);
  }

  /**
   * Identify song using AudD API
   * AudD is simple and has a free tier
   */
  private async identifyWithAudD(audioBlob: Blob): Promise<SongInfo | null> {
    try {
      const apiToken = this.config.apiKeys.audd?.apiToken;
      if (!apiToken) {
        throw new Error('AudD API token not configured');
      }

      const base64Audio = await blobToBase64(audioBlob);
      
      const formData = new FormData();
      formData.append('api_token', apiToken);
      formData.append('audio', audioBlob, 'audio.wav');
      formData.append('return', 'spotify,deezer,apple_music');

      const response = await fetch('https://api.audd.io/', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`AudD API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.status === 'success' && data.result) {
        const result = data.result;
        return {
          title: result.title,
          artist: result.artist,
          album: result.album || 'Unknown Album',
          year: result.release_date ? new Date(result.release_date).getFullYear() : undefined,
          genre: result.spotify?.genres?.[0],
          albumArtUrl: result.spotify?.album?.images?.[0]?.url || result.deezer?.album?.cover_xl,
          duration: result.spotify?.duration_ms ? result.spotify.duration_ms / 1000 : undefined,
          confidence: 0.9,
          identifiedAt: Date.now(),
          externalIds: {
            spotify: result.spotify?.external_urls?.spotify,
            deezer: result.deezer?.link,
          },
        };
      }

      return null;
    } catch (error) {
      console.error('[SongIdentification] AudD error:', error);
      return null;
    }
  }

  /**
   * Identify song using ACRCloud API
   * ACRCloud is more robust but requires more setup
   */
  private async identifyWithACRCloud(audioBlob: Blob): Promise<SongInfo | null> {
    try {
      const { accessKey, accessSecret, host } = this.config.apiKeys.acrcloud || {};
      if (!accessKey || !accessSecret) {
        throw new Error('ACRCloud credentials not configured');
      }

      console.log('[SongIdentification] ACRCloud identification not yet implemented');
      console.log('[SongIdentification] Please use AudD API for now');
      
      return null;
    } catch (error) {
      console.error('[SongIdentification] ACRCloud error:', error);
      return null;
    }
  }

  /**
   * Fetch lyrics from Genius API
   */
  private async fetchGeniusLyrics(songInfo: SongInfo): Promise<LyricsInfo | null> {
    try {
      const accessToken = this.config.apiKeys.genius?.accessToken;
      if (!accessToken) {
        throw new Error('Genius API token not configured');
      }

      const searchQuery = `${songInfo.title} ${songInfo.artist}`;
      const searchUrl = `https://api.genius.com/search?q=${encodeURIComponent(searchQuery)}`;
      
      const searchResponse = await fetch(searchUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!searchResponse.ok) {
        throw new Error(`Genius API error: ${searchResponse.status}`);
      }

      const searchData = await searchResponse.json();
      
      if (searchData.response.hits.length === 0) {
        console.log('[SongIdentification] No Genius lyrics found');
        return null;
      }

      const songUrl = searchData.response.hits[0].result.url;
      
      return {
        plainLyrics: `Lyrics available at: ${songUrl}`,
        source: 'genius',
      };
    } catch (error) {
      console.error('[SongIdentification] Genius error:', error);
      return null;
    }
  }

  /**
   * Fetch lyrics from Musixmatch API
   */
  private async fetchMusixmatchLyrics(songInfo: SongInfo): Promise<LyricsInfo | null> {
    console.log('[SongIdentification] Musixmatch not yet implemented');
    return null;
  }

  /**
   * Get current song info
   */
  getCurrentSong(): SongInfo | null {
    return this.currentSong;
  }

  /**
   * Get current lyrics
   */
  getCurrentLyrics(): LyricsInfo | null {
    return this.currentLyrics;
  }

  /**
   * Store song identification in RAG memory
   */
  private async storeIdentification(songInfo: SongInfo): Promise<void> {
    if (!this.ragMemoryManager) {
      console.log('[SongIdentification] RAG memory manager not available, skipping storage');
      return;
    }

    try {
      const memoryText = `Identified song: "${songInfo.title}" by ${songInfo.artist} from album "${songInfo.album}"${songInfo.year ? ` (${songInfo.year})` : ''}${songInfo.genre ? `, Genre: ${songInfo.genre}` : ''}`;

      const metadata = {
        title: songInfo.title,
        artist: songInfo.artist,
        album: songInfo.album,
        year: songInfo.year || null,
        genre: songInfo.genre || null,
        confidence: songInfo.confidence,
        identifiedAt: songInfo.identifiedAt,
        albumArtUrl: songInfo.albumArtUrl || null,
        externalIds: songInfo.externalIds || {},
      };

      const memoryId = await this.ragMemoryManager.addMemory(
        memoryText,
        'system',
        'song_identification',
        this.currentPersona,
        7,
        metadata
      );

      console.log(`[SongIdentification] Stored in RAG memory with ID: ${memoryId}`);
    } catch (error) {
      console.error('[SongIdentification] Failed to store in RAG memory:', error);
    }
  }

  /**
   * Generate PersonI commentary about the identified song
   */
  private async generatePersonICommentary(songInfo: SongInfo): Promise<void> {
    if (!this.ragMemoryManager || !this.provider) {
      console.log('[SongIdentification] RAG memory or provider not available, skipping commentary');
      return;
    }

    try {
      const searchQuery = `${songInfo.title} by ${songInfo.artist}`;
      const previousMemories = await this.ragMemoryManager.retrieveRelevantMemories(searchQuery, {
        limit: 5,
        threshold: 0.7,
        memoryType: 'song_identification',
      });

      const isRepeated = previousMemories.length > 1;
      const timesHeard = previousMemories.length;

      let contextPrompt = `You are ${this.currentPersona}, providing brief, natural commentary about a song that was just identified.

Song: "${songInfo.title}" by ${songInfo.artist}
Album: ${songInfo.album}${songInfo.year ? `\nYear: ${songInfo.year}` : ''}${songInfo.genre ? `\nGenre: ${songInfo.genre}` : ''}

`;

      if (isRepeated) {
        const previousDates = previousMemories
          .slice(0, 3)
          .map(m => new Date(m.memory.metadata.identifiedAt).toLocaleString());
        
        contextPrompt += `This song has been identified ${timesHeard} times before. Previous occurrences:
${previousDates.map((date, i) => `  ${i + 1}. ${date}`).join('\n')}

Provide a brief, friendly comment acknowledging this is a favorite or recurring song. Keep it under 2 sentences.`;
      } else {
        contextPrompt += `This is the first time identifying this song.

Provide a brief, friendly comment about discovering this new song. Keep it under 2 sentences.`;
      }

      const commentary = await this.provider.generateText(contextPrompt);

      console.log(`[SongIdentification] Generated commentary: ${commentary}`);

      this.dispatchEvent(new CustomEvent('commentary', { 
        detail: { 
          songInfo, 
          commentary, 
          timesHeard,
          isRepeated 
        } 
      }));
    } catch (error) {
      console.error('[SongIdentification] Failed to generate commentary:', error);
    }
  }

  /**
   * Update current persona for memory storage
   */
  setPersona(persona: string): void {
    this.currentPersona = persona;
  }

  /**
   * Update RAG memory manager reference
   */
  setRAGMemoryManager(ragMemoryManager: RAGMemoryManager): void {
    this.ragMemoryManager = ragMemoryManager;
  }

  /**
   * Update provider reference
   */
  setProvider(provider: BaseProvider): void {
    this.provider = provider;
  }

  /**
   * Clear current song and lyrics
   */
  clearCurrent() {
    this.currentSong = null;
    this.currentLyrics = null;
    this.capturedAudioChunks = [];
    this.dispatchEvent(new CustomEvent('cleared'));
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.clearCurrent();
    const micManager = getSharedMicrophone();
    micManager.unregisterConsumer(this.audioConsumerId);
  }
}

export const songIdentificationService = new SongIdentificationService();
