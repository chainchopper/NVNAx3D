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

  // Particle system
  private particles!: THREE.Points;
  private particleCount = 2000;

  // Animation state
  private animationId: number | null = null;
  private isDestroyed = false;

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
      position: relative;
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
    this.animateFrame();
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
    this.renderer.setClearColor(0x0a0a1a, 1);

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

    // Create particle field
    this.createParticleField();

    console.log('[Visualizer3D] Scene created with dual-mesh sphere and particles');
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

  private createParticleField(): void {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);
    const sizes = new Float32Array(this.particleCount);

    for (let i = 0; i < this.particleCount; i++) {
      // Random positions in a cube
      positions[i * 3] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 30;

      // Random colors (cyan to blue spectrum)
      const hue = 0.5 + Math.random() * 0.1; // Cyan-blue range
      const color = new THREE.Color().setHSL(hue, 0.8, 0.6);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      // Random sizes
      sizes[i] = Math.random() * 2 + 0.5;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);

    console.log('[Visualizer3D] Particle field created with', this.particleCount, 'particles');
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

    // Animate particles
    this.updateParticles(elapsedTime, deltaTime);

    // Render
    this.renderer.render(this.scene, this.camera);
  };

  private updateAudioData(): void {
    // Try to get frequency data from analysers
    // Priority: inputAnalyser (microphone) > outputAnalyser (TTS, future)
    let activeAnalyser = this.inputAnalyser;
    
    // Fallback to outputAnalyser if inputAnalyser not available (for future TTS integration)
    if (!activeAnalyser || !activeAnalyser.dataArray) {
      activeAnalyser = this.outputAnalyser;
    }

    if (activeAnalyser && activeAnalyser.dataArray) {
      this.frequencyData = activeAnalyser.dataArray;
      activeAnalyser.getByteFrequencyData(this.frequencyData);

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

  private updateParticles(time: number, deltaTime: number): void {
    if (!this.particles) return;

    // Rotate particle field slowly
    this.particles.rotation.y += deltaTime * 0.05;
    this.particles.rotation.x += deltaTime * 0.02;

    // Audio-reactive particle movement
    const positions = this.particles.geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      
      // Gentle floating motion
      positions[i3 + 1] += Math.sin(time + i * 0.1) * 0.001;
      
      // Audio-reactive expansion
      const distance = Math.sqrt(
        positions[i3] ** 2 + 
        positions[i3 + 1] ** 2 + 
        positions[i3 + 2] ** 2
      );
      const expansionFactor = 1 + this.audioLevel * 0.1;
      
      if (distance > 0) {
        const scale = (distance * expansionFactor) / distance;
        positions[i3] = positions[i3] * (1 - deltaTime) + positions[i3] * scale * deltaTime;
        positions[i3 + 2] = positions[i3 + 2] * (1 - deltaTime) + positions[i3 + 2] * scale * deltaTime;
      }
    }

    this.particles.geometry.attributes.position.needsUpdate = true;
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

    if (this.particles) {
      this.particles.geometry.dispose();
      (this.particles.material as THREE.Material).dispose();
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
