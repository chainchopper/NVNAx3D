/**
 * Object Detection Overlay Component
 * Displays detected objects with bounding boxes and labels
 */

import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { DetectedObject, DetectionResult } from '../services/object-recognition';

@customElement('object-detection-overlay')
export class ObjectDetectionOverlay extends LitElement {
  @property({ type: Boolean }) enabled = false;
  @property({ type: Number }) videoWidth = 0;
  @property({ type: Number }) videoHeight = 0;
  
  @state() private detections: DetectedObject[] = [];
  @state() private fps = 0;
  @state() private isActive = false;

  static styles = css`
    :host {
      display: block;
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }

    .overlay-container {
      position: relative;
      width: 100%;
      height: 100%;
    }

    .detection-box {
      position: absolute;
      border: 2px solid #00ff00;
      background: rgba(0, 255, 0, 0.1);
      pointer-events: none;
      transition: all 0.1s ease;
    }

    .detection-label {
      position: absolute;
      top: -22px;
      left: 0;
      background: rgba(0, 255, 0, 0.9);
      color: black;
      padding: 2px 6px;
      font-size: 11px;
      font-weight: 600;
      border-radius: 3px;
      white-space: nowrap;
      font-family: monospace;
    }

    .stats-panel {
      position: absolute;
      top: 10px;
      left: 10px;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      padding: 8px 12px;
      color: white;
      font-size: 11px;
      font-family: monospace;
      display: flex;
      flex-direction: column;
      gap: 4px;
      pointer-events: all;
    }

    .stats-row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
    }

    .stats-label {
      color: rgba(255, 255, 255, 0.6);
    }

    .stats-value {
      color: #00ff00;
      font-weight: 600;
    }

    .toggle-button {
      position: absolute;
      bottom: 160px;
      right: 20px;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(10px);
      border: 2px solid rgba(255, 255, 255, 0.15);
      border-radius: 50%;
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
      color: white;
      font-size: 18px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      pointer-events: all;
      z-index: 900;
    }

    .toggle-button:hover {
      background: rgba(0, 0, 0, 0.85);
      border-color: rgba(255, 255, 255, 0.3);
      transform: scale(1.08);
    }

    .toggle-button.active {
      background: rgba(0, 255, 0, 0.25);
      border-color: rgba(0, 255, 0, 0.5);
    }
  `;

  updateDetections(result: DetectionResult) {
    this.detections = result.objects;
    this.fps = result.fps;
    this.isActive = true;
  }

  clearDetections() {
    this.detections = [];
    this.fps = 0;
    this.isActive = false;
  }

  private handleToggle() {
    const newState = !this.enabled;
    this.dispatchEvent(new CustomEvent('toggle-detection', {
      detail: { enabled: newState },
      bubbles: true,
      composed: true
    }));
  }

  render() {
    if (!this.enabled) {
      return html`
        <div class="toggle-button" @click="${this.handleToggle}" title="Enable object detection">
          🔍
        </div>
      `;
    }

    return html`
      <div class="overlay-container">
        ${this.detections.map(obj => {
          const [x, y, width, height] = obj.bbox;
          const confidence = Math.round(obj.score * 100);
          
          return html`
            <div 
              class="detection-box"
              style="left: ${x}px; top: ${y}px; width: ${width}px; height: ${height}px;"
            >
              <div class="detection-label">
                ${obj.class} ${confidence}%
              </div>
            </div>
          `;
        })}

        ${this.isActive ? html`
          <div class="stats-panel">
            <div class="stats-row">
              <span class="stats-label">Objects:</span>
              <span class="stats-value">${this.detections.length}</span>
            </div>
            <div class="stats-row">
              <span class="stats-label">FPS:</span>
              <span class="stats-value">${this.fps}</span>
            </div>
          </div>
        ` : ''}

        <div class="toggle-button active" @click="${this.handleToggle}" title="Disable object detection">
          🔍
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'object-detection-overlay': ObjectDetectionOverlay;
  }
}
