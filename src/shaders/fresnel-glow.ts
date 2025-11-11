/**
 * Fresnel Glow Shader
 * 
 * Creates edge-glow effect based on viewing angle
 * From Codrops 3D Audio Visualizer article
 * Audio-reactive intensity modulation
 */

import { simplexNoise3D } from './simplex-noise-3d';
import * as THREE from 'three';

export interface FresnelGlowUniforms {
  time: { value: number };
  audioLevel: { value: number };
  color: { value: THREE.Color };
  fresnelPower: { value: number };
}

export const fresnelGlowVertexShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vViewDir;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vPosition = worldPosition.xyz;
    vViewDir = normalize(cameraPosition - worldPosition.xyz);
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const fresnelGlowFragmentShader = `
  uniform vec3 color;
  uniform float time;
  uniform float audioLevel;
  uniform float fresnelPower;
  
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vViewDir;

  void main() {
    // Calculate Fresnel term (rim lighting)
    float fresnel = 1.0 - max(0.0, dot(vViewDir, vNormal));
    
    // Modulate Fresnel power with audio (sharper glow when loud)
    float dynamicPower = fresnelPower + audioLevel * 2.0;
    fresnel = pow(fresnel, dynamicPower);
    
    // Pulsing effect synchronized with audio
    float pulse = 0.8 + 0.2 * sin(time * 2.0 + audioLevel * 5.0);
    
    // Audio-reactive brightness boost
    float intensity = fresnel * pulse * (1.0 + audioLevel * 0.8);
    
    // Emissive color with alpha fade
    vec3 emissive = color * intensity;
    float alpha = fresnel * (0.7 - audioLevel * 0.3);
    
    gl_FragColor = vec4(emissive, alpha);
  }
`;
