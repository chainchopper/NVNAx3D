/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// tslint:disable:organize-imports
// tslint:disable:ban-malformed-import-paths
// tslint:disable:no-new-decorators

import {LitElement, css, html, PropertyValueMap} from 'lit';
import {customElement, property, query} from 'lit/decorators.js';
import {Analyser} from './analyser';

import * as THREE from 'three';
import {EXRLoader} from 'three/addons/loaders/EXRLoader.js';
import {
  EffectComposer,
  RenderPass,
  EffectPass,
  GodRaysEffect,
  BloomEffect,
  FXAAEffect,
  NormalPass,
  SSAOEffect,
} from 'postprocessing';
import {vs as sphereVS} from './sphere-shader';
import {IdleAnimation, PersoniConfig, TextureName} from './personas';
import {TEXTURES} from './textures';

const IDLE_ACTIVATION_TIME_FRAMES = 120; // Approx 2 seconds

/**
 * 3D live audio visual.
 */
@customElement('gdm-live-audio-visuals-3d')
export class GdmLiveAudioVisuals3D extends LitElement {
  private outputAnalyser!: Analyser;
  private inputAnalyser!: Analyser;
  private camera!: THREE.PerspectiveCamera;
  private scene!: THREE.Scene;
  private composer!: EffectComposer;
  private centralObject!: THREE.Mesh;
  private lightGroup!: THREE.Group;
  private pointLights: THREE.PointLight[] = [];
  private prevTime = 0;
  private accentColor = new THREE.Color(0x87ceeb);
  private jiggleIntensity = 0;
  private sphereMaterial: THREE.MeshPhysicalMaterial;
  private pmremGenerator: THREE.PMREMGenerator;
  private renderer: THREE.WebGLRenderer;
  private godRaysEffect: GodRaysEffect | undefined;
  private textureLoader = new THREE.TextureLoader();
  private textureCache: Map<string, THREE.Texture> = new Map();

  // Idle animation state
  private isIdle = false;
  private idleTimeCounter = 0;
  private activeIdleAnimation: IdleAnimation | 'none' = 'none';
  private particleSystem: THREE.Points | null = null;
  private codeCanvas: HTMLCanvasElement | null = null;
  private codeContext: CanvasRenderingContext2D | null = null;
  private codeTexture: THREE.CanvasTexture | null = null;

  @property({type: Boolean}) isSwitchingPersona = false;
  @property({type: Object}) visuals: PersoniConfig['visuals'];

  private _outputNode!: AudioNode;
  private _inputNode!: AudioNode;

  @property()
  set outputNode(node: AudioNode) {
    this._outputNode = node;
    this.outputAnalyser = new Analyser(this._outputNode);
  }

  get outputNode() {
    return this._outputNode;
  }

  @property()
  set inputNode(node: AudioNode) {
    this._inputNode = node;
    this.inputAnalyser = new Analyser(this._inputNode);
  }

  get inputNode() {
    return this._inputNode;
  }

  @query('canvas') private canvas!: HTMLCanvasElement;

  static styles = css`
    :host {
      display: block;
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }
    canvas {
      width: 100% !important;
      height: 100% !important;
      position: absolute;
      inset: 0;
      image-rendering: pixelated;
    }
  `;

  protected updated(
    changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>,
  ): void {
    if (changedProperties.has('visuals') && this.visuals) {
      this.accentColor.set(this.visuals.accentColor);
      this.recreateCentralObject();
      this.updateMaterialForVisuals();
    }
  }

  private loadTexture(name: TextureName) {
    if (name === 'none' || !name) return null;
    if (this.textureCache.has(name)) {
      return this.textureCache.get(name)!;
    }
    const textureUrl = TEXTURES[name];
    if (!textureUrl) return null;

    const texture = this.textureLoader.load(textureUrl);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    this.textureCache.set(name, texture);
    return texture;
  }

  private updateMaterialForVisuals() {
    if (!this.visuals || !this.sphereMaterial) return;
    const {textureName, shape} = this.visuals;

    // Reset material to base crystal state
    this.sphereMaterial.map = null;
    this.sphereMaterial.emissiveMap = null;
    this.sphereMaterial.emissive.set(0xffffff);
    this.sphereMaterial.emissiveIntensity = 0.1;
    this.sphereMaterial.transmission = 1.0;
    this.sphereMaterial.thickness = 0.5;
    this.sphereMaterial.roughness = 0.05;
    this.sphereMaterial.metalness = 0.1;
    this.sphereMaterial.color.set(0xffffff);
    this.sphereMaterial.transparent = true;

    const texture = this.loadTexture(textureName);

    if (texture) {
      // Shape-specific tiling adjustments for more natural wrapping
      if (shape === 'TorusKnot') {
        texture.repeat.set(8, 2);
      } else if (shape === 'Icosahedron') {
        texture.repeat.set(3, 2);
      } else if (shape === 'Box') {
        texture.repeat.set(2, 2);
      } else {
        texture.repeat.set(1, 1);
      }

      this.sphereMaterial.map = texture;
      this.sphereMaterial.transmission = 0; // Opaque for textures
      this.sphereMaterial.transparent = false;
      this.sphereMaterial.roughness = 0.7;
      this.sphereMaterial.metalness = 0.2;
    }

    // Texture-specific material properties for realism
    if (textureName === 'lava') {
      this.sphereMaterial.emissiveMap = texture;
      this.sphereMaterial.emissive.set(0xffffff);
      this.sphereMaterial.emissiveIntensity = 0.5;
    } else if (textureName === 'bio_green' || textureName === 'organic_glow') {
      this.sphereMaterial.emissiveMap = texture;
      this.sphereMaterial.emissive.set(0xffffff);
      this.sphereMaterial.emissiveIntensity = 0.2;
      this.sphereMaterial.roughness = 0.8;
    } else if (textureName === 'metallic_brushed') {
      this.sphereMaterial.roughness = 0.2;
      this.sphereMaterial.metalness = 0.9;
    } else if (textureName === 'crystal_blue') {
      this.sphereMaterial.roughness = 0.1;
      this.sphereMaterial.transmission = 0.9;
      this.sphereMaterial.thickness = 1.0;
      this.sphereMaterial.transparent = true;
      this.sphereMaterial.emissive.set(this.accentColor);
      this.sphereMaterial.emissiveIntensity = 0.2;
    }

    this.sphereMaterial.needsUpdate = true;
  }

  private createShapeGeometry(shape: string): THREE.BufferGeometry {
    switch (shape) {
      case 'TorusKnot':
        return new THREE.TorusKnotGeometry(0.6, 0.25, 200, 32);
      case 'Box':
        return new THREE.BoxGeometry(1.5, 1.5, 1.5);
      case 'Icosahedron':
      default:
        return new THREE.IcosahedronGeometry(1, 10);
    }
  }

  private recreateCentralObject() {
    if (!this.scene || !this.visuals) return;

    if (this.centralObject) {
      this.scene.remove(this.centralObject);
      this.centralObject.geometry.dispose();
    }

    const geometry = this.createShapeGeometry(this.visuals.shape);
    this.centralObject = new THREE.Mesh(geometry, this.sphereMaterial);
    this.centralObject.castShadow = true;
    this.scene.add(this.centralObject);

    if (this.godRaysEffect) {
      this.godRaysEffect.lightSource = this.centralObject;
    }
  }

  private init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x100c14);

    const backdropGeometry = new THREE.PlaneGeometry(20, 20);
    const backdropMaterial = new THREE.MeshStandardMaterial({
      color: 0x100c14,
      roughness: 0.8,
      metalness: 0.1,
    });
    const backdrop = new THREE.Mesh(backdropGeometry, backdropMaterial);
    backdrop.receiveShadow = true;
    backdrop.position.z = -5;
    this.scene.add(backdrop);

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    this.camera.position.set(0, 0, 5);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio * 0.75);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.pmremGenerator.compileEquirectangularShader();

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(2, 2, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 15;
    this.camera.add(directionalLight);
    this.scene.add(this.camera);

    this.lightGroup = new THREE.Group();
    this.scene.add(this.lightGroup);
    for (let i = 0; i < 3; i++) {
      const light = new THREE.PointLight(0xffffff, 0.5, 30);
      light.castShadow = false;
      this.pointLights.push(light);
      this.lightGroup.add(light);
    }

    this.sphereMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.1,
      roughness: 0.05,
      transmission: 1.0,
      thickness: 0.5,
      emissive: 0xffffff,
      emissiveIntensity: 0.1,
    });

    new EXRLoader().load(
      'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/equirectangular/piz_compressed.exr',
      (texture: THREE.Texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        const exrCubeRenderTarget =
          this.pmremGenerator.fromEquirectangular(texture);
        this.sphereMaterial.envMap = exrCubeRenderTarget.texture;
        this.sphereMaterial.needsUpdate = true;
      },
    );

    this.sphereMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.time = {value: 0};
      shader.uniforms.idleTime = {value: 0};
      shader.uniforms.outputData = {value: new THREE.Vector4()};
      shader.uniforms.jiggleIntensity = {value: 0};
      shader.vertexShader = sphereVS;
      this.sphereMaterial.userData.shader = shader;
    };

    this.recreateCentralObject();
    this.updateMaterialForVisuals();

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    const normalPass = new NormalPass(this.scene, this.camera);
    this.composer.addPass(normalPass);

    this.godRaysEffect = new GodRaysEffect(this.camera, this.centralObject, {
      resolutionScale: 0.75,
      density: 0.9,
      decay: 0.92,
      weight: 0.3,
      exposure: 0.5,
      clampMax: 1.0,
      samples: 60,
    });

    const bloomEffect = new BloomEffect({
      intensity: 1.2,
      luminanceThreshold: 0.3,
      luminanceSmoothing: 0.8,
    });

    const ssaoEffect = new SSAOEffect(this.camera, normalPass.texture, {
      blendFunction: 21,
      samples: 20,
      rings: 4,
      distanceThreshold: 0.02,
      distanceFalloff: 0.0002,
      rangeThreshold: 0.005,
      rangeFalloff: 0.001,
      luminanceInfluence: 0.6,
      radius: 0.05,
      resolutionScale: 0.5,
      bias: 0.01,
    });

    const effectPass = new EffectPass(
      this.camera,
      ssaoEffect,
      this.godRaysEffect,
      bloomEffect,
      new FXAAEffect(),
    );
    this.composer.addPass(effectPass);

    window.addEventListener('resize', this.onWindowResize);
    this.onWindowResize();

    this.animation();
  }

  private onWindowResize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
  };

  private cleanupIdleAnimation(animation: IdleAnimation | 'none') {
    switch (animation) {
      case 'particles':
        if (this.particleSystem) {
          this.scene.remove(this.particleSystem);
          this.particleSystem.geometry.dispose();
          (this.particleSystem.material as THREE.Material).dispose();
          this.particleSystem = null;
        }
        break;
      case 'code':
        if (this.visuals.textureName !== 'bio_green') {
          this.sphereMaterial.emissiveMap = null;
        }
        break;
    }
  }

  private updateIdleAnimation(dt: number, time: number) {
    if (!this.visuals?.idleAnimation || this.visuals.idleAnimation === 'none') {
      return;
    }

    if (
      this.activeIdleAnimation &&
      this.activeIdleAnimation !== this.visuals.idleAnimation
    ) {
      this.cleanupIdleAnimation(this.activeIdleAnimation);
      this.activeIdleAnimation = 'none';
    }

    this.activeIdleAnimation = this.visuals.idleAnimation;
    switch (this.visuals.idleAnimation) {
      case 'glow':
        this.updateGlowAnimation(time);
        break;
      case 'particles':
        this.updateParticlesAnimation(dt);
        break;
      case 'code':
        this.updateCodeScrawlAnimation(time);
        break;
    }
  }

  private updateGlowAnimation(time: number) {
    // Base "breathing" pulse from time
    const timePulse = 0.15 + (Math.sin(time * 2) * 0.5 + 0.5) * 0.1;

    // Reactive pulse from ambient microphone input
    let ambientPulse = 0;
    if (this.inputAnalyser && this.inputAnalyser.data.length > 0) {
      const ambientLevel =
        this.inputAnalyser.data.reduce((a, b) => a + b) /
        (this.inputAnalyser.data.length * 255);
      // Amplify the effect slightly, but keep it subtle.
      ambientPulse = ambientLevel * 0.2;
    }

    const finalIntensity = timePulse + ambientPulse;

    this.sphereMaterial.emissiveIntensity =
      this.visuals.textureName === 'lava'
        ? 0.5 + finalIntensity * 2
        : finalIntensity;
  }

  private updateParticlesAnimation(dt: number) {
    if (!this.particleSystem) {
      const geo = new THREE.BufferGeometry();
      const vertices = [];
      for (let i = 0; i < 200; i++) {
        vertices.push(
          Math.random() * 4 - 2,
          Math.random() * 4 - 2,
          Math.random() * 4 - 2,
        );
      }
      geo.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(vertices, 3),
      );
      const mat = new THREE.PointsMaterial({
        color: this.accentColor,
        size: 0.05,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
      });
      this.particleSystem = new THREE.Points(geo, mat);
      this.scene.add(this.particleSystem);
    }
    (this.particleSystem.material as THREE.PointsMaterial).color.set(
      this.accentColor,
    );
    this.particleSystem.rotation.y += dt * 0.01;
    this.particleSystem.rotation.x += dt * 0.005;
  }

  private updateCodeScrawlAnimation(time: number) {
    if (!this.codeCanvas) {
      this.codeCanvas = document.createElement('canvas');
      this.codeCanvas.width = 512;
      this.codeCanvas.height = 512;
      this.codeContext = this.codeCanvas.getContext('2d')!;
      this.codeTexture = new THREE.CanvasTexture(this.codeCanvas);
      if (this.visuals.textureName !== 'bio_green') {
        this.sphereMaterial.emissiveMap = this.codeTexture;
      }
      this.sphereMaterial.needsUpdate = true;
    }
    const ctx = this.codeContext!;
    ctx.fillStyle = '#000000'; // Clear with black
    ctx.fillRect(0, 0, 512, 512);
    ctx.fillStyle = this.accentColor.getStyle();
    ctx.font = '20px monospace';
    const lines = 25;
    for (let i = 0; i < lines; i++) {
      const text = Math.random().toString(2).substring(2, 40); // Binary-like
      const y = (i * 22 + time * 50) % (lines * 22);
      ctx.fillText(text, 10, y);
    }
    this.codeTexture!.needsUpdate = true;
  }

  private animation() {
    requestAnimationFrame(() => this.animation());

    if (!this.outputAnalyser || !this.inputAnalyser || !this.centralObject)
      return;
    this.outputAnalyser.update();
    this.inputAnalyser.update();

    const t = performance.now();
    const dt = (t - this.prevTime) / (1000 / 60);
    this.prevTime = t;

    if (this.isSwitchingPersona) {
      this.accentColor.setHSL((t / 2000) % 1.0, 0.8, 0.6);
    } else if (this.visuals) {
      this.accentColor.set(this.visuals.accentColor);
    }

    this.lightGroup.rotation.y += 0.005 * dt;
    this.lightGroup.rotation.x += 0.002 * dt;
    const time = t * 0.001;
    this.pointLights[0].position.set(
      Math.sin(time * 0.7) * 4,
      Math.cos(time * 0.5) * 4,
      Math.cos(time * 0.3) * 4,
    );
    this.pointLights[1].position.set(
      Math.cos(time * 0.3) * 4,
      Math.sin(time * 0.5) * 4,
      Math.sin(time * 0.7) * 4,
    );
    this.pointLights[2].position.set(
      Math.sin(time * 0.7) * 4,
      Math.cos(time * 0.3) * 4,
      Math.sin(time * 0.5) * 4,
    );

    const outputIntensity =
      this.outputAnalyser.data.reduce((a, b) => a + b) /
      (this.outputAnalyser.data.length * 255);

    this.pointLights.forEach((light) => {
      light.color.copy(this.accentColor);
      light.intensity = outputIntensity * 4 + 0.2;
    });

    const isCurrentlySpeaking = outputIntensity > 0.05;
    if (isCurrentlySpeaking) {
      this.idleTimeCounter = 0;
      this.isIdle = false;
    } else {
      this.idleTimeCounter += 1;
    }

    if (this.idleTimeCounter > IDLE_ACTIVATION_TIME_FRAMES) {
      this.isIdle = true;
    }

    if (this.isIdle) {
      this.updateIdleAnimation(dt, t);
    } else {
      if (this.activeIdleAnimation !== 'none') {
        this.cleanupIdleAnimation(this.activeIdleAnimation);
        this.activeIdleAnimation = 'none';
        // Reset glow
        this.updateMaterialForVisuals();
      }
    }

    if (this.sphereMaterial.userData.shader) {
      this.centralObject.rotation.y += 0.001 * dt;
      this.centralObject.rotation.x += 0.0005 * dt;
      const shaderUniforms = this.sphereMaterial.userData.shader.uniforms;
      shaderUniforms.time.value += (dt * 0.1 * this.outputAnalyser.data[0]) / 255;
      shaderUniforms.idleTime.value = time;
      shaderUniforms.outputData.value.set(
        (2 * this.outputAnalyser.data[0]) / 255,
        (0.1 * this.outputAnalyser.data[1]) / 255,
        (10 * this.outputAnalyser.data[2]) / 255,
        0,
      );
    }

    const euler = new THREE.Euler(0, -0.001 * t, 0);
    const quaternion = new THREE.Quaternion().setFromEuler(euler);
    const vector = new THREE.Vector3(0, 0, 5);
    vector.applyQuaternion(quaternion);
    this.camera.position.lerp(vector, 0.02);
    this.camera.lookAt(this.centralObject.position);

    this.composer.render(dt);
  }

  protected firstUpdated() {
    this.init();
  }

  protected render() {
    return html`<canvas></canvas>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'gdm-live-audio-visuals-3d': GdmLiveAudioVisuals3D;
  }
}