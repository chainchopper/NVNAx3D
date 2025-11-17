/**
 * Shared App State Service
 * 
 * Central state management for app-wide state that needs to be accessed
 * by both the main interface and visualizer routes.
 * 
 * Uses EventTarget for observable state changes.
 */

import type { PersoniConfig } from '../personas';
import type { UserProfile } from '../types/user-profile';
import { PERSONIS_KEY, USER_PROFILE_KEY } from '../constants/storage.js';

// localStorage keys (matching index.tsx)
const DUAL_MODE_KEY = 'dual-mode-settings';
const UI_PREFERENCES_KEY = 'ui-preferences';
const ACTIVE_PERSONI_KEY = 'active-personi';

export type ActiveSidePanel = 
  | 'none'
  | 'userProfile'
  | 'models'
  | 'personis'
  | 'tts'
  | 'help'
  | 'telephony'
  | 'connectorConfig'
  | 'notes'
  | 'tasks'
  | 'memory'
  | 'routines'
  | 'plugins'
  | 'telephony'
  | 'help';

export type PersonaSlot = 'primary' | 'secondary';

export interface AppState {
  // Persona management
  personis: PersoniConfig[];
  activePersoni: PersoniConfig | null;
  secondaryPersoni: PersoniConfig | null;
  
  // Dual mode
  dualModeEnabled: boolean;
  currentSpeakerSlot: PersonaSlot | null;
  
  // UI state
  activeSidePanel: ActiveSidePanel;
  settingsMenuVisible: boolean;
  showCalendar: boolean;
  showFinancialDashboard: boolean;
  
  // Music detection
  isMusicDetected: boolean;
  musicDetectionEnabled: boolean;
  musicBpm: number;
  musicConfidence: number;
  
  // User profile
  userProfile: UserProfile;
}

export class AppStateService extends EventTarget {
  private state: AppState = {
    personis: [],
    activePersoni: null,
    secondaryPersoni: null,
    dualModeEnabled: false,
    currentSpeakerSlot: null,
    activeSidePanel: 'none',
    settingsMenuVisible: false,
    showCalendar: false,
    showFinancialDashboard: false,
    isMusicDetected: false,
    musicDetectionEnabled: true,
    musicBpm: 0,
    musicConfidence: 0,
    userProfile: {
      name: 'User',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      preferences: {
        theme: 'dark'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  };

  constructor() {
    super();
    this.loadState();
  }

  // Getters
  getState(): Readonly<AppState> {
    return { ...this.state };
  }

  getPersonis(): PersoniConfig[] {
    return [...this.state.personis];
  }

  getActivePersoni(): PersoniConfig | null {
    return this.state.activePersoni;
  }

  getSecondaryPersoni(): PersoniConfig | null {
    return this.state.secondaryPersoni;
  }

  isDualModeEnabled(): boolean {
    return this.state.dualModeEnabled;
  }

  getActiveSidePanel(): ActiveSidePanel {
    return this.state.activeSidePanel;
  }

  getUserProfile(): UserProfile {
    return { ...this.state.userProfile };
  }

  isMusicDetectionEnabled(): boolean {
    return this.state.musicDetectionEnabled;
  }

  // Setters with event emission
  setPersonis(personis: PersoniConfig[]): void {
    this.state.personis = personis;
    this.savePersonis();
    
    // Restore saved active PersonI after personis are loaded
    this.restoreActivePersoniFromSaved();
    
    // Restore saved secondary PersonI if in dual mode
    this.restoreDualModeFromSaved();
    
    this.emit('personis-changed', { personis });
  }

  setActivePersoni(personi: PersoniConfig | null): void {
    this.state.activePersoni = personi;
    this.saveActivePersoni();
    this.emit('active-personi-changed', { personi });
  }

  /**
   * Update a personi in the array and save to localStorage
   */
  updatePersoni(updatedPersoni: PersoniConfig): void {
    const index = this.state.personis.findIndex(p => p.id === updatedPersoni.id);
    if (index !== -1) {
      this.state.personis[index] = updatedPersoni;
      this.savePersonis();
      
      // If this is the active personi, update it too
      if (this.state.activePersoni?.id === updatedPersoni.id) {
        this.state.activePersoni = updatedPersoni;
        this.emit('active-personi-changed', { personi: updatedPersoni });
      }
      
      this.emit('personis-changed', { personis: this.state.personis });
    }
  }

  setSecondaryPersoni(personi: PersoniConfig | null): void {
    this.state.secondaryPersoni = personi;
    this.saveDualModeSettings();
    this.emit('secondary-personi-changed', { personi });
  }

  setDualModeEnabled(enabled: boolean): void {
    this.state.dualModeEnabled = enabled;
    this.saveDualModeSettings();
    this.emit('dual-mode-changed', { enabled });
  }

  setCurrentSpeakerSlot(slot: PersonaSlot | null): void {
    this.state.currentSpeakerSlot = slot;
    this.emit('speaker-slot-changed', { slot });
  }

  setActiveSidePanel(panel: ActiveSidePanel): void {
    this.state.activeSidePanel = panel;
    this.emit('side-panel-changed', { panel });
  }

  setSettingsMenuVisible(visible: boolean): void {
    this.state.settingsMenuVisible = visible;
    this.emit('settings-menu-changed', { visible });
  }

  setShowCalendar(show: boolean): void {
    this.state.showCalendar = show;
    this.saveUIPreferences();
    this.emit('calendar-changed', { show });
  }

  setShowFinancialDashboard(show: boolean): void {
    this.state.showFinancialDashboard = show;
    this.saveUIPreferences();
    this.emit('financial-dashboard-changed', { show });
  }
  
  setMusicDetectionEnabled(enabled: boolean): void {
    this.state.musicDetectionEnabled = enabled;
    this.saveUIPreferences();
    this.emit('music-detection-enabled-changed', { enabled });
  }

  setMusicDetection(detected: boolean, bpm: number = 0, confidence: number = 0): void {
    this.state.isMusicDetected = detected;
    this.state.musicBpm = bpm;
    this.state.musicConfidence = confidence;
    this.emit('music-detection-changed', { detected, bpm, confidence });
  }

  setUserProfile(profile: UserProfile): void {
    this.state.userProfile = profile;
    this.saveUserProfile();
    this.emit('user-profile-changed', { profile });
  }

  // Persistence
  private loadState(): void {
    this.loadPersonis();
    this.loadDualModeSettings();
    this.loadUserProfile();
    this.loadActivePersoni();
    this.loadUIPreferences();
  }

  private loadPersonis(): void {
    try {
      const saved = localStorage.getItem(PERSONIS_KEY);
      if (saved) {
        this.state.personis = JSON.parse(saved);
      }
    } catch (error) {
      console.error('[AppState] Failed to load personis:', error);
    }
  }

  private savePersonis(): void {
    try {
      localStorage.setItem(PERSONIS_KEY, JSON.stringify(this.state.personis));
    } catch (error) {
      console.error('[AppState] Failed to save personis:', error);
    }
  }

  private loadDualModeSettings(): void {
    try {
      const saved = localStorage.getItem(DUAL_MODE_KEY);
      if (saved) {
        const settings = JSON.parse(saved);
        this.state.dualModeEnabled = settings.enabled || false;
        
        if (settings.secondaryPersoniId && this.state.personis.length > 0) {
          this.state.secondaryPersoni = this.state.personis.find(
            p => p.id === settings.secondaryPersoniId
          ) || null;
        }
      }
    } catch (error) {
      console.error('[AppState] Failed to load dual mode settings:', error);
    }
  }

  private saveDualModeSettings(): void {
    try {
      const settings = {
        enabled: this.state.dualModeEnabled,
        secondaryPersoniId: this.state.secondaryPersoni?.id || null,
      };
      localStorage.setItem(DUAL_MODE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('[AppState] Failed to save dual mode settings:', error);
    }
  }

  private loadUserProfile(): void {
    try {
      const saved = localStorage.getItem(USER_PROFILE_KEY);
      if (saved) {
        this.state.userProfile = JSON.parse(saved);
      }
    } catch (error) {
      console.error('[AppState] Failed to load user profile:', error);
    }
  }

  private saveUserProfile(): void {
    try {
      localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(this.state.userProfile));
    } catch (error) {
      console.error('[AppState] Failed to save user profile:', error);
    }
  }

  private loadActivePersoni(): void {
    try {
      const saved = localStorage.getItem(ACTIVE_PERSONI_KEY);
      if (saved && this.state.personis.length > 0) {
        const activePersoniId = JSON.parse(saved);
        this.state.activePersoni = this.state.personis.find(
          p => p.id === activePersoniId
        ) || null;
      }
    } catch (error) {
      console.error('[AppState] Failed to load active personi:', error);
    }
  }

  private saveActivePersoni(): void {
    try {
      const activePersoniId = this.state.activePersoni?.id || null;
      localStorage.setItem(ACTIVE_PERSONI_KEY, JSON.stringify(activePersoniId));
    } catch (error) {
      console.error('[AppState] Failed to save active personi:', error);
    }
  }

  private loadUIPreferences(): void {
    try {
      const saved = localStorage.getItem(UI_PREFERENCES_KEY);
      if (saved) {
        const prefs = JSON.parse(saved);
        this.state.showCalendar = prefs.showCalendar ?? false;
        this.state.showFinancialDashboard = prefs.showFinancialDashboard ?? false;
        this.state.musicDetectionEnabled = prefs.musicDetectionEnabled ?? true;
      }
    } catch (error) {
      console.error('[AppState] Failed to load UI preferences:', error);
    }
  }

  private saveUIPreferences(): void {
    try {
      const prefs = {
        showCalendar: this.state.showCalendar,
        showFinancialDashboard: this.state.showFinancialDashboard,
        musicDetectionEnabled: this.state.musicDetectionEnabled,
      };
      localStorage.setItem(UI_PREFERENCES_KEY, JSON.stringify(prefs));
    } catch (error) {
      console.error('[AppState] Failed to save UI preferences:', error);
    }
  }

  private restoreActivePersoniFromSaved(): void {
    try {
      const saved = localStorage.getItem(ACTIVE_PERSONI_KEY);
      if (saved && this.state.personis.length > 0) {
        const activePersoniId = JSON.parse(saved);
        const personi = this.state.personis.find(p => p.id === activePersoniId);
        if (personi) {
          console.log(`[AppState] Restoring active PersonI: ${personi.name}`);
          this.state.activePersoni = personi;
          this.emit('active-personi-changed', { personi });
        } else {
          console.warn(`[AppState] Saved active PersonI ${activePersoniId} not found in personis list`);
        }
      }
    } catch (error) {
      console.error('[AppState] Failed to restore active personi:', error);
    }
  }

  private restoreDualModeFromSaved(): void {
    try {
      if (this.state.dualModeEnabled && this.state.personis.length > 0) {
        const saved = localStorage.getItem(DUAL_MODE_KEY);
        if (saved) {
          const settings = JSON.parse(saved);
          if (settings.secondaryPersoniId) {
            const personi = this.state.personis.find(p => p.id === settings.secondaryPersoniId);
            if (personi) {
              console.log(`[AppState] Restoring secondary PersonI: ${personi.name}`);
              this.state.secondaryPersoni = personi;
              this.emit('secondary-personi-changed', { personi });
            }
          }
        }
      }
    } catch (error) {
      console.error('[AppState] Failed to restore dual mode:', error);
    }
  }

  // Event emission helper
  private emit(type: string, detail: any): void {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }

  // Convenience method to subscribe to all state changes
  subscribe(callback: (event: CustomEvent) => void): () => void {
    const events = [
      'personis-changed',
      'active-personi-changed',
      'secondary-personi-changed',
      'dual-mode-changed',
      'speaker-slot-changed',
      'side-panel-changed',
      'settings-menu-changed',
      'calendar-changed',
      'financial-dashboard-changed',
      'music-detection-changed',
      'music-detection-enabled-changed',
      'user-profile-changed',
    ];

    const listeners = events.map(event => {
      const listener = callback as EventListener;
      this.addEventListener(event, listener);
      return { event, listener };
    });

    // Return unsubscribe function
    return () => {
      listeners.forEach(({ event, listener }) => {
        this.removeEventListener(event, listener);
      });
    };
  }
}

// Singleton instance
export const appStateService = new AppStateService();
