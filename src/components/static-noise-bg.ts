/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('static-noise-bg')
export class StaticNoiseBg extends LitElement {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private imageData!: ImageData;
  private animationFrame: number | null = null;
  private blockSize = 3; // 3x3 pixel blocks for performance
  private resizeHandler: () => void;

  constructor() {
    super();
    this.resizeHandler = this.handleResize.bind(this);
  }

  static styles = css`
    :host {
      display: block;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 0;
      opacity: 0.4; /* 40% opacity so 3D object remains visible */
    }

    canvas {
      display: block;
      width: 100%;
      height: 100%;
      image-rendering: pixelated; /* Crisp pixel blocks */
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.setupCanvas();
    this.startAnimation();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    window.removeEventListener('resize', this.resizeHandler);
  }

  private setupCanvas() {
    this.updateComplete.then(() => {
      this.canvas = this.renderRoot.querySelector('canvas')!;
      if (!this.canvas) return;

      const ctx = this.canvas.getContext('2d', { alpha: false });
      if (!ctx) return;
      this.ctx = ctx;

      this.resizeCanvas();

      window.addEventListener('resize', this.resizeHandler);
    });
  }

  private handleResize() {
    this.resizeCanvas();
  }

  private resizeCanvas() {
    // Use block size to reduce resolution for performance
    const width = Math.floor(window.innerWidth / this.blockSize);
    const height = Math.floor(window.innerHeight / this.blockSize);
    
    this.canvas.width = width;
    this.canvas.height = height;
    
    // Create ImageData once for efficiency
    this.imageData = this.ctx.createImageData(width, height);
  }

  private generateNoise() {
    if (!this.imageData) return;

    const data = this.imageData.data;
    const length = data.length;

    // Fast noise generation
    for (let i = 0; i < length; i += 4) {
      // Generate random grayscale value
      const value = Math.random() * 255;

      // Add lavender/purple tint for GHOST theme
      // Lavender is a light purple: slightly reduced R and G, boosted B
      data[i] = value * 0.85;      // R - slightly reduced
      data[i + 1] = value * 0.85;  // G - slightly reduced  
      data[i + 2] = value * 1.1;   // B - boosted for lavender tint
      data[i + 3] = 255;           // Alpha - full opacity
    }

    this.ctx.putImageData(this.imageData, 0, 0);
  }

  private startAnimation() {
    this.generateNoise();
    this.animationFrame = requestAnimationFrame(() => this.startAnimation());
  }

  render() {
    return html`<canvas></canvas>`;
  }
}
