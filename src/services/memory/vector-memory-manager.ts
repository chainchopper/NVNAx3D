/**
 * VectorMemoryManager Service
 * Manages vector database with ChromaDB or localStorage fallback
 */

import { LocalMemoryFallback } from './local-memory-fallback';

declare global {
  interface Window {
    chroma?: any;
  }
}

export class VectorMemoryManager {
  protected chromaClient: any = null;
  protected collection: any = null;
  protected localFallback: LocalMemoryFallback | null = null;
  protected ready = false;
  protected usingChroma = false;
  protected collectionName = 'personai_memories';

  async initializeDatabase(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.chroma) {
        await this.initializeChroma();
      } else {
        console.log('[VectorMemoryManager] ChromaDB not available, using localStorage fallback');
        this.initializeFallback();
      }
      this.ready = true;
    } catch (error) {
      console.error('[VectorMemoryManager] Initialization error:', error);
      console.log('[VectorMemoryManager] Falling back to localStorage');
      this.initializeFallback();
      this.ready = true;
    }
  }

  private async initializeChroma(): Promise<void> {
    try {
      this.chromaClient = new window.chroma.ChromaClient();
      
      this.collection = await this.chromaClient.getOrCreateCollection({
        name: this.collectionName,
        metadata: { 
          'hnsw:space': 'cosine',
          description: 'PersonAI memory storage with semantic search'
        },
      });

      this.usingChroma = true;
      console.log('[VectorMemoryManager] ChromaDB initialized successfully');
    } catch (error) {
      console.error('[VectorMemoryManager] ChromaDB initialization failed:', error);
      throw error;
    }
  }

  private initializeFallback(): void {
    this.localFallback = new LocalMemoryFallback();
    this.usingChroma = false;
    console.log('[VectorMemoryManager] LocalMemoryFallback initialized');
  }

  isReady(): boolean {
    return this.ready;
  }

  isUsingChroma(): boolean {
    return this.usingChroma;
  }

  getCollection(): any {
    return this.collection;
  }

  getLocalFallback(): LocalMemoryFallback | null {
    return this.localFallback;
  }
}
