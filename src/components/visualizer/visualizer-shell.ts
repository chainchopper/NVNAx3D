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
import '../../visual-3d';
import './twilio-settings-panel';
import './sms-panel';
import './voice-call-panel';
import './controls-ring';

// Register GSAP plugins
gsap.registerPlugin(Draggable);

@customElement('visualizer-shell')
export class VisualizerShell extends LitElement {
  @state() private audioContext: AudioContext | null = null;
  @state() private outputNode: GainNode | null = null;
  @state() private inputNode: GainNode | null = null;
  @state() private showTwilioSettings = false;
  @state() private showSMSPanel = false;
  @state() private showVoicePanel = false;

  @query('gdm-live-audio-visuals-3d') private visual3d!: any;

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
    this.playIntroAnimation();
    console.log('[VisualizerShell] Initialized');
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.audioContext) {
      this.audioContext.close();
    }
    console.log('[VisualizerShell] Destroyed');
  }

  private async initializeAudioContext(): Promise<void> {
    try {
      // Reuse existing audio context from main app if available
      // TODO: Refactor to use shared audio service for proper TTS/music stream connection
      // For now, create isolated context - Phase 5 will wire to existing streams
      this.audioContext = new AudioContext();
      this.outputNode = this.audioContext.createGain();
      this.inputNode = this.audioContext.createGain();

      // Connect to destination
      this.outputNode.connect(this.audioContext.destination);

      // Set up input from microphone
      const micManager = getSharedMicrophone();
      
      // Request microphone access
      const hasAccess = await micManager.requestMicrophoneAccess();
      if (hasAccess) {
        console.log('[VisualizerShell] Microphone access granted');
        // TODO Phase 2: Wire shared microphone analyser data to visual-3d shader uniforms
        // Currently audio-reactivity is pending - needs integration with existing audio graph
      }

      console.log('[VisualizerShell] Audio context initialized (isolated - needs Phase 2 integration)');
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

  private handleShowTwilioSettings(): void {
    this.showTwilioSettings = !this.showTwilioSettings;
  }

  private handleShowSMSPanel(): void {
    this.showSMSPanel = !this.showSMSPanel;
  }

  private handleShowVoicePanel(): void {
    this.showVoicePanel = !this.showVoicePanel;
  }

  render() {
    return html`
      <div class="visualizer-container">
        <!-- 3D Audio Visualizer (reuses existing visual-3d component) -->
        <gdm-live-audio-visuals-3d
          .outputNode=${this.outputNode}
          .inputNode=${this.inputNode}
          .visuals=${{
            shape: 'Icosahedron',
            accentColor: '#ff6b4a',
            texture: 'none',
            idleAnimation: 'particles',
          }}
        ></gdm-live-audio-visuals-3d>

        <!-- Controls Ring (circular menu like persona carousel) -->
        <controls-ring
          @show-twilio-settings=${this.handleShowTwilioSettings}
          @show-sms=${this.handleShowSMSPanel}
          @show-voice=${this.handleShowVoicePanel}
        ></controls-ring>

        <!-- Twilio Settings Panel (GSAP Draggable) -->
        ${this.showTwilioSettings
          ? html`
              <div class="panel">
                <twilio-settings-panel
                  @close=${() => (this.showTwilioSettings = false)}
                ></twilio-settings-panel>
              </div>
            `
          : ''}

        <!-- SMS Panel (GSAP Draggable) -->
        ${this.showSMSPanel
          ? html`
              <div class="panel">
                <sms-panel @close=${() => (this.showSMSPanel = false)}></sms-panel>
              </div>
            `
          : ''}

        <!-- Voice Call Panel (GSAP Draggable) -->
        ${this.showVoicePanel
          ? html`
              <div class="panel">
                <voice-call-panel
                  @close=${() => (this.showVoicePanel = false)}
                ></voice-call-panel>
              </div>
            `
          : ''}
      </div>

      <!-- Intro Overlay with GSAP Animation -->
      <div class="intro-overlay">
        <div class="intro-text">VISUALIZER</div>
      </div>
    `;
  }
}
