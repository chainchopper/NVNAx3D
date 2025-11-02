/**
 * Camera Thumbnail Orbs
 * Displays small 3D orb "bubbles" for monitoring multiple camera feeds,
 * video streams, and other Nirvana instances
 */

import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import * as THREE from 'three';

export interface ThumbnailFeed {
  id: string;
  label: string;
  type: 'camera' | 'nirvana_instance' | 'video_stream' | 'frigate' | 'rtsp';
  videoElement?: HTMLVideoElement;
  streamUrl?: string;
  width: number;
  height: number;
  active: boolean;
}

@customElement('camera-thumbnail-orbs')
export class CameraThumbnailOrbs extends LitElement {
  @property({ type: Array }) feeds: ThumbnailFeed[] = [];
  @property({ type: Boolean }) visible = true;
  @state() private hoveredFeed: string | null = null;
  
  private container?: HTMLElement;
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private renderers: Map<string, THREE.WebGLRenderer> = new Map();
  private orbs: Map<string, THREE.Mesh> = new Map();
  private videoTextures: Map<string, THREE.VideoTexture> = new Map();
  private animationFrame: number | null = null;

  static styles = css`
    :host {
      display: block;
      position: fixed;
      bottom: 120px;
      left: 20px;
      width: auto;
      height: auto;
      pointer-events: none;
      z-index: 100;
    }

    .orbs-container {
      display: flex;
      flex-direction: column;
      gap: 15px;
      align-items: flex-start;
      pointer-events: auto;
    }

    .orb-wrapper {
      position: relative;
      width: 80px;
      height: 80px;
      cursor: pointer;
      transition: transform 0.3s ease;
    }

    .orb-wrapper:hover {
      transform: scale(1.15);
    }

    .orb-label {
      position: absolute;
      bottom: -20px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 10px;
      color: white;
      background: rgba(0, 0, 0, 0.7);
      padding: 2px 6px;
      border-radius: 4px;
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .orb-wrapper:hover .orb-label {
      opacity: 1;
    }

    .orb-status {
      position: absolute;
      top: 4px;
      right: 4px;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      border: 2px solid rgba(255, 255, 255, 0.8);
      pointer-events: none;
    }

    .orb-status.active {
      background: #00ff00;
      box-shadow: 0 0 6px #00ff00;
    }

    .orb-status.inactive {
      background: #ff0000;
      box-shadow: 0 0 6px #ff0000;
    }

    canvas {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
      border: 2px solid rgba(255, 255, 255, 0.2);
    }

    .expand-button {
      position: absolute;
      bottom: 2px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: white;
      font-size: 10px;
      padding: 2px 8px;
      border-radius: 4px;
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .orb-wrapper:hover .expand-button {
      opacity: 1;
    }

    .expand-button:hover {
      background: rgba(255, 255, 255, 0.2);
    }
  `;

  connectedCallback() {
    super.connectedCallback();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.cleanup();
  }

  protected firstUpdated() {
    this.initializeScene();
    this.createOrbs();
    this.startAnimation();
  }

  protected updated(changedProperties: Map<string, any>) {
    if (changedProperties.has('feeds')) {
      this.updateOrbs();
    }
  }

  private initializeScene() {
    this.scene = new THREE.Scene();
    this.scene.background = null;
    
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    this.camera.position.z = 3;
  }

  private createOrbs() {
    this.feeds.forEach((feed) => {
      const geometry = new THREE.SphereGeometry(0.5, 32, 32);
      
      let material: THREE.MeshBasicMaterial;
      
      if (feed.videoElement) {
        const videoTexture = new THREE.VideoTexture(feed.videoElement);
        videoTexture.minFilter = THREE.LinearFilter;
        videoTexture.magFilter = THREE.LinearFilter;
        this.videoTextures.set(feed.id, videoTexture);
        
        material = new THREE.MeshBasicMaterial({
          map: videoTexture,
          side: THREE.DoubleSide,
        });
      } else {
        // Placeholder for streams not yet connected
        material = new THREE.MeshBasicMaterial({
          color: 0x333333,
          transparent: true,
          opacity: 0.5,
        });
      }
      
      const orb = new THREE.Mesh(geometry, material);
      this.orbs.set(feed.id, orb);
    });
  }

  private updateOrbs() {
    // Remove orbs that no longer exist in feeds
    this.orbs.forEach((orb, id) => {
      if (!this.feeds.find(f => f.id === id)) {
        orb.geometry.dispose();
        (orb.material as THREE.Material).dispose();
        this.orbs.delete(id);
        
        const texture = this.videoTextures.get(id);
        if (texture) {
          texture.dispose();
          this.videoTextures.delete(id);
        }
        
        const renderer = this.renderers.get(id);
        if (renderer) {
          renderer.dispose();
          this.renderers.delete(id);
        }
      }
    });
    
    // Add new orbs
    this.feeds.forEach((feed) => {
      if (!this.orbs.has(feed.id)) {
        this.createOrbForFeed(feed);
      }
    });
  }

  private createOrbForFeed(feed: ThumbnailFeed) {
    const geometry = new THREE.SphereGeometry(0.5, 32, 32);
    
    let material: THREE.MeshBasicMaterial;
    
    if (feed.videoElement) {
      const videoTexture = new THREE.VideoTexture(feed.videoElement);
      videoTexture.minFilter = THREE.LinearFilter;
      videoTexture.magFilter = THREE.LinearFilter;
      this.videoTextures.set(feed.id, videoTexture);
      
      material = new THREE.MeshBasicMaterial({
        map: videoTexture,
        side: THREE.DoubleSide,
      });
    } else {
      material = new THREE.MeshBasicMaterial({
        color: 0x333333,
        transparent: true,
        opacity: 0.5,
      });
    }
    
    const orb = new THREE.Mesh(geometry, material);
    this.orbs.set(feed.id, orb);
  }

  private renderOrb(feed: ThumbnailFeed, canvas: HTMLCanvasElement) {
    if (!this.scene || !this.camera) return;
    
    const orb = this.orbs.get(feed.id);
    if (!orb) return;
    
    // Get or create cached renderer for this feed
    let renderer = this.renderers.get(feed.id);
    if (!renderer) {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
      });
      renderer.setSize(80, 80);
      renderer.setPixelRatio(window.devicePixelRatio);
      this.renderers.set(feed.id, renderer);
    }
    
    // Clear scene and add only this orb
    this.scene.clear();
    this.scene.add(orb);
    
    // Rotate orb slightly for visual interest
    orb.rotation.y += 0.01;
    orb.rotation.x += 0.005;
    
    renderer.render(this.scene, this.camera);
  }

  private startAnimation() {
    const animate = () => {
      this.animationFrame = requestAnimationFrame(animate);
      
      // Update all orb canvases
      this.feeds.forEach((feed, index) => {
        const wrapper = this.shadowRoot?.querySelector(`#orb-${feed.id}`) as HTMLElement;
        if (wrapper) {
          const canvas = wrapper.querySelector('canvas');
          if (canvas) {
            this.renderOrb(feed, canvas);
          }
        }
      });
    };
    
    animate();
  }

  private cleanup() {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
    }
    
    this.orbs.forEach((orb) => {
      orb.geometry.dispose();
      (orb.material as THREE.Material).dispose();
    });
    this.orbs.clear();
    
    this.videoTextures.forEach((texture) => {
      texture.dispose();
    });
    this.videoTextures.clear();
    
    this.renderers.forEach((renderer) => {
      renderer.dispose();
    });
    this.renderers.clear();
  }

  private handleOrbClick(feed: ThumbnailFeed) {
    this.dispatchEvent(new CustomEvent('orb-click', {
      detail: { feed },
      bubbles: true,
      composed: true,
    }));
  }

  private handleOrbExpand(feed: ThumbnailFeed) {
    this.dispatchEvent(new CustomEvent('orb-expand', {
      detail: { feed },
      bubbles: true,
      composed: true,
    }));
  }

  render() {
    if (!this.visible || this.feeds.length === 0) {
      return html``;
    }

    return html`
      <div class="orbs-container">
        ${this.feeds.map((feed) => html`
          <div
            id="orb-${feed.id}"
            class="orb-wrapper"
            @click=${() => this.handleOrbClick(feed)}
            @mouseenter=${() => { this.hoveredFeed = feed.id; }}
            @mouseleave=${() => { this.hoveredFeed = null; }}
          >
            <canvas width="80" height="80"></canvas>
            <div class="orb-status ${feed.active ? 'active' : 'inactive'}"></div>
            <div class="orb-label">${feed.label}</div>
            <button
              class="expand-button"
              @click=${(e: Event) => {
                e.stopPropagation();
                this.handleOrbExpand(feed);
              }}
            >
              ⛶
            </button>
          </div>
        `)}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'camera-thumbnail-orbs': CameraThumbnailOrbs;
  }
}
