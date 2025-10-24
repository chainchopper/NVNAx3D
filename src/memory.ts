/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {GoogleGenAI} from '@google/genai';

const COLLECTION_NAME = 'nirvana-memories';
const EMBEDDING_MODEL = 'text-embedding-004';

interface Memory {
  id: string;
  speaker: string;
  text: string;
  timestamp: number;
  embedding: number[];
}

/**
 * Manages conversational memory using localStorage and client-side vector search.
 */
export class MemoryManager {
  private client: GoogleGenAI;
  private memories: Memory[] = [];
  private unknownUserCounter = 1;

  constructor(client: GoogleGenAI) {
    this.client = client;
  }

  /**
   * Initializes the memory manager by loading data from localStorage.
   */
  async init() {
    try {
      const storedMemories = localStorage.getItem(COLLECTION_NAME);
      if (storedMemories) {
        this.memories = JSON.parse(storedMemories);
        // Find the highest existing unknown user number to avoid reuse
        this.memories.forEach((mem) => {
          if (mem.speaker.startsWith('Unknown User #')) {
            const num = parseInt(mem.speaker.split('#')[1], 10);
            if (!isNaN(num) && num >= this.unknownUserCounter) {
              this.unknownUserCounter = num + 1;
            }
          }
        });
      }
    } catch (e) {
      console.error('Failed to load memories from localStorage:', e);
      this.memories = [];
    }
  }

  /**
   * Persists the current memories to localStorage.
   */
  private save() {
    localStorage.setItem(COLLECTION_NAME, JSON.stringify(this.memories));
  }

  /**
   * Creates a vector embedding for a given text.
   */
  private async createEmbedding(text: string): Promise<number[]> {
    // FIX: The `embedContent` parameter is `contents`, not `content`.
    const response = await this.client.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: {parts: [{text}]},
    });
    // FIX: The response contains an `embeddings` array.
    return response.embeddings[0].values;
  }

  /**
   * Adds a new piece of text to the conversation memory.
   */
  async addFragment(text: string, speaker: string) {
    if (!text.trim()) return;

    const embedding = await this.createEmbedding(text);
    const timestamp = Date.now();
    const id = `${timestamp}-${crypto.randomUUID()}`;

    this.memories.push({id, speaker, text, timestamp, embedding});
    this.save();
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    let magA = 0;
    let magB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      magA += vecA[i] * vecA[i];
      magB += vecB[i] * vecB[i];
    }
    magA = Math.sqrt(magA);
    magB = Math.sqrt(magB);
    if (magA === 0 || magB === 0) {
      return 0;
    }
    return dotProduct / (magA * magB);
  }

  /**
   * Retrieves the most relevant memories based on a query.
   */
  async retrieveRelevantMemories(query: string): Promise<{
    context: string;
    unknownSpeakerId: string | null;
  }> {
    if (this.memories.length === 0) {
      return {context: 'No memories available.', unknownSpeakerId: null};
    }

    const queryEmbedding = await this.createEmbedding(query);

    const scoredMemories = this.memories.map((mem) => ({
      ...mem,
      similarity: this.cosineSimilarity(queryEmbedding, mem.embedding),
    }));

    scoredMemories.sort((a, b) => b.similarity - a.similarity);

    const topMemories = scoredMemories.slice(0, 10);

    if (topMemories.length === 0 || topMemories[0].similarity < 0.5) {
      return {context: 'No relevant memories found.', unknownSpeakerId: null};
    }

    let unknownSpeakerId: string | null = null;
    const context = topMemories
      .map((meta) => {
        if (meta.speaker.startsWith('Unknown User') && !unknownSpeakerId) {
          unknownSpeakerId = meta.speaker;
        }
        return `${meta.speaker}: ${meta.text}`;
      })
      .join('\n');

    return {context, unknownSpeakerId};
  }

  /**
   * This is a placeholder for true voice fingerprinting.
   * For now, we'll create a new unknown user for each conversation segment.
   */
  async findClosestSpeaker(
    text: string,
  ): Promise<{speaker: string; distance: number}> {
    // This is a simplification. A real implementation would compare audio fingerprints.
    // For now, we'll assign a new unknown user ID for this segment of speech.
    const speakerTag = `Unknown User #${this.unknownUserCounter}`;
    this.unknownUserCounter++;
    return {speaker: speakerTag, distance: 1};
  }

  /**
   * Fetches all memories, sorted by timestamp.
   */
  async getAllMemories(): Promise<Memory[]> {
    // Return a copy sorted by timestamp for display
    return [...this.memories].sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Updates a speaker's name across all their memories.
   */
  async updateSpeaker(currentName: string, newName: string) {
    let updated = false;
    this.memories.forEach((mem) => {
      if (mem.speaker === currentName) {
        mem.speaker = newName;
        updated = true;
      }
    });

    if (updated) {
      this.save();
    }
  }

  /**
   * Clears all memories from localStorage.
   */
  async clear() {
    this.memories = [];
    this.unknownUserCounter = 1;
    this.save();
  }
}