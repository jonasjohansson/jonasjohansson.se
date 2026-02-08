import { grainParams, updateGrain as updateGrainFromModule } from "./grain.js";
import shaderSettings from "./config/shader-settings.json";

// Enable/disable shader GUI - set to true to enable GUI controls
const ENABLE_GUI = false;

const simplexNoiseSource = `
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
  float snoise(vec3 v){ 
    const vec2  C = vec2(1.0/6.0, 1.0/3.0);
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute( permute( permute( i.z + vec4(0.0, i1.z, i2.z, 1.0 )) + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
    float n_ = 0.142857142857;
    vec3  ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
  }
  float snoise2D(vec2 v) { return snoise(vec3(v, 0.0)); }
`;

const vertexShaderSource = `#version 300 es
  in vec2 a_position;
  void main() { gl_Position = vec4(a_position, 0, 1); }
`;

const fragmentCommon = `
  precision highp float;
  out vec4 outColor;
  uniform vec2 u_resolution;
  uniform float u_time;
  uniform vec2 u_center;
  uniform float u_scale;
  uniform float u_scaleX;
  uniform float u_scaleY;
  uniform float u_blur;
  uniform float u_feather;
  uniform float u_flowSpeed;
  uniform float u_flowAmount;
  uniform vec2 u_flowDir;
  uniform float u_noiseScale;
  uniform float u_waveHeight;
  uniform float u_waveSpeed;
  uniform vec2 u_position;
  uniform float u_layerOpacity;
  uniform float u_patternScale;
  uniform float u_patternSpeed;
  uniform float u_patternRotation;
  uniform vec2 u_patternOffset;
  uniform float u_patternIntensity;
  uniform float u_patternContrast;
  uniform float u_patternTurbulence;
  uniform float u_shape;
  uniform vec3 u_colorStop1;
  uniform vec3 u_colorStop2;
  uniform vec3 u_colorStop3;
  uniform vec3 u_colorStop4;
  uniform vec3 u_colorStop5;
  uniform float u_stopPos1;
  uniform float u_stopPos2;
  uniform float u_stopPos3;
  uniform float u_stopPos4;
  uniform float u_stopPos5;
  uniform float u_controlPoint0;
  uniform float u_controlPoint1;
  uniform float u_controlPoint2;
  uniform float u_controlPoint3;
  uniform float u_controlPoint4;
  uniform float u_controlPoint5;
  uniform float u_controlPoint6;
  uniform float u_controlPoint7;
  uniform float u_controlPoint8;
  uniform float u_controlPoint9;
  uniform float u_brightness;
  uniform float u_contrast;
  ${simplexNoiseSource}
  float cubicBezier(float t, float p0, float p1, float p2, float p3) {
    float oneMinusT = 1.0 - t;
    float omt2 = oneMinusT * oneMinusT;
    float omt3 = omt2 * oneMinusT;
    float t2 = t * t;
    float t3 = t2 * t;
    return omt3 * p0 + 3.0 * omt2 * t * p1 + 3.0 * oneMinusT * t2 * p2 + t3 * p3;
  }
  float getBlobRadius(float angle) {
    angle = angle - floor(angle * 0.159155) * 6.28318;
    if (angle < 0.0) angle += 6.28318;
    const float pointSpacing = 0.628318;
    const float invSpacing = 1.59155;
    int pointIndex = int(angle * invSpacing);
    float localT = (angle - float(pointIndex) * pointSpacing) * invSpacing;
    float p0, p1, p2, p3, prevP;
    if (pointIndex == 0) { p0 = u_controlPoint0; p1 = u_controlPoint1; p2 = u_controlPoint2; p3 = u_controlPoint3; prevP = u_controlPoint9; }
    else if (pointIndex == 1) { p0 = u_controlPoint1; p1 = u_controlPoint2; p2 = u_controlPoint3; p3 = u_controlPoint4; prevP = u_controlPoint0; }
    else if (pointIndex == 2) { p0 = u_controlPoint2; p1 = u_controlPoint3; p2 = u_controlPoint4; p3 = u_controlPoint5; prevP = u_controlPoint1; }
    else if (pointIndex == 3) { p0 = u_controlPoint3; p1 = u_controlPoint4; p2 = u_controlPoint5; p3 = u_controlPoint6; prevP = u_controlPoint2; }
    else if (pointIndex == 4) { p0 = u_controlPoint4; p1 = u_controlPoint5; p2 = u_controlPoint6; p3 = u_controlPoint7; prevP = u_controlPoint3; }
    else if (pointIndex == 5) { p0 = u_controlPoint5; p1 = u_controlPoint6; p2 = u_controlPoint7; p3 = u_controlPoint8; prevP = u_controlPoint4; }
    else if (pointIndex == 6) { p0 = u_controlPoint6; p1 = u_controlPoint7; p2 = u_controlPoint8; p3 = u_controlPoint9; prevP = u_controlPoint5; }
    else if (pointIndex == 7) { p0 = u_controlPoint7; p1 = u_controlPoint8; p2 = u_controlPoint9; p3 = u_controlPoint0; prevP = u_controlPoint6; }
    else if (pointIndex == 8) { p0 = u_controlPoint8; p1 = u_controlPoint9; p2 = u_controlPoint0; p3 = u_controlPoint1; prevP = u_controlPoint7; }
    else { p0 = u_controlPoint9; p1 = u_controlPoint0; p2 = u_controlPoint1; p3 = u_controlPoint2; prevP = u_controlPoint8; }
    float cp1 = p0 + (p1 - prevP) * 0.3;
    float cp2 = p1 - (p2 - p0) * 0.3;
    return cubicBezier(localT, p0, cp1, cp2, p1);
  }
  float blobNoise(vec2 p, float time) {
    const float L = 0.0018; const float S = 0.04; const float F = 0.043;
    float t1 = F * time; float t2 = time * S * 1.26; float t3 = time * S * 1.09; float t4 = time * S * 0.89;
    float ft126 = t1 * 1.26; float ft109 = t1 * 1.09; float ft089 = t1 * 0.89;
    float noise = 0.0;
    noise += snoise2D(p * 0.0018 + vec2(t1, 0.0)) * 0.85;
    noise += snoise2D(p * 0.0013846 + vec2(ft126, t2)) * 1.15;
    noise += snoise2D(p * 0.0009677 + vec2(ft109, t3)) * 0.60;
    noise += snoise2D(p * 0.0005538 + vec2(ft089, t4)) * 0.40;
    return noise;
  }
  float backgroundNoise(vec2 p, float time, float offset) {
    const float L = 0.0015; const float S = 0.13; const float Y_SCALE = 3.0; const float F = 0.11;
    float t = time + offset; float tS = t * S; float x = p.x * L; float y = p.y * L * Y_SCALE;
    float noise = 0.5;
    noise += snoise(vec3(x + F * t, y, tS)) * 0.30;
    noise += snoise(vec3(x * 0.6 + F * t * 0.6, y * 0.85, tS)) * 0.26;
    noise += snoise(vec3(x * 0.4 + F * t * 0.8, y * 0.70, tS)) * 0.22;
    float turbulence = u_patternTurbulence;
    if (turbulence > 0.0) {
      vec2 turbCoord = p * 0.003 + vec2(time * 0.05, time * 0.07);
      vec2 turb = vec2(snoise2D(turbCoord), snoise2D(turbCoord + vec2(100.0, 0.0))) * turbulence * 50.0;
      noise += snoise(vec3((x + turb.x) * 0.8 + F * t * 0.9, (y + turb.y) * 0.75, tS * 0.85)) * 0.15 * turbulence;
    }
    noise = clamp(noise, 0.0, 1.0);
    float contrast = u_patternContrast;
    noise = (noise - 0.5) * contrast + 0.5;
    return clamp(noise, 0.0, 1.0);
  }
  vec2 rotate2D(vec2 v, float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return vec2(v.x * c - v.y * s, v.x * s + v.y * c);
  }
  float smoothstep5(float t) {
    float t2 = t * t; float t3 = t2 * t; return t3 * (t * (6.0 * t - 15.0) + 10.0);
  }
  vec3 gradientColor(float t) {
    if (t <= u_stopPos1) return u_colorStop1; if (t >= u_stopPos5) return u_colorStop5;
    if (t <= u_stopPos2) { float range = u_stopPos2 - u_stopPos1; float localT = max(0.0, (t - u_stopPos1)) / max(0.0001, range); return mix(u_colorStop1, u_colorStop2, localT); }
    else if (t <= u_stopPos3) { float range = u_stopPos3 - u_stopPos2; float localT = max(0.0, (t - u_stopPos2)) / max(0.0001, range); return mix(u_colorStop2, u_colorStop3, localT); }
    else if (t <= u_stopPos4) { float range = u_stopPos4 - u_stopPos3; float localT = max(0.0, (t - u_stopPos3)) / max(0.0001, range); return mix(u_colorStop3, u_colorStop4, localT); }
    else { float range = u_stopPos5 - u_stopPos4; float localT = max(0.0, (t - u_stopPos4)) / max(0.0001, range); return mix(u_colorStop4, u_colorStop5, localT); }
  }
`;

const fragmentShaderSource = `#version 300 es\n${fragmentCommon}\n  void main(){ vec2 uv = gl_FragCoord.xy; vec2 p = (uv - u_center - u_position) / vec2(u_scaleX, u_scaleY); float time = u_time * u_waveSpeed; float metaballField = 0.0; float baseRadius = 300.0; int numBlobs = 5; for(int i = 0; i < numBlobs; i++) { float angle = float(i) * 2.0 * 3.14159 / float(numBlobs) + time * 0.1; float radius = baseRadius * (0.8 + 0.4 * sin(time * 0.3 + float(i))); vec2 blobCenter = vec2(cos(angle) * 400.0, sin(angle) * 300.0 + sin(time * 0.2 + float(i)) * 200.0); float dist = length(p - blobCenter); float blobField = radius / (dist + 0.1); metaballField += blobField; } float noise = blobNoise(p * u_noiseScale * 0.5, time); metaballField += noise * u_waveHeight * 0.1; float threshold = 0.6; float baseAlpha = smoothstep(threshold - u_blur * 0.01, threshold + u_blur * 0.01, metaballField); baseAlpha = smoothstep5(clamp(baseAlpha, 0.0, 1.0)); float minAlpha = 0.5; float alpha = minAlpha + (1.0 - minAlpha) * baseAlpha; vec2 flowOffset = u_flowDir * (u_time * u_flowAmount * u_flowSpeed * 10.0); vec2 patternP = rotate2D((p + u_patternOffset) * u_patternScale, u_patternRotation); float noiseValue = backgroundNoise(patternP + flowOffset, u_time * u_patternSpeed, 0.0); float positionValue = (uv.y / u_resolution.y) * 0.4 + (uv.x / u_resolution.x) * 0.3 + 0.3; noiseValue = mix(positionValue, noiseValue, u_patternIntensity); noiseValue = clamp(noiseValue, 0.0, 1.0); vec3 color = gradientColor(noiseValue); color = color + u_brightness; color = (color - 0.5) * u_contrast + 0.5; color = clamp(color, 0.0, 1.0); alpha *= u_layerOpacity; outColor = vec4(color, alpha); }`;

function createShader(glctx, type, source) {
  const shader = glctx.createShader(type);
  glctx.shaderSource(shader, source);
  glctx.compileShader(shader);
  if (!glctx.getShaderParameter(shader, glctx.COMPILE_STATUS)) {
    console.error("Shader compilation error:", glctx.getShaderInfoLog(shader));
    glctx.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(glctx, vertexShader, fragmentShader) {
  const program = glctx.createProgram();
  glctx.attachShader(program, vertexShader);
  glctx.attachShader(program, fragmentShader);
  glctx.linkProgram(program);
  if (!glctx.getProgramParameter(program, glctx.LINK_STATUS)) {
    console.error("Program linking error:", glctx.getProgramInfoLog(program));
    glctx.deleteProgram(program);
    return null;
  }
  return program;
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [parseInt(result[1], 16) / 255, parseInt(result[2], 16) / 255, parseInt(result[3], 16) / 255] : [1, 1, 1];
}

// Default params template
function createDefaultParams() {
  return {
    colorStop1: "#FFF8A0",
    colorStop2: "#87CEEB",
    colorStop3: "#FF8C42",
    colorStop4: "#FF6B35",
    colorStop5: "#D44226",
    stopPos1: 0.0,
    stopPos2: 0.3,
    stopPos3: 0.6,
    stopPos4: 0.85,
    stopPos5: 1.0,
    positionX: 0,
    positionY: 0,
    positionMode: "relative",
    positionPercentX: 0.0,
    positionPercentY: 0.0,
    controlPoint0: 0.0,
    controlPoint1: 20.0,
    controlPoint2: 15.0,
    controlPoint3: 0.0,
    controlPoint4: -10.0,
    controlPoint5: -15.0,
    controlPoint6: -10.0,
    controlPoint7: 0.0,
    controlPoint8: 15.0,
    controlPoint9: 20.0,
    scaleX: 0.75,
    scaleY: 0.75,
    blur: 80.0,
    feather: 40.0,
    flowSpeed: 0.1,
    flowAmount: 0.5,
    flowAngle: 0,
    layerOpacity: 0.7,
    noiseScale: 1.0,
    waveHeight: 50.0,
    waveSpeed: 0.1,
    patternScale: 0.5,
    patternSpeed: 1.0,
    patternRotation: 0.0,
    patternOffsetX: 0.0,
    patternOffsetY: 0.0,
    patternIntensity: 0.8,
    patternContrast: 1.0,
    patternTurbulence: 0.0,
    globalBlur: 0.0,
    enabled: true,
    blendMode: "screen",
    shape: 1.0, // 1.0 = circle, 0.0 = square
    grainOpacity: 0.1,
    grainScale: 1.0,
    grainBlend: "screen",
    brightness: 0.0,
    contrast: 1.0,
  };
}

let gui = null;
let shaderInstances = [];

// ShaderInstance class
class ShaderInstance {
  constructor(canvasId, config = {}) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      console.error(`Shader canvas ${canvasId} not found`);
      return;
    }

    this.params = createDefaultParams();
    // Apply config overrides
    Object.assign(this.params, config);

    this.gl = this.canvas.getContext("webgl2") || this.canvas.getContext("webgl");
    if (!this.gl) {
      console.error("WebGL not supported");
      return;
    }

    this.canvas.style.display = "block";
    this.canvas.style.visibility = "visible";

    const vertexShader = createShader(this.gl, this.gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(this.gl, this.gl.FRAGMENT_SHADER, fragmentShaderSource);
    this.program = createProgram(this.gl, vertexShader, fragmentShader);
    if (!this.program) {
      console.error("Failed to create WebGL program");
      return;
    }

    // Fullscreen quad
    this.positionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), this.gl.STATIC_DRAW);

    // Get uniform locations
    this.positionLocation = this.gl.getAttribLocation(this.program, "a_position");
    this.resolutionLocation = this.gl.getUniformLocation(this.program, "u_resolution");
    this.timeLocation = this.gl.getUniformLocation(this.program, "u_time");
    this.centerLocation = this.gl.getUniformLocation(this.program, "u_center");
    this.scaleXLocation = this.gl.getUniformLocation(this.program, "u_scaleX");
    this.scaleYLocation = this.gl.getUniformLocation(this.program, "u_scaleY");
    this.blurLocation = this.gl.getUniformLocation(this.program, "u_blur");
    this.featherLocation = this.gl.getUniformLocation(this.program, "u_feather");
    this.flowSpeedLocation = this.gl.getUniformLocation(this.program, "u_flowSpeed");
    this.flowAmountLocation = this.gl.getUniformLocation(this.program, "u_flowAmount");
    this.flowDirLocation = this.gl.getUniformLocation(this.program, "u_flowDir");
    this.layerOpacityLocation = this.gl.getUniformLocation(this.program, "u_layerOpacity");
    this.noiseScaleLocation = this.gl.getUniformLocation(this.program, "u_noiseScale");
    this.waveHeightLocation = this.gl.getUniformLocation(this.program, "u_waveHeight");
    this.waveSpeedLocation = this.gl.getUniformLocation(this.program, "u_waveSpeed");
    this.positionLocation_uniform = this.gl.getUniformLocation(this.program, "u_position");
    this.patternScaleLocation = this.gl.getUniformLocation(this.program, "u_patternScale");
    this.patternSpeedLocation = this.gl.getUniformLocation(this.program, "u_patternSpeed");
    this.patternRotationLocation = this.gl.getUniformLocation(this.program, "u_patternRotation");
    this.patternOffsetLocation = this.gl.getUniformLocation(this.program, "u_patternOffset");
    this.patternIntensityLocation = this.gl.getUniformLocation(this.program, "u_patternIntensity");
    this.patternContrastLocation = this.gl.getUniformLocation(this.program, "u_patternContrast");
    this.patternTurbulenceLocation = this.gl.getUniformLocation(this.program, "u_patternTurbulence");
    this.shapeLocation = this.gl.getUniformLocation(this.program, "u_shape");
    this.colorStop1Location = this.gl.getUniformLocation(this.program, "u_colorStop1");
    this.colorStop2Location = this.gl.getUniformLocation(this.program, "u_colorStop2");
    this.colorStop3Location = this.gl.getUniformLocation(this.program, "u_colorStop3");
    this.colorStop4Location = this.gl.getUniformLocation(this.program, "u_colorStop4");
    this.colorStop5Location = this.gl.getUniformLocation(this.program, "u_colorStop5");
    this.stopPos1Location = this.gl.getUniformLocation(this.program, "u_stopPos1");
    this.stopPos2Location = this.gl.getUniformLocation(this.program, "u_stopPos2");
    this.stopPos3Location = this.gl.getUniformLocation(this.program, "u_stopPos3");
    this.stopPos4Location = this.gl.getUniformLocation(this.program, "u_stopPos4");
    this.stopPos5Location = this.gl.getUniformLocation(this.program, "u_stopPos5");
    this.controlPointLocations = Array.from({ length: 10 }, (_, i) => this.gl.getUniformLocation(this.program, `u_controlPoint${i}`));
    this.brightnessLocation = this.gl.getUniformLocation(this.program, "u_brightness");
    this.contrastLocation = this.gl.getUniformLocation(this.program, "u_contrast");

    this.startTime = performance.now() / 1000.0;
    this.animationFrameId = null;
  }

  resizeCanvas() {
    if (!this.canvas || !this.gl) return;
    const displayWidth = this.canvas.clientWidth;
    // Use document height instead of viewport height for full page coverage
    const displayHeight = Math.max(document.documentElement.scrollHeight, document.documentElement.clientHeight, window.innerHeight);
    if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
      this.canvas.width = displayWidth;
      this.canvas.height = displayHeight;
      this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  render() {
    if (!this.gl || !this.program || !this.params.enabled) {
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
      return;
    }

    this.resizeCanvas();
    const currentTime = performance.now() / 1000.0 - this.startTime;

    this.gl.useProgram(this.program);
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
    this.gl.enableVertexAttribArray(this.positionLocation);
    this.gl.vertexAttribPointer(this.positionLocation, 2, this.gl.FLOAT, false, 0, 0);
    this.gl.uniform2f(this.resolutionLocation, this.canvas.width, this.canvas.height);
    this.gl.uniform1f(this.timeLocation, currentTime);
    this.gl.uniform2f(this.centerLocation, this.canvas.width / 2, this.canvas.height / 2);

    // Calculate scale so that scaleX = 1.0 means 100% viewport width
    // For a square: we want max(abs(p.x), abs(p.y)) = baseRadius when at viewport edge
    // At viewport edge: p.x = (canvas.width/2) / normalizedScaleX = baseRadius
    // So: normalizedScaleX = (canvas.width/2) / baseRadius
    // When scaleX = 1.0, we want this exact value
    // When scaleX = 0, we want no shape (very small normalizedScaleX to hide it)
    // When scaleX = 2.0, we want 200% width (shape should be 2x larger, so normalizedScaleX should be 2x larger)
    // The shader divides by normalizedScaleX, so: larger normalizedScaleX → smaller p → larger shape
    const baseRadius = 300.0;
    const baseScaleX = this.canvas.width / 2 / baseRadius;
    const baseScaleY = this.canvas.height / 2 / baseRadius;
    // scaleX = 1.0 → baseScaleX (100% width)
    // scaleX = 2.0 → baseScaleX * 2 (200% width, larger shape)
    // scaleX = 0.5 → baseScaleX * 0.5 (50% width, smaller shape)
    // scaleX = 0 → very small value (hide shape)
    const normalizedScaleX = this.params.scaleX > 0 ? baseScaleX * this.params.scaleX : 0.0001;
    const normalizedScaleY = this.params.scaleY > 0 ? baseScaleY * this.params.scaleY : 0.0001;
    this.gl.uniform1f(this.scaleXLocation, normalizedScaleX);
    this.gl.uniform1f(this.scaleYLocation, normalizedScaleY);
    this.gl.uniform1f(this.blurLocation, this.params.blur);
    this.gl.uniform1f(this.featherLocation, this.params.feather);
    this.gl.uniform1f(this.flowSpeedLocation, this.params.flowSpeed);
    this.gl.uniform1f(this.flowAmountLocation, this.params.flowAmount);
    const angleRad = (this.params.flowAngle * Math.PI) / 180;
    this.gl.uniform2f(this.flowDirLocation, Math.cos(angleRad), Math.sin(angleRad));
    this.gl.uniform1f(this.layerOpacityLocation, this.params.layerOpacity);
    this.gl.uniform1f(this.noiseScaleLocation, this.params.noiseScale);
    this.gl.uniform1f(this.waveHeightLocation, this.params.waveHeight);
    this.gl.uniform1f(this.waveSpeedLocation, this.params.waveSpeed);
    this.gl.uniform1f(this.patternScaleLocation, this.params.patternScale);
    this.gl.uniform1f(this.patternSpeedLocation, this.params.patternSpeed);
    this.gl.uniform1f(this.patternRotationLocation, (this.params.patternRotation * Math.PI) / 180);
    this.gl.uniform2f(this.patternOffsetLocation, this.params.patternOffsetX, this.params.patternOffsetY);
    this.gl.uniform1f(this.patternIntensityLocation, this.params.patternIntensity);
    this.gl.uniform1f(this.patternContrastLocation, this.params.patternContrast);
    this.gl.uniform1f(this.patternTurbulenceLocation, this.params.patternTurbulence);
    this.gl.uniform1f(this.shapeLocation, this.params.shape);

    // Calculate position - fixed positions based on config
    let posX = this.params.positionX;
    let posY = this.params.positionY;

    if (this.params.positionMode === "relative") {
      posX = ((this.params.positionPercentX || 0) * this.canvas.width) / 200.0;
      posY = ((this.params.positionPercentY || 0) * this.canvas.height) / 200.0;
    }

    this.gl.uniform2f(this.positionLocation_uniform, posX, posY);

    const rgb1 = hexToRgb(this.params.colorStop1);
    const rgb2 = hexToRgb(this.params.colorStop2);
    const rgb3 = hexToRgb(this.params.colorStop3);
    const rgb4 = hexToRgb(this.params.colorStop4);
    const rgb5 = hexToRgb(this.params.colorStop5);
    this.gl.uniform3f(this.colorStop1Location, rgb1[0], rgb1[1], rgb1[2]);
    this.gl.uniform3f(this.colorStop2Location, rgb2[0], rgb2[1], rgb2[2]);
    this.gl.uniform3f(this.colorStop3Location, rgb3[0], rgb3[1], rgb3[2]);
    this.gl.uniform3f(this.colorStop4Location, rgb4[0], rgb4[1], rgb4[2]);
    this.gl.uniform3f(this.colorStop5Location, rgb5[0], rgb5[1], rgb5[2]);
    this.gl.uniform1f(this.stopPos1Location, this.params.stopPos1);
    this.gl.uniform1f(this.stopPos2Location, this.params.stopPos2);
    this.gl.uniform1f(this.stopPos3Location, this.params.stopPos3);
    this.gl.uniform1f(this.stopPos4Location, this.params.stopPos4);
    this.gl.uniform1f(this.stopPos5Location, this.params.stopPos5);
    for (let i = 0; i < 10; i++) {
      this.gl.uniform1f(this.controlPointLocations[i], this.params[`controlPoint${i}`]);
    }
    this.gl.uniform1f(this.brightnessLocation, this.params.brightness);
    this.gl.uniform1f(this.contrastLocation, this.params.contrast);

    // Update global blur and blend mode
    const blurValue = this.params.globalBlur > 0 ? `${this.params.globalBlur}px` : "none";
    if (this.canvas.style.filter !== `blur(${blurValue})`) {
      this.canvas.style.filter = `blur(${blurValue})`;
    }
    if (this.canvas.style.mixBlendMode !== this.params.blendMode) {
      this.canvas.style.mixBlendMode = this.params.blendMode;
    }

    this.gl.clearColor(0, 0, 0, 0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

    this.animationFrameId = requestAnimationFrame(() => this.render());
  }

  start() {
    this.startTime = performance.now() / 1000.0;
    this.render();
  }
}

async function createGUI() {
  if (gui) return;

  // Use first instance's params for GUI
  if (shaderInstances.length === 0) return;
  const params = shaderInstances[0].params;

  const { default: GUI } = await import("lil-gui");
  gui = new GUI({ title: "Shader Controls" });
  gui.domElement.style.position = "fixed";
  gui.domElement.style.top = "20px";
  gui.domElement.style.left = "20px";
  gui.domElement.style.zIndex = "10002";
  gui.hide();

  gui.onChange(() => {
    // Sync changes to all instances
    shaderInstances.forEach((instance) => {
      Object.assign(instance.params, params);
    });
    // Note: Changes are only saved when you export settings
  });

  // Add export/import buttons
  const settingsFolder = gui.addFolder("Settings");
  const exportButton = { exportSettings: () => exportSettings() };
  settingsFolder.add(exportButton, "exportSettings").name("Export Settings");

  gui.add(params, "enabled").name("Enabled");
  const blurController = gui.add(params, "globalBlur", 0, 100, 0.5).name("Global Blur");
  blurController.onChange(() => {
    // Apply blur immediately to all instances
    shaderInstances.forEach((instance) => {
      instance.params.globalBlur = params.globalBlur;
      const blurValue = params.globalBlur > 0 ? `${params.globalBlur}px` : "none";
      instance.canvas.style.filter = `blur(${blurValue})`;
    });
  });

  const blendModes = [
    "normal",
    "multiply",
    "screen",
    "overlay",
    "soft-light",
    "hard-light",
    "color-dodge",
    "color-burn",
    "darken",
    "lighten",
    "difference",
    "exclusion",
  ];
  const blendController = gui.add(params, "blendMode", blendModes).name("Blend Mode");
  blendController.onChange(() => {
    // Apply blend mode immediately to all instances
    shaderInstances.forEach((instance) => {
      instance.params.blendMode = params.blendMode;
      instance.canvas.style.mixBlendMode = params.blendMode;
    });
  });

  const grainFolder = gui.addFolder("Grain/Noise");
  const grainOpacityController = grainFolder.add(params, "grainOpacity", 0, 1, 0.01).name("Grain Opacity");
  grainOpacityController.onChange(() => {
    grainParams.opacity = params.grainOpacity;
    updateGrainFromModule();
  });

  const grainScaleController = grainFolder.add(params, "grainScale", 0.1, 5.0, 0.1).name("Grain Scale");
  grainScaleController.onChange(() => {
    grainParams.scale = params.grainScale;
    updateGrainFromModule();
  });

  const grainBlendController = grainFolder.add(params, "grainBlend", blendModes).name("Grain Blend Mode");
  grainBlendController.onChange(() => {
    grainParams.blend = params.grainBlend;
    updateGrainFromModule();
  });

  const gradientFolder = gui.addFolder("Gradient Colors");
  gradientFolder.addColor(params, "colorStop1").name("Stop 1");
  gradientFolder.addColor(params, "colorStop2").name("Stop 2");
  gradientFolder.addColor(params, "colorStop3").name("Stop 3");
  gradientFolder.addColor(params, "colorStop4").name("Stop 4");
  gradientFolder.addColor(params, "colorStop5").name("Stop 5");

  const stopPosFolder = gui.addFolder("Color Stop Positions");
  stopPosFolder.add(params, "stopPos1", 0, 1, 0.01).name("Stop 1 Position");
  stopPosFolder.add(params, "stopPos2", 0, 1, 0.01).name("Stop 2 Position");
  stopPosFolder.add(params, "stopPos3", 0, 1, 0.01).name("Stop 3 Position");
  stopPosFolder.add(params, "stopPos4", 0, 1, 0.01).name("Stop 4 Position");
  stopPosFolder.add(params, "stopPos5", 0, 1, 0.01).name("Stop 5 Position");

  const positionFolder = gui.addFolder("Position");
  positionFolder.add(params, "positionMode", ["absolute", "relative"]).name("Position Mode");
  positionFolder.add(params, "positionX", -1000, 1000, 1).name("Position X (pixels)");
  positionFolder.add(params, "positionY", -1000, 1000, 1).name("Position Y (pixels)");
  positionFolder.add(params, "positionPercentX", -100, 100, 1).name("Position X (%)");
  positionFolder.add(params, "positionPercentY", -100, 100, 1).name("Position Y (%)");

  gui.add(params, "scaleX", 0, 2.0, 0.01).name("Width Scale");
  gui.add(params, "scaleY", 0, 2.0, 0.01).name("Height Scale");
  gui.add(params, "shape", { Circle: 1.0, Square: 0.0 }).name("Shape");
  gui.add(params, "blur", 0, 200, 1).name("Blur");
  gui.add(params, "feather", 0, 150, 1).name("Feather");
  gui.add(params, "layerOpacity", 0, 1, 0.01).name("Opacity");
  gui.add(params, "brightness", -1, 1, 0.01).name("Brightness");
  gui.add(params, "contrast", 0, 2, 0.01).name("Contrast");
  gui.add(params, "flowSpeed", 0, 5, 0.1).name("Flow Speed");
  gui.add(params, "flowAmount", 0, 10, 0.1).name("Flow Amount");
  gui.add(params, "flowAngle", 0, 360, 1).name("Flow Direction (°)");
  gui.add(params, "noiseScale", 0.1, 5.0, 0.1).name("Noise Scale");
  gui.add(params, "waveHeight", 0, 300, 1).name("Wave Height");
  gui.add(params, "waveSpeed", 0, 5, 0.1).name("Wave Speed");

  const patternFolder = gui.addFolder("Pattern Controls");
  patternFolder.add(params, "patternScale", 0.1, 10.0, 0.1).name("Pattern Scale");
  patternFolder.add(params, "patternSpeed", 0, 10, 0.1).name("Pattern Speed");
  patternFolder.add(params, "patternRotation", 0, 360, 1).name("Pattern Rotation (°)");
  patternFolder.add(params, "patternOffsetX", -1000, 1000, 1).name("Pattern Offset X");
  patternFolder.add(params, "patternOffsetY", -1000, 1000, 1).name("Pattern Offset Y");
  patternFolder.add(params, "patternIntensity", 0, 5, 0.1).name("Pattern Intensity");
  patternFolder.add(params, "patternContrast", 0, 10, 0.1).name("Pattern Contrast");
  patternFolder.add(params, "patternTurbulence", 0, 5, 0.1).name("Pattern Turbulence");

  const controlPointsFolder = gui.addFolder("Control Points");
  const angleNames = ["0°", "36°", "72°", "108°", "144°", "180°", "216°", "252°", "288°", "324°"];
  for (let i = 0; i < 10; i++) {
    controlPointsFolder.add(params, `controlPoint${i}`, -100, 100, 0.5).name(`Point ${i} (${angleNames[i]})`);
  }
}

function toggleGUI() {
  if (!gui) return;
  if (gui._hidden) {
    gui.show();
  } else {
    gui.hide();
  }
}

function exportSettings() {
  if (shaderInstances.length === 0) return;
  const params = shaderInstances[0].params;
  // Remove unused cursor and followCursor properties
  const cleanedParams = { ...params };
  delete cleanedParams.cursorX;
  delete cleanedParams.cursorY;
  delete cleanedParams.followCursor;
  const settings = {
    params: cleanedParams,
  };

  // Create download
  const dataStr = JSON.stringify(settings, null, 2);
  const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
  const exportFileDefaultName = "shader-settings.json";

  const linkElement = document.createElement("a");
  linkElement.setAttribute("href", dataUri);
  linkElement.setAttribute("download", exportFileDefaultName);
  linkElement.click();

  // Settings exported to shader-settings.json
  // Place this file in src/js/config/ directory to have it loaded automatically on each page load.
}

function loadSettingsFromFile() {
  // Return the imported settings (now statically imported, so synchronous)
  try {
    return shaderSettings.default || shaderSettings;
  } catch (error) {
    return null;
  }
}

export async function initializeShader() {
  // Load settings from config file (now synchronous since it's statically imported)
  const fileSettings = loadSettingsFromFile();

  // Start with defaults
  const initialConfig = {
    shape: 0.0, // Square
    positionMode: "relative",
    positionPercentX: 0.0,
    positionPercentY: 0.0,
    scaleX: 0.75, // 25% smaller than viewport width (1.0 = 100% width)
    scaleY: 0.75, // 25% smaller than viewport height
  };

  // Apply file settings if present (overrides defaults)
  if (fileSettings && fileSettings.params) {
    Object.assign(initialConfig, fileSettings.params);
  }

  // Create single shader instance
  const instance = new ShaderInstance("shader-canvas", initialConfig);

  if (!instance.canvas || !instance.gl) {
    console.error("Shader canvas not initialized");
    return;
  }

  shaderInstances.push(instance);

  // Sync grain params from grain.js
  instance.params.grainOpacity = grainParams.opacity;
  instance.params.grainScale = grainParams.scale;
  instance.params.grainBlend = grainParams.blend;

  // Create GUI (uses instance's params) - disabled by default
  if (ENABLE_GUI) {
    createGUI();
  }

  // Handle window resize and scroll (for dynamic page height)
  const handleResize = () => {
    shaderInstances.forEach((instance) => instance.resizeCanvas());
  };
  window.addEventListener("resize", handleResize);
  window.addEventListener("scroll", handleResize);

  // Also update on content load to catch dynamic height changes
  if (document.readyState === "complete") {
    setTimeout(handleResize, 100);
  } else {
    window.addEventListener("load", () => setTimeout(handleResize, 100));
  }

  // Start rendering
  instance.start();

  // Expose functions globally (only if GUI is enabled)
  if (ENABLE_GUI) {
    window.toggleShaderGUI = toggleGUI;
    window.exportShaderSettings = exportSettings;

    // Add keyboard shortcut to toggle GUI (press 'G' key)
    document.addEventListener("keydown", (event) => {
      if (
        event.key.toLowerCase() === "g" &&
        event.target.tagName !== "INPUT" &&
        event.target.tagName !== "TEXTAREA" &&
        !event.target.isContentEditable
      ) {
        event.preventDefault();
        toggleGUI();
      }
    });
  } else {
    // Still expose export function even when GUI is disabled (for programmatic use)
    window.exportShaderSettings = exportSettings;
  }
}
