import * as THREE from 'three';

// The world is only points. Where the scan is dense they are small hard dots;
// where it thins they grow and soften until they meet, so surfaces close up
// while the torn holes stay open. Focus falls off like a lens: what is looked
// at stays sharp, nearer and farther points swell and pale. The far end sinks
// into a cold haze rather than plain black, the screens light what is in
// front of them, and one stretch of the strip light stutters.

export const LIGHTS = 4;

const vertexShader = /* glsl */ `
  #define LIGHTS ${LIGHTS}
  attribute vec3 tint;
  attribute float gap;
  uniform float uTime;
  uniform float uScale;
  uniform float uSize;
  uniform float uMaxSize;
  uniform float uMinSize;
  uniform float uGapFill;
  uniform float uFocus;
  uniform float uBlur;
  uniform float uGather;
  uniform float uFogNear;
  uniform float uFogDensity;
  uniform vec3 uFogColor;
  uniform vec2 uNearFade;
  uniform float uKeep;
  uniform float uDim;
  uniform float uDrift;
  uniform float uExposure;
  uniform vec3 uTone;
  uniform vec3 uFlicker;
  uniform vec3 uStrip;
  uniform vec3 uLightOrigin[LIGHTS];
  uniform vec3 uLightNormal[LIGHTS];
  uniform float uLightStrength[LIGHTS];
  varying vec3 vColor;
  varying float vAlpha;
  varying float vSoft;

  float hash(float n) { return fract(sin(n) * 43758.5453123); }

  void main() {
    float id = float(gl_VertexID);
    float h = hash(id * 0.618);
    vec3 drift = vec3(hash(id + 1.0), hash(id + 2.0), hash(id + 3.0)) - 0.5;
    vec3 p = position;
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
    // Its own size, or as wide as the gap to its neighbours, whichever is
    // larger; then the lens: the further from focus, the wider and fainter.
    float sharp = max(uSize * (0.55 + h * 0.9), gap * uGapFill) * uScale / depth;
    float blur = uBlur * abs(1.0 / depth - 1.0 / uFocus) * uScale;
    float size = clamp(sharp + blur, uMinSize, uMaxSize);
    gl_PointSize = size;
    float spread = clamp(sharp * sharp / (size * size), 0.06, 1.0);
    vSoft = clamp((size - 2.5) / 7.0, 0.0, 1.0);

    vec3 c = tint;
    float l = dot(c, vec3(0.299, 0.587, 0.114));
    vColor = mix(vec3(l) * uTone, c, uKeep) * uExposure;
    vec3 world = (modelMatrix * vec4(position, 1.0)).xyz;
    // The strip light: bright points along the middle of the ceiling. In one
    // stretch of it the tube stutters.
    float tube = smoothstep(1.9, 2.05, world.y) * (1.0 - smoothstep(0.25, 0.45, abs(world.x - 0.07))) * smoothstep(0.65, 0.85, l);
    float stretch = 1.0 - smoothstep(uFlicker.y * 0.8, uFlicker.y, abs(world.z - uFlicker.x));
    vColor *= mix(1.0, uFlicker.z, tube * stretch);
    // The scan was lit evenly; here the light comes from the tube. The roof
    // and the upper walls catch it, the seats less, the floor sinks into
    // shadow, and where the tube stutters the whole stretch goes with it.
    if (uStrip.z > 0.0) {
      float reach = length(world.xy - uStrip.xy);
      float light = mix(1.0, 0.28 + 0.72 / (1.0 + reach * reach * 0.9), uStrip.z);
      vColor *= light * mix(1.0, 0.35 + 0.65 * uFlicker.z, stretch);
    }
    // Screens light what is in front of them: the hands, the face, the seat.
    for (int i = 0; i < LIGHTS; i++) {
      vec3 d = world - uLightOrigin[i];
      float facing = max(0.0, dot(normalize(d), uLightNormal[i]));
      vColor += vec3(0.62, 0.74, 0.95) * uLightStrength[i] * (0.25 + 0.75 * facing) / (1.0 + dot(d, d) * 9.0);
    }
    // Haze: the further, the more the colour gives way to the cold dark.
    float fog = 1.0 - exp(-max(0.0, depth - uFogNear) * uFogDensity);
    vColor = mix(vColor, uFogColor, fog);
    vAlpha = (1.0 - fog * 0.55) * spread * smoothstep(uNearFade.x, uNearFade.y, length(mv.xyz)) * arrive * uDim;
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  varying float vSoft;
  void main() {
    float r = length(gl_PointCoord - 0.5);
    if (r > 0.5) discard;
    // Small points are hard dots, a scan's; large ones, grown to fill a gap
    // or swollen out of focus, are soft discs that blend into their
    // neighbours.
    float a = smoothstep(0.5, mix(0.38, 0.0, vSoft), r) * vAlpha;
    gl_FragColor = vec4(vColor, a);
  }
`;

export function createPoints({ positions, colors, count, gaps }) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('tint', new THREE.BufferAttribute(colors, 3, true));
  geometry.setAttribute('gap', new THREE.BufferAttribute(gaps || new Float32Array(count), 1));
  geometry.setDrawRange(0, count);
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uScale: { value: 1 },
      uSize: { value: 0.03 },
      uMaxSize: { value: 16 },
      uMinSize: { value: 1 },
      uGapFill: { value: 0 },
      uFocus: { value: 3 },
      uBlur: { value: 0 },
      uGather: { value: 0 },
      uFogNear: { value: 2 },
      uFogDensity: { value: 0.1 },
      uFogColor: { value: new THREE.Color(0, 0, 0) },
      uNearFade: { value: new THREE.Vector2(0.2, 0.8) },
      uKeep: { value: 0.5 },
      uDim: { value: 1 },
      uDrift: { value: 0.004 },
      uExposure: { value: 1 },
      uTone: { value: new THREE.Color(0.82, 0.88, 1.05) },
      uFlicker: { value: new THREE.Vector3(0, 0, 1) },
      uStrip: { value: new THREE.Vector3(0, 2.1, 0) },
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
}
