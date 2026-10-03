import '../../css/walk.css';
import * as THREE from 'three';
import { createTimeline } from './timeline.js';
import { loadPoints } from './loader.js';
import { createPoints, setPointScale, setScreenLights } from './points.js';
import { devicePoints, screenLights } from './devices.js';
import { createScreens } from './screens.js';

const base = new URL('./', location.href);
// How solid the carriage's points are: nearly opaque, so the scan's own
// whites and blues hold, but soft enough to stay a cloud.
const GLOW = 0.85;
// The dark the carriage sinks into: cold, faintly green, like a tunnel.
const HAZE = new THREE.Color(0.008, 0.013, 0.016);

function supported() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; }
}

// Each cloud comes in two files: a random share that phones stop at, and
// the rest, which larger screens add. Their names change with their
// contents, so only the scene itself is fetched fresh.
async function loadShares(files, shares) {
  const parts = await Promise.all(shares.map(share => loadPoints(new URL(files[share - 1], base))));
  const count = parts.reduce((sum, part) => sum + part.count, 0);
  const positions = new Float32Array(count * 3), colors = new Uint8Array(count * 3), gaps = new Float32Array(count);
  let offset = 0;
  for (const part of parts) {
    positions.set(part.positions, offset * 3);
    colors.set(part.colors, offset * 3);
    if (part.gaps) gaps.set(part.gaps, offset);
    offset += part.count;
  }
  // The spacing was measured with every point present; with only a share,
  // the gaps are wider by the square root of what is missing.
  const thinned = Math.sqrt(shares.length === 1 ? 1 / 0.4 : 1);
  for (let i = 0; i < count; i++) gaps[i] *= thinned;
  return { positions, colors, count, gaps };
}

async function start() {
  const phone = matchMedia('(max-width: 768px), (hover: none)').matches;
  const shares = phone ? [1] : [1, 2];
  const scene = await fetch(new URL('scene.json', base), { cache: 'no-store' }).then(response => response.json());
  const [carriage, people] = await Promise.all([
    loadShares(scene.files.carriage, shares),
    loadShares(scene.files.people, shares),
  ]);
  // Each article meets its passenger by name; a stop with no passenger stays
  // on the plain page.
  const anchors = new Map(scene.stops.map(anchor => [anchor.stop, anchor]));
  const stops = [...document.querySelectorAll('.stop')]
    .map(element => ({ element, anchor: anchors.get(element.dataset.stop) }))
    .filter(stop => stop.anchor)
    .sort((a, b) => a.anchor.at - b.anchor.at)
    .map(stop => ({ ...stop, pose: stop.anchor.pose }));
  const held = stops.map(stop => stop.anchor);
  const timeline = createTimeline(held, { dwell: 0.22 });

  document.documentElement.classList.add('walk-live');
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  renderer.setClearColor(HAZE);
  const pixelRatio = Math.min(devicePixelRatio, 1.5);
  renderer.setPixelRatio(pixelRatio);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  document.body.prepend(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(phone ? 62 : 52, 1, 0.03, 40);
  const world = new THREE.Scene();

  // The scan covers one stretch of carriage. It repeats down the line, every
  // other copy turned end to end, and the torn ends and the dark hide the
  // joins: a carriage that never quite ends.
  const segment = createPoints(carriage);
  // Where a point of the segment lands in each copy, along the carriage.
  const placed = (copy, z) => copy.mirror ? copy.z - scene.segment - z : copy.z + z;
  for (const copy of scene.copies) {
    const piece = new THREE.Points(segment.geometry, segment.material);
    piece.frustumCulled = false;
    if (copy.mirror) {
      piece.scale.z = -1;
      piece.position.z = copy.z - scene.segment;
    } else piece.position.z = copy.z;
    world.add(piece);
  }

  // The strip light glows in the haze: soft halos along each run of tube,
  // in every copy of the carriage.
  const glow = document.createElement('canvas');
  glow.width = glow.height = 64;
  const g = glow.getContext('2d');
  const gradient = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.35, 'rgba(255,255,255,0.35)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gradient;
  g.fillRect(0, 0, 64, 64);
  const halo = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(glow), color: new THREE.Color(0.85, 0.95, 1), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  const halos = [];
  for (const copy of scene.copies) {
    for (const lamp of scene.lamps) {
      for (let z = lamp.from + 0.35; z < lamp.to; z += 0.7) {
        const sprite = new THREE.Sprite(halo.clone());
        sprite.position.set(lamp.x, lamp.y - 0.04, placed(copy, z));
        sprite.scale.set(1.1, 0.7, 1);
        world.add(sprite);
        halos.push(sprite);
      }
    }
  }
  // One stretch of tube stutters, near the man with the laptop.
  const failing = scene.lamps.at(-1);
  const flickerAt = placed(scene.copies[1], (failing.from + failing.to) / 2);
  const flickerHalf = (failing.to - failing.from) / 2;
  const passengers = createPoints(people);
  const kinds = held.map(anchor => anchor.pose);
  const devices = createPoints(devicePoints(held, kinds, { density: phone ? 0.6 : 1 }));
  // Devices are held close: they neither fade at the lens nor part around it.
  devices.material.uniforms.uNearFade.value.set(0.02, 0.08);
  // Passengers stay until much closer, so a shoulder and the back of a head
  // frame the screen rather than dissolving.
  passengers.material.uniforms.uNearFade.value.set(0.06, 0.3);
  passengers.material.uniforms.uKeep.value = 0.85;
  world.add(passengers, devices);
  const clouds = [segment, passengers, devices];
  const lights = screenLights(held, kinds);
  for (const cloud of clouds) {
    setScreenLights(cloud, lights);
    cloud.material.uniforms.uFogNear.value = 1.2;
    cloud.material.uniforms.uFogDensity.value = 0.17;
    cloud.material.uniforms.uFogColor.value.copy(HAZE);
    cloud.material.uniforms.uFlicker.value.set(flickerAt, flickerHalf, 1);
    // A slight grade: blue-teal in the shadows, a warmer light.
    cloud.material.uniforms.uShadow.value.setRGB(0.74, 0.92, 1.14);
    cloud.material.uniforms.uHighlight.value.setRGB(1.07, 1, 0.9);
  }
  // The carriage and its passengers are only fully there around the eye.
  for (const cloud of [segment, passengers]) cloud.material.uniforms.uReal.value.set(1.4, 5);
  // Gaps close where the scan is thin; the lens softens what is off focus.
  segment.material.uniforms.uGapFill.value = 0.85;
  passengers.material.uniforms.uGapFill.value = 0.8;
  for (const cloud of [segment, passengers]) {
    cloud.material.uniforms.uBlur.value = 0.0025;
    cloud.material.uniforms.uStrip.value.set(scene.lamps[0].x, scene.lamps[0].y, 1);
  }
  // The carriage keeps the scan's own colours, the white panels, blue
  // doors and seats and the strip light. Its points barely stir, so the
  // scan stays sharp; the dream is in the dark and the drift of the camera.
  segment.material.uniforms.uSize.value = 0.014;
  segment.material.uniforms.uDrift.value = 0.006;
  segment.material.uniforms.uKeep.value = 0.8;
  segment.material.uniforms.uTone.value.setRGB(0.96, 0.98, 1.02);
  segment.material.uniforms.uExposure.value = 1.15;
  passengers.material.uniforms.uSize.value = 0.016;
  devices.material.uniforms.uSize.value = 0.01;

  const screens = createScreens(stops, held);
  document.body.append(screens.renderer.domElement);

  // Down the aisle, drifting a little from side to side.
  const { start: zStart, end: zEnd, eye: EYE } = scene.path;
  const zAt = t => zStart + (zEnd - zStart) * t;
  const path = new THREE.CatmullRomCurve3(Array.from({ length: 12 }, (_, i) => {
    const t = i / 11;
    return new THREE.Vector3(Math.sin(t * 9.1) * 0.12, EYE, zAt(t));
  }));

  // Over the shoulder, back far enough to see the screen in its holder's
  // hands, whichever way the viewport is turned.
  const shoulders = held.map(anchor => ({ eye: new THREE.Vector3(), screen: new THREE.Vector3(...anchor.position) }));
  const frameScreens = () => held.forEach((anchor, index) => {
    const tall = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2), wide = tall * camera.aspect;
    const distance = Math.max(anchor.size[1] / (tall * 0.4), anchor.size[0] / (wide * 0.55));
    shoulders[index].eye.fromArray(anchor.over).multiplyScalar(distance).add(shoulders[index].screen);
  });

  const resize = () => {
    renderer.setSize(innerWidth, innerHeight);
    screens.renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    for (const cloud of clouds) setPointScale(cloud, camera, innerHeight, pixelRatio);
    // Dense points stay hard dots of a pixel or two; only gaps and the lens
    // grow them, up to a soft disc.
    segment.material.uniforms.uMaxSize.value = 7 * pixelRatio;
    passengers.material.uniforms.uMaxSize.value = 6 * pixelRatio;
    devices.material.uniforms.uMaxSize.value = 4 * pixelRatio;
    frameScreens();
  };
  addEventListener('resize', resize);
  resize();
  // The screens leave the page for the scene on the first frame; measure the
  // window again once they are out of the way.
  requestAnimationFrame(() => requestAnimationFrame(resize));

  const scrollable = () => Math.max(1, document.documentElement.scrollHeight - innerHeight);
  const end = document.querySelector('.walk-end');

  // Keys step from stop to stop; the scroll does the travelling.
  addEventListener('keydown', event => {
    const forward = ['ArrowDown', 'ArrowRight', 'PageDown'].includes(event.key) || (event.key === ' ' && !event.shiftKey);
    const back = ['ArrowUp', 'ArrowLeft', 'PageUp'].includes(event.key) || (event.key === ' ' && event.shiftKey);
    if (!forward && !back) return;
    event.preventDefault();
    const here = scrollY / scrollable();
    const marks = [0, ...stops.map((_, index) => timeline.progressOf(index)), 1];
    const next = forward ? marks.find(mark => mark > here + 0.005) ?? 1 : marks.findLast(mark => mark < here - 0.005) ?? 0;
    scrollTo({ top: next * scrollable(), behavior: 'smooth' });
  });

  let progress = scrollY / scrollable();
  let lastT = timeline.at(progress).t, stride = 0;
  const eye = new THREE.Vector3(), look = new THREE.Vector3(), ahead = new THREE.Vector3();
  const clock = new THREE.Clock();
  const focus = stops.map(() => 0);
  // How far the camera has turned to each screen, eased on its own clock so
  // the turn is slow however fast the scroll arrives. Leaving one screen and
  // turning to the next overlap, as a head would.
  const leans = stops.map(() => 0);
  let focusDistance = 3, stutterUntil = 0, nextStutter = 5;

  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.1);
    const time = clock.elapsedTime;
    // The camera follows the scroll by time, not frames, so a slow device
    // walks at the same pace as a fast one.
    progress += (scrollY / scrollable() - progress) * (1 - Math.exp(-dt * 2));
    const now = timeline.at(progress);

    // Walking: the faintest rise and fall while moving, and a slow drift as
    // if the camera were carried rather than held.
    const speed = Math.min(1, Math.abs(now.t - lastT) / Math.max(dt, 0.001) * 6);
    lastT = now.t;
    stride += speed * dt * 7;
    path.getPointAt(now.t, eye);
    path.getPointAt(Math.min(1, now.t + 0.03), ahead);
    ahead.y = EYE - 0.1;
    eye.y += Math.abs(Math.sin(stride)) * 0.006 * speed;
    eye.x += Math.sin(time * 0.31) * 0.006;
    eye.y += Math.sin(time * 0.43) * 0.004;
    look.copy(ahead);

    // Leaning in over someone's shoulder, the carriage sinks into the dark
    // and only they and their screen stay.
    let lean = 0;
    leans.forEach((value, index) => {
      const target = now.stop === index ? THREE.MathUtils.smootherstep(now.focus, 0, 1) : 0;
      leans[index] = value + (target - value) * (1 - Math.exp(-dt * 1.1));
      const eased = THREE.MathUtils.smoothstep(leans[index], 0, 1);
      eye.lerp(shoulders[index].eye, eased);
      look.lerp(shoulders[index].screen, eased);
      focus[index] = leans[index];
      lean = Math.max(lean, leans[index]);
    });
    camera.position.copy(eye);
    camera.lookAt(look);

    // Focus: down the carriage while walking, on the screen when leaning in.
    const target = THREE.MathUtils.lerp(3.2, eye.distanceTo(look), Math.min(1, lean * 1.2));
    focusDistance += (target - focusDistance) * (1 - Math.exp(-dt * 2));
    // Now and then the failing tube stutters for a second or so.
    if (time > nextStutter) {
      stutterUntil = time + 0.4 + Math.random() * 1.4;
      nextStutter = stutterUntil + 6 + Math.random() * 12;
    }
    const beat = Math.sin(Math.floor(time * 14) * 12.9898) * 43758.5453;
    const level = time < stutterUntil && beat - Math.floor(beat) < 0.55 ? 0.12 : 1;
    for (const sprite of halos) {
      const near = Math.abs(sprite.position.z - flickerAt) < flickerHalf ? level : 1;
      const far = Math.exp(-Math.max(0, camera.position.distanceTo(sprite.position) - 1.5) * 0.12);
      sprite.material.opacity = 0.11 * near * far * (1 - 0.6 * lean);
    }

    segment.material.uniforms.uDim.value = GLOW * (1 - 0.8 * lean);
    for (const cloud of clouds) {
      cloud.material.uniforms.uFocus.value = focusDistance;
      cloud.material.uniforms.uFlicker.value.z = level;
      cloud.material.uniforms.uTime.value = time;
      cloud.material.uniforms.uGather.value = Math.min(1, time / 3);
      // Every eleven seconds a sweep goes out from the eye.
      cloud.material.uniforms.uSweep.value = (time % 11) * 2.4;
    }
    end.classList.toggle('is-near', progress > 0.97);
    renderer.render(world, camera);
    screens.render(camera, focus);
  });
}

// If the scene cannot load, the stops stay a plain page.
if (supported()) start().catch(() => document.documentElement.classList.remove('walk-live'));
