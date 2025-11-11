/**
 * Visualizer Shell Component
 * 
 * Main container for Codrops-inspired 3D audio visualizer
 * Manages GSAP animations, Twilio panels, and audio-reactive visuals
 */

import { LitElement, html, css } from 'lit';
import { customElement, state, query } from 'lit/decorators.js';
import { gsap } from 'gsap';
import { Draggable } from 'gsap/Draggable';
import { providerManager } from '../../services/provider-manager';
import { getSharedMicrophone } from '../../utils';
import { Analyser } from '../../analyser';
import { appStateService, type ActiveSidePanel } from '../../services/app-state-service';
import { personaTemplates, DEFAULT_CAPABILITIES, type PersoniConfig } from '../../personas';
import { activePersonasManager } from '../../services/active-personas-manager';
import { dualPersonIManager } from '../../services/dual-personi-manager';
import type { MenuItem } from './settings-menu';
import './visualizer-3d';
import './visualizer-controls';
import './settings-fab';
import './settings-menu';
import './persona-carousel-hud';
import './dual-mode-controls-hud';
import './music-detection-hud';
import '../models-panel';
import '../user-profile-panel';
import '../notes-panel';
import '../tasks-panel';
import '../memory-panel';
import '../routines-panel';
import '../plugin-manager-panel';
import '../connector-config-panel';
import '../chatterbox-settings';

// Register GSAP plugins
gsap.registerPlugin(Draggable);

// localStorage keys (matching index.tsx)
const PERSONIS_KEY = 'gdm-personis';

@customElement('visualizer-shell')
export class VisualizerShell extends LitElement {
  @state() private audioContext: AudioContext | null = null;
  @state() private outputNode: GainNode | null = null;
  @state() private inputNode: GainNode | null = null;
  
  // Panel management
  @state() private activeSidePanel: ActiveSidePanel = 'none';
  @state() private settingsMenuVisible = false;
  @state() private fabPosition = { x: 0, y: 0 };
  
  // Twilio panels (Phase 4)
  @state() private showTwilioSettings = false;
  @state() private showSMSPanel = false;
  @state() private showVoicePanel = false;

  @query('visualizer-3d') private visualizer3d!: any;
  @query('settings-fab') private settingsFab!: any;
  
  private outputAnalyser: Analyser | null = null;
  private inputAnalyser: Analyser | null = null;
  private unsubscribeAppState: (() => void) | null = null;

  static styles = css`
    :host {
      display: block;
      position: fixed;
      inset: 0;
      width: 100%;
      height: 100%;
      background: radial-gradient(ellipse at center, #0a0e27 0%, #000000 100%);
      overflow: hidden;
    }

    .visualizer-container {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .intro-overlay {
      position: fixed;
      inset: 0;
      background: #000;
      z-index: 999;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
    }

    .intro-text {
      font-family: 'Segoe UI', sans-serif;
      font-size: 48px;
      font-weight: 300;
      color: rgba(255, 255, 255, 0);
      letter-spacing: 8px;
      text-transform: uppercase;
    }

    /* Panels will be absolutely positioned by GSAP Draggable */
    .panel {
      position: absolute;
      z-index: 100;
    }

    /* Hidden by default, shown via controls */
    .hidden {
      display: none;
    }
  `;

  async connectedCallback(): Promise<void> {
    super.connectedCallback();
    await this.initializeAudioContext();
    this.loadPersonIs();
    this.playIntroAnimation();
    this.subscribeToAppState();
    console.log('[VisualizerShell] Initialized');
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.audioContext) {
      this.audioContext.close();
    }
    if (this.unsubscribeAppState) {
      this.unsubscribeAppState();
    }
    console.log('[VisualizerShell] Destroyed');
  }

  /**
   * Load PersonI from localStorage and hydrate default templates
   * Replicates index.tsx loadConfiguration() logic for PersonI
   */
  private loadPersonIs(): void {
    try {
      const storedPersonis = localStorage.getItem(PERSONIS_KEY);
      let personis: PersoniConfig[];
      
      if (storedPersonis) {
        personis = JSON.parse(storedPersonis);
        
        // Ensure all loaded PersonI have complete defaults from templates
        personis = personis.map(p => {
          const template = personaTemplates.find(t => t.templateName === p.templateName);
          return {
            ...p,
            capabilities: p.capabilities || { ...DEFAULT_CAPABILITIES },
            avatarUrl: p.avatarUrl || template?.avatarUrl,
            visuals: p.visuals || template?.visuals,
            voiceName: p.voiceName || template?.voiceName,
            thinkingModel: p.thinkingModel || template?.thinkingModel,
          };
        });
        
        // SYNC NEW TEMPLATES: Check if any templates are missing and add them
        const existingTemplateNames = personis.map(p => p.templateName);
        const missingTemplates = personaTemplates.filter(
          template => !existingTemplateNames.includes(template.templateName || template.name)
        );
        
        if (missingTemplates.length > 0) {
          console.log(`[VisualizerShell] Adding ${missingTemplates.length} new PersonI from templates:`, 
            missingTemplates.map(t => t.name).join(', '));
          
          const newPersonis = missingTemplates.map((template) => {
            return {
              id: crypto.randomUUID(),
              name: template.name,
              tagline: template.tagline,
              systemInstruction: template.systemInstruction,
              templateName: template.templateName || template.name,
              voiceName: template.voiceName,
              thinkingModel: template.thinkingModel,
              enabledConnectors: template.enabledConnectors,
              capabilities: template.capabilities || { ...DEFAULT_CAPABILITIES },
              avatarUrl: template.avatarUrl,
              visuals: template.visuals,
            };
          });
          
          personis = [...personis, ...newPersonis];
        }
        
        // Save with updated capabilities, avatarUrl, and new PersonI
        localStorage.setItem(PERSONIS_KEY, JSON.stringify(personis));
      } else {
        // First time setup: create PersonI from templates
        personis = personaTemplates.map((template) => {
          return {
            id: crypto.randomUUID(),
            name: template.name,
            tagline: template.tagline,
            systemInstruction: template.systemInstruction,
            templateName: template.templateName || template.name,
            voiceName: template.voiceName,
            thinkingModel: template.thinkingModel,
            enabledConnectors: template.enabledConnectors,
            capabilities: template.capabilities || { ...DEFAULT_CAPABILITIES },
            avatarUrl: template.avatarUrl,
            visuals: template.visuals,
          };
        });
        localStorage.setItem(PERSONIS_KEY, JSON.stringify(personis));
        console.log('[VisualizerShell] Created default PersonI from templates:', personis.map(p => p.name).join(', '));
      }
      
      // Update app state with loaded PersonI
      appStateService.setPersonis(personis);
      
      // Set active persona to first one if none selected
      if (personis.length > 0) {
        const activePersoni = appStateService.getActivePersoni() || personis[0];
        appStateService.setActivePersoni(activePersoni);
        
        // Sync with activePersonasManager (primary slot)
        activePersonasManager.setPersona('primary', activePersoni);
        console.log('[VisualizerShell] Set active PersonI:', activePersoni.name);
        
        // Sync secondary persona if dual mode was enabled
        const secondaryPersoni = appStateService.getSecondaryPersoni();
        if (secondaryPersoni) {
          activePersonasManager.setPersona('secondary', secondaryPersoni);
          console.log('[VisualizerShell] Restored secondary PersonI:', secondaryPersoni.name);
        }
      }
    } catch (error) {
      console.error('[VisualizerShell] Failed to load PersonI:', error);
    }
  }

  private subscribeToAppState(): void {
    // Subscribe to app state changes
    this.unsubscribeAppState = appStateService.subscribe(() => {
      const state = appStateService.getState();
      this.activeSidePanel = state.activeSidePanel;
      this.settingsMenuVisible = state.settingsMenuVisible;
      this.requestUpdate();
    });
  }

  private async initializeAudioContext(): Promise<void> {
    try {
      this.audioContext = new AudioContext();
      this.outputNode = this.audioContext.createGain();
      this.inputNode = this.audioContext.createGain();

      // Connect outputNode to destination for playback
      this.outputNode.connect(this.audioContext.destination);

      // Create analysers for audio visualizer
      this.outputAnalyser = new Analyser(this.outputNode);
      this.inputAnalyser = new Analyser(this.inputNode);

      // Request microphone access and connect to inputNode
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });

        // Create source from microphone stream
        const sourceNode = this.audioContext.createMediaStreamSource(mediaStream);
        
        // Connect microphone to inputNode (which feeds inputAnalyser)
        sourceNode.connect(this.inputNode);
        
        // Also connect to a muted output to keep graph alive without feedback
        const mutedGain = this.audioContext.createGain();
        mutedGain.gain.setValueAtTime(0, this.audioContext.currentTime);
        this.inputNode.connect(mutedGain);
        mutedGain.connect(this.audioContext.destination);

        console.log('[VisualizerShell] Microphone connected to audio analyser');
      } catch (micError) {
        console.warn('[VisualizerShell] Microphone access denied:', micError);
        // Visualizer will use fallback animation without audio reactivity
      }

      // Wire analysers to visualizer component after it's rendered
      this.updateComplete.then(() => {
        if (this.visualizer3d) {
          this.visualizer3d.outputAnalyser = this.outputAnalyser;
          this.visualizer3d.inputAnalyser = this.inputAnalyser;
          console.log('[VisualizerShell] Analysers connected to visualizer-3d');
        }
      });

      console.log('[VisualizerShell] Audio context initialized with microphone stream');
    } catch (error) {
      console.error('[VisualizerShell] Audio context initialization failed:', error);
    }
  }

  private playIntroAnimation(): void {
    // Wait for next frame to ensure DOM is ready
    requestAnimationFrame(() => {
      const overlay = this.shadowRoot?.querySelector('.intro-overlay');
      const text = this.shadowRoot?.querySelector('.intro-text');

      if (!overlay || !text) return;

      // GSAP timeline for entrance
      const timeline = gsap.timeline();

      // Fade in text
      timeline.to(text, {
        opacity: 1,
        duration: 1.5,
        ease: 'power2.inOut',
      });

      // Hold for a moment
      timeline.to(text, {
        opacity: 1,
        duration: 0.5,
      });

      // Fade out text and overlay
      timeline.to([text, overlay], {
        opacity: 0,
        duration: 1,
        ease: 'power2.inOut',
        onComplete: () => {
          if (overlay) {
            (overlay as HTMLElement).style.display = 'none';
          }
        },
      });

      console.log('[VisualizerShell] Intro animation started');
    });
  }

  // Settings FAB and Menu handlers
  private handleFabToggle(): void {
    const state = appStateService.getState();
    appStateService.setSettingsMenuVisible(!state.settingsMenuVisible);
  }

  private handleMenuItemClick(e: CustomEvent<{ item: MenuItem }>): void {
    const { item } = e.detail;
    
    // MenuItem is already the ActiveSidePanel type, just set it directly
    appStateService.setActiveSidePanel(item);
    appStateService.setSettingsMenuVisible(false); // Close menu after selection
  }

  private handleClosePanel(): void {
    appStateService.setActiveSidePanel('none');
  }

  // Twilio panel handlers (legacy - Phase 4)
  private handleShowTwilioSettings(): void {
    this.showTwilioSettings = !this.showTwilioSettings;
  }

  private handleShowSMSPanel(): void {
    this.showSMSPanel = !this.showSMSPanel;
  }

  private handleShowVoicePanel(): void {
    this.showVoicePanel = !this.showVoicePanel;
  }

  // Render panel based on activeSidePanel state
  private renderActivePanel() {
    switch (this.activeSidePanel) {
      case 'userProfile':
        return html`<user-profile-panel @close=${this.handleClosePanel}></user-profile-panel>`;
      case 'models':
        return html`<models-panel @close=${this.handleClosePanel}></models-panel>`;
      case 'personis':
        return html`<chatterbox-settings @close=${this.handleClosePanel}></chatterbox-settings>`;
      case 'connectorConfig':
        return html`<connector-config-panel @close=${this.handleClosePanel}></connector-config-panel>`;
      case 'notes':
        return html`<notes-panel @close=${this.handleClosePanel}></notes-panel>`;
      case 'tasks':
        return html`<tasks-panel @close=${this.handleClosePanel}></tasks-panel>`;
      case 'memory':
        return html`<memory-panel @close=${this.handleClosePanel}></memory-panel>`;
      case 'routines':
        return html`<routines-panel @close=${this.handleClosePanel}></routines-panel>`;
      case 'plugins':
        return html`<plugin-manager-panel @close=${this.handleClosePanel}></plugin-manager-panel>`;
      default:
        return null;
    }
  }

  render() {
    return html`
      <div class="visualizer-container">
        <!-- 3D Audio Visualizer with Codrops shaders -->
        <visualizer-3d></visualizer-3d>

        <!-- Floating Control Panel (auto-hide, draggable) -->
        <visualizer-controls></visualizer-controls>

        <!-- HUD Overlays -->
        <persona-carousel-hud></persona-carousel-hud>
        <dual-mode-controls-hud></dual-mode-controls-hud>
        <music-detection-hud></music-detection-hud>

        <!-- Settings FAB (draggable gear button) -->
        <settings-fab
          @toggle=${this.handleFabToggle}
        ></settings-fab>

        <!-- Radial Settings Menu -->
        <settings-menu
          .visible=${this.settingsMenuVisible}
          @menu-item-click=${this.handleMenuItemClick}
        ></settings-menu>

        <!-- Active Side Panel (conditional render) -->
        ${this.activeSidePanel !== 'none'
          ? html`<div class="panel">${this.renderActivePanel()}</div>`
          : ''}
      </div>

      <!-- Intro Overlay with GSAP Animation -->
      <div class="intro-overlay">
        <div class="intro-text">VISUALIZER</div>
      </div>
    `;
  }
}
