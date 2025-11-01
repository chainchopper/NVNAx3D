/**
 * EmbeddingGenerator Service
 * Generates embeddings using Gemini text-embedding-004 with fallback
 * SECURITY: Uses backend proxy to prevent API key exposure in browser
 */

import { providerManager } from '../provider-manager';

export class EmbeddingGenerator {
  private cache: Map<string, number[]> = new Map();
  private embedModel = 'text-embedding-004';
  private geminiAvailable = false;

  constructor() {
    // Backend proxy uses relative URLs (Vite proxy handles routing to port 3001)
  }

  async initialize(): Promise<boolean> {
    try {
      const providers = providerManager.getAllProviders();
      const googleProvider = providers.find(p => p.type === 'google' && p.enabled && p.verified);

      if (googleProvider) {
        // Check if backend has Gemini API key by making a test call (Vite proxy handles routing)
        try {
          const response = await fetch('/api/gemini/embeddings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: this.embedModel,
              text: 'test',
            }),
          });
          
          this.geminiAvailable = response.ok;
          console.log('[EmbeddingGenerator] Initialized with Gemini API via backend proxy');
          return true;
        } catch (error) {
          console.warn('[EmbeddingGenerator] Backend Gemini API not available, using fallback:', error);
          this.geminiAvailable = false;
          return false;
        }
      } else {
        console.warn('[EmbeddingGenerator] No valid Google provider found, using fallback embeddings');
        this.geminiAvailable = false;
        return false;
      }
    } catch (error) {
      console.error('[EmbeddingGenerator] Initialization failed:', error);
      this.geminiAvailable = false;
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
      if (this.geminiAvailable) {
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
    try {
      // Call backend proxy endpoint instead of using API key directly (Vite proxy handles routing)
      const response = await fetch('/api/gemini/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.embedModel,
          text,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `Backend returned ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success || !data.data.embedding) {
        throw new Error(data.error || 'Backend request failed or no embedding returned');
      }

      return data.data.embedding;
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
    return this.geminiAvailable;
  }
}
