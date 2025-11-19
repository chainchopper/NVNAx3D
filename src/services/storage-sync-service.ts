/**
 * StorageSyncService - Intelligent auto-persistence without save buttons
 * 
 * Features:
 * - Debounced writes (300ms) with requestIdleCallback
 * - Deep equality checking to prevent unnecessary writes
 * - Cross-tab reconciliation with lastWriteEpoch
 * - Namespace support for organized storage
 * - Storage quota awareness
 */

interface PendingWrite {
  namespace: string;
  payload: any;
  timestamp: number;
}

class StorageSyncServiceClass {
  private pendingWrites: Map<string, PendingWrite> = new Map();
  private debounceTimers: Map<string, number> = new Map();
  private lastWriteEpochs: Map<string, number> = new Map();
  private readonly DEBOUNCE_MS = 300;
  private readonly instanceId = `${Date.now()}-${Math.random()}`;

  constructor() {
    this.setupStorageListener();
    this.setupBeforeUnload();
  }

  /**
   * Schedule a write to localStorage with debouncing and dirty checking
   */
  save(namespace: string, payload: any): void {
    const existingTimer = this.debounceTimers.get(namespace);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const currentData = this.load(namespace);
    if (this.deepEqual(currentData, payload)) {
      return;
    }

    this.pendingWrites.set(namespace, {
      namespace,
      payload,
      timestamp: Date.now()
    });

    const timer = window.setTimeout(() => {
      this.flush(namespace);
    }, this.DEBOUNCE_MS);

    this.debounceTimers.set(namespace, timer);
  }

  /**
   * Immediately write pending changes for a namespace
   */
  flush(namespace?: string): void {
    if (namespace) {
      const pending = this.pendingWrites.get(namespace);
      if (pending) {
        this.writeToStorage(pending);
        this.pendingWrites.delete(namespace);
      }
      const timer = this.debounceTimers.get(namespace);
      if (timer) {
        clearTimeout(timer);
        this.debounceTimers.delete(namespace);
      }
    } else {
      this.pendingWrites.forEach(pending => {
        this.writeToStorage(pending);
      });
      this.pendingWrites.clear();
      this.debounceTimers.forEach(timer => clearTimeout(timer));
      this.debounceTimers.clear();
    }
  }

  /**
   * Load data from localStorage
   */
  load<T = any>(namespace: string): T | null {
    try {
      const raw = localStorage.getItem(namespace);
      if (!raw) return null;
      
      const parsed = JSON.parse(raw);
      
      if (parsed && typeof parsed === 'object' && '_meta' in parsed) {
        return parsed.data as T;
      }
      
      return parsed as T;
    } catch (err) {
      console.warn(`[StorageSyncService] Failed to load ${namespace}:`, err);
      return null;
    }
  }

  /**
   * Write to storage with metadata and epoch tracking
   */
  private writeToStorage(pending: PendingWrite): void {
    const useIdleCallback = 'requestIdleCallback' in window;
    
    const doWrite = () => {
      try {
        const epoch = Date.now();
        const envelope = {
          _meta: {
            instanceId: this.instanceId,
            epoch,
            version: '1.0.0'
          },
          data: pending.payload
        };

        localStorage.setItem(pending.namespace, JSON.stringify(envelope));
        this.lastWriteEpochs.set(pending.namespace, epoch);
        
      } catch (err) {
        if ((err as any).name === 'QuotaExceededError') {
          console.error('[StorageSyncService] Storage quota exceeded for', pending.namespace);
          this.dispatchEvent(new CustomEvent('storage-quota-exceeded', {
            detail: { namespace: pending.namespace }
          }));
        } else {
          console.error('[StorageSyncService] Write failed:', err);
        }
      }
    };

    if (useIdleCallback) {
      requestIdleCallback(doWrite, { timeout: 1000 });
    } else {
      doWrite();
    }
  }

  /**
   * Deep equality check to avoid unnecessary writes
   */
  private deepEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (typeof a !== 'object' || typeof b !== 'object') return false;

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!this.deepEqual(a[key], b[key])) return false;
    }

    return true;
  }

  /**
   * Listen for storage events from other tabs
   */
  private setupStorageListener(): void {
    window.addEventListener('storage', (event) => {
      if (!event.key) return;

      try {
        const newValue = event.newValue ? JSON.parse(event.newValue) : null;
        
        if (newValue && newValue._meta) {
          if (newValue._meta.instanceId === this.instanceId) {
            return;
          }

          const lastEpoch = this.lastWriteEpochs.get(event.key);
          if (lastEpoch && newValue._meta.epoch <= lastEpoch) {
            return;
          }

          this.lastWriteEpochs.set(event.key, newValue._meta.epoch);
          
          this.dispatchEvent(new CustomEvent('storage-sync', {
            detail: {
              namespace: event.key,
              data: newValue.data,
              fromInstance: newValue._meta.instanceId
            }
          }));
        }
      } catch (err) {
        console.warn('[StorageSyncService] Failed to process storage event:', err);
      }
    });
  }

  /**
   * Flush all pending writes before page unload
   */
  private setupBeforeUnload(): void {
    window.addEventListener('beforeunload', () => {
      this.flush();
    });
  }

  /**
   * Event dispatcher for quota exceeded and cross-tab sync
   */
  private dispatchEvent(event: CustomEvent): void {
    window.dispatchEvent(event);
  }
}

export const StorageSyncService = new StorageSyncServiceClass();
