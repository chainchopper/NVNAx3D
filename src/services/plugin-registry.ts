/**
 * Dynamic UI Plugin Registry
 * Manages PersonI-generated UI components with persistence
 */

import type {
  Plugin,
  PluginMetadata,
  PluginInstance,
  PluginRegistry as IPluginRegistry,
} from '../types/plugin-types';

class PluginRegistry {
  private plugins: Map<string, Plugin> = new Map();
  private instances: Map<string, PluginInstance> = new Map();
  private loadedComponents: Map<string, any> = new Map();
  private storageKey = 'nirvana_plugins';
  private instancesKey = 'nirvana_plugin_instances';

  async initialize(): Promise<void> {
    await this.loadFromStorage();
    console.log('[PluginRegistry] Initialized with', this.plugins.size, 'plugins');
  }

  private async loadFromStorage(): Promise<void> {
    try {
      const pluginsJson = localStorage.getItem(this.storageKey);
      const instancesJson = localStorage.getItem(this.instancesKey);

      if (pluginsJson) {
        const pluginsArray: Plugin[] = JSON.parse(pluginsJson);
        pluginsArray.forEach(plugin => {
          this.plugins.set(plugin.metadata.id, plugin);
        });
      }

      if (instancesJson) {
        const instancesArray: PluginInstance[] = JSON.parse(instancesJson);
        instancesArray.forEach(instance => {
          this.instances.set(instance.instanceId, instance);
        });
      }
    } catch (error) {
      console.error('[PluginRegistry] Error loading from storage:', error);
    }
  }

  private async saveToStorage(): Promise<void> {
    try {
      const pluginsArray = Array.from(this.plugins.values());
      const instancesArray = Array.from(this.instances.values());

      localStorage.setItem(this.storageKey, JSON.stringify(pluginsArray));
      localStorage.setItem(this.instancesKey, JSON.stringify(instancesArray));
    } catch (error) {
      console.error('[PluginRegistry] Error saving to storage:', error);
    }
  }

  async registerPlugin(plugin: Plugin): Promise<string> {
    const id = plugin.metadata.id || this.generateId();
    
    const pluginWithId: Plugin = {
      ...plugin,
      metadata: {
        ...plugin.metadata,
        id,
        updatedAt: new Date().toISOString(),
      },
    };

    this.plugins.set(id, pluginWithId);
    await this.saveToStorage();

    console.log('[PluginRegistry] Registered plugin:', id, '-', plugin.metadata.name);
    return id;
  }

  async unregisterPlugin(id: string): Promise<boolean> {
    const deleted = this.plugins.delete(id);
    
    if (deleted) {
      Array.from(this.instances.values())
        .filter(instance => instance.pluginId === id)
        .forEach(instance => this.instances.delete(instance.instanceId));

      this.loadedComponents.delete(id);
      await this.saveToStorage();
      console.log('[PluginRegistry] Unregistered plugin:', id);
    }

    return deleted;
  }

  async updatePlugin(id: string, updates: Partial<Plugin>): Promise<boolean> {
    const existing = this.plugins.get(id);
    
    if (!existing) {
      return false;
    }

    const updated: Plugin = {
      ...existing,
      ...updates,
      metadata: {
        ...existing.metadata,
        ...updates.metadata,
        id,
        updatedAt: new Date().toISOString(),
      },
    };

    this.plugins.set(id, updated);
    await this.saveToStorage();
    
    console.log('[PluginRegistry] Updated plugin:', id);
    return true;
  }

  async togglePlugin(id: string, enabled?: boolean): Promise<boolean> {
    const plugin = this.plugins.get(id);
    
    if (!plugin) {
      return false;
    }

    plugin.enabled = enabled !== undefined ? enabled : !plugin.enabled;
    await this.saveToStorage();
    
    console.log('[PluginRegistry] Toggled plugin:', id, 'enabled:', plugin.enabled);
    return plugin.enabled;
  }

  async setAutoLoad(id: string, autoLoad: boolean): Promise<boolean> {
    const plugin = this.plugins.get(id);
    
    if (!plugin) {
      return false;
    }

    plugin.autoLoad = autoLoad;
    await this.saveToStorage();
    
    console.log('[PluginRegistry] Set autoLoad for plugin:', id, 'autoLoad:', autoLoad);
    return true;
  }

  getPlugin(id: string): Plugin | undefined {
    return this.plugins.get(id);
  }

  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  getEnabledPlugins(): Plugin[] {
    return Array.from(this.plugins.values()).filter(p => p.enabled);
  }

  getAutoLoadPlugins(): Plugin[] {
    return Array.from(this.plugins.values()).filter(p => p.autoLoad && p.enabled);
  }

  searchPlugins(query: string): Plugin[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.plugins.values()).filter(plugin => 
      plugin.metadata.name.toLowerCase().includes(lowerQuery) ||
      plugin.metadata.description.toLowerCase().includes(lowerQuery) ||
      plugin.metadata.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  async createInstance(pluginId: string, props: Record<string, any> = {}): Promise<string | null> {
    const plugin = this.plugins.get(pluginId);
    
    if (!plugin || !plugin.enabled) {
      console.warn('[PluginRegistry] Cannot create instance - plugin not found or disabled:', pluginId);
      return null;
    }

    const instanceId = this.generateId();
    const instance: PluginInstance = {
      pluginId,
      instanceId,
      props,
    };

    this.instances.set(instanceId, instance);
    await this.saveToStorage();

    console.log('[PluginRegistry] Created instance:', instanceId, 'for plugin:', pluginId);
    return instanceId;
  }

  async destroyInstance(instanceId: string): Promise<boolean> {
    const deleted = this.instances.delete(instanceId);
    
    if (deleted) {
      await this.saveToStorage();
      console.log('[PluginRegistry] Destroyed instance:', instanceId);
    }

    return deleted;
  }

  getInstance(instanceId: string): PluginInstance | undefined {
    return this.instances.get(instanceId);
  }

  getPluginInstances(pluginId: string): PluginInstance[] {
    return Array.from(this.instances.values()).filter(i => i.pluginId === pluginId);
  }

  getAllInstances(): PluginInstance[] {
    return Array.from(this.instances.values());
  }

  setLoadedComponent(pluginId: string, component: any): void {
    this.loadedComponents.set(pluginId, component);
  }

  getLoadedComponent(pluginId: string): any {
    return this.loadedComponents.get(pluginId);
  }

  private generateId(): string {
    return `plugin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async exportPlugin(id: string): Promise<string | null> {
    const plugin = this.plugins.get(id);
    
    if (!plugin) {
      return null;
    }

    return JSON.stringify(plugin, null, 2);
  }

  async importPlugin(pluginJson: string): Promise<string | null> {
    try {
      const plugin: Plugin = JSON.parse(pluginJson);
      
      const newId = this.generateId();
      plugin.metadata.id = newId;
      plugin.metadata.createdAt = new Date().toISOString();
      plugin.metadata.updatedAt = new Date().toISOString();

      return await this.registerPlugin(plugin);
    } catch (error) {
      console.error('[PluginRegistry] Error importing plugin:', error);
      return null;
    }
  }

  getStats() {
    return {
      totalPlugins: this.plugins.size,
      enabledPlugins: this.getEnabledPlugins().length,
      autoLoadPlugins: this.getAutoLoadPlugins().length,
      totalInstances: this.instances.size,
      loadedComponents: this.loadedComponents.size,
    };
  }
}

export const pluginRegistry = new PluginRegistry();
