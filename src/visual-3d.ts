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
import {TEXTURES, TEXTURE_MAPS} from './textures';

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
  private secondaryObject: THREE.Mesh | null = null; // For dual PersonI mode
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
  private codeStreams: Array<{x: number; y: number; speed: number; chars: string[]}> = [];
  
  private previousEmissiveIntensity = 0.1;
  private targetEmissiveIntensity = 0.1;
  private previousPointLightIntensity = 0.5;
  
  private listeningGlowColor = new THREE.Color(0x00ff00);
  private originalEmissiveColor = new THREE.Color(0xffffff);
  
  private idleAnimationPhase = 0;
  private baseOpacity = 0.7;

  // Music detection state
  private musicBeatPhase = 0;
  private lastBeatTime = 0;
  private musicIntensitySmoothed = 0;

  // Hourly time indication state
  private lastHour = -1;
  private hourlyJiggleIntensity = 0;

  // Camera background support
  private cameraBackgroundPlane: THREE.Mesh | null = null;
  private cameraVideoTexture: THREE.VideoTexture | null = null;

  @property({type: Boolean}) isSwitchingPersona = false;
  @property({type: Boolean}) isListening = false;
  @property({type: Boolean}) isAiSpeaking = false;
  @property({type: Object}) visuals: PersoniConfig['visuals'];
  @property({type: Boolean}) isMusicDetected = false;
  @property({type: Number}) musicBpm = 0;
  @property({type: Boolean}) musicBeatDetected = false;
  @property({type: Number}) musicConfidence = 0;
  @property({type: Object}) cameraVideoElement: HTMLVideoElement | null = null;
  @property({type: String}) cameraRenderMode: 'native' | 'texture' | 'both' = 'native'; // Control whether camera is rendered as 3D texture
  @property({type: Boolean}) dualModeActive = false;
  @property({type: Object}) secondaryVisuals: PersoniConfig['visuals'] | null = null;

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
      z-index: 1;
      pointer-events: none;
    }
    canvas {
      width: 100% !important;
      height: 100% !important;
      position: absolute;
      inset: 0;
      image-rendering: pixelated;
      pointer-events: none;
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
    
    if (changedProperties.has('cameraVideoElement')) {
      this.updateCameraBackground();
    }
    
    // Handle dual mode changes
    if (changedProperties.has('dualModeActive') || changedProperties.has('secondaryVisuals')) {
      this.updateDualModeVisuals();
    }
  }

  private updateCameraBackground(): void {
    // Remove existing camera background
    if (this.cameraBackgroundPlane) {
      this.camera?.remove(this.cameraBackgroundPlane);
      this.cameraBackgroundPlane = null;
    }
    
    if (this.cameraVideoTexture) {
      this.cameraVideoTexture.dispose();
      this.cameraVideoTexture = null;
    }

    // Add new camera background if video element is provided AND render mode is texture/both
    // Native mode = HTML5 video element (hardware accelerated), Texture mode = 3D plane background (for external feeds/widgets)
    if (this.cameraVideoElement && this.scene && (this.cameraRenderMode === 'texture' || this.cameraRenderMode === 'both')) {
      try {
        console.log('[Visual3D] Creating camera background texture (render mode:', this.cameraRenderMode, ')');
        
        // Create video texture
        this.cameraVideoTexture = new THREE.VideoTexture(this.cameraVideoElement);
        this.cameraVideoTexture.minFilter = THREE.LinearFilter;
        this.cameraVideoTexture.magFilter = THREE.LinearFilter;
        this.cameraVideoTexture.format = THREE.RGBFormat;

        // Create background plane
        const aspect = window.innerWidth / window.innerHeight;
        const planeGeometry = new THREE.PlaneGeometry(10 * aspect, 10);
        const planeMaterial = new THREE.MeshBasicMaterial({
          map: this.cameraVideoTexture,
          side: THREE.DoubleSide,
          transparent: false,
        });

        this.cameraBackgroundPlane = new THREE.Mesh(planeGeometry, planeMaterial);
        this.cameraBackgroundPlane.position.z = -10; // Behind the view (farther than camera orbit radius)
        this.camera.add(this.cameraBackgroundPlane); // Attach to camera so it moves with the view

        console.log('[Visual3D] Camera background texture created (for external feeds/widgets)');
      } catch (error) {
        console.error('[Visual3D] Failed to create camera background:', error);
      }
    } else if (this.cameraVideoElement && this.cameraRenderMode === 'native') {
      console.log('[Visual3D] Using native HTML5 video rendering (hardware accelerated) - no 3D texture created');
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

  private loadPBRMaps(baseName: string) {
    const glossMap = this.textureLoader.load(`/${baseName}_glossiness.jpg`);
    const specularMap = this.textureLoader.load(`/${baseName}_specular.jpg`);
    return { glossMap, specularMap };
  }

  private updateMaterialForVisuals() {
    if (!this.visuals || !this.sphereMaterial) return;
    const {textureName, shape, idleAnimation} = this.visuals;

    // Reset material to base crystal state
    this.sphereMaterial.map = null;
    this.sphereMaterial.emissiveMap = null;
    this.sphereMaterial.roughnessMap = null;
    this.sphereMaterial.metalnessMap = null;
    this.sphereMaterial.normalMap = null;
    this.sphereMaterial.alphaMap = null;
    this.sphereMaterial.emissive.set(0xffffff);
    this.sphereMaterial.emissiveIntensity = 0.1;
    this.sphereMaterial.transmission = 0.3;
    this.sphereMaterial.thickness = 0.5;
    this.sphereMaterial.roughness = 0.05;
    this.sphereMaterial.metalness = 0.1;
    this.sphereMaterial.color.set(0xffffff);
    this.sphereMaterial.transparent = true;
    this.sphereMaterial.opacity = this.baseOpacity;
    this.sphereMaterial.depthWrite = false;
    this.sphereMaterial.needsUpdate = true;
  }

  private createShapeGeometry(shape: string): THREE.BufferGeometry {
    switch (shape) {
      case 'TorusKnot':
        // Reduced by 50% from (0.6, 0.25) to (0.3, 0.125)
        return new THREE.TorusKnotGeometry(0.3, 0.125, 200, 32);
      case 'Icosahedron':
      default:
        // Reduced by 50% from radius 1 to 0.5
        return new THREE.IcosahedronGeometry(0.5, 10);
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
    
    // Position primary object based on dual mode
    if (this.dualModeActive) {
      this.centralObject.position.set(-2, 0, 0);
    } else {
      this.centralObject.position.set(0, 0, 0);
    }
    
    this.scene.add(this.centralObject);

    if (this.godRaysEffect) {
      this.godRaysEffect.lightSource = this.centralObject;
    }
  }
  
  private updateDualModeVisuals() {
    if (!this.scene) return;
    
    // Handle secondary object for dual mode
    if (this.dualModeActive && this.secondaryVisuals) {
      if (!this.secondaryObject) {
        // Create secondary object
        const geometry = this.createShapeGeometry(this.secondaryVisuals.shape);
        const material = this.sphereMaterial.clone();
        material.emissive.set(this.secondaryVisuals.accentColor);
        this.secondaryObject = new THREE.Mesh(geometry, material);
        this.secondaryObject.castShadow = true;
        this.secondaryObject.position.set(2, 0, 0);
        this.scene.add(this.secondaryObject);
        
        // Animate fade in
        material.opacity = 0;
        const fadeIn = setInterval(() => {
          material.opacity = Math.min(material.opacity + 0.05, this.baseOpacity);
          if (material.opacity >= this.baseOpacity) {
            clearInterval(fadeIn);
          }
        }, 16);
      }
      
      // Position objects for dual mode
      if (this.centralObject) {
        this.centralObject.position.set(-2, 0, 0);
      }
    } else {
      // Remove secondary object if dual mode is disabled
      if (this.secondaryObject) {
        this.scene.remove(this.secondaryObject);
        this.secondaryObject.geometry.dispose();
        (this.secondaryObject.material as THREE.Material).dispose();
        this.secondaryObject = null;
      }
      
      // Center primary object
      if (this.centralObject) {
        this.centralObject.position.set(0, 0, 0);
      }
    }
  }

  private init() {
    this.scene = new THREE.Scene();
    this.scene.background = null;

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
      alpha: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio * 0.75);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0x000000, 0);

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
      transparent: true,
      opacity: this.baseOpacity,
      depthWrite: false,
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
      shader.uniforms.inputData = {value: new THREE.Vector4()};
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
      density: 0.6,
      decay: 0.92,
      weight: 0.2,
      exposure: 0.5,
      clampMax: 1.0,
      samples: 30,
    });

    const bloomEffect = new BloomEffect({
      intensity: 1.2,
      luminanceThreshold: 0.3,
      luminanceSmoothing: 0.8,
    });

    const ssaoEffect = new SSAOEffect(this.camera, normalPass.texture, {
      blendFunction: 21,
      samples: 12,
      rings: 4,
      distanceThreshold: 0.02,
      distanceFalloff: 0.0002,
      rangeThreshold: 0.005,
      rangeFalloff: 0.001,
      luminanceInfluence: 0.6,
      radius: 0.08,
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
      case 'subtle_breath':
        this.updateSubtleBreathAnimation(time, dt);
        break;
      case 'contemplative':
        this.updateContemplativeAnimation(time, dt);
        break;
      case 'energetic':
        this.updateEnergeticAnimation(time, dt);
        break;
      case 'meditative':
        this.updateMeditativeAnimation(time, dt);
        break;
    }
  }

  private updateGlowAnimation(time: number) {
    const baseIntensity = this.visuals.textureName === 'lava' ? 0.5 : 0.1;
    const timePulse = (Math.sin(time * 1.5) * 0.5 + 0.5) * 0.08;
    
    let ambientPulse = 0;
    if (this.inputAnalyser && this.inputAnalyser.data.length > 0) {
      const ambientLevel =
        this.inputAnalyser.data.reduce((a, b) => a + b) /
        (this.inputAnalyser.data.length * 255);
      ambientPulse = ambientLevel * 0.15;
    }

    this.targetEmissiveIntensity = baseIntensity + timePulse + ambientPulse;
    
    this.previousEmissiveIntensity += 
      (this.targetEmissiveIntensity - this.previousEmissiveIntensity) * 0.1;
    
    this.sphereMaterial.emissiveIntensity = this.previousEmissiveIntensity;
  }

  private updateParticlesAnimation(dt: number) {
    if (!this.particleSystem) {
      const geo = new THREE.BufferGeometry();
      const vertices = [];
      const sizes = [];
      const colors = [];
      const particleCount = 500;
      
      for (let i = 0; i < particleCount; i++) {
        vertices.push(
          (Math.random() - 0.5) * 5,
          (Math.random() - 0.5) * 5,
          (Math.random() - 0.5) * 5,
        );
        sizes.push(Math.random() * 0.08 + 0.02);
        
        const colorVariation = Math.random() * 0.3;
        const color = this.accentColor.clone();
        color.offsetHSL(colorVariation - 0.15, 0, Math.random() * 0.2 - 0.1);
        colors.push(color.r, color.g, color.b);
      }
      
      geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geo.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      
      const mat = new THREE.PointsMaterial({
        size: 0.05,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        vertexColors: true,
        sizeAttenuation: true,
        depthWrite: false,
      });
      
      this.particleSystem = new THREE.Points(geo, mat);
      this.scene.add(this.particleSystem);
    }
    
    const positions = this.particleSystem.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < positions.length; i += 3) {
      positions[i + 1] += Math.sin(this.idleAnimationPhase + i) * 0.001;
    }
    this.particleSystem.geometry.attributes.position.needsUpdate = true;
    
    this.particleSystem.rotation.y += dt * 0.008;
    this.particleSystem.rotation.x += dt * 0.004;
  }

  private updateDramaticIdleAnimations(time: number, dt: number) {
    if (!this.centralObject) return;
    
    this.idleAnimationPhase += dt * 0.001;
    
    const breathScale = 1.0 + Math.sin(this.idleAnimationPhase * 0.5) * 0.05;
    this.centralObject.scale.set(breathScale, breathScale, breathScale);
    
    const wobbleX = Math.sin(this.idleAnimationPhase * 0.7) * 0.02;
    const wobbleY = Math.cos(this.idleAnimationPhase * 0.5) * 0.02;
    const wobbleZ = Math.sin(this.idleAnimationPhase * 0.9) * 0.015;

    this.centralObject.rotation.y += (0.002 + wobbleY) * dt;
    this.centralObject.rotation.x += (0.001 + wobbleX) * dt;
    this.centralObject.rotation.z += wobbleZ * dt;
    
    const floatY = Math.sin(this.idleAnimationPhase * 0.3) * 0.15;
    this.centralObject.position.y = floatY;
    
    const baseIntensity = this.visuals?.textureName === 'lava' ? 0.5 : 0.1;
    const energyPulse = Math.sin(this.idleAnimationPhase * 0.8) * 0.15;
    this.targetEmissiveIntensity = baseIntensity + 0.2 + energyPulse;
    
    this.previousEmissiveIntensity += 
      (this.targetEmissiveIntensity - this.previousEmissiveIntensity) * 0.08;
    this.sphereMaterial.emissiveIntensity = this.previousEmissiveIntensity;
    
    const opacityPulse = Math.sin(this.idleAnimationPhase * 0.4) * 0.1;
    if (this.sphereMaterial.transmission > 0.5) {
      this.sphereMaterial.opacity = this.baseOpacity + opacityPulse;
    } else {
      this.sphereMaterial.opacity = 0.85 + opacityPulse * 0.5;
    }
    
    if (this.sphereMaterial.userData.shader) {
      const shaderUniforms = this.sphereMaterial.userData.shader.uniforms;
      const idleWarp = Math.sin(this.idleAnimationPhase * 0.3) * 0.5;
      shaderUniforms.outputData.value.set(
        idleWarp,
        Math.cos(this.idleAnimationPhase * 0.4) * 0.3,
        Math.sin(this.idleAnimationPhase * 0.5) * 0.4,
        time
      );
      shaderUniforms.jiggleIntensity.value = this.hourlyJiggleIntensity;
    }
  }

  private updateCodeScrawlAnimation(time: number) {
    if (!this.codeCanvas) {
      this.codeCanvas = document.createElement('canvas');
      this.codeCanvas.width = 1024;
      this.codeCanvas.height = 1024;
      this.codeContext = this.codeCanvas.getContext('2d')!;
      this.codeTexture = new THREE.CanvasTexture(this.codeCanvas);
      if (this.visuals.textureName !== 'bio_green') {
        this.sphereMaterial.emissiveMap = this.codeTexture;
      }
      this.sphereMaterial.needsUpdate = true;
      
      const matrixChars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾜ';
      for (let i = 0; i < 35; i++) {
        this.codeStreams.push({
          x: Math.random() * 1024,
          y: Math.random() * -1024,
          speed: 3 + Math.random() * 6,
          chars: Array.from({length: 25}, () => 
            matrixChars[Math.floor(Math.random() * matrixChars.length)]
          )
        });
      }
    }
    
    const ctx = this.codeContext!;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillRect(0, 0, 1024, 1024);
    
    ctx.font = 'bold 24px monospace';
    const matrixChars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾜ';
    
    this.codeStreams.forEach(stream => {
      stream.y += stream.speed;
      if (stream.y > 1200) {
        stream.y = Math.random() * -400;
        stream.x = Math.random() * 1024;
      }
      
      stream.chars.forEach((char, idx) => {
        const y = stream.y - idx * 28;
        if (y > 0 && y < 1024) {
          const brightness = Math.max(0, 1 - idx / stream.chars.length);
          const green = Math.floor(255 * brightness);
          
          if (idx === 0) {
            ctx.fillStyle = `rgb(200, 255, 200)`;
            ctx.shadowColor = '#00ff00';
            ctx.shadowBlur = 10;
          } else {
            ctx.fillStyle = `rgb(0, ${green}, 0)`;
            ctx.shadowBlur = 0;
          }
          
          ctx.fillText(char, stream.x, y);
          
          if (Math.random() > 0.97) {
            stream.chars[idx] = matrixChars[Math.floor(Math.random() * matrixChars.length)];
          }
        }
      });
    });
    
    ctx.shadowBlur = 0;
    this.codeTexture!.needsUpdate = true;
  }

  private updateSubtleBreathAnimation(time: number, dt: number) {
    if (!this.centralObject) return;
    
    this.idleAnimationPhase += dt * 0.0005;
    
    const breathScale = 1.0 + Math.sin(this.idleAnimationPhase * 0.2) * 0.015;
    this.centralObject.scale.set(breathScale, breathScale, breathScale);
    
    const baseIntensity = this.visuals?.textureName === 'lava' ? 0.5 : 0.1;
    const gentlePulse = Math.sin(this.idleAnimationPhase * 0.15) * 0.03;
    this.targetEmissiveIntensity = baseIntensity + gentlePulse;
    
    this.previousEmissiveIntensity += 
      (this.targetEmissiveIntensity - this.previousEmissiveIntensity) * 0.05;
    this.sphereMaterial.emissiveIntensity = this.previousEmissiveIntensity;
    
    if (this.sphereMaterial.userData.shader) {
      const shaderUniforms = this.sphereMaterial.userData.shader.uniforms;
      const subtleWarp = Math.sin(this.idleAnimationPhase * 0.1) * 0.1;
      shaderUniforms.outputData.value.set(
        subtleWarp,
        Math.cos(this.idleAnimationPhase * 0.08) * 0.08,
        Math.sin(this.idleAnimationPhase * 0.12) * 0.1,
        time
      );
      shaderUniforms.jiggleIntensity.value = this.hourlyJiggleIntensity;
    }
  }

  private updateContemplativeAnimation(time: number, dt: number) {
    if (!this.centralObject) return;
    
    this.idleAnimationPhase += dt * 0.0008;
    
    const breathScale = 1.0 + Math.sin(this.idleAnimationPhase * 0.25) * 0.025;
    this.centralObject.scale.set(breathScale, breathScale, breathScale);
    
    this.centralObject.rotation.y += dt * 0.0003;
    this.centralObject.rotation.x = Math.sin(this.idleAnimationPhase * 0.1) * 0.1;
    
    const hue = (this.idleAnimationPhase * 0.02) % 1.0;
    const contemplativeColor = new THREE.Color().setHSL(hue, 0.6, 0.5);
    this.sphereMaterial.emissive.lerp(contemplativeColor, 0.02);
    
    const baseIntensity = this.visuals?.textureName === 'lava' ? 0.5 : 0.1;
    const colorPulse = Math.sin(this.idleAnimationPhase * 0.2) * 0.1;
    this.targetEmissiveIntensity = baseIntensity + 0.15 + colorPulse;
    
    this.previousEmissiveIntensity += 
      (this.targetEmissiveIntensity - this.previousEmissiveIntensity) * 0.06;
    this.sphereMaterial.emissiveIntensity = this.previousEmissiveIntensity;
    
    if (this.sphereMaterial.userData.shader) {
      const shaderUniforms = this.sphereMaterial.userData.shader.uniforms;
      shaderUniforms.outputData.value.set(
        Math.sin(this.idleAnimationPhase * 0.15) * 0.2,
        Math.cos(this.idleAnimationPhase * 0.18) * 0.15,
        Math.sin(this.idleAnimationPhase * 0.22) * 0.25,
        time
      );
      shaderUniforms.jiggleIntensity.value = this.hourlyJiggleIntensity;
    }
  }

  private updateEnergeticAnimation(time: number, dt: number) {
    if (!this.centralObject) return;
    
    this.idleAnimationPhase += dt * 0.002;
    
    const energyScale = 1.0 + Math.sin(this.idleAnimationPhase * 1.2) * 0.08;
    this.centralObject.scale.set(energyScale, energyScale, energyScale);
    
    this.centralObject.rotation.y += dt * 0.002;
    this.centralObject.rotation.x += dt * 0.001;
    this.centralObject.rotation.z = Math.sin(this.idleAnimationPhase * 0.9) * 0.15;
    
    const floatY = Math.sin(this.idleAnimationPhase * 0.8) * 0.2;
    this.centralObject.position.y = floatY;
    
    const baseIntensity = this.visuals?.textureName === 'lava' ? 0.5 : 0.1;
    const energyPulse = Math.sin(this.idleAnimationPhase * 1.5) * 0.25;
    this.targetEmissiveIntensity = baseIntensity + 0.3 + energyPulse;
    
    this.previousEmissiveIntensity += 
      (this.targetEmissiveIntensity - this.previousEmissiveIntensity) * 0.12;
    this.sphereMaterial.emissiveIntensity = this.previousEmissiveIntensity;
    
    const opacityPulse = Math.sin(this.idleAnimationPhase * 0.9) * 0.15;
    if (this.sphereMaterial.transmission > 0.5) {
      this.sphereMaterial.opacity = this.baseOpacity + opacityPulse;
    } else {
      this.sphereMaterial.opacity = 0.85 + opacityPulse * 0.5;
    }
    
    if (this.sphereMaterial.userData.shader) {
      const shaderUniforms = this.sphereMaterial.userData.shader.uniforms;
      shaderUniforms.outputData.value.set(
        Math.sin(this.idleAnimationPhase * 1.0) * 0.8,
        Math.cos(this.idleAnimationPhase * 1.2) * 0.6,
        Math.sin(this.idleAnimationPhase * 1.4) * 0.7,
        time
      );
      shaderUniforms.jiggleIntensity.value = this.hourlyJiggleIntensity + 0.2;
    }
  }

  private updateMeditativeAnimation(time: number, dt: number) {
    if (!this.centralObject) return;
    
    this.idleAnimationPhase += dt * 0.0003;
    
    const zenBreath = 1.0 + Math.sin(this.idleAnimationPhase * 0.08) * 0.01;
    this.centralObject.scale.set(zenBreath, zenBreath, zenBreath);
    
    this.centralObject.rotation.y += dt * 0.00015;
    this.centralObject.position.y = Math.sin(this.idleAnimationPhase * 0.05) * 0.05;
    
    const calmColor = new THREE.Color(0x4a90e2);
    this.sphereMaterial.emissive.lerp(calmColor, 0.01);
    
    const baseIntensity = this.visuals?.textureName === 'lava' ? 0.5 : 0.1;
    const zenPulse = Math.sin(this.idleAnimationPhase * 0.06) * 0.02;
    this.targetEmissiveIntensity = baseIntensity + 0.05 + zenPulse;
    
    this.previousEmissiveIntensity += 
      (this.targetEmissiveIntensity - this.previousEmissiveIntensity) * 0.03;
    this.sphereMaterial.emissiveIntensity = this.previousEmissiveIntensity;
    
    if (this.sphereMaterial.transmission > 0.5) {
      this.sphereMaterial.opacity = 0.75 + Math.sin(this.idleAnimationPhase * 0.04) * 0.05;
    }
    
    if (this.sphereMaterial.userData.shader) {
      const shaderUniforms = this.sphereMaterial.userData.shader.uniforms;
      shaderUniforms.outputData.value.set(
        Math.sin(this.idleAnimationPhase * 0.05) * 0.05,
        Math.cos(this.idleAnimationPhase * 0.04) * 0.04,
        Math.sin(this.idleAnimationPhase * 0.06) * 0.06,
        time
      );
      shaderUniforms.jiggleIntensity.value = this.hourlyJiggleIntensity;
    }
  }
  
  private updateListeningVisuals(audioLevel: number) {
    this.targetEmissiveIntensity = 0.3 + audioLevel * 0.4;
    this.previousEmissiveIntensity += 
      (this.targetEmissiveIntensity - this.previousEmissiveIntensity) * 0.15;
    
    this.sphereMaterial.emissive.lerp(this.listeningGlowColor, 0.1);
    this.sphereMaterial.emissiveIntensity = this.previousEmissiveIntensity;
    
    if (this.sphereMaterial.userData.shader) {
      const shaderUniforms = this.sphereMaterial.userData.shader.uniforms;
      shaderUniforms.inputData.value.set(
        audioLevel * 2,
        audioLevel * 1.5,
        audioLevel * 2.5,
        0
      );
      shaderUniforms.jiggleIntensity.value = this.hourlyJiggleIntensity + (audioLevel * 0.3);
    }
  }
  
  private updateSpeakingVisuals(audioData: Uint8Array, time: number, dt: number) {
    if (!this.centralObject) return;
    
    // Extract frequency ranges with averaging for better analysis
    const bassRange = audioData.slice(0, Math.min(10, audioData.length));
    const midRange = audioData.slice(10, Math.min(50, audioData.length));
    const highRange = audioData.slice(50, audioData.length);
    
    const bassFreq = (bassRange.reduce((a, b) => a + b, 0) / bassRange.length) / 255;
    const midFreq = (midRange.length > 0 ? midRange.reduce((a, b) => a + b, 0) / midRange.length : 0) / 255;
    const highFreq = (highRange.length > 0 ? highRange.reduce((a, b) => a + b, 0) / highRange.length : 0) / 255;
    const avgAmp = audioData.reduce((a, b) => a + b) / (audioData.length * 255);
    
    const rotationIntensity = midFreq * 0.02 * dt;
    this.centralObject.rotation.y += rotationIntensity;
    this.centralObject.rotation.x += rotationIntensity * 0.5;
    this.centralObject.rotation.z += highFreq * 0.01 * dt;
    
    const shakeAmount = bassFreq * 0.1;
    this.centralObject.position.x = Math.sin(time * 20) * shakeAmount;
    this.centralObject.position.y = Math.cos(time * 15) * shakeAmount;
    this.centralObject.position.z = Math.sin(time * 18) * shakeAmount * 0.5;
    
    const scaleBase = 1.0 + avgAmp * 0.15;
    this.centralObject.scale.set(scaleBase, scaleBase, scaleBase);
    
    this.targetEmissiveIntensity = 0.3 + avgAmp * 0.5;
    this.previousEmissiveIntensity += 
      (this.targetEmissiveIntensity - this.previousEmissiveIntensity) * 0.2;
    this.sphereMaterial.emissiveIntensity = this.previousEmissiveIntensity;
    
    if (this.sphereMaterial.userData.shader) {
      const shaderUniforms = this.sphereMaterial.userData.shader.uniforms;
      shaderUniforms.outputData.value.set(
        bassFreq * 3,
        midFreq * 2.5,
        highFreq * 4,
        time
      );
      shaderUniforms.jiggleIntensity.value = this.hourlyJiggleIntensity + (bassFreq * 0.5);
    }
  }
  
  private resetGeometryTransforms() {
    if (!this.centralObject) return;
    
    this.centralObject.position.lerp(new THREE.Vector3(0, 0, 0), 0.1);
    this.centralObject.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
  }

  /**
   * Update visuals when music is detected
   * More dramatic, beat-synchronized, full-spectrum reactions
   */
  private updateMusicVisuals(frequencyData: Uint8Array, time: number, dt: number) {
    if (!this.centralObject) return;

    // Get frequency bands for full-spectrum reaction
    const bassFreq = frequencyData.slice(0, 10).reduce((a, b) => a + b) / (10 * 255);
    const lowMidFreq = frequencyData.slice(10, 30).reduce((a, b) => a + b) / (20 * 255);
    const midFreq = frequencyData.slice(30, 60).reduce((a, b) => a + b) / (30 * 255);
    const highMidFreq = frequencyData.slice(60, 120).reduce((a, b) => a + b) / (60 * 255);
    const highFreq = frequencyData.slice(120, 200).reduce((a, b) => a + b) / (80 * 255);

    // Smooth music intensity for dramatic but controlled reactions
    const instantIntensity = bassFreq + midFreq + highFreq;
    this.musicIntensitySmoothed = this.musicIntensitySmoothed * 0.7 + instantIntensity * 0.3;

    // Beat-synchronized pulsing
    if (this.musicBeatDetected) {
      this.musicBeatPhase = 1.0;
      this.lastBeatTime = time;
    }

    // Decay beat phase for smooth pulse
    const timeSinceBeat = time - this.lastBeatTime;
    this.musicBeatPhase = Math.max(0, this.musicBeatPhase - dt * 0.05);
    const beatPulse = Math.pow(this.musicBeatPhase, 0.5);

    // Dramatic scale with beat sync - larger reactions than speech
    const musicScale = 1.0 + beatPulse * 0.4 + this.musicIntensitySmoothed * 0.3;
    this.centralObject.scale.set(musicScale, musicScale, musicScale);

    // Enhanced rotation for music - faster and multi-axis
    this.centralObject.rotation.y += (bassFreq * 0.05 + 0.01) * dt;
    this.centralObject.rotation.x += midFreq * 0.03 * dt;
    this.centralObject.rotation.z += highFreq * 0.02 * dt;

    // Dramatic emissive intensity - more vibrant than speech
    const musicEmissive = 0.5 + this.musicIntensitySmoothed * 0.8 + beatPulse * 0.5;
    this.sphereMaterial.emissiveIntensity = musicEmissive;

    // Color shift based on frequency content
    const hue = (bassFreq * 0.3 + midFreq * 0.4 + highFreq * 0.3);
    const tempColor = new THREE.Color().setHSL(hue, 0.8, 0.6);
    this.sphereMaterial.emissive.lerp(tempColor, 0.15);

    // Enhanced point light intensity for music
    const musicLightIntensity = 1.0 + this.musicIntensitySmoothed * 2.0 + beatPulse * 1.5;
    this.pointLights.forEach((light) => {
      light.intensity = musicLightIntensity;
      light.color.lerp(tempColor, 0.2);
    });

    // Update shader uniforms with full spectrum data
    if (this.sphereMaterial.userData.shader) {
      const shaderUniforms = this.sphereMaterial.userData.shader.uniforms;
      shaderUniforms.outputData.value.set(
        bassFreq * 5,      // More dramatic bass response
        midFreq * 4,       // Enhanced mid response
        highFreq * 6,      // Strong high response
        beatPulse          // Beat sync
      );
      shaderUniforms.jiggleIntensity.value = this.musicIntensitySmoothed * 2;
    }
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

    const currentHour = new Date().getHours();
    if (currentHour !== this.lastHour && this.lastHour !== -1) {
      this.hourlyJiggleIntensity = 3.0;
    }
    this.lastHour = currentHour;
    this.hourlyJiggleIntensity = Math.max(0, this.hourlyJiggleIntensity - dt * 0.05);

    if (this.isSwitchingPersona) {
      this.accentColor.setHSL((t / 2000) % 1.0, 0.8, 0.6);
    } else if (this.visuals) {
      this.accentColor.set(this.visuals.accentColor);
    }

    this.lightGroup.rotation.y += 0.005 * dt;
    this.lightGroup.rotation.x += 0.002 * dt;
    const time = t * 0.001;
    this.pointLights[0].position.set(
      Math.sin(time * 0.35) * 4,
      Math.cos(time * 0.25) * 4,
      Math.cos(time * 0.15) * 4,
    );
    this.pointLights[1].position.set(
      Math.cos(time * 0.15) * 4,
      Math.sin(time * 0.25) * 4,
      Math.sin(time * 0.35) * 4,
    );
    this.pointLights[2].position.set(
      Math.sin(time * 0.35) * 4,
      Math.cos(time * 0.15) * 4,
      Math.sin(time * 0.25) * 4,
    );

    const outputIntensity =
      this.outputAnalyser.data.reduce((a, b) => a + b) /
      (this.outputAnalyser.data.length * 255);
    
    const inputIntensity =
      this.inputAnalyser.data.reduce((a, b) => a + b) /
      (this.inputAnalyser.data.length * 255);

    const targetPointLightIntensity = outputIntensity * 2 + 0.3;
    this.previousPointLightIntensity += 
      (targetPointLightIntensity - this.previousPointLightIntensity) * 0.08;
    
    this.pointLights.forEach((light) => {
      light.color.copy(this.accentColor);
      light.intensity = this.previousPointLightIntensity;
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

    // Priority order: Listening > Speaking > Music > Idle > Default
    if (this.isListening && inputIntensity > 0.01) {
      this.updateListeningVisuals(inputIntensity);
      if (this.activeIdleAnimation !== 'none') {
        this.cleanupIdleAnimation(this.activeIdleAnimation);
        this.activeIdleAnimation = 'none';
      }
    } else if (this.isAiSpeaking && outputIntensity > 0.01) {
      this.updateSpeakingVisuals(this.outputAnalyser.data, time, dt);
      if (this.activeIdleAnimation !== 'none') {
        this.cleanupIdleAnimation(this.activeIdleAnimation);
        this.activeIdleAnimation = 'none';
      }
    } else if (this.isMusicDetected && (inputIntensity > 0.01 || outputIntensity > 0.01)) {
      // Music detected - use more dramatic reactions
      const musicData = inputIntensity > outputIntensity ? this.inputAnalyser.data : this.outputAnalyser.data;
      this.updateMusicVisuals(musicData, time, dt);
      if (this.activeIdleAnimation !== 'none') {
        this.cleanupIdleAnimation(this.activeIdleAnimation);
        this.activeIdleAnimation = 'none';
      }
    } else if (this.isIdle) {
      this.updateDramaticIdleAnimations(time, dt);
      this.updateIdleAnimation(dt, t);
      this.sphereMaterial.emissive.lerp(this.originalEmissiveColor, 0.05);
    } else {
      if (this.activeIdleAnimation !== 'none') {
        this.cleanupIdleAnimation(this.activeIdleAnimation);
        this.activeIdleAnimation = 'none';
        this.updateMaterialForVisuals();
      }
      this.resetGeometryTransforms();
      this.sphereMaterial.emissive.lerp(this.originalEmissiveColor, 0.05);
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
    this.lastHour = new Date().getHours();
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