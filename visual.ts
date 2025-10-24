/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */

import {LitElement, css, html} from 'lit';
import {customElement, property, query} from 'lit/decorators.js';
import {Analyser} from './analyser';

@customElement('gdm-live-audio-visuals')
export class GdmLiveAudioVisuals extends LitElement {
  private inputAnalyser: Analyser;
  private outputAnalyser: Analyser;

  private _outputNode: AudioNode;

  @property()
  set outputNode(node: AudioNode) {
    this._outputNode = node;
    this.outputAnalyser = new Analyser(this._outputNode);
  }

  get outputNode() {
    return this._outputNode;
  }

  private _inputNode: AudioNode;

  @property()
  set inputNode(node: AudioNode) {
    this._inputNode = node;
    this.inputAnalyser = new Analyser(this._inputNode);
  }

  get inputNode() {
    return this._inputNode;
  }

  @query('canvas') private canvas: HTMLCanvasElement;
  private canvasCtx: CanvasRenderingContext2D;

  static styles = css`
    canvas {
      width: 400px;
      aspect-ratio: 1 / 1;
    }
  `;

  private visualize() {
    requestAnimationFrame(() => this.visualize());

    if (!this.canvasCtx || !this.outputAnalyser || !this.inputAnalyser) {
      return;
    }

    const canvas = this.canvas;
    const canvasCtx = this.canvasCtx;

    const WIDTH = canvas.width;
    const HEIGHT = canvas.height;

    // Reset canvas for new frame
    canvasCtx.globalCompositeOperation = 'source-over';
    canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
    canvasCtx.fillStyle = '#1f2937';
    canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

    // --- Draw Input ---
    this.inputAnalyser.update();
    const inputBarWidth = WIDTH / this.inputAnalyser.data.length;
    let x = 0;
    const inputGradient = canvasCtx.createLinearGradient(0, 0, 0, HEIGHT);
    inputGradient.addColorStop(1, '#D16BA5');
    inputGradient.addColorStop(0.5, '#E78686');
    inputGradient.addColorStop(0, '#FB5F5F');
    canvasCtx.fillStyle = inputGradient;

    for (let i = 0; i < this.inputAnalyser.data.length; i++) {
      const barHeight = this.inputAnalyser.data[i] * (HEIGHT / 255);
      canvasCtx.fillRect(x, HEIGHT - barHeight, inputBarWidth, barHeight);
      x += inputBarWidth;
    }

    // --- Draw Output (blended on top) ---
    this.outputAnalyser.update();
    canvasCtx.globalCompositeOperation = 'lighter';
    const outputBarWidth = WIDTH / this.outputAnalyser.data.length;
    x = 0;
    const outputGradient = canvasCtx.createLinearGradient(0, 0, 0, HEIGHT);
    outputGradient.addColorStop(1, '#3b82f6');
    outputGradient.addColorStop(0.5, '#10b981');
    outputGradient.addColorStop(0, '#ef4444');
    canvasCtx.fillStyle = outputGradient;

    for (let i = 0; i < this.outputAnalyser.data.length; i++) {
      const barHeight = this.outputAnalyser.data[i] * (HEIGHT / 255);
      canvasCtx.fillRect(x, HEIGHT - barHeight, outputBarWidth, barHeight);
      x += outputBarWidth;
    }
  }

  protected firstUpdated() {
    this.canvas.width = 400;
    this.canvas.height = 400;
    this.canvasCtx = this.canvas.getContext('2d')!;
    this.visualize(); // Start animation loop after canvas is initialized
  }

  protected render() {
    return html`<canvas></canvas>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'gdm-live-audio-visuals': GdmLiveAudioVisuals;
  }
}