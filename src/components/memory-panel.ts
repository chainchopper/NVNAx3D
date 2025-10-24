import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { enhancedRagMemoryManager } from '../services/memory/enhanced-rag-memory-manager';
import { Memory, MemoryType } from '../types/memory';

interface RAGSettings {
  enabled: boolean;
  similarityThreshold: number;
  maxMemories: number;
}

const RAG_SETTINGS_KEY = 'rag-settings';
const DEFAULT_RAG_SETTINGS: RAGSettings = {
  enabled: true,
  similarityThreshold: 0.6,
  maxMemories: 10,
};

@customElement('memory-panel')
export class MemoryPanel extends LitElement {
  @state() private memories: Memory[] = [];
  @state() private selectedMemory: Memory | null = null;
  @state() private filterType: MemoryType | 'all' = 'all';
  @state() private searchText = '';
  @state() private sortBy: 'newest' | 'oldest' | 'relevance' = 'newest';
  @state() private ragSettings: RAGSettings = DEFAULT_RAG_SETTINGS;
  @state() private busy = false;
  @state() private saveMessage = '';

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
      padding: 20px 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(0, 0, 0, 0.2);
    }

    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .header-top h2 {
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

    .statistics-dashboard {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      align-items: center;
      font-size: 13px;
    }

    .stat-item {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .stat-item.total { border-color: rgba(135, 206, 250, 0.5); }
    .stat-item.conversation { border-color: rgba(33, 150, 243, 0.5); }
    .stat-item.note { border-color: rgba(76, 175, 80, 0.5); }
    .stat-item.task { border-color: rgba(255, 193, 7, 0.5); }
    .stat-item.reminder { border-color: rgba(156, 39, 176, 0.5); }
    .stat-item.preference { border-color: rgba(255, 152, 0, 0.5); }
    .stat-item.fact { border-color: rgba(0, 188, 212, 0.5); }

    .stat-label {
      opacity: 0.8;
      font-size: 12px;
    }

    .stat-value {
      font-weight: 600;
      font-size: 14px;
    }

    .settings-section {
      padding: 16px 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(0, 0, 0, 0.1);
    }

    .settings-section h3 {
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 600;
      opacity: 0.9;
    }

    .settings-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 16px;
    }

    .setting-item {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .setting-item.full-width {
      grid-column: 1 / -1;
    }

    .setting-label {
      font-size: 13px;
      font-weight: 500;
      opacity: 0.9;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .toggle-switch {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 24px;
    }

    .toggle-switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(255, 255, 255, 0.2);
      transition: 0.4s;
      border-radius: 24px;
    }

    .slider:before {
      position: absolute;
      content: '';
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: 0.4s;
      border-radius: 50%;
    }

    input:checked + .slider {
      background-color: #2196f3;
    }

    input:checked + .slider:before {
      transform: translateX(20px);
    }

    .slider-input-container {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .slider-input {
      flex: 1;
      height: 6px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 3px;
      outline: none;
      -webkit-appearance: none;
    }

    .slider-input::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 18px;
      height: 18px;
      background: #2196f3;
      border-radius: 50%;
      cursor: pointer;
    }

    .slider-input::-moz-range-thumb {
      width: 18px;
      height: 18px;
      background: #2196f3;
      border-radius: 50%;
      cursor: pointer;
      border: none;
    }

    .slider-value {
      font-size: 13px;
      font-weight: 600;
      min-width: 40px;
      text-align: right;
    }

    .number-input {
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px;
      color: white;
      font-size: 13px;
      width: 100%;
      box-sizing: border-box;
    }

    .number-input:focus {
      outline: none;
      border-color: #2196f3;
    }

    .save-settings-btn {
      width: 100%;
      padding: 10px;
      background: #2196f3;
      border: none;
      border-radius: 6px;
      color: white;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }

    .save-settings-btn:hover {
      background: #1976d2;
    }

    .save-message {
      text-align: center;
      padding: 8px;
      font-size: 13px;
      color: #4caf50;
      min-height: 29px;
    }

    .main-container {
      display: flex;
      height: calc(100% - 300px);
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

    .search-box::placeholder {
      color: rgba(255, 255, 255, 0.5);
    }

    .filter-controls {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .filter-select {
      width: 100%;
      padding: 8px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px;
      color: white;
      font-size: 13px;
      box-sizing: border-box;
    }

    .filter-select option {
      background: #1a1a24;
      color: white;
    }

    .memories-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    }

    .memory-item {
      padding: 12px;
      margin-bottom: 8px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .memory-item:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.3);
    }

    .memory-item.selected {
      background: rgba(33, 150, 243, 0.2);
      border-color: #2196f3;
    }

    .memory-item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }

    .memory-type-badge {
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: 600;
      border: 1px solid;
    }

    .memory-type-badge.conversation {
      background: rgba(33, 150, 243, 0.2);
      border-color: rgba(33, 150, 243, 0.5);
      color: #2196f3;
    }

    .memory-type-badge.note {
      background: rgba(76, 175, 80, 0.2);
      border-color: rgba(76, 175, 80, 0.5);
      color: #4caf50;
    }

    .memory-type-badge.task {
      background: rgba(255, 193, 7, 0.2);
      border-color: rgba(255, 193, 7, 0.5);
      color: #ffc107;
    }

    .memory-type-badge.reminder {
      background: rgba(156, 39, 176, 0.2);
      border-color: rgba(156, 39, 176, 0.5);
      color: #9c27b0;
    }

    .memory-type-badge.preference {
      background: rgba(255, 152, 0, 0.2);
      border-color: rgba(255, 152, 0, 0.5);
      color: #ff9800;
    }

    .memory-type-badge.fact {
      background: rgba(0, 188, 212, 0.2);
      border-color: rgba(0, 188, 212, 0.5);
      color: #00bcd4;
    }

    .memory-timestamp {
      font-size: 11px;
      opacity: 0.7;
    }

    .memory-preview {
      font-size: 13px;
      line-height: 1.4;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      margin-bottom: 6px;
    }

    .memory-speaker {
      font-size: 11px;
      opacity: 0.7;
      font-weight: 500;
    }

    .detail-pane {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      padding: 24px;
    }

    .detail-pane.empty {
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

    .detail-header {
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .detail-type-badge {
      display: inline-block;
      margin-bottom: 12px;
    }

    .detail-content {
      flex: 1;
      margin-bottom: 20px;
    }

    .detail-text {
      font-size: 15px;
      line-height: 1.6;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .detail-metadata {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      padding: 16px;
      margin-bottom: 20px;
    }

    .metadata-grid {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 12px 16px;
      font-size: 13px;
    }

    .metadata-label {
      font-weight: 600;
      opacity: 0.7;
    }

    .metadata-value {
      opacity: 0.9;
    }

    .detail-actions {
      display: flex;
      gap: 12px;
    }

    .btn {
      padding: 10px 20px;
      border-radius: 6px;
      border: none;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
      font-weight: 500;
    }

    .btn-danger {
      background: rgba(244, 67, 54, 0.2);
      color: #f44336;
      border: 1px solid rgba(244, 67, 54, 0.5);
    }

    .btn-danger:hover {
      background: rgba(244, 67, 54, 0.3);
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
        min-width: 0;
        max-height: 40%;
      }

      .settings-grid {
        grid-template-columns: 1fr;
      }
    }
  `;

  async connectedCallback() {
    super.connectedCallback();
    await enhancedRagMemoryManager.initialize();
    
    const config = enhancedRagMemoryManager.getConfig();
    this.ragSettings = {
      enabled: config.enabled,
      similarityThreshold: config.similarityThreshold,
      maxMemories: config.maxMemories,
    };
    
    await this.loadMemories();
  }

  private saveSettings() {
    enhancedRagMemoryManager.configure({
      enabled: this.ragSettings.enabled,
      similarityThreshold: this.ragSettings.similarityThreshold,
      maxMemories: this.ragSettings.maxMemories,
    });
    
    this.saveMessage = '✓ Settings saved successfully';
    setTimeout(() => {
      this.saveMessage = '';
    }, 3000);
  }

  private async loadMemories() {
    this.busy = true;
    try {
      await enhancedRagMemoryManager.initialize();

      let allMemories: Memory[];
      
      if (this.searchText && this.searchText.trim().length > 0) {
        const results = await enhancedRagMemoryManager.retrieveRelevantMemories(
          this.searchText,
          {
            limit: 100,
            threshold: this.ragSettings.similarityThreshold,
            memoryType: this.filterType === 'all' ? undefined : this.filterType,
          }
        );
        allMemories = results.map(r => r.memory);
        this.sortBy = 'relevance';
      } else if (this.filterType === 'all') {
        allMemories = await enhancedRagMemoryManager.getAllMemories();
      } else {
        allMemories = await enhancedRagMemoryManager.getMemoriesByType(this.filterType);
      }

      if (this.sortBy === 'newest') {
        allMemories.sort((a, b) => 
          new Date(b.metadata.timestamp).getTime() - new Date(a.metadata.timestamp).getTime()
        );
      } else if (this.sortBy === 'oldest') {
        allMemories.sort((a, b) => 
          new Date(a.metadata.timestamp).getTime() - new Date(b.metadata.timestamp).getTime()
        );
      }

      this.memories = allMemories;
    } catch (error) {
      console.error('[MemoryPanel] Failed to load memories:', error);
    } finally {
      this.busy = false;
    }
  }

  private async deleteMemory() {
    if (!this.selectedMemory) return;
    
    if (!confirm('Are you sure you want to delete this memory? This action cannot be undone.')) {
      return;
    }

    this.busy = true;
    try {
      await enhancedRagMemoryManager.deleteMemory(this.selectedMemory.id);
      this.selectedMemory = null;
      await this.loadMemories();
    } catch (error) {
      console.error('[MemoryPanel] Failed to delete memory:', error);
    } finally {
      this.busy = false;
    }
  }

  private selectMemory(memory: Memory) {
    this.selectedMemory = memory;
  }

  private handleSearchChange(e: Event) {
    const input = e.target as HTMLInputElement;
    this.searchText = input.value;
    this.loadMemories();
  }

  private handleFilterChange(e: Event) {
    const select = e.target as HTMLSelectElement;
    this.filterType = select.value as MemoryType | 'all';
    this.selectedMemory = null;
    this.loadMemories();
  }

  private handleSortChange(e: Event) {
    const select = e.target as HTMLSelectElement;
    this.sortBy = select.value as 'newest' | 'oldest' | 'relevance';
    this.loadMemories();
  }

  private computeStatistics() {
    const total = this.memories.length;
    const byType: Record<string, number> = {};

    this.memories.forEach(m => {
      const type = m.metadata.type;
      byType[type] = (byType[type] || 0) + 1;
    });

    return { total, byType };
  }

  private formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'just now';
  }

  private formatFullTimestamp(timestamp: string): string {
    return new Date(timestamp).toLocaleString();
  }

  private close() {
    this.dispatchEvent(new CustomEvent('close'));
  }

  render() {
    const stats = this.computeStatistics();

    return html`
      <div class="header">
        <div class="header-top">
          <h2>🧠 Memory Management</h2>
          <button class="close-btn" @click=${this.close}>&times;</button>
        </div>
        <div class="statistics-dashboard">
          <div class="stat-item total">
            <span class="stat-label">Total:</span>
            <span class="stat-value">${stats.total}</span>
          </div>
          ${Object.entries(stats.byType).map(([type, count]) => html`
            <div class="stat-item ${type}">
              <span class="stat-label">${type}:</span>
              <span class="stat-value">${count}</span>
            </div>
          `)}
        </div>
      </div>

      <div class="settings-section">
        <h3>RAG Memory Settings</h3>
        <div class="settings-grid">
          <div class="setting-item">
            <div class="setting-label">
              <span>Enable RAG Memory System</span>
              <label class="toggle-switch">
                <input 
                  type="checkbox" 
                  .checked=${this.ragSettings.enabled}
                  @change=${(e: Event) => {
                    this.ragSettings = {
                      ...this.ragSettings,
                      enabled: (e.target as HTMLInputElement).checked
                    };
                  }}
                >
                <span class="slider"></span>
              </label>
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-label">
              <span>Similarity Threshold: ${this.ragSettings.similarityThreshold.toFixed(2)}</span>
            </div>
            <div class="slider-input-container">
              <input 
                type="range" 
                class="slider-input"
                min="0"
                max="1"
                step="0.05"
                .value=${this.ragSettings.similarityThreshold.toString()}
                @input=${(e: Event) => {
                  this.ragSettings = {
                    ...this.ragSettings,
                    similarityThreshold: parseFloat((e.target as HTMLInputElement).value)
                  };
                }}
              >
              <span class="slider-value">${this.ragSettings.similarityThreshold.toFixed(2)}</span>
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-label">
              <span>Max Memories per Query</span>
            </div>
            <input 
              type="number" 
              class="number-input"
              min="1"
              max="50"
              .value=${this.ragSettings.maxMemories.toString()}
              @input=${(e: Event) => {
                this.ragSettings = {
                  ...this.ragSettings,
                  maxMemories: parseInt((e.target as HTMLInputElement).value) || 10
                };
              }}
            >
          </div>

          <div class="setting-item full-width">
            <button class="save-settings-btn" @click=${() => this.saveSettings()}>
              Save Settings
            </button>
            <div class="save-message">${this.saveMessage}</div>
          </div>
        </div>
      </div>

      <div class="main-container">
        <div class="sidebar">
          <div class="sidebar-header">
            <input 
              type="text" 
              class="search-box"
              placeholder="🔍 Semantic search..."
              .value=${this.searchText}
              @input=${this.handleSearchChange}
            >
            <div class="filter-controls">
              <select class="filter-select" @change=${this.handleFilterChange} .value=${this.filterType}>
                <option value="all">All Types</option>
                <option value="conversation">Conversations</option>
                <option value="note">Notes</option>
                <option value="task">Tasks</option>
                <option value="reminder">Reminders</option>
                <option value="preference">Preferences</option>
                <option value="fact">Facts</option>
              </select>
              <select class="filter-select" @change=${this.handleSortChange} .value=${this.sortBy}>
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                ${this.searchText ? html`<option value="relevance">Most Relevant</option>` : ''}
              </select>
            </div>
          </div>

          <div class="memories-list">
            ${this.busy ? html`
              <div class="loading">Loading memories...</div>
            ` : this.memories.length === 0 ? html`
              <div class="empty-state">
                <p>No memories found</p>
              </div>
            ` : this.memories.map(memory => html`
              <div 
                class="memory-item ${this.selectedMemory?.id === memory.id ? 'selected' : ''}"
                @click=${() => this.selectMemory(memory)}
              >
                <div class="memory-item-header">
                  <span class="memory-type-badge ${memory.metadata.type}">
                    ${memory.metadata.type}
                  </span>
                  <span class="memory-timestamp">
                    ${this.formatTimestamp(memory.metadata.timestamp)}
                  </span>
                </div>
                <div class="memory-preview">${memory.text}</div>
                <div class="memory-speaker">
                  👤 ${memory.metadata.speaker} → ${memory.metadata.persona}
                </div>
              </div>
            `)}
          </div>
        </div>

        <div class="detail-pane ${!this.selectedMemory ? 'empty' : ''}">
          ${!this.selectedMemory ? html`
            <div class="empty-state">
              <p>Select a memory to view details</p>
            </div>
          ` : html`
            <div class="detail-header">
              <div class="detail-type-badge">
                <span class="memory-type-badge ${this.selectedMemory.metadata.type}">
                  ${this.selectedMemory.metadata.type}
                </span>
              </div>
            </div>

            <div class="detail-content">
              <div class="detail-text">${this.selectedMemory.text}</div>
            </div>

            <div class="detail-metadata">
              <div class="metadata-grid">
                <span class="metadata-label">Type:</span>
                <span class="metadata-value">${this.selectedMemory.metadata.type}</span>
                
                <span class="metadata-label">Timestamp:</span>
                <span class="metadata-value">${this.formatFullTimestamp(this.selectedMemory.metadata.timestamp)}</span>
                
                <span class="metadata-label">Speaker:</span>
                <span class="metadata-value">${this.selectedMemory.metadata.speaker}</span>
                
                <span class="metadata-label">Persona:</span>
                <span class="metadata-value">${this.selectedMemory.metadata.persona}</span>
                
                <span class="metadata-label">Importance:</span>
                <span class="metadata-value">${this.selectedMemory.metadata.importance}/10</span>
                
                <span class="metadata-label">Embedding:</span>
                <span class="metadata-value">${this.selectedMemory.embedding ? '✓ Generated' : '✗ Not generated'}</span>
                
                <span class="metadata-label">ID:</span>
                <span class="metadata-value">${this.selectedMemory.id}</span>
              </div>
            </div>

            <div class="detail-actions">
              <button class="btn btn-danger" @click=${this.deleteMemory}>
                🗑️ Delete Memory
              </button>
            </div>
          `}
        </div>
      </div>
    `;
  }
}
