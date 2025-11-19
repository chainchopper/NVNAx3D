/**
 * PersistentStateController - Lit ReactiveController for auto-persistence
 * 
 * Mirrors React's useEffect pattern for Lit components:
 * - Automatically saves state on component updates
 * - No manual save buttons required
 * - Works with StorageSyncService for intelligent debouncing
 * 
 * Usage:
 * ```typescript
 * class MyComponent extends LitElement {
 *   private persistence = new PersistentStateController(this, {
 *     namespace: 'my-component',
 *     getState: () => ({ myProp: this.myProp }),
 *     setState: (state) => { this.myProp = state.myProp; }
 *   });
 * }
 * ```
 */

import { ReactiveController, ReactiveControllerHost } from 'lit';
import { StorageSyncService } from '../services/storage-sync-service.js';

interface PersistentStateOptions<T> {
  namespace: string;
  getState: () => T;
  setState: (state: T) => void;
  autoLoad?: boolean;
  watchProperties?: string[];
}

export class PersistentStateController<T = any> implements ReactiveController {
  private host: ReactiveControllerHost;
  private options: PersistentStateOptions<T>;
  private lastSavedState: T | null = null;
  private initialized = false;

  constructor(host: ReactiveControllerHost, options: PersistentStateOptions<T>) {
    this.host = host;
    this.options = {
      autoLoad: true,
      ...options
    };
    
    host.addController(this);
  }

  hostConnected(): void {
    if (this.options.autoLoad && !this.initialized) {
      this.loadState();
      this.initialized = true;
    }

    this.setupStorageSyncListener();
  }

  hostDisconnected(): void {
    this.flush();
  }

  hostUpdated(): void {
    const currentState = this.options.getState();
    
    if (!this.deepEqual(currentState, this.lastSavedState)) {
      this.saveState(currentState);
    }
  }

  /**
   * Manually trigger a save (debounced)
   */
  save(): void {
    const currentState = this.options.getState();
    this.saveState(currentState);
  }

  /**
   * Force immediate write bypassing debounce
   */
  flush(): void {
    StorageSyncService.flush(this.options.namespace);
  }

  /**
   * Load state from storage
   */
  loadState(): void {
    const stored = StorageSyncService.load<T>(this.options.namespace);
    
    if (stored) {
      this.options.setState(stored);
      this.lastSavedState = stored;
      this.host.requestUpdate();
    }
  }

  /**
   * Get current state without triggering save
   */
  getState(): T {
    return this.options.getState();
  }

  /**
   * Clear stored state
   */
  clear(): void {
    localStorage.removeItem(this.options.namespace);
    this.lastSavedState = null;
  }

  /**
   * Save state using StorageSyncService
   */
  private saveState(state: T): void {
    StorageSyncService.save(this.options.namespace, state);
    this.lastSavedState = state;
  }

  /**
   * Listen for cross-tab storage sync events
   */
  private setupStorageSyncListener(): void {
    const handler = ((event: CustomEvent) => {
      if (event.detail.namespace === this.options.namespace) {
        this.options.setState(event.detail.data);
        this.lastSavedState = event.detail.data;
        this.host.requestUpdate();
      }
    }) as EventListener;

    window.addEventListener('storage-sync', handler);
  }

  /**
   * Deep equality check
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
}
