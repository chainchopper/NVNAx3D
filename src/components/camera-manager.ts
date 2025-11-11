/**
 * Camera Manager Component
 * Manages camera access, video streaming, and frame capture
 */

import { LitElement, css, html } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';

export interface CameraFrame {
  dataUrl: string;
  timestamp: number;
  width: number;
  height: number;
}

@customElement('camera-manager')
export class CameraManager extends LitElement {
  @property({ type: Boolean }) enabled = false;
  @property({ type: Boolean }) showPreview = false;
  @property({ type: String }) renderMode: 'native' | 'texture' | 'both' = 'native'; // native = hardware-accelerated HTML5 video, texture = 3D background
  
  @state() private hasPermission = false;
  @state() private isActive = false;
  @state() private error: string | null = null;
  @state() private facingMode: 'user' | 'environment' = 'user';
  
  @query('video') private videoElement!: HTMLVideoElement;
  @query('canvas') private canvasElement!: HTMLCanvasElement;
  
  private mediaStream: MediaStream | null = null;
  private captureInterval: number | null = null;
  private readonly CAPTURE_INTERVAL_MS = 5000; // Capture every 5 seconds

  static styles = css`
    :host {
      display: block;
      position: relative;
    }

    .camera-container {
      position: relative;
      width: 100%;
      height: 100%;
    }

    video {
      display: none;
      width: 100%;
      height: 100%;
      object-fit: cover;
      position: fixed;
      top: 0;
      left: 0;
      z-index: 1; /* Above body background, below 3D canvas */
      transform: scaleX(-1); /* Mirror for front-facing camera */
    }

    video.preview,
    video.native {
      display: block;
    }
    
    video.native {
      /* Native rendering mode - full screen background with hardware acceleration */
      width: 100vw;
      height: 100vh;
      opacity: 1;
      transition: opacity 0.3s ease;
    }

    canvas {
      display: none;
    }

    .error-message {
      color: #ff4444;
      padding: 8px;
      font-size: 12px;
    }

    .permission-prompt {
      padding: 16px;
      background: rgba(0, 0, 0, 0.7);
      border-radius: 8px;
      color: white;
      text-align: center;
    }
  `;

  async requestPermissions(): Promise<boolean> {
    try {
      console.log(`[CameraManager] Requesting camera permissions (${this.facingMode} camera)...`);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: this.facingMode
        }
      });

      this.mediaStream = stream;
      this.hasPermission = true;
      this.error = null;
      
      console.log('[CameraManager] Camera permissions granted');
      this.dispatchEvent(new CustomEvent('permissions-granted'));
      
      return true;
    } catch (err) {
      console.error('[CameraManager] Camera permission denied:', err);
      this.error = 'Camera access denied. Please allow camera permissions.';
      this.hasPermission = false;
      this.dispatchEvent(new CustomEvent('permissions-denied', { detail: { error: err } }));
      return false;
    }
  }

  /**
   * Switch between front (user) and back (environment) cameras
   * This is especially useful on mobile devices
   */
  async switchCamera(): Promise<boolean> {
    const wasActive = this.isActive;
    
    // Properly stop the camera (clears isActive flag)
    this.stop();
    
    // Toggle facing mode
    this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';
    console.log(`[CameraManager] Switching to ${this.facingMode} camera`);
    
    // If was active, restart with new camera
    if (wasActive) {
      const granted = await this.requestPermissions();
      if (granted) {
        await this.start();
        this.dispatchEvent(new CustomEvent('camera-switched', { 
          detail: { facingMode: this.facingMode } 
        }));
        return true;
      }
    }
    
    return false;
  }

  /**
   * Get the current camera facing mode
   */
  getFacingMode(): 'user' | 'environment' {
    return this.facingMode;
  }

  async start(): Promise<boolean> {
    if (this.isActive) {
      console.log('[CameraManager] Already active');
      return true;
    }

    if (!this.hasPermission) {
      const granted = await this.requestPermissions();
      if (!granted) return false;
    }

    try {
      if (this.videoElement && this.mediaStream) {
        this.videoElement.srcObject = this.mediaStream;
        await this.videoElement.play();
        this.isActive = true;
        
        // Start periodic frame capture for vision analysis
        this.startPeriodicCapture();
        
        console.log('[CameraManager] Camera started with periodic capture');
        this.dispatchEvent(new CustomEvent('camera-started'));
        return true;
      }
      return false;
    } catch (err) {
      console.error('[CameraManager] Failed to start camera:', err);
      this.error = 'Failed to start camera';
      return false;
    }
  }

  /**
   * Start periodic frame capture for vision analysis
   */
  private startPeriodicCapture(): void {
    // Clear any existing interval
    if (this.captureInterval) {
      clearInterval(this.captureInterval);
    }

    // Capture immediately
    setTimeout(() => {
      this.captureAndAnalyze();
    }, 1000); // Wait 1s for video to stabilize

    // Then capture periodically
    this.captureInterval = window.setInterval(() => {
      this.captureAndAnalyze();
    }, this.CAPTURE_INTERVAL_MS);

    console.log(`[CameraManager] Periodic capture started (every ${this.CAPTURE_INTERVAL_MS / 1000}s)`);
  }

  /**
   * Capture frame and dispatch for vision analysis
   */
  private captureAndAnalyze(): void {
    const frame = this.captureFrame();
    if (frame) {
      console.log('[CameraManager] Frame captured for vision analysis');
      // The frame-captured event is already dispatched by captureFrame()
      // Listeners (like camera-vision-service) can handle it
    }
  }

  stop(): void {
    if (!this.isActive) return;

    if (this.captureInterval) {
      clearInterval(this.captureInterval);
      this.captureInterval = null;
    }

    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.srcObject = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    this.isActive = false;
    this.hasPermission = false;
    
    console.log('[CameraManager] Camera stopped');
    this.dispatchEvent(new CustomEvent('camera-stopped'));
  }

  captureFrame(): CameraFrame | null {
    if (!this.isActive || !this.videoElement || !this.canvasElement) {
      console.warn('[CameraManager] Cannot capture frame - camera not active');
      return null;
    }

    try {
      const video = this.videoElement;
      const canvas = this.canvasElement;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        console.error('[CameraManager] Failed to get canvas context');
        return null;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

      const frame: CameraFrame = {
        dataUrl,
        timestamp: Date.now(),
        width: canvas.width,
        height: canvas.height
      };

      this.dispatchEvent(new CustomEvent('frame-captured', { detail: frame }));
      return frame;
    } catch (err) {
      console.error('[CameraManager] Failed to capture frame:', err);
      return null;
    }
  }

  getVideoElement(): HTMLVideoElement | null {
    return this.videoElement || null;
  }

  isReady(): boolean {
    return this.isActive && this.hasPermission;
  }

  async firstUpdated() {
    // Auto-request camera permissions on first load (only if not already granted/denied)
    try {
      const permissions = await navigator.permissions.query({ name: 'camera' as PermissionName });
      console.log('[CameraManager] Camera permission state:', permissions.state);
      
      if (permissions.state === 'prompt') {
        // Permission hasn't been decided yet, auto-request
        console.log('[CameraManager] Auto-requesting camera permissions...');
        await this.requestPermissions();
      } else if (permissions.state === 'granted') {
        // Permission already granted, mark as such
        this.hasPermission = true;
        console.log('[CameraManager] Camera permission already granted');
      }
    } catch (err) {
      // Permissions API not supported or camera query not supported
      console.log('[CameraManager] Permissions API not available, will request on first use');
    }
  }

  protected updated(changedProps: Map<string, any>) {
    if (changedProps.has('enabled')) {
      if (this.enabled) {
        this.start();
      } else {
        this.stop();
      }
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.stop();
  }

  render() {
    const videoClass = this.renderMode === 'native' || this.renderMode === 'both'
      ? 'native'
      : this.showPreview
      ? 'preview'
      : '';
    
    return html`
      <div class="camera-container">
        <video 
          class="${videoClass}"
          autoplay 
          playsinline 
          muted
        ></video>
        <canvas></canvas>
        
        ${this.error ? html`
          <div class="error-message">${this.error}</div>
        ` : ''}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'camera-manager': CameraManager;
  }
}
