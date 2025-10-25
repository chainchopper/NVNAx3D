/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { SongInfo, LyricsInfo, LyricLine } from '../services/song-identification-service';

/**
 * Song Info Bubble Component
 * Displays identified song information with album art and lyrics
 * Features glass morphism design and smooth animations
 */
@customElement('song-info-bubble')
export class SongInfoBubble extends LitElement {
  @property({ type: Object }) songInfo: SongInfo | null = null;
  @property({ type: Object }) lyricsInfo: LyricsInfo | null = null;
  @property({ type: Boolean }) visible = false;
  @property({ type: Boolean }) showLyrics = true;
  @property({ type: Number }) playbackTime = 0;

  @state() private currentLyricIndex = 0;
  @state() private isMinimized = false;

  static styles = css`
    :host {
      display: block;
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 100;
      pointer-events: none;
    }

    .bubble-container {
      width: 350px;
      max-width: 90vw;
      pointer-events: auto;
      transform: translateX(400px);
      opacity: 0;
      transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .bubble-container.visible {
      transform: translateX(0);
      opacity: 1;
    }

    .bubble-container.minimized {
      width: 80px;
    }

    .bubble {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 20px;
      padding: 20px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      transition: all 0.3s ease;
    }

    .bubble-container.minimized .bubble {
      padding: 10px;
      border-radius: 50%;
      width: 60px;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .bubble:hover {
      background: rgba(255, 255, 255, 0.15);
      border-color: rgba(255, 255, 255, 0.3);
    }

    .header {
      display: flex;
      align-items: flex-start;
      gap: 15px;
      margin-bottom: 15px;
    }

    .bubble-container.minimized .header {
      margin-bottom: 0;
    }

    .album-art-container {
      position: relative;
      flex-shrink: 0;
    }

    .album-art {
      width: 80px;
      height: 80px;
      border-radius: 12px;
      object-fit: cover;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      transition: all 0.3s ease;
    }

    .bubble-container.minimized .album-art {
      width: 40px;
      height: 40px;
      border-radius: 50%;
    }

    .confidence-ring {
      position: absolute;
      top: -4px;
      left: -4px;
      right: -4px;
      bottom: -4px;
      border-radius: 16px;
      border: 3px solid transparent;
      background: conic-gradient(
        from 0deg,
        #4ade80 0deg,
        #4ade80 var(--confidence-angle, 270deg),
        rgba(255, 255, 255, 0.2) var(--confidence-angle, 270deg),
        rgba(255, 255, 255, 0.2) 360deg
      );
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      padding: 3px;
      animation: pulse 2s ease-in-out infinite;
    }

    .bubble-container.minimized .confidence-ring {
      border-radius: 50%;
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.7;
      }
    }

    .song-details {
      flex: 1;
      min-width: 0;
    }

    .bubble-container.minimized .song-details {
      display: none;
    }

    .song-title {
      font-size: 16px;
      font-weight: 600;
      color: white;
      margin: 0 0 4px 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }

    .song-artist {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.8);
      margin: 0 0 4px 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .song-meta {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.6);
      display: flex;
      gap: 8px;
    }

    .controls {
      display: flex;
      gap: 8px;
      margin-top: 8px;
    }

    .bubble-container.minimized .controls {
      display: none;
    }

    .control-button {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      padding: 6px 12px;
      color: white;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
    }

    .control-button:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: translateY(-1px);
    }

    .control-button:active {
      transform: translateY(0);
    }

    .lyrics-container {
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      max-height: 200px;
      overflow-y: auto;
    }

    .bubble-container.minimized .lyrics-container {
      display: none;
    }

    .lyrics-container::-webkit-scrollbar {
      width: 6px;
    }

    .lyrics-container::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 3px;
    }

    .lyrics-container::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 3px;
    }

    .lyrics-container::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    .lyric-line {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.5);
      margin: 8px 0;
      transition: all 0.3s ease;
      line-height: 1.5;
    }

    .lyric-line.active {
      color: white;
      font-weight: 500;
      font-size: 15px;
      text-shadow: 0 2px 8px rgba(255, 255, 255, 0.3);
      transform: translateX(4px);
    }

    .lyric-line.past {
      opacity: 0.3;
    }

    .plain-lyrics {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.7);
      line-height: 1.6;
      white-space: pre-wrap;
    }

    .no-lyrics {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.5);
      font-style: italic;
      text-align: center;
      padding: 20px;
    }

    .close-button {
      position: absolute;
      top: 10px;
      right: 10px;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      transition: all 0.2s ease;
    }

    .bubble-container.minimized .close-button {
      display: none;
    }

    .close-button:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: scale(1.1);
    }

    .minimize-button {
      position: absolute;
      top: 10px;
      right: 40px;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      transition: all 0.2s ease;
    }

    .bubble-container.minimized .minimize-button {
      display: none;
    }

    .minimize-button:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: scale(1.1);
    }
  `;

  protected updated(changedProperties: Map<string, any>) {
    if (changedProperties.has('playbackTime') && this.lyricsInfo?.syncedLyrics) {
      this.updateCurrentLyric();
    }
  }

  private updateCurrentLyric() {
    if (!this.lyricsInfo?.syncedLyrics) return;

    const lyrics = this.lyricsInfo.syncedLyrics;
    const currentTime = this.playbackTime;

    for (let i = lyrics.length - 1; i >= 0; i--) {
      if (currentTime >= lyrics[i].time) {
        if (this.currentLyricIndex !== i) {
          this.currentLyricIndex = i;
          this.scrollToCurrentLyric();
        }
        break;
      }
    }
  }

  private scrollToCurrentLyric() {
    setTimeout(() => {
      const container = this.shadowRoot?.querySelector('.lyrics-container');
      const activeLine = this.shadowRoot?.querySelector('.lyric-line.active');
      if (container && activeLine) {
        const containerRect = container.getBoundingClientRect();
        const lineRect = activeLine.getBoundingClientRect();
        const offset = lineRect.top - containerRect.top - containerRect.height / 2 + lineRect.height / 2;
        container.scrollBy({ top: offset, behavior: 'smooth' });
      }
    }, 50);
  }

  private handleClose() {
    this.dispatchEvent(new CustomEvent('close'));
  }

  private handleMinimize() {
    this.isMinimized = !this.isMinimized;
  }

  private renderLyrics() {
    if (!this.showLyrics || !this.lyricsInfo) {
      return nothing;
    }

    if (this.lyricsInfo.syncedLyrics && this.lyricsInfo.syncedLyrics.length > 0) {
      return html`
        <div class="lyrics-container">
          ${this.lyricsInfo.syncedLyrics.map((line, index) => html`
            <div 
              class="lyric-line ${index === this.currentLyricIndex ? 'active' : ''} ${index < this.currentLyricIndex ? 'past' : ''}"
            >
              ${line.text}
            </div>
          `)}
        </div>
      `;
    } else if (this.lyricsInfo.plainLyrics) {
      return html`
        <div class="lyrics-container">
          <div class="plain-lyrics">${this.lyricsInfo.plainLyrics}</div>
        </div>
      `;
    }

    return html`
      <div class="lyrics-container">
        <div class="no-lyrics">No lyrics available</div>
      </div>
    `;
  }

  render() {
    if (!this.songInfo) {
      return nothing;
    }

    const confidenceAngle = (this.songInfo.confidence || 0) * 360;

    return html`
      <div class="bubble-container ${this.visible ? 'visible' : ''} ${this.isMinimized ? 'minimized' : ''}">
        <div class="bubble" style="--confidence-angle: ${confidenceAngle}deg">
          <button class="close-button" @click=${this.handleClose} title="Close">×</button>
          <button class="minimize-button" @click=${this.handleMinimize} title="Minimize">−</button>
          
          <div class="header">
            <div class="album-art-container">
              <div class="confidence-ring"></div>
              ${this.songInfo.albumArtUrl
                ? html`<img class="album-art" src=${this.songInfo.albumArtUrl} alt="Album art" />`
                : html`<div class="album-art"></div>`
              }
            </div>
            
            <div class="song-details">
              <h3 class="song-title" title=${this.songInfo.title}>${this.songInfo.title}</h3>
              <p class="song-artist" title=${this.songInfo.artist}>${this.songInfo.artist}</p>
              <div class="song-meta">
                ${this.songInfo.album ? html`<span>${this.songInfo.album}</span>` : nothing}
                ${this.songInfo.year ? html`<span>• ${this.songInfo.year}</span>` : nothing}
              </div>
              <div class="controls">
                ${this.songInfo.externalIds?.spotify
                  ? html`<a class="control-button" href=${this.songInfo.externalIds.spotify} target="_blank">🎵 Spotify</a>`
                  : nothing
                }
                ${this.songInfo.externalIds?.youtube
                  ? html`<a class="control-button" href=${this.songInfo.externalIds.youtube} target="_blank">▶️ YouTube</a>`
                  : nothing
                }
              </div>
            </div>
          </div>

          ${this.renderLyrics()}
        </div>
      </div>
    `;
  }
}
