import * as THREE from 'three';

// The world is only points: soft round dust that fades into the dark with
// distance, breathes a little in place, gathers out of nothing on arrival
// and scatters out of the way as the camera passes through. Colour comes
// from the scan, pulled toward one cold tone so the place reads as a memory.

const vertexShader = /* glsl */ `
  attribute vec3 tint;
  uniform float uTime;
  uniform float uScale;
  uniform float uSize;
  uniform float uMaxSize;
  uniform float uGather;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform vec3 uTone;
  varying vec3 vColor;
  varying float vAlpha;

  float hash(float n) { return fract(sin(n) * 43758.5453123); }

  void main() {
    float id = float(gl_VertexID);
    float h = hash(id * 0.618);
    vec3 drift = vec3(hash(id + 1.0), hash(id + 2.0), hash(id + 3.0)) - 0.5;
    vec3 p = position;
    // Breathing: each point circles slowly on its own phase.
    p += 0.018 * vec3(sin(uTime * 0.5 + h * 40.0), sin(uTime * 0.37 + h * 70.0), cos(uTime * 0.43 + h * 20.0));
    // Arrival: points come in from scattered places, the far ones last.
    float arrive = smoothstep(h * 0.6, h * 0.6 + 0.4, uGather);
    p += drift * 6.0 * (1.0 - arrive);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    // Points close to the camera part around it rather than filling the view.
    float close = 1.0 - smoothstep(0.25, 1.6, length(mv.xyz));
    mv.xyz += normalize(mv.xyz + drift * 0.6) * close * 0.5;
    gl_Position = projectionMatrix * mv;

    float depth = max(0.05, -mv.z);
    gl_PointSize = min(uSize * uScale * (0.55 + h * 0.9) / depth, uMaxSize);

    vec3 c = tint;
    float l = dot(c, vec3(0.299, 0.587, 0.114));
    vColor = mix(vec3(l) * uTone, c, 0.5);
    // Fog far away, and nothing right at the lens: what the camera passes
    // through thins to nothing instead of blooming across the view.
    vAlpha = (1.0 - smoothstep(uFogNear, uFogFar, depth)) * smoothstep(0.2, 0.8, length(mv.xyz)) * arrive;
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
      uTone: { value: new THREE.Color(0.82, 0.88, 1.05) },
    },
    transparent: true,
    depthWrite: false,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return points;
}

// Point size is in metres; this turns it into pixels for the current view.
export function setPointScale(points, camera, height, pixelRatio) {
  points.material.uniforms.uScale.value = height * pixelRatio / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
  points.material.uniforms.uMaxSize.value = 16 * pixelRatio;
}
