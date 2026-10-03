import * as THREE from 'three';

// The world is only points: soft round dust that fades into the dark with
// distance, breathes a little in place, gathers out of nothing on arrival
// and scatters out of the way as the camera passes through. Colour comes
// from the scan, pulled toward one cold tone so the place reads as a memory.

export const LIGHTS = 4;

const vertexShader = /* glsl */ `
  #define LIGHTS ${LIGHTS}
  attribute vec3 tint;
  uniform float uTime;
  uniform float uScale;
  uniform float uSize;
  uniform float uMaxSize;
  uniform float uGather;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform vec2 uNearFade;
  uniform float uKeep;
  uniform float uDim;
  uniform float uDrift;
  uniform float uExposure;
  uniform float uMinSize;
  uniform vec3 uTone;
  uniform vec3 uLightOrigin[LIGHTS];
  uniform vec3 uLightNormal[LIGHTS];
  uniform float uLightStrength[LIGHTS];
  varying vec3 vColor;
  varying float vAlpha;

  float hash(float n) { return fract(sin(n) * 43758.5453123); }

  void main() {
    float id = float(gl_VertexID);
    float h = hash(id * 0.618);
    vec3 drift = vec3(hash(id + 1.0), hash(id + 2.0), hash(id + 3.0)) - 0.5;
    vec3 p = position;
    // Breathing: each point drifts slowly round its place on its own phase,
    // like dust hanging in the light.
    p += uDrift * vec3(sin(uTime * 0.21 + h * 40.0), sin(uTime * 0.17 + h * 70.0), cos(uTime * 0.19 + h * 20.0));
    // Arrival: points come in from scattered places, the far ones last.
    float arrive = smoothstep(h * 0.6, h * 0.6 + 0.4, uGather);
    p += drift * 6.0 * (1.0 - arrive);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    // Points close to the camera part around it rather than filling the view.
    float close = (1.0 - smoothstep(0.25, 1.6, length(mv.xyz))) * step(0.5, uNearFade.y);
    mv.xyz += normalize(mv.xyz + drift * 0.6) * close * 0.5;
    gl_Position = projectionMatrix * mv;

    float depth = max(0.05, -mv.z);
    // A scan's points stay small at any distance: density draws the image,
    // not the size of each dot.
    gl_PointSize = clamp(uSize * uScale * (0.55 + h * 0.9) / depth, uMinSize, uMaxSize);

    vec3 c = tint;
    float l = dot(c, vec3(0.299, 0.587, 0.114));
    vColor = mix(vec3(l) * uTone, c, uKeep) * uExposure;
    // Screens light what is in front of them: the hands, the face, the seat.
    vec3 world = (modelMatrix * vec4(position, 1.0)).xyz;
    for (int i = 0; i < LIGHTS; i++) {
      vec3 d = world - uLightOrigin[i];
      float facing = max(0.0, dot(normalize(d), uLightNormal[i]));
      vColor += vec3(0.62, 0.74, 0.95) * uLightStrength[i] * (0.25 + 0.75 * facing) / (1.0 + dot(d, d) * 9.0);
    }
    // Fog far away, and nothing right at the lens: what the camera passes
    // through thins to nothing instead of blooming across the view.
    vAlpha = (1.0 - smoothstep(uFogNear, uFogFar, depth)) * smoothstep(uNearFade.x, uNearFade.y, length(mv.xyz)) * arrive * uDim;
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float r = length(gl_PointCoord - 0.5);
    if (r > 0.5) discard;
    float a = smoothstep(0.5, 0.05, r) * vAlpha;
    gl_FragColor = vec4(vColor, a);
  }
`;

export function createPoints({ positions, colors, count }) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('tint', new THREE.BufferAttribute(colors, 3, true));
  geometry.setDrawRange(0, count);
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uScale: { value: 1 },
      uSize: { value: 0.03 },
      uMaxSize: { value: 16 },
      uGather: { value: 0 },
      uFogNear: { value: 2 },
      uFogFar: { value: 22 },
      uNearFade: { value: new THREE.Vector2(0.2, 0.8) },
      uKeep: { value: 0.5 },
      uDim: { value: 1 },
      uDrift: { value: 0.018 },
      uExposure: { value: 1 },
      uMinSize: { value: 1 },
      uTone: { value: new THREE.Color(0.82, 0.88, 1.05) },
      uLightOrigin: { value: Array.from({ length: LIGHTS }, () => new THREE.Vector3()) },
      uLightNormal: { value: Array.from({ length: LIGHTS }, () => new THREE.Vector3(0, 0, 1)) },
      uLightStrength: { value: new Array(LIGHTS).fill(0) },
    },
    transparent: true,
    depthWrite: false,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return points;
}

// Each lit screen as a light: where it is, which way it faces, how bright.
export function setScreenLights(points, lights) {
  const { uLightOrigin, uLightNormal, uLightStrength } = points.material.uniforms;
  lights.slice(0, LIGHTS).forEach((light, i) => {
    uLightOrigin.value[i].copy(light.origin);
    uLightNormal.value[i].copy(light.normal);
    uLightStrength.value[i] = light.strength;
  });
}

// Point size is in metres; this turns it into pixels for the current view.
export function setPointScale(points, camera, height, pixelRatio) {
  points.material.uniforms.uScale.value = height * pixelRatio / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
  points.material.uniforms.uMaxSize.value = 4.5 * pixelRatio;
}
