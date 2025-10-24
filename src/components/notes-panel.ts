import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { notesManager } from '../services/notes-manager';
import { NoteSummary, NoteDetail } from '../types/memory';

@customElement('notes-panel')
export class NotesPanel extends LitElement {
  @state() private notes: NoteSummary[] = [];
  @state() private selectedNoteId: string | null = null;
  @state() private selectedNote: NoteDetail | null = null;
  @state() private draftTitle = '';
  @state() private draftContent = '';
  @state() private draftTags = '';
  @state() private draftImportance = 5;
  @state() private searchText = '';
  @state() private filterTag: string | null = null;
  @state() private sortBy: 'date' | 'importance' = 'date';
  @state() private busy = false;
  @state() private isCreating = false;
  @state() private hasChanges = false;

  static styles = css`
    :host {
      display: block;
      position: fixed;
      right: 0;
      top: 0;
      bottom: 0;
      width: 900px;
      max-width: 95vw;
      background: rgba(20, 20, 30, 0.98);
      backdrop-filter: blur(20px);
      box-shadow: -4px 0 20px rgba(0, 0, 0, 0.5);
      z-index: 1000;
      color: white;
      font-family: system-ui, -apple-system, sans-serif;
      animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }

    .header {
      padding: 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(0, 0, 0, 0.2);
    }

    .header h2 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .close-btn {
      background: none;
      border: none;
      color: white;
      font-size: 24px;
      cursor: pointer;
      padding: 8px;
      opacity: 0.7;
      transition: opacity 0.2s;
    }

    .close-btn:hover {
      opacity: 1;
    }

    .main-container {
      display: flex;
      height: calc(100% - 73px);
    }

    .sidebar {
      width: 30%;
      min-width: 250px;
      border-right: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      flex-direction: column;
      background: rgba(0, 0, 0, 0.1);
    }

    .sidebar-header {
      padding: 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .search-box {
      width: 100%;
      padding: 10px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px;
      color: white;
      font-size: 14px;
      box-sizing: border-box;
      margin-bottom: 12px;
    }

    .search-box:focus {
      outline: none;
      border-color: #2196f3;
    }

    .filter-controls {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
    }

    .filter-select {
      flex: 1;
      padding: 8px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px;
      color: white;
      font-size: 13px;
    }

    .filter-select option {
      background: #1a1a24;
      color: white;
    }

    .new-note-btn {
      width: 100%;
      padding: 12px;
      background: #2196f3;
      border: none;
      border-radius: 6px;
      color: white;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }

    .new-note-btn:hover {
      background: #1976d2;
    }

    .notes-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    }

    .note-item {
      padding: 12px;
      margin-bottom: 8px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .note-item:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.3);
    }

    .note-item.selected {
      background: rgba(33, 150, 243, 0.2);
      border-color: #2196f3;
    }

    .note-item-title {
      font-weight: 600;
      margin-bottom: 6px;
      font-size: 14px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .note-item-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      opacity: 0.7;
      margin-bottom: 6px;
    }

    .note-item-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 6px;
    }

    .tag-chip {
      padding: 2px 8px;
      background: rgba(33, 150, 243, 0.3);
      border-radius: 12px;
      font-size: 11px;
      border: 1px solid rgba(33, 150, 243, 0.5);
    }

    .importance-stars {
      color: #ffd700;
    }

    .editor {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      padding: 24px;
    }

    .editor.empty {
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.5;
      text-align: center;
    }

    .empty-state {
      font-size: 18px;
      color: rgba(255, 255, 255, 0.5);
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 8px;
      color: rgba(255, 255, 255, 0.9);
    }

    .form-group input[type="text"],
    .form-group textarea {
      width: 100%;
      padding: 10px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px;
      color: white;
      font-size: 14px;
      box-sizing: border-box;
      font-family: system-ui, -apple-system, sans-serif;
    }

    .form-group input[type="text"]:focus,
    .form-group textarea:focus {
      outline: none;
      border-color: #2196f3;
    }

    .form-group textarea {
      min-height: 300px;
      resize: vertical;
      line-height: 1.6;
    }

    .title-input {
      font-size: 18px;
      font-weight: 600;
    }

    .importance-slider-container {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .importance-slider {
      flex: 1;
      height: 6px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 3px;
      outline: none;
      -webkit-appearance: none;
    }

    .importance-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 18px;
      height: 18px;
      background: #2196f3;
      border-radius: 50%;
      cursor: pointer;
    }

    .importance-slider::-moz-range-thumb {
      width: 18px;
      height: 18px;
      background: #2196f3;
      border-radius: 50%;
      cursor: pointer;
      border: none;
    }

    .importance-value {
      font-size: 14px;
      font-weight: 600;
      min-width: 60px;
      text-align: right;
    }

    .persona-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px;
      font-size: 13px;
      margin-bottom: 20px;
    }

    .action-buttons {
      display: flex;
      gap: 12px;
      margin-top: 24px;
    }

    .btn {
      padding: 12px 24px;
      border-radius: 6px;
      border: none;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
      font-weight: 500;
    }

    .btn-primary {
      background: #2196f3;
      color: white;
      flex: 1;
    }

    .btn-primary:hover {
      background: #1976d2;
    }

    .btn-primary:disabled {
      background: rgba(33, 150, 243, 0.3);
      cursor: not-allowed;
    }

    .btn-danger {
      background: rgba(244, 67, 54, 0.2);
      color: #f44336;
      border: 1px solid rgba(244, 67, 54, 0.5);
    }

    .btn-danger:hover {
      background: rgba(244, 67, 54, 0.3);
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.1);
      color: white;
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .input-hint {
      font-size: 12px;
      opacity: 0.6;
      margin-top: 4px;
    }

    .loading {
      text-align: center;
      padding: 20px;
      opacity: 0.7;
    }

    @media (max-width: 768px) {
      :host {
        width: 100%;
      }

      .main-container {
        flex-direction: column;
      }

      .sidebar {
        width: 100%;
        max-height: 40%;
        border-right: none;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }
    }
  `;

  async connectedCallback() {
    super.connectedCallback();
    await this.initialize();
    this.addEventListener('keydown', this.handleKeydown);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this.handleKeydown);
  }

  private handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      this.handleClose();
    } else if (e.ctrlKey && e.key === 'n') {
      e.preventDefault();
      this.createNewNote();
    }
  };

  private async initialize() {
    this.busy = true;
    try {
      await notesManager.initialize();
      await this.loadNotes();
    } catch (error) {
      console.error('[NotesPanel] Initialization error:', error);
    } finally {
      this.busy = false;
    }
  }

  private async loadNotes() {
    try {
      const filters: any = {};
      if (this.searchText) {
        filters.searchText = this.searchText;
      }
      if (this.filterTag) {
        filters.tag = this.filterTag;
      }

      this.notes = await notesManager.getNotes(filters);
      this.sortNotes();
    } catch (error) {
      console.error('[NotesPanel] Error loading notes:', error);
    }
  }

  private sortNotes() {
    if (this.sortBy === 'date') {
      this.notes.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } else if (this.sortBy === 'importance') {
      this.notes.sort((a, b) => b.importance - a.importance);
    }
  }

  private getAllTags(): string[] {
    const tagSet = new Set<string>();
    this.notes.forEach(note => {
      note.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }

  private createNewNote() {
    this.isCreating = true;
    this.selectedNoteId = null;
    this.selectedNote = null;
    this.draftTitle = '';
    this.draftContent = '';
    this.draftTags = '';
    this.draftImportance = 5;
    this.hasChanges = false;
  }

  private async selectNote(noteId: string) {
    if (this.hasChanges) {
      if (!confirm('You have unsaved changes. Discard them?')) {
        return;
      }
    }

    this.busy = true;
    try {
      const note = await notesManager.getNoteById(noteId);
      if (note) {
        this.selectedNoteId = noteId;
        this.selectedNote = note;
        this.draftTitle = note.title;
        this.draftContent = note.content;
        this.draftTags = note.tags.join(', ');
        this.draftImportance = note.importance;
        this.isCreating = false;
        this.hasChanges = false;
      }
    } catch (error) {
      console.error('[NotesPanel] Error selecting note:', error);
    } finally {
      this.busy = false;
    }
  }

  private handleInputChange() {
    this.hasChanges = true;
  }

  private async saveNote() {
    if (!this.draftTitle.trim()) {
      alert('Please enter a title for the note');
      return;
    }

    if (!this.draftContent.trim()) {
      alert('Please enter content for the note');
      return;
    }

    this.busy = true;
    try {
      const tags = this.draftTags
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      if (this.isCreating) {
        const id = await notesManager.createNote({
          title: this.draftTitle,
          content: this.draftContent,
          tags,
          importance: this.draftImportance,
          persona: 'user',
        });
        this.selectedNoteId = id;
        this.isCreating = false;
      } else if (this.selectedNoteId) {
        await notesManager.updateNote(this.selectedNoteId, {
          title: this.draftTitle,
          content: this.draftContent,
          tags,
          importance: this.draftImportance,
        });
      }

      this.hasChanges = false;
      await this.loadNotes();

      if (this.selectedNoteId) {
        const note = await notesManager.getNoteById(this.selectedNoteId);
        if (note) {
          this.selectedNote = note;
        }
      }
    } catch (error) {
      console.error('[NotesPanel] Error saving note:', error);
      alert('Failed to save note. Please try again.');
    } finally {
      this.busy = false;
    }
  }

  private async deleteNote() {
    if (!this.selectedNoteId) return;

    if (!confirm('Are you sure you want to delete this note? This action cannot be undone.')) {
      return;
    }

    this.busy = true;
    try {
      await notesManager.deleteNote(this.selectedNoteId);
      this.selectedNoteId = null;
      this.selectedNote = null;
      this.isCreating = false;
      this.hasChanges = false;
      await this.loadNotes();
    } catch (error) {
      console.error('[NotesPanel] Error deleting note:', error);
      alert('Failed to delete note. Please try again.');
    } finally {
      this.busy = false;
    }
  }

  private cancelEdit() {
    if (this.hasChanges) {
      if (!confirm('You have unsaved changes. Discard them?')) {
        return;
      }
    }

    if (this.selectedNote) {
      this.draftTitle = this.selectedNote.title;
      this.draftContent = this.selectedNote.content;
      this.draftTags = this.selectedNote.tags.join(', ');
      this.draftImportance = this.selectedNote.importance;
    } else {
      this.selectedNoteId = null;
      this.isCreating = false;
    }
    this.hasChanges = false;
  }

  private handleClose() {
    if (this.hasChanges) {
      if (!confirm('You have unsaved changes. Are you sure you want to close?')) {
        return;
      }
    }
    this.dispatchEvent(new CustomEvent('close'));
  }

  private async handleSearch(e: Event) {
    this.searchText = (e.target as HTMLInputElement).value;
    await this.loadNotes();
  }

  private async handleFilterTag(e: Event) {
    const value = (e.target as HTMLSelectElement).value;
    this.filterTag = value === '' ? null : value;
    await this.loadNotes();
  }

  private async handleSortChange(e: Event) {
    this.sortBy = (e.target as HTMLSelectElement).value as 'date' | 'importance';
    this.sortNotes();
    this.requestUpdate();
  }

  private formatDate(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  private renderStars(importance: number): string {
    const fullStars = Math.floor(importance / 2);
    const halfStar = importance % 2 === 1;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

    return '★'.repeat(fullStars) + (halfStar ? '⯨' : '') + '☆'.repeat(emptyStars);
  }

  render() {
    const allTags = this.getAllTags();
    const showEditor = this.isCreating || this.selectedNoteId;

    return html`
      <div class="header">
        <h2>
          <span>📝</span>
          <span>Notes</span>
        </h2>
        <button class="close-btn" @click=${this.handleClose} title="Close (Esc)">×</button>
      </div>

      <div class="main-container">
        <div class="sidebar">
          <div class="sidebar-header">
            <input
              type="text"
              class="search-box"
              placeholder="🔍 Search notes..."
              .value=${this.searchText}
              @input=${this.handleSearch}
            />
            
            <div class="filter-controls">
              <select class="filter-select" @change=${this.handleFilterTag}>
                <option value="">All Tags</option>
                ${allTags.map(tag => html`
                  <option value=${tag} ?selected=${this.filterTag === tag}>${tag}</option>
                `)}
              </select>

              <select class="filter-select" @change=${this.handleSortChange}>
                <option value="date" ?selected=${this.sortBy === 'date'}>Date</option>
                <option value="importance" ?selected=${this.sortBy === 'importance'}>Importance</option>
              </select>
            </div>

            <button class="new-note-btn" @click=${this.createNewNote} title="New Note (Ctrl+N)">
              ➕ New Note
            </button>
          </div>

          <div class="notes-list">
            ${this.busy && this.notes.length === 0 ? html`
              <div class="loading">Loading notes...</div>
            ` : this.notes.length === 0 ? html`
              <div style="text-align: center; padding: 20px; opacity: 0.5;">
                No notes yet. Create your first note!
              </div>
            ` : this.notes.map(note => html`
              <div
                class="note-item ${this.selectedNoteId === note.id ? 'selected' : ''}"
                @click=${() => this.selectNote(note.id)}
              >
                <div class="note-item-title">${note.title}</div>
                <div class="note-item-meta">
                  <span>${this.formatDate(note.timestamp)}</span>
                  <span class="importance-stars" title="Importance: ${note.importance}/10">
                    ${this.renderStars(note.importance)}
                  </span>
                </div>
                ${note.tags.length > 0 ? html`
                  <div class="note-item-tags">
                    ${note.tags.map(tag => html`<span class="tag-chip">${tag}</span>`)}
                  </div>
                ` : ''}
              </div>
            `)}
          </div>
        </div>

        <div class="editor ${!showEditor ? 'empty' : ''}">
          ${!showEditor ? html`
            <div class="empty-state">
              <div>Select a note to view or edit</div>
              <div style="font-size: 14px; margin-top: 10px; opacity: 0.7;">
                Or press <kbd>Ctrl+N</kbd> to create a new note
              </div>
            </div>
          ` : html`
            ${this.selectedNote && !this.isCreating ? html`
              <div class="persona-badge">
                <span>👤</span>
                <span>Created by: ${this.selectedNote.createdByPersona}</span>
              </div>
            ` : ''}

            <div class="form-group">
              <label>Title</label>
              <input
                type="text"
                class="title-input"
                placeholder="Enter note title..."
                .value=${this.draftTitle}
                @input=${(e: Event) => {
                  this.draftTitle = (e.target as HTMLInputElement).value;
                  this.handleInputChange();
                }}
              />
            </div>

            <div class="form-group">
              <label>Tags</label>
              <input
                type="text"
                placeholder="Enter tags separated by commas (e.g., work, important, ideas)"
                .value=${this.draftTags}
                @input=${(e: Event) => {
                  this.draftTags = (e.target as HTMLInputElement).value;
                  this.handleInputChange();
                }}
              />
              <div class="input-hint">Separate tags with commas</div>
            </div>

            <div class="form-group">
              <label>Importance</label>
              <div class="importance-slider-container">
                <input
                  type="range"
                  class="importance-slider"
                  min="1"
                  max="10"
                  .value=${String(this.draftImportance)}
                  @input=${(e: Event) => {
                    this.draftImportance = parseInt((e.target as HTMLInputElement).value);
                    this.handleInputChange();
                  }}
                />
                <div class="importance-value">
                  ${this.draftImportance}/10 ${this.renderStars(this.draftImportance)}
                </div>
              </div>
            </div>

            <div class="form-group">
              <label>Content</label>
              <textarea
                placeholder="Write your note here..."
                .value=${this.draftContent}
                @input=${(e: Event) => {
                  this.draftContent = (e.target as HTMLInputElement).value;
                  this.handleInputChange();
                }}
              ></textarea>
            </div>

            <div class="action-buttons">
              <button
                class="btn btn-primary"
                @click=${this.saveNote}
                ?disabled=${this.busy || !this.hasChanges}
              >
                ${this.busy ? 'Saving...' : this.isCreating ? 'Create Note' : 'Save Changes'}
              </button>

              ${!this.isCreating && this.selectedNoteId ? html`
                <button class="btn btn-danger" @click=${this.deleteNote} ?disabled=${this.busy}>
                  Delete
                </button>
              ` : ''}

              ${this.hasChanges ? html`
                <button class="btn btn-secondary" @click=${this.cancelEdit} ?disabled=${this.busy}>
                  Cancel
                </button>
              ` : ''}
            </div>
          `}
        </div>
      </div>
    `;
  }
}
