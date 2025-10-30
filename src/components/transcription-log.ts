/**
 * Transcription Log Component
 * Displays conversation history with formatting and auto-scroll
 */

import { LitElement, css, html } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';

export interface TranscriptEntry {
  speaker: 'user' | 'ai' | 'system';
  text: string;
  personiName?: string;
  personiColor?: string;
  slot?: 'primary' | 'secondary';
  timestamp?: number;
}

@customElement('transcription-log')
export class TranscriptionLog extends LitElement {
  @property({ type: Array }) entries: TranscriptEntry[] = [];
  @property({ type: Boolean }) autoScroll = true;
  @property({ type: String }) currentTranscript = '';

  @query('.transcript-container') private container!: HTMLDivElement;

  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }

    .transcript-container {
      position: absolute;
      top: 20px;
      right: 20px;
      width: 350px;
      max-height: 60vh;
      background: rgba(0, 0, 0, 0.7);
      border-radius: 12px;
      padding: 16px;
      overflow-y: auto;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      z-index: 5;
    }

    .transcript-container::-webkit-scrollbar {
      width: 6px;
    }

    .transcript-container::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 3px;
    }

    .transcript-container::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 3px;
    }

    .transcript-container::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    .transcript-entry {
      margin-bottom: 12px;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 13px;
      line-height: 1.5;
      animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .transcript-entry.user {
      background: rgba(100, 150, 255, 0.2);
      border-left: 3px solid rgba(100, 150, 255, 0.8);
    }

    .transcript-entry.ai {
      background: rgba(100, 255, 150, 0.2);
      border-left: 3px solid rgba(100, 255, 150, 0.8);
    }

    .transcript-entry.system {
      background: rgba(255, 200, 100, 0.2);
      border-left: 3px solid rgba(255, 200, 100, 0.8);
    }

    .speaker-label {
      font-weight: 600;
      margin-bottom: 4px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.9;
    }

    .transcript-text {
      color: rgba(255, 255, 255, 0.95);
      word-wrap: break-word;
    }

    .current-transcript {
      margin-top: 12px;
      padding: 12px;
      background: rgba(135, 206, 235, 0.15);
      border-radius: 8px;
      border: 1px solid rgba(135, 206, 235, 0.3);
      font-size: 13px;
      color: rgba(255, 255, 255, 0.9);
      min-height: 20px;
      font-style: italic;
    }

    .empty-state {
      text-align: center;
      padding: 24px;
      color: rgba(255, 255, 255, 0.5);
      font-size: 13px;
    }

    .timestamp {
      font-size: 10px;
      color: rgba(255, 255, 255, 0.4);
      margin-left: 8px;
    }

    .slot-indicator {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-right: 6px;
    }

    .slot-indicator.primary {
      background: rgba(100, 255, 150, 0.8);
    }

    .slot-indicator.secondary {
      background: rgba(255, 150, 100, 0.8);
    }
  `;

  protected updated(changedProps: Map<string, any>) {
    if (changedProps.has('entries') && this.autoScroll) {
      this.scrollToBottom();
    }
  }

  private scrollToBottom() {
    requestAnimationFrame(() => {
      if (this.container) {
        this.container.scrollTop = this.container.scrollHeight;
      }
    });
  }

  private formatTime(timestamp?: number): string {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  private getSpeakerLabel(entry: TranscriptEntry): string {
    if (entry.speaker === 'user') return 'You';
    if (entry.speaker === 'system') return 'System';
    return entry.personiName || 'AI';
  }

  private getSpeakerColor(entry: TranscriptEntry): string {
    if (entry.speaker === 'user') return 'rgba(100, 150, 255, 1)';
    if (entry.speaker === 'system') return 'rgba(255, 200, 100, 1)';
    return entry.personiColor || 'rgba(100, 255, 150, 1)';
  }

  render() {
    return html`
      <div class="transcript-container">
        ${this.entries.length === 0 && !this.currentTranscript ? html`
          <div class="empty-state">
            Conversation will appear here
          </div>
        ` : ''}
        
        ${repeat(
          this.entries,
          (entry, index) => `${index}-${entry.timestamp}`,
          (entry) => html`
            <div class="transcript-entry ${entry.speaker}">
              <div class="speaker-label" style="color: ${this.getSpeakerColor(entry)}">
                ${entry.slot ? html`
                  <span class="slot-indicator ${entry.slot}"></span>
                ` : ''}
                ${this.getSpeakerLabel(entry)}
                ${entry.timestamp ? html`
                  <span class="timestamp">${this.formatTime(entry.timestamp)}</span>
                ` : ''}
              </div>
              <div class="transcript-text">${entry.text}</div>
            </div>
          `
        )}
        
        ${this.currentTranscript ? html`
          <div class="current-transcript">
            ${this.currentTranscript}
          </div>
        ` : ''}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'transcription-log': TranscriptionLog;
  }
}
