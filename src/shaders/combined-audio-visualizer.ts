/**
 * Combined Audio Visualizer Shader
 * 
 * Merges Fresnel glow + Noise displacement for Codrops-inspired effect
 * Dual-mesh system: wireframe outer sphere + inner glow halo
 */

import { simplexNoise3D } from './simplex-noise-3d';
import * as THREE from 'three';

/**
 * Outer Wireframe Sphere Material
 * Spiky, audio-reactive with vertex noise displacement
 */
export function createWireframeMaterial(color: THREE.Color) {
  return new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      audioLevel: { value: 0 },
      distortion: { value: 1.0 },
      bassFreq: { value: 0 },
      midFreq: { value: 0 },
      highFreq: { value: 0 },
      color: { value: color },
    },
    wireframe: true,
    transparent: true,
    vertexShader: `
      ${simplexNoise3D}
      
      uniform float time;
      uniform float audioLevel;
      uniform float distortion;
      uniform float bassFreq;
      uniform float midFreq;
      uniform float highFreq;
      
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying float vDisplacement;

      void main() {
        vNormal = normalize(normalMatrix * normal);
        
        vec3 pos = position;
        
        // Multi-layered noise
        float noise1 = snoise(pos * 0.5 + vec3(0.0, 0.0, time * 0.3)) * bassFreq * 2.0;
        float noise2 = snoise(pos * 1.0 + vec3(time * 0.5, 0.0, 0.0)) * midFreq * 1.5;
        float noise3 = snoise(pos * 2.0 + vec3(0.0, time * 0.7, 0.0)) * highFreq * 1.0;
        
        float combinedNoise = noise1 + noise2 * 0.5 + noise3 * 0.25;
        float displacement = combinedNoise * distortion * (1.0 + audioLevel * 2.0);
        
        vec3 displacedPos = pos + normal * displacement;
        vPosition = (modelMatrix * vec4(displacedPos, 1.0)).xyz;
        vDisplacement = displacement;
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPos, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 color;
      uniform float time;
      uniform float audioLevel;
      
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying float vDisplacement;

      void main() {
        // Fresnel term for edge glow
        vec3 viewDir = normalize(cameraPosition - vPosition);
        float fresnel = 1.0 - max(0.0, dot(viewDir, vNormal));
        fresnel = pow(fresnel, 2.0 + audioLevel * 2.0);
        
        // Displacement-based glow
        float glowIntensity = abs(vDisplacement) * 0.5;
        
        // Pulsing
        float pulse = 0.8 + 0.2 * sin(time * 2.0);
        
        // Combined emissive
        vec3 emissive = color * fresnel * pulse * (1.0 + audioLevel * 0.8 + glowIntensity);
        float alpha = fresnel * (0.7 - audioLevel * 0.3);
        
        gl_FragColor = vec4(emissive, alpha);
      }
    `,
  });
}

/**
 * Inner Glow Halo Material
 * Smooth, pulsing aura with Fresnel effect
 */
export function createInnerGlowMaterial(color: THREE.Color) {
  return new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      audioLevel: { value: 0 },
      color: { value: color },
    },
    side: THREE.BackSide, // Render inner surface
    transparent: true,
    blending: THREE.AdditiveBlending, // Glowing effect
    depthWrite: false,
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vPosition;

      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 color;
      uniform float time;
      uniform float audioLevel;
      
      varying vec3 vNormal;
      varying vec3 vPosition;

      void main() {
        // Fresnel for inner glow
        vec3 viewDir = normalize(cameraPosition - vPosition);
        float fresnel = 1.0 - abs(dot(viewDir, vNormal));
        fresnel = pow(fresnel, 3.0);
        
        // Audio-reactive pulsing
        float pulse = 0.5 + 0.5 * sin(time * 1.5 + audioLevel * 10.0);
        
        // Emissive halo
        vec3 emissive = color * fresnel * pulse * (1.0 + audioLevel * 2.0);
        float alpha = fresnel * (0.3 + audioLevel * 0.4);
        
        gl_FragColor = vec4(emissive, alpha);
      }
    `,
  });
}

/**
 * Update shader uniforms with audio data
 */
export function updateAudioVisualizerShaders(
  wireframeMaterial: THREE.ShaderMaterial,
  glowMaterial: THREE.ShaderMaterial,
  time: number,
  audioLevel: number,
  bassFreq: number,
  midFreq: number,
  highFreq: number
): void {
  // Update wireframe material
  wireframeMaterial.uniforms.time.value = time;
  wireframeMaterial.uniforms.audioLevel.value = audioLevel;
  wireframeMaterial.uniforms.bassFreq.value = bassFreq;
  wireframeMaterial.uniforms.midFreq.value = midFreq;
  wireframeMaterial.uniforms.highFreq.value = highFreq;
  
  // Update glow material
  glowMaterial.uniforms.time.value = time;
  glowMaterial.uniforms.audioLevel.value = audioLevel;
}
