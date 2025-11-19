/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { NirvanaCard, Plugin, CardValidationResult } from '../types/plugin-types';
import { pluginRegistry } from './plugin-registry';

/**
 * Plugin Card Manager
 * Handles import/export of .nirvana-card files for portable plugin distribution
 */
class PluginCardManager {
  private readonly CARD_VERSION = '1.0.0';
  private readonly NIRVANA_API_VERSION = '^1.0.0';

  /**
   * Export a plugin to .nirvana-card format
   */
  async exportPlugin(pluginId: string, exportedBy?: string): Promise<NirvanaCard | null> {
    const plugin = pluginRegistry.getPlugin(pluginId);
    if (!plugin) {
      console.error('[PluginCardManager] Plugin not found:', pluginId);
      return null;
    }

    const card: NirvanaCard = {
      version: this.CARD_VERSION,
      metadata: {
        ...plugin.metadata,
      },
      plugin: {
        component: plugin.component,
        enabled: plugin.enabled,
        autoLoad: plugin.autoLoad,
      },
      dependencies: {
        'nirvana-api': this.NIRVANA_API_VERSION,
      },
      exportedAt: new Date().toISOString(),
      exportedBy: exportedBy || 'user',
    };

    console.log('[PluginCardManager] Exported plugin:', pluginId);
    return card;
  }

  /**
   * Import a plugin from .nirvana-card format
   */
  async importCard(card: NirvanaCard): Promise<{ success: boolean; pluginId?: string; error?: string }> {
    // Validate card first
    const validation = this.validateCard(card);
    if (!validation.valid) {
      return {
        success: false,
        error: `Card validation failed: ${validation.errors.join(', ')}`,
      };
    }

    // Create plugin from card
    const plugin: Plugin = {
      metadata: {
        ...card.metadata,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      component: card.plugin.component,
      enabled: false,  // Imported plugins start disabled for safety
      autoLoad: false,
    };

    try {
      const pluginId = await pluginRegistry.registerPlugin(plugin);
      console.log('[PluginCardManager] Imported plugin:', pluginId, '-', plugin.metadata.name);
      return {
        success: true,
        pluginId,
      };
    } catch (error: any) {
      console.error('[PluginCardManager] Import failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to register plugin',
      };
    }
  }

  /**
   * Validate a .nirvana-card file
   */
  validateCard(card: NirvanaCard): CardValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check version
    if (!card.version) {
      errors.push('Missing card version');
    } else if (card.version !== this.CARD_VERSION) {
      warnings.push(`Card version ${card.version} may be incompatible with current version ${this.CARD_VERSION}`);
    }

    // Check metadata
    if (!card.metadata) {
      errors.push('Missing plugin metadata');
    } else {
      if (!card.metadata.id) errors.push('Missing plugin ID');
      if (!card.metadata.name) errors.push('Missing plugin name');
      if (!card.metadata.description) errors.push('Missing plugin description');
      if (!card.metadata.author) errors.push('Missing plugin author');
      if (!card.metadata.version) errors.push('Missing plugin version');
    }

    // Check plugin component
    if (!card.plugin) {
      errors.push('Missing plugin data');
    } else {
      if (!card.plugin.component) {
        errors.push('Missing plugin component');
      } else {
        if (!card.plugin.component.template) errors.push('Missing component template');
        if (!card.plugin.component.styles) warnings.push('Missing component styles (optional)');
        if (!card.plugin.component.props) warnings.push('Missing component props definition (optional)');
        if (!card.plugin.component.events) warnings.push('Missing component events definition (optional)');
      }
    }

    // Check dependencies
    if (card.dependencies) {
      const nirvanaApiVersion = card.dependencies['nirvana-api'];
      if (!nirvanaApiVersion) {
        warnings.push('Missing nirvana-api dependency');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Download card as .nirvana-card file
   */
  async downloadCard(pluginId: string): Promise<void> {
    const card = await this.exportPlugin(pluginId);
    if (!card) {
      console.error('[PluginCardManager] Failed to export plugin:', pluginId);
      return;
    }

    const blob = new Blob([JSON.stringify(card, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${card.metadata.id}.nirvana-card`;
    a.click();
    URL.revokeObjectURL(url);

    console.log('[PluginCardManager] Downloaded card:', card.metadata.name);
  }

  /**
   * Read and import card from file
   */
  async importFromFile(file: File): Promise<{ success: boolean; pluginId?: string; error?: string }> {
    try {
      const text = await file.text();
      const card = JSON.parse(text) as NirvanaCard;
      return await this.importCard(card);
    } catch (error: any) {
      console.error('[PluginCardManager] File read error:', error);
      return {
        success: false,
        error: error.message || 'Failed to read card file',
      };
    }
  }

  /**
   * Import card from JSON string
   */
  async importFromJSON(json: string): Promise<{ success: boolean; pluginId?: string; error?: string }> {
    try {
      const card = JSON.parse(json) as NirvanaCard;
      return await this.importCard(card);
    } catch (error: any) {
      console.error('[PluginCardManager] JSON parse error:', error);
      return {
        success: false,
        error: error.message || 'Invalid JSON format',
      };
    }
  }

  /**
   * Export all plugins as a bundle
   */
  async exportAllPlugins(): Promise<NirvanaCard[]> {
    const cards: NirvanaCard[] = [];
    const plugins = pluginRegistry.getAllPlugins();

    for (const plugin of plugins) {
      const card = await this.exportPlugin(plugin.metadata.id);
      if (card) {
        cards.push(card);
      }
    }

    console.log('[PluginCardManager] Exported', cards.length, 'plugins');
    return cards;
  }

  /**
   * Download all plugins as bundle
   */
  async downloadAllPlugins(): Promise<void> {
    const cards = await this.exportAllPlugins();
    
    const blob = new Blob([JSON.stringify(cards, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nirvana-plugins-bundle-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    console.log('[PluginCardManager] Downloaded plugin bundle');
  }
}

export const pluginCardManager = new PluginCardManager();
