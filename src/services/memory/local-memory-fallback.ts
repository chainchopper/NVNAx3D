/**
 * LocalMemoryFallback Service
 * Provides localStorage-based memory storage with cosine similarity search
 */

import { Memory, MemorySearchOptions, MemorySearchResult } from '../../types/memory';

const STORAGE_KEY = 'personai_vector_memories';

export class LocalMemoryFallback {
  private memories: Memory[] = [];

  constructor() {
    this.initialize();
  }

  initialize(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.memories = JSON.parse(stored);
        console.log(`[LocalMemoryFallback] Loaded ${this.memories.length} memories from localStorage`);
      }
    } catch (error) {
      console.error('[LocalMemoryFallback] Failed to load memories:', error);
      this.memories = [];
    }
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.memories));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.error('[LocalMemoryFallback] ⚠️ QUOTA EXCEEDED - Triggering emergency cleanup');
        // Immediate pruning to oldest 500 memories
        this.emergencyPrune(500);
        // Retry save
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(this.memories));
          console.log('[LocalMemoryFallback] ✓ Save succeeded after emergency cleanup');
        } catch (retryError) {
          console.error('[LocalMemoryFallback] ⚠️ Save failed even after cleanup:', retryError);
        }
      } else {
        console.error('[LocalMemoryFallback] Failed to save memories:', error);
      }
    }
  }

  private emergencyPrune(keepCount: number): void {
    const originalCount = this.memories.length;
    
    // Sort by timestamp in metadata, keep most recent
    this.memories.sort((a, b) => {
      const aTime = a.metadata?.timestamp ? new Date(a.metadata.timestamp).getTime() : 0;
      const bTime = b.metadata?.timestamp ? new Date(b.metadata.timestamp).getTime() : 0;
      return bTime - aTime;
    });

    this.memories = this.memories.slice(0, keepCount);
    
    console.log(`[LocalMemoryFallback] Emergency pruned ${originalCount - this.memories.length} old memories (${originalCount} → ${this.memories.length})`);
  }

  addMemory(memory: Memory): void {
    this.memories.push(memory);
    this.save();
    console.log(`[LocalMemoryFallback] Added memory ${memory.id}, total: ${this.memories.length}`);
  }

  searchMemories(options: MemorySearchOptions, queryEmbedding: number[]): MemorySearchResult[] {
    const {
      limit = 10,
      threshold = 0.7,
      speaker = null,
      persona = null,
      memoryType = null,
    } = options;

    let filtered = this.memories.filter(memory => {
      if (speaker && memory.metadata.speaker !== speaker) return false;
      if (persona && memory.metadata.persona !== persona) return false;
      if (memoryType && memory.metadata.type !== memoryType) return false;
      return memory.embedding !== null;
    });

    const results: MemorySearchResult[] = filtered
      .map(memory => {
        const score = memory.embedding
          ? this.calculateCosineSimilarity(queryEmbedding, memory.embedding)
          : 0;
        return { memory, score };
      })
      .filter(result => result.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    console.log(`[LocalMemoryFallback] Found ${results.length} memories matching criteria`);
    return results;
  }

  calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      console.warn('[LocalMemoryFallback] Vector length mismatch');
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (normA * normB);
  }

  getAllMemories(): Memory[] {
    return [...this.memories];
  }

  clearAllMemories(): void {
    this.memories = [];
    this.save();
    console.log('[LocalMemoryFallback] Cleared all memories');
  }

  getMemoryById(id: string): Memory | null {
    const memory = this.memories.find(m => m.id === id);
    return memory || null;
  }

  deleteMemory(id: string): boolean {
    const index = this.memories.findIndex(m => m.id === id);
    if (index === -1) {
      console.warn(`[LocalMemoryFallback] Memory ${id} not found for deletion`);
      return false;
    }
    this.memories.splice(index, 1);
    this.save();
    console.log(`[LocalMemoryFallback] Deleted memory ${id}, total: ${this.memories.length}`);
    return true;
  }

  updateMemory(id: string, updatedMemory: Memory): boolean {
    const index = this.memories.findIndex(m => m.id === id);
    if (index === -1) {
      console.warn(`[LocalMemoryFallback] Memory ${id} not found for update`);
      return false;
    }
    this.memories[index] = updatedMemory;
    this.save();
    console.log(`[LocalMemoryFallback] Updated memory ${id}`);
    return true;
  }
}
