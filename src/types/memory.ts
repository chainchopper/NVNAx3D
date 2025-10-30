/**
 * Memory system types and interfaces
 */

export type MemoryType = 
  | 'conversation' 
  | 'note' 
  | 'reminder' 
  | 'preference' 
  | 'fact' 
  | 'task' 
  | 'song_identification' 
  | 'routine'
  | 'audio_recording'
  | 'camera_observation'
  | 'email_summary'
  | 'call_log'
  | 'text_message'
  | 'agent_task'
  | 'system_status'
  | 'voice_clone'
  | 'file_upload';

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

export interface NoteSummary {
  id: string;
  title: string;
  tags: string[];
  timestamp: string;
  createdByPersona: string;
  importance: number;
}

export interface NoteDetail extends NoteSummary {
  content: string;
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface TaskSummary {
  id: string;
  title: string;
  status: TaskStatus;
  priority: number;
  dueDate: string | null;
  assignee: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  isOverdue: boolean;
}

export interface TaskDetail extends TaskSummary {
  description: string;
}
