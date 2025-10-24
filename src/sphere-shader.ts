/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
const vs = `#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
  varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>

uniform float time;
uniform float idleTime;

uniform vec4 inputData;
uniform vec4 outputData;
uniform float listeningIntensity;
uniform float jiggleIntensity;

vec3 calc( vec3 pos ) {

  vec3 dir = normalize( pos );
  
  // Subtle idle "breathing" animation with two layers of noise for more organic feel
  float idleDeform1 = 0.05 * sin(pos.y * 5.0 + idleTime * 2.0) * cos(pos.x * 3.0 + idleTime * 1.5);
  float idleDeform2 = 0.03 * sin(pos.z * 7.0 + idleTime * 1.1) * cos(pos.y * 4.0 + idleTime * 2.2);

  
  // Deformation from AI's output voice
  float outputDeform = 1. * outputData.x * outputData.y * (.5 + .5 * sin(outputData.z * pos.y + time));

  // Jiggle effect for hourly transition
  float jiggleDeform = jiggleIntensity * 0.1 * sin(idleTime * 50.0) * cos(idleTime * 30.0 + pos.y * 10.0);

  return pos + dir * (idleDeform1 + idleDeform2 + outputDeform + jiggleDeform);
}

vec3 spherical( float r, float theta, float phi ) {
  return r * vec3(
    cos( theta ) * cos( phi ),
    sin( theta ) * cos( phi ),
    sin( phi )
  );
}

void main() {
  #include <uv_vertex>
  #include <color_vertex>
  #include <morphinstance_vertex>
  #include <morphcolor_vertex>
  #include <batching_vertex>
  #include <beginnormal_vertex>
  #include <morphnormal_vertex>
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  #include <defaultnormal_vertex>
  #include <normal_vertex>
  #include <begin_vertex>

  float inc = 0.001;

  float r = length( position );
  float theta = ( uv.x + 0.5 ) * 2. * PI;
  float phi = -( uv.y + 0.5 ) * PI;

  vec3 np = calc( spherical( r, theta, phi )  );

  vec3 tangent = normalize( calc( spherical( r, theta + inc, phi ) ) - np );
  vec3 bitangent = normalize( calc( spherical( r, theta, phi + inc ) ) - np );
  transformedNormal = -normalMatrix * normalize( cross( tangent, bitangent ) );

  vNormal = normalize( transformedNormal );

  transformed = np;

  #include <morphtarget_vertex>
  #include <skinning_vertex>
  #include <displacementmap_vertex>
  #include <project_vertex>
  #include <logdepthbuf_vertex>
  #include <clipping_planes_vertex>
  vViewPosition = - mvPosition.xyz;
  #include <worldpos_vertex>
  #include <shadowmap_vertex>
  #include <fog_vertex>
  #ifdef USE_TRANSMISSION
    vWorldPosition = worldPosition.xyz;
  #endif
}`;

export {vs};
