/**
 * Storage Quota Manager
 * Monitors and manages localStorage usage with automatic cleanup
 */

export interface StorageStats {
  used: number;
  total: number;
  percentage: number;
  byKey: Map<string, number>;
}

export interface CleanupResult {
  deletedKeys: number;
  bytesFreed: number;
  success: boolean;
}

const QUOTA_WARNING_THRESHOLD = 0.75; // Warn at 75%
const QUOTA_CLEANUP_THRESHOLD = 0.85; // Auto-cleanup at 85%
const QUOTA_ESTIMATE = 10 * 1024 * 1024; // 10MB typical localStorage limit

// Priorities for cleanup (higher = keep longer)
const KEY_PRIORITIES: Record<string, number> = {
  // Critical - never auto-delete
  'gdm-personis': 100,
  'gdm-providers': 100,
  'userProfile': 100,
  'nirvana_oauth_vault': 100,
  'nirvana_oauth_vault_key': 100,
  
  // Important - delete only when critical
  'gdm-tasks': 80,
  'gdm-notes': 80,
  'nirvana-active-personas': 80,
  'nirvana_plugins': 80,
  
  // Standard - can delete when needed
  'nirvana-context-history': 50,
  'personai_vector_memories': 50,
  
  // Low priority - delete first
  'nirvana-gol-state': 20,
  'agent_patterns': 30,
  'dismissed-patterns': 10,
};

export class StorageQuotaManager {
  private warningShown = false;
  private monitoringInterval: number | null = null;

  constructor() {
    this.startMonitoring();
  }

  /**
   * Calculate current localStorage usage
   */
  getStorageStats(): StorageStats {
    let totalSize = 0;
    const byKey = new Map<string, number>();

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      const value = localStorage.getItem(key);
      if (!value) continue;

      const size = new Blob([value]).size;
      totalSize += size;
      byKey.set(key, size);
    }

    return {
      used: totalSize,
      total: QUOTA_ESTIMATE,
      percentage: (totalSize / QUOTA_ESTIMATE) * 100,
      byKey,
    };
  }

  /**
   * Check if storage is healthy
   */
  checkHealth(): { healthy: boolean; reason?: string } {
    const stats = this.getStorageStats();

    if (stats.percentage >= 95) {
      return { healthy: false, reason: 'Critical: Storage 95% full' };
    }
    if (stats.percentage >= QUOTA_CLEANUP_THRESHOLD * 100) {
      return { healthy: false, reason: `Storage ${Math.round(stats.percentage)}% full` };
    }
    if (stats.percentage >= QUOTA_WARNING_THRESHOLD * 100) {
      return { healthy: false, reason: `Storage ${Math.round(stats.percentage)}% full (warning)` };
    }

    return { healthy: true };
  }

  /**
   * Prune old memories from vector storage
   */
  pruneMemories(keepCount: number = 500): CleanupResult {
    try {
      const stored = localStorage.getItem('personai_vector_memories');
      if (!stored) {
        return { deletedKeys: 0, bytesFreed: 0, success: true };
      }

      const memories = JSON.parse(stored);
      if (!Array.isArray(memories)) {
        return { deletedKeys: 0, bytesFreed: 0, success: false };
      }

      const originalSize = new Blob([stored]).size;
      const deletedCount = memories.length - keepCount;

      if (deletedCount <= 0) {
        return { deletedKeys: 0, bytesFreed: 0, success: true };
      }

      // Sort by timestamp in metadata, keep most recent
      memories.sort((a: any, b: any) => {
        const aTime = a.metadata?.timestamp ? new Date(a.metadata.timestamp).getTime() : 0;
        const bTime = b.metadata?.timestamp ? new Date(b.metadata.timestamp).getTime() : 0;
        return bTime - aTime;
      });

      const pruned = memories.slice(0, keepCount);
      const prunedStr = JSON.stringify(pruned);
      localStorage.setItem('personai_vector_memories', prunedStr);

      const newSize = new Blob([prunedStr]).size;
      const bytesFreed = originalSize - newSize;

      console.log(`[StorageQuotaManager] Pruned ${deletedCount} old memories, freed ${(bytesFreed / 1024).toFixed(1)}KB`);

      return {
        deletedKeys: deletedCount,
        bytesFreed,
        success: true,
      };
    } catch (error) {
      console.error('[StorageQuotaManager] Failed to prune memories:', error);
      return { deletedKeys: 0, bytesFreed: 0, success: false };
    }
  }

  /**
   * Trim conversation history
   */
  trimConversationHistory(maxMessagesPerSlot: number = 50): CleanupResult {
    try {
      const stored = localStorage.getItem('nirvana-context-history');
      if (!stored) {
        return { deletedKeys: 0, bytesFreed: 0, success: true };
      }

      const originalSize = new Blob([stored]).size;
      const history = JSON.parse(stored);

      let totalTrimmed = 0;

      if (history.primary && Array.isArray(history.primary)) {
        const trimmed = history.primary.length - maxMessagesPerSlot;
        if (trimmed > 0) {
          history.primary = history.primary.slice(-maxMessagesPerSlot);
          totalTrimmed += trimmed;
        }
      }

      if (history.secondary && Array.isArray(history.secondary)) {
        const trimmed = history.secondary.length - maxMessagesPerSlot;
        if (trimmed > 0) {
          history.secondary = history.secondary.slice(-maxMessagesPerSlot);
          totalTrimmed += trimmed;
        }
      }

      if (totalTrimmed > 0) {
        const trimmedStr = JSON.stringify(history);
        localStorage.setItem('nirvana-context-history', trimmedStr);

        const newSize = new Blob([trimmedStr]).size;
        const bytesFreed = originalSize - newSize;

        console.log(`[StorageQuotaManager] Trimmed ${totalTrimmed} old messages, freed ${(bytesFreed / 1024).toFixed(1)}KB`);

        return {
          deletedKeys: totalTrimmed,
          bytesFreed,
          success: true,
        };
      }

      return { deletedKeys: 0, bytesFreed: 0, success: true };
    } catch (error) {
      console.error('[StorageQuotaManager] Failed to trim conversation history:', error);
      return { deletedKeys: 0, bytesFreed: 0, success: false };
    }
  }

  /**
   * Delete low-priority keys
   */
  deleteLowPriorityKeys(minPriority: number = 30): CleanupResult {
    let deletedKeys = 0;
    let bytesFreed = 0;

    try {
      const stats = this.getStorageStats();

      for (const [key, size] of stats.byKey.entries()) {
        const priority = KEY_PRIORITIES[key] || 50;

        if (priority < minPriority) {
          localStorage.removeItem(key);
          deletedKeys++;
          bytesFreed += size;
          console.log(`[StorageQuotaManager] Deleted low-priority key: ${key} (${(size / 1024).toFixed(1)}KB)`);
        }
      }

      return { deletedKeys, bytesFreed, success: true };
    } catch (error) {
      console.error('[StorageQuotaManager] Failed to delete low-priority keys:', error);
      return { deletedKeys, bytesFreed, success: false };
    }
  }

  /**
   * Automatic cleanup when quota is exceeded
   */
  async performAutoCleanup(): Promise<CleanupResult> {
    console.log('[StorageQuotaManager] Starting automatic cleanup...');

    let totalDeleted = 0;
    let totalFreed = 0;

    // Step 1: Prune memories to 500 most recent
    const memoryResult = this.pruneMemories(500);
    totalDeleted += memoryResult.deletedKeys;
    totalFreed += memoryResult.bytesFreed;

    // Step 2: Trim conversation history to 50 messages per slot
    const historyResult = this.trimConversationHistory(50);
    totalDeleted += historyResult.deletedKeys;
    totalFreed += historyResult.bytesFreed;

    // Step 3: Delete low-priority keys
    const lowPriorityResult = this.deleteLowPriorityKeys(30);
    totalDeleted += lowPriorityResult.deletedKeys;
    totalFreed += lowPriorityResult.bytesFreed;

    // Step 4: If still above threshold, more aggressive pruning
    let stats = this.getStorageStats();
    if (stats.percentage >= QUOTA_CLEANUP_THRESHOLD * 100) {
      console.warn('[StorageQuotaManager] Still above threshold after cleanup, pruning more aggressively');
      
      // More aggressive memory pruning
      const aggressiveMemory = this.pruneMemories(250);
      totalDeleted += aggressiveMemory.deletedKeys;
      totalFreed += aggressiveMemory.bytesFreed;

      // More aggressive history trimming
      const aggressiveHistory = this.trimConversationHistory(25);
      totalDeleted += aggressiveHistory.deletedKeys;
      totalFreed += aggressiveHistory.bytesFreed;

      stats = this.getStorageStats();
    }

    const success = stats.percentage < QUOTA_CLEANUP_THRESHOLD * 100;

    if (!success) {
      console.error(`[StorageQuotaManager] ⚠️ Cleanup failed to bring storage below threshold: ${stats.percentage.toFixed(1)}% used`);
    }

    console.log(`[StorageQuotaManager] Cleanup ${success ? 'succeeded' : 'FAILED'}: ${totalDeleted} items removed, ${(totalFreed / 1024).toFixed(1)}KB freed (now at ${stats.percentage.toFixed(1)}%)`);

    return {
      deletedKeys: totalDeleted,
      bytesFreed: totalFreed,
      success,
    };
  }

  /**
   * Start monitoring storage and auto-cleanup
   */
  private startMonitoring(): void {
    // Check every 30 seconds
    this.monitoringInterval = window.setInterval(() => {
      this.checkAndCleanup();
    }, 30000);

    // Initial check
    this.checkAndCleanup();
  }

  private checkAndCleanup(): void {
    const stats = this.getStorageStats();

    // Critical: Auto-cleanup at 85%
    if (stats.percentage >= QUOTA_CLEANUP_THRESHOLD * 100) {
      console.warn(`[StorageQuotaManager] ⚠️ Storage ${Math.round(stats.percentage)}% full - triggering auto-cleanup`);
      this.performAutoCleanup();
    }
    // Warning at 75%
    else if (stats.percentage >= QUOTA_WARNING_THRESHOLD * 100 && !this.warningShown) {
      console.warn(`[StorageQuotaManager] ⚠️ Storage ${Math.round(stats.percentage)}% full - consider clearing old data`);
      this.warningShown = true;
    }
    // Reset warning flag if storage drops below threshold
    else if (stats.percentage < QUOTA_WARNING_THRESHOLD * 100) {
      this.warningShown = false;
    }
  }

  /**
   * Log detailed storage usage
   */
  logStorageUsage(): void {
    const stats = this.getStorageStats();

    console.log(`[StorageQuotaManager] === Storage Usage ===`);
    console.log(`Total: ${(stats.used / 1024).toFixed(1)}KB / ~${(stats.total / 1024).toFixed(0)}KB (${stats.percentage.toFixed(1)}%)`);
    console.log(`Breakdown by key:`);

    const sorted = Array.from(stats.byKey.entries()).sort((a, b) => b[1] - a[1]);

    for (const [key, size] of sorted.slice(0, 20)) {
      const priority = KEY_PRIORITIES[key] || 50;
      console.log(`  ${key}: ${(size / 1024).toFixed(1)}KB (priority: ${priority})`);
    }

    console.log(`========================`);
  }

  /**
   * Stop monitoring
   */
  destroy(): void {
    if (this.monitoringInterval !== null) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }
}

// Singleton instance
export const storageQuotaManager = new StorageQuotaManager();
