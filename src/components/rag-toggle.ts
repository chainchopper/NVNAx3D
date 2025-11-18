/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {LitElement, html, css} from 'lit';
import {customElement, property} from 'lit/decorators.js';

@customElement('rag-toggle')
export class RAGToggle extends LitElement {
  @property({type: Boolean}) enabled = true;
  @property({type: Number}) lastRetrievedCount = 0;
  @property({type: Boolean}) initialized = false;

  private inactivityTimer: number | null = null;
  private readonly HIDE_DELAY = 5000;

  static styles = css`
    :host {
      display: block;
      position: fixed;
      top: 20px;
      left: 20px;
      z-index: 150;
      transition: opacity 0.5s ease-out;
      pointer-events: auto;
    }

    :host(.hidden) {
      opacity: 0;
      pointer-events: none;
    }

    .rag-toggle-container {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      border: 2px solid rgba(255, 255, 255, 0.15);
      cursor: pointer;
      transition: all 0.2s ease;
      user-select: none;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }

    .rag-toggle-container:hover {
      background: rgba(0, 0, 0, 0.85);
      border-color: rgba(255, 255, 255, 0.3);
      transform: scale(1.05);
    }

    .rag-toggle-container:active {
      transform: scale(0.98);
    }

    .rag-toggle-container.enabled {
      border-color: rgba(76, 175, 80, 0.4);
    }

    .rag-toggle-container.disabled {
      border-color: rgba(244, 67, 54, 0.4);
    }

    .toggle-icon {
      font-size: 16px;
      line-height: 1;
    }

    .toggle-label {
      font-size: 12px;
      font-weight: 500;
      color: #fff;
      letter-spacing: 0.3px;
    }

    .memory-count {
      font-size: 10px;
      padding: 2px 6px;
      background: rgba(76, 175, 80, 0.2);
      border-radius: 8px;
      color: #4CAF50;
      border: 1px solid rgba(76, 175, 80, 0.3);
      font-weight: 600;
    }

    .not-initialized {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .not-initialized:hover {
      transform: none;
      border-color: rgba(255, 255, 255, 0.15);
    }

    .tooltip {
      position: absolute;
      top: 100%;
      left: 0;
      margin-top: 8px;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 6px 10px;
      border-radius: 6px;
      font-size: 11px;
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s ease;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .rag-toggle-container:hover .tooltip {
      opacity: 1;
    }
  `;

  private handleToggle() {
    if (!this.initialized) return;
    
    const newState = !this.enabled;
    this.dispatchEvent(new CustomEvent('rag-toggle', {
      detail: { enabled: newState },
      bubbles: true,
      composed: true
    }));
  }

  private resetInactivityTimer() {
    if (this.inactivityTimer !== null) {
      window.clearTimeout(this.inactivityTimer);
    }
    
    this.classList.remove('hidden');
    
    this.inactivityTimer = window.setTimeout(() => {
      this.classList.add('hidden');
    }, this.HIDE_DELAY);
  }

  private handleUserActivity = () => {
    this.resetInactivityTimer();
  };

  override connectedCallback() {
    super.connectedCallback();
    
    document.addEventListener('mousemove', this.handleUserActivity);
    document.addEventListener('mousedown', this.handleUserActivity);
    document.addEventListener('keydown', this.handleUserActivity);
    document.addEventListener('touchstart', this.handleUserActivity);
    
    this.resetInactivityTimer();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    
    document.removeEventListener('mousemove', this.handleUserActivity);
    document.removeEventListener('mousedown', this.handleUserActivity);
    document.removeEventListener('keydown', this.handleUserActivity);
    document.removeEventListener('touchstart', this.handleUserActivity);
    
    if (this.inactivityTimer !== null) {
      window.clearTimeout(this.inactivityTimer);
    }
  }

  render() {
    const containerClasses = [
      'rag-toggle-container',
      this.enabled ? 'enabled' : 'disabled',
      !this.initialized ? 'not-initialized' : ''
    ].filter(Boolean).join(' ');

    const tooltipText = !this.initialized 
      ? 'RAG Memory not initialized' 
      : this.enabled 
        ? 'Click to disable contextual memory retrieval' 
        : 'Click to enable contextual memory retrieval';

    return html`
      <div class="${containerClasses}" @click="${this.handleToggle}">
        <span class="toggle-icon">${this.enabled ? '🧠' : '💤'}</span>
        ${this.enabled && this.lastRetrievedCount > 0 ? html`
          <span class="memory-count">${this.lastRetrievedCount}</span>
        ` : html`
          <span class="toggle-label">RAG</span>
        `}
        <span class="tooltip">${tooltipText}</span>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'rag-toggle': RAGToggle;
  }
}
