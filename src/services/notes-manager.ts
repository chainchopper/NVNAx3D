/**
 * NotesManager Service
 * Manages note-taking with CRUD operations leveraging RAG memory system
 */

import { EnhancedRAGMemoryManager } from './memory/enhanced-rag-memory-manager';
import { NoteSummary, NoteDetail, Memory } from '../types/memory';

export class NotesManager {
  private ragMemory: EnhancedRAGMemoryManager;
  private initialized = false;

  constructor() {
    this.ragMemory = new EnhancedRAGMemoryManager();
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('[NotesManager] Already initialized');
      return;
    }

    await this.ragMemory.initialize();
    this.initialized = true;
    console.log('[NotesManager] Initialized successfully');
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('NotesManager not initialized. Call initialize() first.');
    }
  }

  async createNote(params: {
    title: string;
    content: string;
    tags?: string[];
    persona?: string;
    importance?: number;
  }): Promise<string> {
    this.ensureInitialized();

    const { title, content, tags = [], persona = 'user', importance = 5 } = params;

    if (!title || title.trim().length === 0) {
      throw new Error('Note title cannot be empty');
    }

    if (!content || content.trim().length === 0) {
      throw new Error('Note content cannot be empty');
    }

    if (importance < 1 || importance > 10) {
      throw new Error('Importance must be between 1 and 10');
    }

    const combinedText = `${title}\n\n${content}`;
    const timestamp = new Date().toISOString();

    const id = await this.ragMemory.addMemory(
      combinedText,
      'user',
      'note',
      persona,
      importance,
      {
        noteTitle: title,
        noteContent: content,
        tags,
        createdByPersona: persona,
        lastModified: timestamp,
      }
    );

    console.log(`[NotesManager] Created note: ${id} - "${title}"`);
    return id;
  }

  async getNotes(filters?: {
    tag?: string;
    searchText?: string;
    persona?: string;
  }): Promise<NoteSummary[]> {
    this.ensureInitialized();

    let notes: Memory[];

    if (filters?.tag) {
      notes = await this.ragMemory.searchByTags([filters.tag], {
        memoryType: 'note',
        persona: filters.persona || null,
      });
    } else {
      notes = await this.ragMemory.getNotes();
      
      if (filters?.persona) {
        notes = notes.filter(note => note.metadata.createdByPersona === filters.persona);
      }
    }

    if (filters?.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      notes = notes.filter(note => {
        const title = note.metadata.noteTitle || '';
        const content = note.metadata.noteContent || '';
        return (
          title.toLowerCase().includes(searchLower) ||
          content.toLowerCase().includes(searchLower)
        );
      });
    }

    return notes.map(note => this.memoryToNoteSummary(note));
  }

  async getNoteById(id: string): Promise<NoteDetail | null> {
    this.ensureInitialized();

    const memory = await this.ragMemory.getMemoryById(id);
    
    if (!memory || memory.metadata.type !== 'note') {
      return null;
    }

    return this.memoryToNoteDetail(memory);
  }

  async updateNote(id: string, updates: {
    title?: string;
    content?: string;
    tags?: string[];
    importance?: number;
  }): Promise<void> {
    this.ensureInitialized();

    const existingMemory = await this.ragMemory.getMemoryById(id);
    
    if (!existingMemory || existingMemory.metadata.type !== 'note') {
      throw new Error(`Note with ID ${id} not found`);
    }

    const currentTitle = existingMemory.metadata.noteTitle || '';
    const currentContent = existingMemory.metadata.noteContent || '';
    const currentTags = existingMemory.metadata.tags || [];
    const currentImportance = existingMemory.metadata.importance || 5;

    const newTitle = updates.title !== undefined ? updates.title : currentTitle;
    const newContent = updates.content !== undefined ? updates.content : currentContent;
    const newTags = updates.tags !== undefined ? updates.tags : currentTags;
    const newImportance = updates.importance !== undefined ? updates.importance : currentImportance;

    if (newImportance < 1 || newImportance > 10) {
      throw new Error('Importance must be between 1 and 10');
    }

    const titleOrContentChanged = newTitle !== currentTitle || newContent !== currentContent;
    
    let updatedText = existingMemory.text;
    let updatedEmbedding = existingMemory.embedding;

    if (titleOrContentChanged) {
      updatedText = `${newTitle}\n\n${newContent}`;
      const embeddingGenerator = (this.ragMemory as any).embeddingGenerator;
      if (embeddingGenerator) {
        updatedEmbedding = await embeddingGenerator.generateEmbedding(updatedText);
      }
    }

    const timestamp = new Date().toISOString();

    const updatedMemory: Memory = {
      ...existingMemory,
      text: updatedText,
      embedding: updatedEmbedding,
      metadata: {
        ...existingMemory.metadata,
        noteTitle: newTitle,
        noteContent: newContent,
        tags: newTags,
        importance: newImportance,
        lastModified: timestamp,
      },
    };

    await this.ragMemory.updateMemory(id, updatedMemory);
    console.log(`[NotesManager] Updated note: ${id} - "${newTitle}"`);
  }

  async deleteNote(id: string): Promise<void> {
    this.ensureInitialized();

    const memory = await this.ragMemory.getMemoryById(id);
    
    if (!memory || memory.metadata.type !== 'note') {
      throw new Error(`Note with ID ${id} not found`);
    }

    const deleted = await this.ragMemory.deleteMemory(id);
    
    if (!deleted) {
      throw new Error(`Failed to delete note with ID ${id}`);
    }

    console.log(`[NotesManager] Deleted note: ${id}`);
  }

  async searchNotes(query: string, limit: number = 10): Promise<NoteDetail[]> {
    this.ensureInitialized();

    if (!query || query.trim().length === 0) {
      throw new Error('Search query cannot be empty');
    }

    const results = await this.ragMemory.retrieveRelevantMemories(query, {
      memoryType: 'note',
      limit,
      threshold: 0.5,
    });

    return results.map(result => this.memoryToNoteDetail(result.memory));
  }

  private memoryToNoteSummary(memory: Memory): NoteSummary {
    return {
      id: memory.id,
      title: memory.metadata.noteTitle || 'Untitled',
      tags: memory.metadata.tags || [],
      timestamp: memory.metadata.timestamp,
      createdByPersona: memory.metadata.createdByPersona || memory.metadata.persona,
      importance: memory.metadata.importance || 5,
    };
  }

  private memoryToNoteDetail(memory: Memory): NoteDetail {
    return {
      id: memory.id,
      title: memory.metadata.noteTitle || 'Untitled',
      content: memory.metadata.noteContent || memory.text,
      tags: memory.metadata.tags || [],
      timestamp: memory.metadata.timestamp,
      createdByPersona: memory.metadata.createdByPersona || memory.metadata.persona,
      importance: memory.metadata.importance || 5,
    };
  }
}

export const notesManager = new NotesManager();
