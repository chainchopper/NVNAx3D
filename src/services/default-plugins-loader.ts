/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { pluginRegistry } from './plugin-registry';
import { DEFAULT_PLUGINS } from '../plugins/default-plugins';

const DEFAULT_PLUGINS_LOADED_KEY = 'nirvana_default_plugins_loaded';

/**
 * Default Plugins Loader
 * Auto-imports bundled default plugins on first app load
 */
class DefaultPluginsLoader {
  async loadDefaultPlugins(): Promise<void> {
    // Check if default plugins already loaded
    const alreadyLoaded = localStorage.getItem(DEFAULT_PLUGINS_LOADED_KEY);
    
    if (alreadyLoaded === 'true') {
      console.log('[DefaultPlugins] Already loaded, skipping');
      return;
    }

    console.log('[DefaultPlugins] Loading default plugins...');

    try {
      // Register each default plugin
      for (const plugin of DEFAULT_PLUGINS) {
        // Check if plugin already exists (avoid duplicates)
        const existing = pluginRegistry.getPlugin(plugin.metadata.id);
        if (existing) {
          console.log('[DefaultPlugins] Skipping existing plugin:', plugin.metadata.id);
          continue;
        }

        await pluginRegistry.registerPlugin(plugin);
        console.log('[DefaultPlugins] Registered:', plugin.metadata.name);
      }

      // Mark as loaded
      localStorage.setItem(DEFAULT_PLUGINS_LOADED_KEY, 'true');
      console.log('[DefaultPlugins] Successfully loaded', DEFAULT_PLUGINS.length, 'default plugins');
    } catch (error) {
      console.error('[DefaultPlugins] Failed to load default plugins:', error);
    }
  }

  /**
   * Reset flag to reload default plugins (useful for development/testing)
   */
  resetLoadFlag(): void {
    localStorage.removeItem(DEFAULT_PLUGINS_LOADED_KEY);
    console.log('[DefaultPlugins] Load flag reset - plugins will reload on next app start');
  }

  /**
   * Get list of default plugin IDs
   */
  getDefaultPluginIds(): string[] {
    return DEFAULT_PLUGINS.map(p => p.metadata.id);
  }
}

export const defaultPluginsLoader = new DefaultPluginsLoader();
