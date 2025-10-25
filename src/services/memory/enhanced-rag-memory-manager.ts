/**
 * EnhancedRAGMemoryManager Service
 * Extended RAG memory system with advanced speaker management, temporal queries, and memory type categorization
 */

import { RAGMemoryManager } from './rag-memory-manager';
import type { 
  Memory, 
  MemoryType, 
  MemorySearchOptions, 
  MemorySearchResult,
  SpeakerStats,
  EnhancedSearchOptions
} from '../../types/memory';

export class EnhancedRAGMemoryManager extends RAGMemoryManager {
  
  async getAllMemories(): Promise<Memory[]> {
    if (!this.isReady()) {
      throw new Error('EnhancedRAGMemoryManager not ready. Call initialize() first.');
    }

    if (this.usingChroma && this.collection) {
      return await this.getAllMemoriesFromChroma();
    } else if (this.localFallback) {
      return this.localFallback.getAllMemories();
    } else {
      throw new Error('No storage backend available');
    }
  }

  private async getAllMemoriesFromChroma(): Promise<Memory[]> {
    try {
      const result = await this.collection.get({
        limit: 100000,
      });

      if (!result.ids || result.ids.length === 0) {
        return [];
      }

      const memories: Memory[] = [];
      for (let i = 0; i < result.ids.length; i++) {
        memories.push({
          id: result.ids[i],
          text: result.documents[i],
          embedding: result.embeddings ? result.embeddings[i] : null,
          metadata: result.metadatas[i],
        });
      }

      return memories;
    } catch (error) {
      console.error('[EnhancedRAGMemoryManager] Failed to get all memories from ChromaDB:', error);
      throw error;
    }
  }

  async getMemoriesByType(type: MemoryType): Promise<Memory[]> {
    const memories = await this.getAllMemories();
    return memories.filter(memory => memory.metadata.type === type)
      .sort((a, b) => 
        new Date(b.metadata.timestamp).getTime() - new Date(a.metadata.timestamp).getTime()
      );
  }

  private normalizeSpeaker(speaker: string): string {
    return speaker.toLowerCase().trim();
  }

  private calculateRecencyBoost(timestamp: string): number {
    const memoryDate = new Date(timestamp);
    const now = new Date();
    const daysDiff = (now.getTime() - memoryDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysDiff < 1) return 1.0;
    if (daysDiff < 2) return 0.9;
    if (daysDiff < 7) return 0.8;
    if (daysDiff < 30) return 0.7;
    if (daysDiff < 90) return 0.6;
    return 0.5;
  }

  private getDateRangeKey(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private isDateInRange(timestamp: string, startDate: Date, endDate: Date): boolean {
    const memoryDate = new Date(timestamp);
    return memoryDate >= startDate && memoryDate <= endDate;
  }

  async getSpeakers(): Promise<string[]> {
    const memories = await this.getAllMemories();
    const speakersSet = new Set<string>();
    
    memories.forEach(memory => {
      if (memory.metadata.speaker) {
        speakersSet.add(memory.metadata.speaker);
      }
    });

    return Array.from(speakersSet).sort();
  }

  async getSpeakerStats(speaker: string): Promise<SpeakerStats> {
    const memories = await this.getAllMemories();
    const normalizedSpeaker = this.normalizeSpeaker(speaker);
    
    const speakerMemories = memories.filter(
      memory => this.normalizeSpeaker(memory.metadata.speaker) === normalizedSpeaker
    );

    if (speakerMemories.length === 0) {
      throw new Error(`No memories found for speaker: ${speaker}`);
    }

    const timestamps = speakerMemories.map(m => new Date(m.metadata.timestamp));
    const importanceScores = speakerMemories.map(m => m.metadata.importance || 5);

    return {
      speaker: speakerMemories[0].metadata.speaker,
      messageCount: speakerMemories.length,
      firstSeen: new Date(Math.min(...timestamps.map(d => d.getTime()))),
      lastSeen: new Date(Math.max(...timestamps.map(d => d.getTime()))),
      averageImportance: importanceScores.reduce((a, b) => a + b, 0) / importanceScores.length,
    };
  }

  async getMemoriesBySpeaker(speaker: string, limit?: number): Promise<Memory[]> {
    const memories = await this.getAllMemories();
    const normalizedSpeaker = this.normalizeSpeaker(speaker);
    
    let speakerMemories = memories.filter(
      memory => this.normalizeSpeaker(memory.metadata.speaker) === normalizedSpeaker
    );

    speakerMemories.sort((a, b) => 
      new Date(b.metadata.timestamp).getTime() - new Date(a.metadata.timestamp).getTime()
    );

    if (limit) {
      speakerMemories = speakerMemories.slice(0, limit);
    }

    return speakerMemories;
  }

  async getConversationBetween(speaker1: string, speaker2: string): Promise<Memory[]> {
    const memories = await this.getAllMemories();
    const normalizedSpeaker1 = this.normalizeSpeaker(speaker1);
    const normalizedSpeaker2 = this.normalizeSpeaker(speaker2);
    
    const conversationMemories = memories.filter(memory => {
      const normalizedSpeaker = this.normalizeSpeaker(memory.metadata.speaker);
      return (
        normalizedSpeaker === normalizedSpeaker1 || 
        normalizedSpeaker === normalizedSpeaker2
      );
    });

    conversationMemories.sort((a, b) => 
      new Date(a.metadata.timestamp).getTime() - new Date(b.metadata.timestamp).getTime()
    );

    return conversationMemories;
  }

  async getMemoriesInDateRange(
    startDate: Date, 
    endDate: Date, 
    options: MemorySearchOptions = {}
  ): Promise<Memory[]> {
    const memories = await this.getAllMemories();
    
    let filtered = memories.filter(memory => 
      this.isDateInRange(memory.metadata.timestamp, startDate, endDate)
    );

    if (options.speaker) {
      const normalizedSpeaker = this.normalizeSpeaker(options.speaker);
      filtered = filtered.filter(
        memory => this.normalizeSpeaker(memory.metadata.speaker) === normalizedSpeaker
      );
    }

    if (options.persona) {
      filtered = filtered.filter(memory => memory.metadata.persona === options.persona);
    }

    if (options.memoryType) {
      filtered = filtered.filter(memory => memory.metadata.type === options.memoryType);
    }

    filtered.sort((a, b) => 
      new Date(b.metadata.timestamp).getTime() - new Date(a.metadata.timestamp).getTime()
    );

    if (options.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }

  async getMemoriesToday(): Promise<Memory[]> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    
    return this.getMemoriesInDateRange(startOfDay, endOfDay);
  }

  async getMemoriesYesterday(): Promise<Memory[]> {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const startOfDay = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0);
    const endOfDay = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59);
    
    return this.getMemoriesInDateRange(startOfDay, endOfDay);
  }

  async getMemoriesLastWeek(): Promise<Memory[]> {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    return this.getMemoriesInDateRange(weekAgo, now);
  }

  async getMemoriesByDay(): Promise<Map<string, Memory[]>> {
    const memories = await this.getAllMemories();
    const groupedByDay = new Map<string, Memory[]>();

    memories.forEach(memory => {
      const dateKey = this.getDateRangeKey(new Date(memory.metadata.timestamp));
      
      if (!groupedByDay.has(dateKey)) {
        groupedByDay.set(dateKey, []);
      }
      
      groupedByDay.get(dateKey)!.push(memory);
    });

    groupedByDay.forEach((memories) => {
      memories.sort((a, b) => 
        new Date(a.metadata.timestamp).getTime() - new Date(b.metadata.timestamp).getTime()
      );
    });

    return groupedByDay;
  }

  async getNotes(limit?: number): Promise<Memory[]> {
    const memories = await this.getAllMemories();
    
    let notes = memories.filter(memory => memory.metadata.type === 'note');
    
    notes.sort((a, b) => {
      const importanceDiff = (b.metadata.importance || 5) - (a.metadata.importance || 5);
      if (importanceDiff !== 0) return importanceDiff;
      return new Date(b.metadata.timestamp).getTime() - new Date(a.metadata.timestamp).getTime();
    });

    if (limit) {
      notes = notes.slice(0, limit);
    }

    return notes;
  }

  async getPreferences(limit?: number): Promise<Memory[]> {
    const memories = await this.getAllMemories();
    
    let preferences = memories.filter(memory => memory.metadata.type === 'preference');
    
    preferences.sort((a, b) => {
      const importanceDiff = (b.metadata.importance || 5) - (a.metadata.importance || 5);
      if (importanceDiff !== 0) return importanceDiff;
      return new Date(b.metadata.timestamp).getTime() - new Date(a.metadata.timestamp).getTime();
    });

    if (limit) {
      preferences = preferences.slice(0, limit);
    }

    return preferences;
  }

  async getFacts(limit?: number): Promise<Memory[]> {
    const memories = await this.getAllMemories();
    
    let facts = memories.filter(memory => memory.metadata.type === 'fact');
    
    facts.sort((a, b) => {
      const importanceDiff = (b.metadata.importance || 5) - (a.metadata.importance || 5);
      if (importanceDiff !== 0) return importanceDiff;
      return new Date(b.metadata.timestamp).getTime() - new Date(a.metadata.timestamp).getTime();
    });

    if (limit) {
      facts = facts.slice(0, limit);
    }

    return facts;
  }

  async getReminders(active: boolean = true): Promise<Memory[]> {
    const memories = await this.getAllMemories();
    
    let reminders = memories.filter(memory => memory.metadata.type === 'reminder');

    if (active) {
      const now = new Date();
      reminders = reminders.filter(memory => {
        const reminderDate = memory.metadata.reminderDate 
          ? new Date(memory.metadata.reminderDate) 
          : null;
        return !reminderDate || reminderDate >= now;
      });
    }
    
    reminders.sort((a, b) => {
      if (a.metadata.reminderDate && b.metadata.reminderDate) {
        return new Date(a.metadata.reminderDate).getTime() - new Date(b.metadata.reminderDate).getTime();
      }
      const importanceDiff = (b.metadata.importance || 5) - (a.metadata.importance || 5);
      if (importanceDiff !== 0) return importanceDiff;
      return new Date(b.metadata.timestamp).getTime() - new Date(a.metadata.timestamp).getTime();
    });

    return reminders;
  }

  async getTasks(limit?: number): Promise<Memory[]> {
    const memories = await this.getAllMemories();
    
    let tasks = memories.filter(memory => memory.metadata.type === 'task');
    
    tasks.sort((a, b) => {
      const priorityDiff = (b.metadata.priority || 3) - (a.metadata.priority || 3);
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.metadata.updatedAt || b.metadata.timestamp).getTime() - new Date(a.metadata.updatedAt || a.metadata.timestamp).getTime();
    });

    if (limit) {
      tasks = tasks.slice(0, limit);
    }

    return tasks;
  }

  async searchWithTimeBoost(
    query: string, 
    options: EnhancedSearchOptions = {}
  ): Promise<Memory[]> {
    const {
      dateRange,
      importanceThreshold,
      timeBoost = true,
      ...baseOptions
    } = options;

    const results = await this.retrieveRelevantMemories(query, baseOptions);

    let processedResults = results.map(result => {
      let adjustedScore = result.score;

      if (timeBoost) {
        const recencyBoost = this.calculateRecencyBoost(result.memory.metadata.timestamp);
        adjustedScore *= recencyBoost;
      }

      if (importanceThreshold && result.memory.metadata.importance < importanceThreshold) {
        return null;
      }

      return {
        ...result,
        score: adjustedScore,
      };
    }).filter((r): r is MemorySearchResult => r !== null);

    if (dateRange) {
      processedResults = processedResults.filter(result =>
        this.isDateInRange(result.memory.metadata.timestamp, dateRange.start, dateRange.end)
      );
    }

    processedResults.sort((a, b) => b.score - a.score);

    return processedResults.map(r => r.memory);
  }

  async searchByTags(
    tags: string[], 
    options: MemorySearchOptions = {}
  ): Promise<Memory[]> {
    const memories = await this.getAllMemories();
    
    let filtered = memories.filter(memory => {
      const memoryTags = memory.metadata.tags as string[] | undefined;
      if (!memoryTags || !Array.isArray(memoryTags)) {
        return false;
      }
      return tags.some(tag => memoryTags.includes(tag));
    });

    if (options.speaker) {
      const normalizedSpeaker = this.normalizeSpeaker(options.speaker);
      filtered = filtered.filter(
        memory => this.normalizeSpeaker(memory.metadata.speaker) === normalizedSpeaker
      );
    }

    if (options.persona) {
      filtered = filtered.filter(memory => memory.metadata.persona === options.persona);
    }

    if (options.memoryType) {
      filtered = filtered.filter(memory => memory.metadata.type === options.memoryType);
    }

    filtered.sort((a, b) => {
      const importanceDiff = (b.metadata.importance || 5) - (a.metadata.importance || 5);
      if (importanceDiff !== 0) return importanceDiff;
      return new Date(b.metadata.timestamp).getTime() - new Date(a.metadata.timestamp).getTime();
    });

    if (options.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }
}

export const enhancedRagMemoryManager = new EnhancedRAGMemoryManager();
