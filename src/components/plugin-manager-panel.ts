/**
 * Plugin Manager Panel
 * UI for managing PersonI-generated plugins
 */

import { LitElement, css, html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import type { Plugin } from '../types/plugin-types';
import { pluginRegistry } from '../services/plugin-registry';
import { dynamicComponentGenerator } from '../services/dynamic-component-generator';

@customElement('plugin-manager-panel')
export class PluginManagerPanel extends LitElement {
  @state() private plugins: Plugin[] = [];
  @state() private selectedPlugin: Plugin | null = null;
  @state() private searchQuery = '';
  @state() private filterEnabled: boolean | null = null;
  @state() private showConfirmDelete = false;
  @state() private deleteTarget: string | null = null;

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: rgba(20, 20, 40, 0.95);
      color: white;
      overflow: hidden;
    }

    .panel-header {
      padding: 20px;
      background: linear-gradient(135deg, rgba(100, 50, 200, 0.3), rgba(50, 100, 255, 0.3));
      border-bottom: 2px solid rgba(100, 200, 255, 0.3);
    }

    .panel-title {
      font-size: 24px;
      font-weight: 600;
      margin: 0 0 10px 0;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .panel-subtitle {
      font-size: 14px;
      opacity: 0.7;
      margin: 0;
    }

    .search-bar {
      padding: 15px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      gap: 10px;
    }

    .search-input {
      flex: 1;
      padding: 10px 15px;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      color: white;
      font-size: 14px;
    }

    .search-input:focus {
      outline: none;
      border-color: rgba(100, 200, 255, 0.5);
    }

    .filter-buttons {
      display: flex;
      gap: 5px;
    }

    .filter-btn {
      padding: 8px 12px;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px;
      color: white;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s;
    }

    .filter-btn:hover {
      background: rgba(100, 200, 255, 0.2);
    }

    .filter-btn.active {
      background: rgba(100, 200, 255, 0.3);
      border-color: rgba(100, 200, 255, 0.6);
    }

    .plugin-list {
      flex: 1;
      overflow-y: auto;
      padding: 10px;
    }

    .plugin-card {
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      padding: 15px;
      margin-bottom: 10px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .plugin-card:hover {
      background: rgba(0, 0, 0, 0.5);
      border-color: rgba(100, 200, 255, 0.3);
    }

    .plugin-card.selected {
      border-color: rgba(100, 200, 255, 0.6);
      background: rgba(100, 200, 255, 0.1);
    }

    .plugin-card.disabled {
      opacity: 0.5;
    }

    .plugin-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8px;
    }

    .plugin-name {
      font-size: 16px;
      font-weight: 600;
      margin: 0;
    }

    .plugin-version {
      font-size: 12px;
      opacity: 0.6;
      background: rgba(255, 255, 255, 0.1);
      padding: 2px 8px;
      border-radius: 10px;
    }

    .plugin-description {
      font-size: 13px;
      opacity: 0.8;
      margin: 5px 0;
    }

    .plugin-meta {
      display: flex;
      gap: 15px;
      font-size: 11px;
      opacity: 0.6;
      margin-top: 8px;
    }

    .plugin-tags {
      display: flex;
      gap: 5px;
      flex-wrap: wrap;
      margin-top: 8px;
    }

    .tag {
      background: rgba(100, 200, 255, 0.2);
      padding: 3px 8px;
      border-radius: 10px;
      font-size: 11px;
    }

    .plugin-actions {
      display: flex;
      gap: 8px;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .action-btn {
      padding: 6px 12px;
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      background: rgba(0, 0, 0, 0.3);
      color: white;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s;
    }

    .action-btn:hover {
      background: rgba(100, 200, 255, 0.2);
    }

    .action-btn.danger:hover {
      background: rgba(255, 100, 100, 0.2);
      border-color: rgba(255, 100, 100, 0.6);
    }

    .action-btn.primary {
      background: rgba(100, 200, 255, 0.3);
      border-color: rgba(100, 200, 255, 0.6);
    }

    .empty-state {
      text-align: center;
      padding: 40px;
      opacity: 0.5;
    }

    .stats-bar {
      padding: 15px 20px;
      background: rgba(0, 0, 0, 0.3);
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      justify-content: space-between;
      font-size: 12px;
    }

    .stat {
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .confirm-dialog {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(20, 20, 40, 0.98);
      border: 2px solid rgba(255, 100, 100, 0.5);
      border-radius: 10px;
      padding: 25px;
      min-width: 300px;
      z-index: 1000;
    }

    .confirm-dialog h3 {
      margin: 0 0 15px 0;
      color: #ff6b6b;
    }

    .confirm-actions {
      display: flex;
      gap: 10px;
      margin-top: 20px;
      justify-content: flex-end;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.loadPlugins();
  }

  async loadPlugins() {
    this.plugins = pluginRegistry.getAllPlugins();
  }

  get filteredPlugins() {
    let filtered = this.plugins;

    if (this.searchQuery) {
      filtered = pluginRegistry.searchPlugins(this.searchQuery);
    }

    if (this.filterEnabled !== null) {
      filtered = filtered.filter(p => p.enabled === this.filterEnabled);
    }

    return filtered;
  }

  private handleSearch(e: Event) {
    this.searchQuery = (e.target as HTMLInputElement).value;
  }

  private setFilter(enabled: boolean | null) {
    this.filterEnabled = this.filterEnabled === enabled ? null : enabled;
  }

  private selectPlugin(plugin: Plugin) {
    this.selectedPlugin = this.selectedPlugin?.metadata.id === plugin.metadata.id ? null : plugin;
  }

  private async togglePlugin(plugin: Plugin) {
    await pluginRegistry.togglePlugin(plugin.metadata.id);
    await this.loadPlugins();
  }

  private async toggleAutoLoad(plugin: Plugin) {
    await pluginRegistry.setAutoLoad(plugin.metadata.id, !plugin.autoLoad);
    await this.loadPlugins();
  }

  private confirmDelete(pluginId: string) {
    this.deleteTarget = pluginId;
    this.showConfirmDelete = true;
  }

  private async deletePlugin() {
    if (this.deleteTarget) {
      await pluginRegistry.unregisterPlugin(this.deleteTarget);
      await this.loadPlugins();
      this.showConfirmDelete = false;
      this.deleteTarget = null;
      this.selectedPlugin = null;
    }
  }

  private cancelDelete() {
    this.showConfirmDelete = false;
    this.deleteTarget = null;
  }

  private async exportPlugin(plugin: Plugin) {
    const json = await pluginRegistry.exportPlugin(plugin.metadata.id);
    if (json) {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${plugin.metadata.name.replace(/\s+/g, '-').toLowerCase()}.plugin.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  render() {
    const stats = pluginRegistry.getStats();
    const filtered = this.filteredPlugins;

    return html`
      <div class="panel-header">
        <h2 class="panel-title">
          🔌 Plugin Manager
        </h2>
        <p class="panel-subtitle">
          Manage PersonI-generated UI components
        </p>
      </div>

      <div class="search-bar">
        <input
          type="text"
          class="search-input"
          placeholder="Search plugins..."
          .value=${this.searchQuery}
          @input=${this.handleSearch}
        />
        <div class="filter-buttons">
          <button
            class="filter-btn ${this.filterEnabled === true ? 'active' : ''}"
            @click=${() => this.setFilter(true)}
          >
            ✓ Enabled
          </button>
          <button
            class="filter-btn ${this.filterEnabled === false ? 'active' : ''}"
            @click=${() => this.setFilter(false)}
          >
            ✗ Disabled
          </button>
        </div>
      </div>

      <div class="plugin-list">
        ${filtered.length === 0
          ? html`
              <div class="empty-state">
                <div style="font-size: 48px; margin-bottom: 10px;">📦</div>
                <div>No plugins ${this.searchQuery ? 'match your search' : 'installed yet'}</div>
                <div style="font-size: 12px; margin-top: 10px; opacity: 0.6;">
                  Ask a PersonI to create a UI component!
                </div>
              </div>
            `
          : filtered.map(plugin => this.renderPluginCard(plugin))}
      </div>

      <div class="stats-bar">
        <div class="stat">📊 Total: ${stats.totalPlugins}</div>
        <div class="stat">✓ Enabled: ${stats.enabledPlugins}</div>
        <div class="stat">🚀 Auto-load: ${stats.autoLoadPlugins}</div>
        <div class="stat">📍 Instances: ${stats.totalInstances}</div>
      </div>

      ${this.showConfirmDelete ? this.renderConfirmDialog() : nothing}
    `;
  }

  private renderPluginCard(plugin: Plugin) {
    const isSelected = this.selectedPlugin?.metadata.id === plugin.metadata.id;

    return html`
      <div
        class="plugin-card ${isSelected ? 'selected' : ''} ${!plugin.enabled ? 'disabled' : ''}"
        @click=${() => this.selectPlugin(plugin)}
      >
        <div class="plugin-header">
          <h3 class="plugin-name">${plugin.metadata.name}</h3>
          <span class="plugin-version">v${plugin.metadata.version}</span>
        </div>
        
        <div class="plugin-description">${plugin.metadata.description}</div>
        
        <div class="plugin-meta">
          <span>👤 ${plugin.metadata.author}</span>
          <span>📂 ${plugin.metadata.category}</span>
          <span>📅 ${new Date(plugin.metadata.createdAt).toLocaleDateString()}</span>
        </div>

        ${plugin.metadata.tags.length > 0
          ? html`
              <div class="plugin-tags">
                ${plugin.metadata.tags.map(tag => html`<span class="tag">${tag}</span>`)}
              </div>
            `
          : nothing}

        ${isSelected
          ? html`
              <div class="plugin-actions">
                <button
                  class="action-btn ${plugin.enabled ? 'primary' : ''}"
                  @click=${(e: Event) => {
                    e.stopPropagation();
                    this.togglePlugin(plugin);
                  }}
                >
                  ${plugin.enabled ? '✓ Enabled' : 'Enable'}
                </button>
                <button
                  class="action-btn ${plugin.autoLoad ? 'primary' : ''}"
                  @click=${(e: Event) => {
                    e.stopPropagation();
                    this.toggleAutoLoad(plugin);
                  }}
                >
                  ${plugin.autoLoad ? '🚀 Auto-load' : 'Manual Load'}
                </button>
                <button
                  class="action-btn"
                  @click=${(e: Event) => {
                    e.stopPropagation();
                    this.exportPlugin(plugin);
                  }}
                >
                  📤 Export
                </button>
                <button
                  class="action-btn danger"
                  @click=${(e: Event) => {
                    e.stopPropagation();
                    this.confirmDelete(plugin.metadata.id);
                  }}
                >
                  🗑️ Delete
                </button>
              </div>
            `
          : nothing}
      </div>
    `;
  }

  private renderConfirmDialog() {
    const plugin = this.plugins.find(p => p.metadata.id === this.deleteTarget);

    return html`
      <div class="confirm-dialog">
        <h3>⚠️ Delete Plugin?</h3>
        <p>Are you sure you want to delete "${plugin?.metadata.name}"?</p>
        <p style="font-size: 12px; opacity: 0.7;">This action cannot be undone.</p>
        
        <div class="confirm-actions">
          <button class="action-btn" @click=${this.cancelDelete}>Cancel</button>
          <button class="action-btn danger" @click=${this.deletePlugin}>Delete</button>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'plugin-manager-panel': PluginManagerPanel;
  }
}
