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
import './visualizer-3d';
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

  @query('visualizer-3d') private visualizer3d!: any;
  
  private outputAnalyser: Analyser | null = null;
  private inputAnalyser: Analyser | null = null;

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
        <!-- 3D Audio Visualizer with Codrops shaders -->
        <visualizer-3d></visualizer-3d>

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
