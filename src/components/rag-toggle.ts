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

  static styles = css`
    :host {
      display: block;
      position: fixed;
      top: 70px;
      left: 20px;
      z-index: 1000;
    }

    .rag-toggle-container {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 16px;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      cursor: pointer;
      transition: all 0.3s ease;
      user-select: none;
    }

    .rag-toggle-container:hover {
      background: rgba(0, 0, 0, 0.8);
      border-color: rgba(255, 255, 255, 0.2);
      transform: translateY(-2px);
    }

    .rag-toggle-container.enabled {
      border-color: rgba(76, 175, 80, 0.5);
    }

    .rag-toggle-container.disabled {
      border-color: rgba(158, 158, 158, 0.3);
    }

    .toggle-icon {
      font-size: 18px;
      filter: drop-shadow(0 0 4px currentColor);
    }

    .toggle-label {
      font-size: 13px;
      font-weight: 500;
      color: #fff;
      letter-spacing: 0.3px;
    }

    .toggle-status {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.6);
      margin-left: 4px;
    }

    .toggle-status.active {
      color: #4CAF50;
    }

    .memory-count {
      font-size: 10px;
      padding: 2px 6px;
      background: rgba(76, 175, 80, 0.2);
      border-radius: 10px;
      color: #4CAF50;
      border: 1px solid rgba(76, 175, 80, 0.3);
    }

    .not-initialized {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .not-initialized:hover {
      transform: none;
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

  render() {
    const containerClasses = [
      'rag-toggle-container',
      this.enabled ? 'enabled' : 'disabled',
      !this.initialized ? 'not-initialized' : ''
    ].filter(Boolean).join(' ');

    return html`
      <div class="${containerClasses}" @click="${this.handleToggle}">
        <span class="toggle-icon">${this.enabled ? '🧠' : '🚫'}</span>
        <span class="toggle-label">RAG Memory</span>
        <span class="toggle-status ${this.enabled ? 'active' : ''}">
          ${this.enabled ? 'ON' : 'OFF'}
        </span>
        ${this.enabled && this.lastRetrievedCount > 0 ? html`
          <span class="memory-count">${this.lastRetrievedCount}</span>
        ` : ''}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'rag-toggle': RAGToggle;
  }
}
