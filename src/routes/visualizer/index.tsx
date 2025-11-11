/**
 * Visualizer Route - Codrops-Inspired 3D Audio Visualizer
 * 
 * Features:
 * - Fresnel glow + Simplex noise shaders (from Codrops article)
 * - Dual-mesh sphere (wireframe outer + inner halo)
 * - GSAP Draggable panels with auto-hide
 * - Audio-reactive to TTS voice AND music detection
 * - Twilio integration (SMS threads, voice calls)
 */

import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { router } from '../../router';
import '../../components/visualizer/visualizer-shell';

@customElement('visualizer-interface')
export class VisualizerInterface extends LitElement {
  @state() private isActive = false;

  static styles = css`
    :host {
      display: block;
      position: fixed;
      inset: 0;
      width: 100%;
      height: 100%;
      background: #000000;
      overflow: hidden;
      z-index: 1;
    }

    .nav-home {
      position: fixed;
      top: 20px;
      left: 20px;
      z-index: 1000;
      padding: 12px 24px;
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 24px;
      color: white;
      font-family: 'Segoe UI', sans-serif;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.3s ease;
      opacity: 0.7;
    }

    .nav-home:hover {
      background: rgba(255, 255, 255, 0.15);
      opacity: 1;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .nav-home::before {
      content: '←';
      margin-right: 8px;
    }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    this.isActive = true;
    console.log('[VisualizerInterface] Mounted');
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.isActive = false;
    console.log('[VisualizerInterface] Unmounted');
  }

  private handleNavigateHome(): void {
    router.navigate('main');
  }

  render() {
    if (!this.isActive) return html``;

    return html`
      <button class="nav-home" @click=${this.handleNavigateHome}>
        Home
      </button>
      <visualizer-shell></visualizer-shell>
    `;
  }
}
