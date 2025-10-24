/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
const vs = `precision highp float;

in vec3 position;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
}`;

const fs = `precision highp float;

out vec4 fragmentColor;

uniform vec2 resolution;
uniform float time;
uniform vec3 moodColor;

// 2D Random
float random (in vec2 st) {
    return fract(sin(dot(st.xy,
                         vec2(12.9898,78.233)))
                 * 43758.5453123);
}

// 2D Noise based on Morgan McGuire @morgan3d
// https://www.shadertoy.com/view/4dS3Wd
float noise (in vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);

    // Four corners in 2D of a tile
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));

    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(a, b, u.x) +
            (c - a)* u.y * (1.0 - u.x) +
            (d - b) * u.x * u.y;
}


void main() {
  float aspectRatio = resolution.x / resolution.y; 
  vec2 vUv = gl_FragCoord.xy / resolution;

  vUv -= .5;
  vUv.x *= aspectRatio;

  // Create a more dynamic, multi-layered noise for the background
  vec2 pos = vUv * 3.0 + vec2(time * 0.1, time * 0.05);
  float n = noise(pos) * 0.5 + noise(pos * 2.0) * 0.25 + noise(pos * 4.0) * 0.125;
  n = pow(n, 1.2);

  float factor = 4.;
  float d = factor * length(vUv);
  vec3 from = vec3(3., 3., 5.) / 255.;
  vec3 to = vec3(16., 12., 20.) / 255.;

  vec3 baseColor = mix(from, to, d);
  
  // Blend the base color with the mood color - Increased from 0.2 to 0.8
  vec3 finalColor = mix(baseColor, moodColor, 0.8);

  fragmentColor = vec4(finalColor + .05 * n, 1.);
}
`;

export {fs, vs};
