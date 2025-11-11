/**
 * Noise Displacement Shader
 * 
 * Vertex displacement using 3D Simplex noise for audio-reactive spikes
 * From Codrops 3D Audio Visualizer article
 */

import { simplexNoise3D } from './simplex-noise-3d';

export interface NoiseDisplacementUniforms {
  time: { value: number };
  audioLevel: { value: number };
  distortion: { value: number };
  bassFreq: { value: number };
  midFreq: { value: number };
  highFreq: { value: number };
}

export const noiseDisplacementVertexShader = `
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
    
    // Multi-layered noise for rich detail
    vec3 pos = position;
    
    // Low-frequency noise driven by bass
    float noise1 = snoise(pos * 0.5 + vec3(0.0, 0.0, time * 0.3));
    noise1 *= bassFreq * 2.0;
    
    // Mid-frequency noise
    float noise2 = snoise(pos * 1.0 + vec3(time * 0.5, 0.0, 0.0));
    noise2 *= midFreq * 1.5;
    
    // High-frequency detail
    float noise3 = snoise(pos * 2.0 + vec3(0.0, time * 0.7, 0.0));
    noise3 *= highFreq * 1.0;
    
    // Combine noise layers
    float combinedNoise = noise1 + noise2 * 0.5 + noise3 * 0.25;
    
    // Apply distortion and audio level
    float displacement = combinedNoise * distortion * (1.0 + audioLevel * 2.0);
    
    // Displace vertex along normal (creates spikes)
    vec3 displacedPos = pos + normal * displacement;
    
    vPosition = (modelMatrix * vec4(displacedPos, 1.0)).xyz;
    vDisplacement = displacement;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPos, 1.0);
  }
`;

export const noiseDisplacementFragmentShader = `
  uniform vec3 color;
  uniform float time;
  uniform float audioLevel;
  
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vDisplacement;

  void main() {
    // Color modulation based on displacement (spikes glow brighter)
    float glowIntensity = abs(vDisplacement) * 0.5;
    
    // Pulsing effect
    float pulse = 0.8 + 0.2 * sin(time * 3.0);
    
    // Audio-reactive brightness
    vec3 emissive = color * (1.0 + glowIntensity + audioLevel * 0.5) * pulse;
    
    gl_FragColor = vec4(emissive, 0.8);
  }
`;
