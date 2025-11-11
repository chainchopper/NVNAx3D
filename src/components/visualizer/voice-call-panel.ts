/**
 * Voice Call Panel
 * Placeholder for Phase 4 implementation
 */

import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('voice-call-panel')
export class VoiceCallPanel extends LitElement {
  static styles = css`
    :host {
      display: block;
      /* TODO: Phase 4 - Voice call controls (mute/listen/join) */
    }
  `;

  render() {
    return html`<div>Voice Call Panel - Coming in Phase 4</div>`;
  }
}
