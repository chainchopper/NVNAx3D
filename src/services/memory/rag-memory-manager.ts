/**
 * RAGMemoryManager Service
 * Main RAG memory system orchestrator with add/retrieve operations
 */

import { VectorMemoryManager } from './vector-memory-manager';
import { EmbeddingGenerator } from './embedding-generator';
import { Memory, MemoryType, MemorySearchOptions, MemorySearchResult } from '../../types/memory';

export class RAGMemoryManager extends VectorMemoryManager {
  private embeddingGenerator: EmbeddingGenerator;
  private initialized = false;

  constructor() {
    super();
    this.embeddingGenerator = new EmbeddingGenerator();
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('[RAGMemoryManager] Already initialized');
      return;
    }

    console.log('[RAGMemoryManager] Initializing...');
    
    await this.embeddingGenerator.initialize();
    await this.initializeDatabase();

    this.initialized = true;
    
    const storageType = this.isUsingChroma() ? 'ChromaDB' : 'localStorage';
    const embeddingType = this.embeddingGenerator.isGeminiAvailable() ? 'Gemini' : 'fallback';
    console.log(`[RAGMemoryManager] Initialized with ${storageType} storage and ${embeddingType} embeddings`);
  }

  async addMemory(
    text: string,
    speaker: string,
    type: MemoryType,
    persona: string,
    importance: number = 5,
    additionalMetadata: Record<string, any> = {}
  ): Promise<string> {
    if (!this.isReady()) {
      throw new Error('RAGMemoryManager not ready. Call initialize() first.');
    }

    const id = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();

    console.log(`[RAGMemoryManager] Generating embedding for memory: "${text.substring(0, 50)}..."`);
    const embedding = await this.embeddingGenerator.generateEmbedding(text);

    const memory: Memory = {
      id,
      text,
      embedding,
      metadata: {
        speaker,
        timestamp,
        type,
        persona,
        importance,
        ...additionalMetadata,
      },
    };

    if (this.usingChroma && this.collection) {
      await this.addToChroma(memory);
    } else if (this.localFallback) {
      this.localFallback.addMemory(memory);
    } else {
      throw new Error('No storage backend available');
    }

    console.log(`[RAGMemoryManager] Memory added: ${id}`);
    return id;
  }

  private async addToChroma(memory: Memory): Promise<void> {
    try {
      await this.collection.add({
        ids: [memory.id],
        embeddings: [memory.embedding],
        documents: [memory.text],
        metadatas: [memory.metadata],
      });
    } catch (error) {
      console.error('[RAGMemoryManager] Failed to add to ChromaDB:', error);
      throw error;
    }
  }

  async retrieveRelevantMemories(
    query: string,
    options: MemorySearchOptions = {}
  ): Promise<MemorySearchResult[]> {
    if (!this.isReady()) {
      throw new Error('RAGMemoryManager not ready. Call initialize() first.');
    }

    const {
      limit = 10,
      threshold = 0.7,
      speaker = null,
      persona = null,
      memoryType = null,
    } = options;

    console.log(`[RAGMemoryManager] Searching for memories matching: "${query.substring(0, 50)}..."`);
    
    const queryEmbedding = await this.embeddingGenerator.generateEmbedding(query);

    let results: MemorySearchResult[];

    if (this.usingChroma && this.collection) {
      results = await this.searchChroma(queryEmbedding, options);
    } else if (this.localFallback) {
      results = this.localFallback.searchMemories(options, queryEmbedding);
    } else {
      throw new Error('No storage backend available');
    }

    console.log(`[RAGMemoryManager] Found ${results.length} relevant memories`);
    return results;
  }

  private async searchChroma(
    queryEmbedding: number[],
    options: MemorySearchOptions
  ): Promise<MemorySearchResult[]> {
    const {
      limit = 10,
      threshold = 0.7,
      speaker = null,
      persona = null,
      memoryType = null,
    } = options;

    try {
      const where: Record<string, any> = {};
      if (speaker) where.speaker = speaker;
      if (persona) where.persona = persona;
      if (memoryType) where.type = memoryType;

      const queryParams: any = {
        queryEmbeddings: [queryEmbedding],
        nResults: limit,
      };

      if (Object.keys(where).length > 0) {
        queryParams.where = where;
      }

      const chromaResults = await this.collection.query(queryParams);

      return this.processChromaResults(chromaResults, threshold);
    } catch (error) {
      console.error('[RAGMemoryManager] ChromaDB search failed:', error);
      throw error;
    }
  }

  private processChromaResults(chromaResults: any, threshold: number): MemorySearchResult[] {
    const results: MemorySearchResult[] = [];

    if (!chromaResults.ids || !chromaResults.ids[0]) {
      return results;
    }

    const ids = chromaResults.ids[0];
    const documents = chromaResults.documents[0];
    const metadatas = chromaResults.metadatas[0];
    const distances = chromaResults.distances[0];

    for (let i = 0; i < ids.length; i++) {
      const score = 1 - (distances[i] || 0);
      
      if (score >= threshold) {
        const memory: Memory = {
          id: ids[i],
          text: documents[i],
          embedding: null,
          metadata: metadatas[i],
        };

        results.push({ memory, score });
      }
    }

    return results;
  }

  formatMemoriesForContext(results: MemorySearchResult[]): string {
    if (results.length === 0) {
      return 'No relevant memories found.';
    }

    const formatted = results.map((result, index) => {
      const { memory, score } = result;
      const { speaker, type, timestamp, importance } = memory.metadata;
      const date = new Date(timestamp).toLocaleString();
      
      return `[Memory ${index + 1}] (relevance: ${(score * 100).toFixed(1)}%, importance: ${importance}/10)
Speaker: ${speaker}
Type: ${type}
Date: ${date}
Content: ${memory.text}`;
    });

    return formatted.join('\n\n');
  }

  async clearAllMemories(): Promise<void> {
    if (!this.isReady()) {
      throw new Error('RAGMemoryManager not ready. Call initialize() first.');
    }

    if (this.usingChroma && this.collection) {
      try {
        await this.chromaClient.deleteCollection({ name: this.collectionName });
        await this.initializeDatabase();
        console.log('[RAGMemoryManager] ChromaDB collection cleared and recreated');
      } catch (error) {
        console.error('[RAGMemoryManager] Failed to clear ChromaDB:', error);
        throw error;
      }
    } else if (this.localFallback) {
      this.localFallback.clearAllMemories();
      console.log('[RAGMemoryManager] localStorage memories cleared');
    }
  }

  getStorageInfo(): { type: string; embeddingType: string; ready: boolean } {
    return {
      type: this.isUsingChroma() ? 'ChromaDB' : 'localStorage',
      embeddingType: this.embeddingGenerator.isGeminiAvailable() ? 'Gemini' : 'fallback',
      ready: this.isReady() && this.initialized,
    };
  }
}

export const ragMemoryManager = new RAGMemoryManager();
