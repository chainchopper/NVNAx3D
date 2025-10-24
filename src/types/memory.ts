/**
 * Memory system types and interfaces
 */

export type MemoryType = 'conversation' | 'note' | 'reminder' | 'preference' | 'fact';

export interface Memory {
  id: string;
  text: string;
  embedding: number[] | null;
  metadata: {
    speaker: string;
    timestamp: string;
    type: MemoryType;
    persona: string;
    importance: number;
    [key: string]: any;
  };
}

export interface MemorySearchOptions {
  limit?: number;
  threshold?: number;
  speaker?: string | null;
  persona?: string | null;
  memoryType?: MemoryType | null;
}

export interface MemorySearchResult {
  memory: Memory;
  score: number;
}

export interface SpeakerStats {
  speaker: string;
  messageCount: number;
  firstSeen: Date;
  lastSeen: Date;
  averageImportance: number;
}

export interface EnhancedSearchOptions extends MemorySearchOptions {
  dateRange?: { start: Date; end: Date };
  tags?: string[];
  timeBoost?: boolean;
  importanceThreshold?: number;
}
