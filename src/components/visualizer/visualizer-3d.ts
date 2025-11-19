/**
 * Visualizer 3D Component
 * 
 * Codrops-inspired audio visualizer with:
 * - Dual-mesh sphere (wireframe outer + inner glow)
 * - Fresnel + Noise displacement shaders
 * - Particle field background
 * - Audio-reactive to TTS and music streams
 */

import { LitElement, css, html } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { 
  createWireframeMaterial, 
  createInnerGlowMaterial,
  updateAudioVisualizerShaders 
} from '../../shaders/combined-audio-visualizer';

@customElement('visualizer-3d')
export class Visualizer3D extends LitElement {
  @query('canvas') private canvas!: HTMLCanvasElement;

  // Audio analysers (will be set from parent)
  @property({ type: Object }) outputAnalyser: any = null;
  @property({ type: Object }) inputAnalyser: any = null;
  
  // Camera state (affects visualization scale/transparency)
  @property({ type: Boolean }) cameraActive = false;

  // Three.js core
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private clock = new THREE.Clock();

  // Audio visualizer meshes
  private wireframeSphere!: THREE.Mesh;
  private glowSphere!: THREE.Mesh;
  private wireframeMaterial!: THREE.ShaderMaterial;
  private glowMaterial!: THREE.ShaderMaterial;

  // Animation state
  private animationId: number | null = null;
  private isDestroyed = false;
  private orbitalRotation = { angle: 0 }; // For GSAP ticker rotation
  
  // Mouse parallax
  private mouseX = 0;
  private mouseY = 0;
  private quickToX: any;
  private quickToY: any;
  
  // Cleanup references
  private cameraTickerCallback: any;
  private handleMouseMove: any;
  private entranceTimeline: gsap.core.Timeline | null = null;

  // Audio data
  private frequencyData: Uint8Array = new Uint8Array(256);
  private bassFreq = 0;
  private midFreq = 0;
  private highFreq = 0;
  private audioLevel = 0;

  static override styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      position: fixed;
      top: 0;
      left: 0;
      z-index: 10; /* Above camera background (z:1), below HUD (z:40-50) */
      pointer-events: none; /* Allow mouse events to pass through to controls */
    }

    canvas {
      width: 100%;
      height: 100%;
      display: block;
    }
  `;

  override render() {
    return html`<canvas></canvas>`;
  }

  override firstUpdated() {
    this.initThreeJS();
    this.createScene();
    this.setupMouseParallax();
    this.playEntranceAnimation();
    this.animateFrame();
  }

  override updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);
    
    if (changedProperties.has('cameraActive')) {
      this.handleCameraStateChange();
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.cleanup();
  }

  private initThreeJS(): void {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x0a0a1a, 10, 50);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      this.canvas.clientWidth / this.canvas.clientHeight,
      0.1,
      1000
    );
    this.camera.position.z = 5;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
    });
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0); // Fully transparent background

    // Handle resize
    window.addEventListener('resize', this.handleResize);
  }

  private createScene(): void {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    this.scene.add(ambientLight);

    // Directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(5, 5, 5);
    this.scene.add(directionalLight);

    // Create dual-mesh sphere system
    this.createAudioSphere();

    // Set initial state for entrance animation
    this.camera.position.z = 15; // Start far away
    this.wireframeSphere.scale.setScalar(0); // Start invisible
    this.glowSphere.scale.setScalar(0);

    console.log('[Visualizer3D] Scene created with dual-mesh sphere');
  }

  private playEntranceAnimation(): void {
    this.entranceTimeline = gsap.timeline({
      defaults: { ease: 'power2.out' },
      onComplete: () => {
        // Start orbital rotation after entrance completes
        this.startCameraOrbit();
      }
    });

    const tl = this.entranceTimeline;

    // Camera zoom in
    tl.to(this.camera.position, {
      z: 5,
      duration: 2.5,
      ease: 'power3.out'
    }, 0);

    // Wireframe sphere entrance (scale with bounce)
    tl.to(this.wireframeSphere.scale, {
      x: 1,
      y: 1,
      z: 1,
      duration: 1.8,
      ease: 'back.out(1.7)'
    }, 0.5);

    // Glow sphere entrance (slightly delayed for depth effect)
    tl.to(this.glowSphere.scale, {
      x: 1,
      y: 1,
      z: 1,
      duration: 1.8,
      ease: 'back.out(1.7)'
    }, 0.6);

    console.log('[Visualizer3D] Entrance animation started');
  }

  private startCameraOrbit(): void {
    // Guard: prevent ticker registration after cleanup
    if (this.isDestroyed) {
      console.warn('[Visualizer3D] Skipping camera orbit - component already destroyed');
      return;
    }

    // Consolidated camera animation ticker (orbital + mouse parallax)
    this.cameraTickerCallback = () => {
      if (this.isDestroyed) return;

      // Gentle orbital rotation (full circle every 60 seconds)
      this.orbitalRotation.angle += 0.0003;
      
      // Calculate orbital base position
      const radius = 5;
      const height = Math.sin(this.orbitalRotation.angle * 0.5) * 0.3; // Subtle vertical wobble
      
      const orbitalX = Math.sin(this.orbitalRotation.angle) * radius * 0.2;
      const orbitalY = height;
      const orbitalZ = 5 + Math.cos(this.orbitalRotation.angle) * 0.5;
      
      // Apply mouse parallax on top of orbital position
      const parallaxX = this.mouseX * 0.5; // Increased from 0.3 for more visible effect
      const parallaxY = this.mouseY * 0.5;
      
      // Use quickTo for smooth parallax interpolation
      this.quickToX(orbitalX + parallaxX);
      this.quickToY(orbitalY + parallaxY);
      
      // Set Z directly (no parallax on depth)
      this.camera.position.z = orbitalZ;
      
      // Always look at center
      this.camera.lookAt(0, 0, 0);
    };

    gsap.ticker.add(this.cameraTickerCallback);

    console.log('[Visualizer3D] Consolidated camera animation started (orbital + parallax)');
  }

  private setupMouseParallax(): void {
    // Create ultra-smooth camera position updaters using GSAP quickTo
    // quickTo creates optimized setters for fast, smooth animations
    this.quickToX = gsap.quickTo(this.camera.position, 'x', {
      duration: 0.8,
      ease: 'power2.out'
    });
    
    this.quickToY = gsap.quickTo(this.camera.position, 'y', {
      duration: 0.8,
      ease: 'power2.out'
    });

    // Track mouse movement (store reference for cleanup)
    this.handleMouseMove = (e: MouseEvent) => {
      // Normalize mouse position to -1 to 1 range
      this.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener('mousemove', this.handleMouseMove);

    console.log('[Visualizer3D] Mouse tracking initialized');
  }

  private createAudioSphere(): void {
    const geometry = new THREE.IcosahedronGeometry(2, 4); // Higher detail for smooth displacement

    // Outer wireframe sphere with noise displacement
    this.wireframeMaterial = createWireframeMaterial(new THREE.Color(0x00ffff));
    this.wireframeSphere = new THREE.Mesh(geometry, this.wireframeMaterial);
    this.scene.add(this.wireframeSphere);

    // Inner glow halo (slightly smaller)
    const glowGeometry = new THREE.IcosahedronGeometry(1.8, 3);
    this.glowMaterial = createInnerGlowMaterial(new THREE.Color(0x0088ff));
    this.glowSphere = new THREE.Mesh(glowGeometry, this.glowMaterial);
    this.scene.add(this.glowSphere);

    console.log('[Visualizer3D] Dual-mesh audio sphere created');
  }

  /**
   * Handle camera state changes - reduce size and increase transparency when camera is active
   */
  private handleCameraStateChange(): void {
    if (!this.wireframeSphere || !this.glowSphere) return;

    if (this.cameraActive) {
      // Camera is active - make visualization smaller and more transparent
      console.log('[Visualizer3D] Camera active - reducing size and transparency');
      
      // Smoothly scale down to 60% of original size
      gsap.to(this.wireframeSphere.scale, {
        x: 0.6,
        y: 0.6,
        z: 0.6,
        duration: 0.8,
        ease: 'power2.out'
      });
      
      gsap.to(this.glowSphere.scale, {
        x: 0.6,
        y: 0.6,
        z: 0.6,
        duration: 0.8,
        ease: 'power2.out'
      });
      
      // Increase transparency (reduce opacity to 30%)
      gsap.to(this.wireframeMaterial.uniforms.uOpacity, {
        value: 0.3,
        duration: 0.8,
        ease: 'power2.out'
      });
      
      gsap.to(this.glowMaterial.uniforms.uOpacity, {
        value: 0.3,
        duration: 0.8,
        ease: 'power2.out'
      });
    } else {
      // Camera is off - restore to normal size and opacity
      console.log('[Visualizer3D] Camera inactive - restoring size and opacity');
      
      // Restore to 100% scale
      gsap.to(this.wireframeSphere.scale, {
        x: 1,
        y: 1,
        z: 1,
        duration: 0.8,
        ease: 'power2.out'
      });
      
      gsap.to(this.glowSphere.scale, {
        x: 1,
        y: 1,
        z: 1,
        duration: 0.8,
        ease: 'power2.out'
      });
      
      // Restore full opacity
      gsap.to(this.wireframeMaterial.uniforms.uOpacity, {
        value: 1.0,
        duration: 0.8,
        ease: 'power2.out'
      });
      
      gsap.to(this.glowMaterial.uniforms.uOpacity, {
        value: 1.0,
        duration: 0.8,
        ease: 'power2.out'
      });
    }
  }

  private animateFrame = (): void => {
    if (this.isDestroyed) return;

    this.animationId = requestAnimationFrame(this.animateFrame);

    const elapsedTime = this.clock.getElapsedTime();
    const deltaTime = this.clock.getDelta();

    // Update audio data
    this.updateAudioData();

    // Update shader uniforms
    this.updateShaders(elapsedTime);

    // Render
    this.renderer.render(this.scene, this.camera);
  };

  private updateAudioData(): void {
    // Try to get frequency data from analysers
    // Priority: inputAnalyser (microphone) > outputAnalyser (TTS, future)
    let activeAnalyser = this.inputAnalyser;
    
    // Fallback to outputAnalyser if inputAnalyser not available (for future TTS integration)
    if (!activeAnalyser || !activeAnalyser.data) {
      activeAnalyser = this.outputAnalyser;
    }

    if (activeAnalyser && activeAnalyser.data) {
      // Update analyser to get fresh frequency data
      activeAnalyser.update();
      this.frequencyData = activeAnalyser.data;

      // Calculate frequency bands (same as visual-3d.ts)
      const bass = this.frequencyData.slice(0, 10);
      const mid = this.frequencyData.slice(30, 60);
      const high = this.frequencyData.slice(120, 200);

      this.bassFreq = bass.reduce((a, b) => a + b, 0) / (bass.length * 255);
      this.midFreq = mid.reduce((a, b) => a + b, 0) / (mid.length * 255);
      this.highFreq = high.reduce((a, b) => a + b, 0) / (high.length * 255);

      // Overall audio level
      this.audioLevel = (this.bassFreq + this.midFreq + this.highFreq) / 3;
    } else {
      // Fallback: gentle animation when no audio
      this.audioLevel = 0.1;
      this.bassFreq = 0.05;
      this.midFreq = 0.05;
      this.highFreq = 0.05;
    }
  }

  private updateShaders(time: number): void {
    if (!this.wireframeMaterial || !this.glowMaterial) return;

    // Update both materials with audio data
    updateAudioVisualizerShaders(
      this.wireframeMaterial,
      this.glowMaterial,
      time,
      this.audioLevel,
      this.bassFreq,
      this.midFreq,
      this.highFreq
    );
  }

  private handleResize = (): void => {
    if (!this.canvas || !this.camera || !this.renderer) return;

    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  };

  private cleanup(): void {
    this.isDestroyed = true;

    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    // Kill entrance timeline to prevent onComplete callback
    if (this.entranceTimeline) {
      this.entranceTimeline.kill();
      this.entranceTimeline = null;
    }

    // Remove GSAP ticker callbacks
    if (this.cameraTickerCallback) {
      gsap.ticker.remove(this.cameraTickerCallback);
      this.cameraTickerCallback = null;
    }

    // Remove mouse event listener
    if (this.handleMouseMove) {
      window.removeEventListener('mousemove', this.handleMouseMove);
      this.handleMouseMove = null;
    }

    window.removeEventListener('resize', this.handleResize);

    // Dispose Three.js resources
    if (this.wireframeSphere) {
      this.wireframeSphere.geometry.dispose();
      if (this.wireframeMaterial) this.wireframeMaterial.dispose();
    }

    if (this.glowSphere) {
      this.glowSphere.geometry.dispose();
      if (this.glowMaterial) this.glowMaterial.dispose();
    }

    if (this.renderer) {
      this.renderer.dispose();
    }

    console.log('[Visualizer3D] Cleaned up');
  }

  /**
   * Public method to update color scheme
   */
  public updateColors(wireframeColor: THREE.Color, glowColor: THREE.Color): void {
    if (this.wireframeMaterial) {
      this.wireframeMaterial.uniforms.color.value = wireframeColor;
    }
    if (this.glowMaterial) {
      this.glowMaterial.uniforms.color.value = glowColor;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'visualizer-3d': Visualizer3D;
  }
}
