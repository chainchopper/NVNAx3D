/**
 * EmbeddingGenerator Service
 * Generates embeddings using Gemini text-embedding-004 with fallback
 */

import { GoogleGenAI } from '@google/genai';
import { providerManager } from '../provider-manager';

export class EmbeddingGenerator {
  private cache: Map<string, number[]> = new Map();
  private client: GoogleGenAI | null = null;
  private embedModel = 'text-embedding-004';

  async initialize(): Promise<boolean> {
    try {
      const providers = providerManager.getAllProviders();
      const googleProvider = providers.find(p => p.type === 'google' && p.enabled && p.verified && p.apiKey);

      if (googleProvider && googleProvider.apiKey) {
        this.client = new GoogleGenAI({ apiKey: googleProvider.apiKey });
        console.log('[EmbeddingGenerator] Initialized with Gemini API');
        return true;
      } else {
        console.warn('[EmbeddingGenerator] No valid Google provider found, using fallback embeddings');
        return false;
      }
    } catch (error) {
      console.error('[EmbeddingGenerator] Initialization failed:', error);
      return false;
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const cacheKey = String(this.hashString(text));
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    let embedding: number[];

    try {
      if (this.client) {
        embedding = await this.generateGeminiEmbedding(text);
      } else {
        embedding = this.generateFallbackEmbedding(text);
      }
    } catch (error) {
      console.warn('[EmbeddingGenerator] Gemini embedding failed, using fallback:', error);
      embedding = this.generateFallbackEmbedding(text);
    }

    this.cache.set(cacheKey, embedding);
    
    if (this.cache.size > 1000) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    return embedding;
  }

  private async generateGeminiEmbedding(text: string): Promise<number[]> {
    if (!this.client) {
      throw new Error('Gemini client not initialized');
    }

    try {
      const result = await this.client.models.embedContent({
        model: this.embedModel,
        contents: [{ parts: [{ text }] }],
      });

      if (result.embeddings && result.embeddings.length > 0) {
        return result.embeddings[0].values;
      }

      throw new Error('No embedding returned from Gemini');
    } catch (error) {
      console.error('[EmbeddingGenerator] Gemini API error:', error);
      throw error;
    }
  }

  generateFallbackEmbedding(text: string): number[] {
    const dimension = 768;
    const embedding = new Array(dimension).fill(0);
    
    const normalized = text.toLowerCase().trim();
    
    for (let i = 0; i < normalized.length; i++) {
      const charCode = normalized.charCodeAt(i);
      const idx = (charCode * (i + 1)) % dimension;
      embedding[idx] += 1 / (i + 1);
    }
    
    const words = normalized.split(/\s+/).filter(w => w.length > 0);
    words.forEach((word, wordIdx) => {
      const wordHash = this.hashString(word);
      const idx = Math.abs(wordHash) % dimension;
      embedding[idx] += (words.length - wordIdx) / words.length;
    });
    
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= magnitude;
      }
    }

    return embedding;
  }

  hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  }

  clearCache(): void {
    this.cache.clear();
    console.log('[EmbeddingGenerator] Cache cleared');
  }

  isGeminiAvailable(): boolean {
    return this.client !== null;
  }
}
