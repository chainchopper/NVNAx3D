/**
 * Visualizer Controls Component
 * 
 * Floating glass-morphic control panel for the audio visualizer
 * Features:
 * - Circular glass-morphic design
 * - GSAP Draggable with momentum physics
 * - Auto-hide after 5 seconds of inactivity
 */

import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { gsap } from 'gsap';
import { Draggable } from 'gsap/Draggable';

// Register GSAP Draggable plugin
gsap.registerPlugin(Draggable);

@customElement('visualizer-controls')
export class VisualizerControls extends LitElement {
  @state() private isHidden = false;
  private inactivityTimer: number | null = null;
  private hideAnimation: gsap.core.Tween | null = null;
  private draggableInstance: Draggable[] | null = null;
  
  // Activity listener references for cleanup
  private handleMouseMove: (() => void) | null = null;
  private handleClick: (() => void) | null = null;
  private handleKeydown: (() => void) | null = null;

  static override styles = css`
    :host {
      display: block;
      position: fixed;
      bottom: 40px;
      right: 40px;
      z-index: 1000;
      cursor: grab;
      transition: opacity 0.5s ease, visibility 0.5s ease;
    }

    :host([hidden]) {
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
    }

    .control-panel {
      width: 280px;
      padding: 24px;
      background: rgba(10, 10, 26, 0.7);
      backdrop-filter: blur(20px);
      border-radius: 24px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 
        0 8px 32px rgba(0, 0, 0, 0.4),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
      color: #fff;
      user-select: none;
    }

    .control-panel:active {
      cursor: grabbing;
    }

    .header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
    }

    .status-indicator {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: linear-gradient(135deg, #00ffff, #0088ff);
      box-shadow: 0 0 12px rgba(0, 255, 255, 0.6);
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.6; transform: scale(0.9); }
    }

    .title {
      font-size: 16px;
      font-weight: 600;
      letter-spacing: 0.5px;
      background: linear-gradient(135deg, #00ffff, #0088ff);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .info-grid {
      display: grid;
      gap: 12px;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      font-size: 13px;
    }

    .label {
      color: rgba(255, 255, 255, 0.6);
    }

    .value {
      color: #00ffff;
      font-weight: 500;
    }

    .back-button {
      margin-top: 16px;
      width: 100%;
      padding: 12px;
      background: linear-gradient(135deg, rgba(0, 255, 255, 0.2), rgba(0, 136, 255, 0.2));
      border: 1px solid rgba(0, 255, 255, 0.3);
      border-radius: 12px;
      color: #00ffff;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .back-button:hover {
      background: linear-gradient(135deg, rgba(0, 255, 255, 0.3), rgba(0, 136, 255, 0.3));
      border-color: rgba(0, 255, 255, 0.5);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 255, 255, 0.3);
    }

    .back-button:active {
      transform: translateY(0);
    }

    .hint {
      margin-top: 12px;
      text-align: center;
      font-size: 11px;
      color: rgba(255, 255, 255, 0.4);
    }
  `;

  override render() {
    return html`
      <div class="control-panel">
        <div class="header">
          <div class="status-indicator"></div>
          <div class="title">Audio Visualizer</div>
        </div>
        
        <div class="info-grid">
          <div class="info-row">
            <span class="label">Status</span>
            <span class="value">Active</span>
          </div>
          <div class="info-row">
            <span class="label">Mode</span>
            <span class="value">Microphone</span>
          </div>
          <div class="info-row">
            <span class="label">Particles</span>
            <span class="value">2000</span>
          </div>
        </div>

        <button class="back-button" @click=${this.navigateBack}>
          ← Return to Main Interface
        </button>

        <div class="hint">
          Drag to reposition • Auto-hides after 5s
        </div>
      </div>
    `;
  }

  override firstUpdated() {
    this.setupDraggable();
    this.startInactivityTimer();
    this.setupMouseActivityListeners();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.cleanup();
  }

  private setupDraggable(): void {
    const panel = this.shadowRoot?.querySelector('.control-panel');
    if (!panel) return;

    this.draggableInstance = Draggable.create(panel, {
      type: 'x,y',
      bounds: window,
      inertia: true, // Momentum physics
      edgeResistance: 0.65,
      onDragStart: () => {
        this.resetInactivityTimer(); // Reset timer on drag
      },
      onDrag: () => {
        this.resetInactivityTimer();
      },
    });

    console.log('[VisualizerControls] Draggable enabled with momentum physics');
  }

  private setupMouseActivityListeners(): void {
    const handleActivity = () => {
      this.showPanel();
      this.resetInactivityTimer();
    };

    // Store references for cleanup
    this.handleMouseMove = handleActivity;
    this.handleClick = handleActivity;
    this.handleKeydown = handleActivity;

    // Listen for mouse movement and clicks anywhere in the visualizer
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('click', this.handleClick);
    window.addEventListener('keydown', this.handleKeydown);

    console.log('[VisualizerControls] Activity listeners registered');
  }

  private startInactivityTimer(): void {
    this.resetInactivityTimer();
  }

  private resetInactivityTimer(): void {
    // Clear existing timer
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }

    // Show panel if hidden
    if (this.isHidden) {
      this.showPanel();
    }

    // Set new timer to hide after 5 seconds
    this.inactivityTimer = window.setTimeout(() => {
      this.hidePanel();
    }, 5000);
  }

  private showPanel(): void {
    if (!this.isHidden) return;

    this.isHidden = false;
    this.removeAttribute('hidden');

    // Cancel any ongoing hide animation
    if (this.hideAnimation) {
      this.hideAnimation.kill();
    }

    // Animate in
    gsap.to(this, {
      duration: 0.3,
      ease: 'power2.out',
      onUpdate: () => {
        this.requestUpdate();
      }
    });
  }

  private hidePanel(): void {
    if (this.isHidden) return;

    this.hideAnimation = gsap.to(this, {
      duration: 0.5,
      ease: 'power2.in',
      onComplete: () => {
        this.isHidden = true;
        this.setAttribute('hidden', '');
        this.hideAnimation = null;
      }
    });
  }

  private navigateBack(): void {
    window.location.hash = '#/';
  }

  private cleanup(): void {
    // Clear timer
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }

    // Kill hide animation
    if (this.hideAnimation) {
      this.hideAnimation.kill();
      this.hideAnimation = null;
    }

    // Kill draggable instance
    if (this.draggableInstance) {
      this.draggableInstance.forEach(d => d.kill());
      this.draggableInstance = null;
    }

    // Remove activity listeners
    if (this.handleMouseMove) {
      window.removeEventListener('mousemove', this.handleMouseMove);
      this.handleMouseMove = null;
    }
    if (this.handleClick) {
      window.removeEventListener('click', this.handleClick);
      this.handleClick = null;
    }
    if (this.handleKeydown) {
      window.removeEventListener('keydown', this.handleKeydown);
      this.handleKeydown = null;
    }

    console.log('[VisualizerControls] Cleaned up (timer, animation, draggable, listeners)');
  }
}
