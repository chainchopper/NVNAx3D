/**
 * System Context Service
 * 
 * Aggregates ALL system state and menu data to provide complete awareness
 * to PersonI AI - ensuring consistent context regardless of AI provider/model.
 * 
 * This service acts as the "system memory" that PersonI can always access,
 * providing information about:
 * - User profile and preferences
 * - Notes, tasks, routines summaries
 * - Configured connectors and their status
 * - Current app state (UI, settings, active features)
 * - Available capabilities and tools
 */

import { appStateService } from './app-state-service';
import { userProfileManager } from './user-profile-manager';
import { notesManager } from './notes-manager';
import { tasksManager } from './tasks-manager';
import { routineExecutor } from './routine-executor';
import { pluginRegistry } from './plugin-registry';
import { ConnectorConfigManager } from '../types/connector-config';
import { providerManager } from './provider-manager';
import { ragMemoryManager } from './memory/rag-memory-manager';
import { toolOrchestrator } from './tool-orchestrator';
import type { PersoniConfig } from '../personas';

export interface SystemContext {
  timestamp: string;
  userProfile: {
    name: string;
    pronouns?: string;
    timezone: string;
    customContext?: string;
  };
  activePersonI: {
    name: string;
    id: string;
    enabledConnectors: string[];
    capabilities: string[];
    availableTools: string[];
  };
  dataSnapshot: {
    notes: { total: number; recentCount: number; hasData: boolean };
    tasks: { total: number; pending: number; completed: number; overdue: number; hasData: boolean };
    routines: { total: number; enabled: number; hasData: boolean };
    memories: { total: number; hasData: boolean; byType: Record<string, number> };
    plugins: { total: number; enabled: number; hasData: boolean };
  };
  connectors: {
    configured: string[];
    available: string[];
    status: Record<string, { configured: boolean; verified: boolean }>;
  };
  providers: {
    configured: string[];
    activeModel: string | null;
  };
  appState: {
    dualModeEnabled: boolean;
    musicDetectionEnabled: boolean;
    activePanel: string;
  };
}

class SystemContextService {
  private initialized = false;
  private contextCache: SystemContext | null = null;
  private cacheTimestamp = 0;
  private readonly CACHE_TTL_MS = 30000; // 30 seconds cache
  private memoryCount = 0;
  private memoryCountTimestamp = 0;
  private readonly MEMORY_COUNT_CACHE_MS = 60000; // 1 minute cache for memory count

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Initialize all managers
    try {
      await notesManager.initialize();
      await tasksManager.initialize();
      await routineExecutor.initialize();
      await ragMemoryManager.initialize();
    } catch (error) {
      console.warn('[SystemContext] Some managers failed to initialize:', error);
    }

    this.initialized = true;
    console.log('[SystemContext] Initialized');
  }

  /**
   * Get complete system context for AI awareness (with smart caching)
   */
  async getSystemContext(personi: PersoniConfig, forceRefresh = false): Promise<SystemContext> {
    if (!this.initialized) {
      await this.initialize();
    }

    const now = Date.now();
    const cacheValid = !forceRefresh && this.contextCache && (now - this.cacheTimestamp) < this.CACHE_TTL_MS;

    if (cacheValid) {
      // Clone cached context to avoid mutation
      const clonedContext: SystemContext = {
        ...this.contextCache!,
        activePersonI: {
          name: personi.name,
          id: personi.id,
          enabledConnectors: personi.enabledConnectors || [],
          capabilities: this.extractCapabilities(personi),
          availableTools: this.getAvailableTools(personi),
        },
        // Clone dataSnapshot to update volatile counts
        dataSnapshot: {
          ...this.contextCache!.dataSnapshot,
          // Refresh memory count if stale
          memories: await this.getMemoriesSnapshot(),
        },
      };
      return clonedContext;
    }

    // Full refresh
    const timestamp = new Date().toISOString();
    const appState = appStateService.getState();
    const userProfile = userProfileManager.getProfile();

    // Get data snapshots
    const notesSnapshot = await this.getNotesSnapshot();
    const tasksSnapshot = await this.getTasksSnapshot();
    const routinesSnapshot = await this.getRoutinesSnapshot();
    const pluginsSnapshot = await this.getPluginsSnapshot();
    const memoriesSnapshot = await this.getMemoriesSnapshot();
    
    // Get connector status
    const connectorConfigs = ConnectorConfigManager.loadConfigs();
    const configuredConnectors = connectorConfigs
      .filter(c => c.configured)
      .map(c => c.id);
    
    const connectorStatus: Record<string, { configured: boolean; verified: boolean }> = {};
    connectorConfigs.forEach(c => {
      connectorStatus[c.id] = {
        configured: c.configured,
        verified: c.verified,
      };
    });

    // Get provider status
    const providers = providerManager.getAllProviders();
    const configuredProviders = providers
      .filter(p => p.enabled && p.verified)
      .map(p => p.name);

    const context: SystemContext = {
      timestamp,
      userProfile: {
        name: userProfile.name,
        pronouns: userProfile.pronouns,
        timezone: userProfile.timezone,
        customContext: userProfile.customContext,
      },
      activePersonI: {
        name: personi.name,
        id: personi.id,
        enabledConnectors: personi.enabledConnectors || [],
        capabilities: this.extractCapabilities(personi),
        availableTools: this.getAvailableTools(personi),
      },
      dataSnapshot: {
        notes: notesSnapshot,
        tasks: tasksSnapshot,
        routines: routinesSnapshot,
        memories: memoriesSnapshot,
        plugins: pluginsSnapshot,
      },
      connectors: {
        configured: configuredConnectors,
        available: connectorConfigs.map(c => c.id),
        status: connectorStatus,
      },
      providers: {
        configured: configuredProviders,
        activeModel: personi.models?.conversation as string || null,
      },
      appState: {
        dualModeEnabled: appState.dualModeEnabled,
        musicDetectionEnabled: appState.musicDetectionEnabled,
        activePanel: appState.activeSidePanel,
      },
    };

    // Cache the context
    this.contextCache = context;
    this.cacheTimestamp = now;

    return context;
  }

  /**
   * Extract capabilities from PersonI config
   */
  private extractCapabilities(personi: PersoniConfig): string[] {
    const capabilities: string[] = [];
    if (personi.capabilities?.vision) capabilities.push('vision');
    if (personi.capabilities?.imageGeneration) capabilities.push('image-generation');
    if (personi.capabilities?.webSearch) capabilities.push('web-search');
    if (personi.capabilities?.tools) capabilities.push('tool-calling');
    return capabilities;
  }

  /**
   * Get available tools for PersonI
   */
  private getAvailableTools(personi: PersoniConfig): string[] {
    const tools: string[] = [];
    
    // Get tools enabled for this PersonI via connectors
    const enabledConnectors = personi.enabledConnectors || [];
    
    // Map connectors to their available tools
    enabledConnectors.forEach(connectorId => {
      const connectorTools = toolOrchestrator.getToolsForConnector(connectorId);
      tools.push(...connectorTools);
    });

    return [...new Set(tools)]; // Remove duplicates
  }

  /**
   * Format system context as human-readable string for AI prompt
   */
  formatContextForPrompt(context: SystemContext): string {
    const sections: string[] = [];

    // User profile section
    sections.push(`## User Information`);
    sections.push(`Name: ${context.userProfile.name}`);
    if (context.userProfile.pronouns) {
      sections.push(`Pronouns: ${context.userProfile.pronouns}`);
    }
    sections.push(`Timezone: ${context.userProfile.timezone}`);
    if (context.userProfile.customContext) {
      sections.push(`Context: ${context.userProfile.customContext}`);
    }

    // PersonI capabilities
    sections.push(`\n## Your Capabilities`);
    sections.push(`Active PersonI: ${context.activePersonI.name}`);
    sections.push(`Capabilities: ${context.activePersonI.capabilities.join(', ') || 'basic conversation'}`);
    
    // Available tools
    if (context.activePersonI.availableTools.length > 0) {
      sections.push(`\n## Available Tools`);
      sections.push(`You have access to these tools: ${context.activePersonI.availableTools.join(', ')}`);
    }
    
    // Connector status
    if (context.activePersonI.enabledConnectors.length > 0) {
      sections.push(`\n## Connected Services`);
      context.activePersonI.enabledConnectors.forEach(connectorId => {
        const status = context.connectors.status[connectorId];
        if (status?.verified) {
          sections.push(`✓ ${connectorId} (verified and ready)`);
        } else if (status?.configured) {
          sections.push(`⚠ ${connectorId} (configured, needs verification)`);
        } else {
          sections.push(`✗ ${connectorId} (not configured)`);
        }
      });
    }

    // Data availability
    sections.push(`\n## Available Data`);
    
    if (context.dataSnapshot.notes.hasData) {
      sections.push(`📝 Notes: ${context.dataSnapshot.notes.total} total (${context.dataSnapshot.notes.recentCount} recent)`);
    }
    
    if (context.dataSnapshot.tasks.hasData) {
      sections.push(`✅ Tasks: ${context.dataSnapshot.tasks.pending} pending, ${context.dataSnapshot.tasks.completed} completed, ${context.dataSnapshot.tasks.overdue} overdue`);
    }
    
    if (context.dataSnapshot.routines.hasData) {
      sections.push(`⚡ Routines: ${context.dataSnapshot.routines.enabled} active automation routines`);
    }
    
    if (context.dataSnapshot.plugins.hasData) {
      sections.push(`🧩 Plugins: ${context.dataSnapshot.plugins.enabled} active custom components`);
    }
    
    if (context.dataSnapshot.memories.hasData) {
      const memoryTypesSummary = Object.entries(context.dataSnapshot.memories.byType)
        .filter(([_, count]) => count > 0)
        .map(([type, count]) => `${type}: ${count}`)
        .join(', ');
      sections.push(`🧠 Memories: ${context.dataSnapshot.memories.total} stored (${memoryTypesSummary})`);
    }

    // Current app state
    if (context.appState.dualModeEnabled) {
      sections.push(`\n## Active Features`);
      sections.push(`- Dual PersonI mode is active`);
    }
    
    if (context.appState.musicDetectionEnabled) {
      if (!context.appState.dualModeEnabled) {
        sections.push(`\n## Active Features`);
      }
      sections.push(`- Music detection enabled`);
    }

    return sections.join('\n');
  }

  /**
   * Get notes snapshot (counts without loading all data)
   */
  private async getNotesSnapshot(): Promise<{ total: number; recentCount: number; hasData: boolean }> {
    try {
      const notes = await notesManager.getNotes();
      const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
      const recentNotes = notes.filter(n => 
        new Date(n.timestamp).getTime() > twentyFourHoursAgo
      );
      
      return {
        total: notes.length,
        recentCount: recentNotes.length,
        hasData: notes.length > 0,
      };
    } catch (error) {
      console.warn('[SystemContext] Failed to get notes snapshot:', error);
      return { total: 0, recentCount: 0, hasData: false };
    }
  }

  /**
   * Get tasks snapshot
   */
  private async getTasksSnapshot(): Promise<{ total: number; pending: number; completed: number; overdue: number; hasData: boolean }> {
    try {
      const stats = await tasksManager.computeStatistics();
      return {
        total: stats.total,
        pending: stats.pending,
        completed: stats.completed,
        overdue: stats.overdue,
        hasData: stats.total > 0,
      };
    } catch (error) {
      console.warn('[SystemContext] Failed to get tasks snapshot:', error);
      return { total: 0, pending: 0, completed: 0, overdue: 0, hasData: false };
    }
  }

  /**
   * Get routines snapshot
   */
  private async getRoutinesSnapshot(): Promise<{ total: number; enabled: number; hasData: boolean }> {
    try {
      const routines = await routineExecutor.getRoutines();
      const enabled = routines.filter(r => r.enabled).length;
      
      return {
        total: routines.length,
        enabled,
        hasData: routines.length > 0,
      };
    } catch (error) {
      console.warn('[SystemContext] Failed to get routines snapshot:', error);
      return { total: 0, enabled: 0, hasData: false };
    }
  }

  /**
   * Get plugins snapshot
   */
  private getPluginsSnapshot(): { total: number; enabled: number; hasData: boolean } {
    try {
      const plugins = pluginRegistry.getAllPlugins();
      const enabled = plugins.filter(p => p.enabled).length;
      
      return {
        total: plugins.length,
        enabled,
        hasData: plugins.length > 0,
      };
    } catch (error) {
      console.warn('[SystemContext] Failed to get plugins snapshot:', error);
      return { total: 0, enabled: 0, hasData: false };
    }
  }

  /**
   * Get memories snapshot (optimized with separate cache)
   * Uses metadata-only query to avoid fetching documents/embeddings
   */
  private async getMemoriesSnapshot(): Promise<{ total: number; hasData: boolean; byType: Record<string, number> }> {
    const now = Date.now();
    
    // Use cached memory count if valid (avoids repeated Chroma queries)
    if ((now - this.memoryCountTimestamp) < this.MEMORY_COUNT_CACHE_MS) {
      return {
        total: this.memoryCount,
        hasData: this.memoryCount > 0,
        byType: {}, // Type breakdown only on full refresh
      };
    }

    try {
      // Lightweight metadata-only query - no documents or embeddings
      const memoryStats = await ragMemoryManager.getMemoryStats();
      
      // Update cache
      this.memoryCount = memoryStats.total;
      this.memoryCountTimestamp = now;

      return {
        total: memoryStats.total,
        hasData: memoryStats.total > 0,
        byType: memoryStats.byType,
      };
    } catch (error) {
      console.warn('[SystemContext] Failed to get memories snapshot:', error);
      return { total: 0, hasData: false, byType: {} };
    }
  }

  /**
   * Clear the context cache (useful for testing or forcing refresh)
   */
  clearCache(): void {
    this.contextCache = null;
    this.cacheTimestamp = 0;
  }
}

// Singleton instance
export const systemContextService = new SystemContextService();
