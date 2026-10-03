import '../../css/walk.css';
import * as THREE from 'three';
import { createTimeline } from './timeline.js';
import { loadPoints } from './loader.js';
import { createPoints, setPointScale, setScreenLights } from './points.js';
import { devicePoints, screenLights } from './devices.js';
import { createScreens } from './screens.js';

const base = new URL('./', location.href);

function supported() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; }
}

async function start() {
  const [scene, carriage, people] = await Promise.all([
    fetch(new URL('scene.json', base)).then(response => response.json()),
    loadPoints(new URL('carriage.bin', base)),
    loadPoints(new URL('people.bin', base)),
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
  const timeline = createTimeline(held, { dwell: 0.14 });
  const phone = matchMedia('(max-width: 768px), (hover: none)').matches;

  document.documentElement.classList.add('walk-live');
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  renderer.setClearColor(0x050506);
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
  for (const copy of scene.copies) {
    const piece = new THREE.Points(segment.geometry, segment.material);
    piece.frustumCulled = false;
    if (copy.mirror) {
      piece.scale.z = -1;
      piece.position.z = copy.z - scene.segment;
    } else piece.position.z = copy.z;
    world.add(piece);
  }
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
  // Phones draw a share of the points; the files are shuffled, so any share
  // is an even thinning.
  if (phone) for (const cloud of [segment, passengers]) cloud.geometry.setDrawRange(0, Math.floor(cloud.geometry.attributes.position.count * 0.5));
  const lights = screenLights(held, kinds);
  for (const cloud of clouds) {
    setScreenLights(cloud, lights);
    cloud.material.uniforms.uFogFar.value = 13;
  }
  segment.material.uniforms.uSize.value = 0.026;
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

  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.1);
    const time = clock.elapsedTime;
    // The camera follows the scroll by time, not frames, so a slow device
    // walks at the same pace as a fast one.
    progress += (scrollY / scrollable() - progress) * (1 - Math.exp(-dt * 3.5));
    const now = timeline.at(progress);
    stops.forEach((_, index) => { focus[index] = now.stop === index ? now.focus : 0; });

    // Walking: a step's rise and fall while moving, a held camera's sway always.
    const speed = Math.min(1, Math.abs(now.t - lastT) / Math.max(dt, 0.001) * 6);
    lastT = now.t;
    stride += speed * dt * 7;
    path.getPointAt(now.t, eye);
    path.getPointAt(Math.min(1, now.t + 0.03), ahead);
    ahead.y = EYE - 0.1;
    eye.y += Math.abs(Math.sin(stride)) * 0.025 * speed;
    eye.x += Math.sin(time * 0.7) * 0.012 + Math.sin(time * 1.9) * 0.005;
    eye.y += Math.sin(time * 1.1) * 0.008;
    look.copy(ahead);

    // Leaning in over someone's shoulder, the carriage sinks into the dark
    // and only they and their screen stay.
    let lean = 0;
    if (now.stop >= 0) {
      lean = THREE.MathUtils.smootherstep(now.focus, 0, 1);
      const shoulder = shoulders[now.stop];
      eye.lerp(shoulder.eye, lean);
      look.lerp(shoulder.screen, lean);
    }
    camera.position.copy(eye);
    camera.lookAt(look);

    segment.material.uniforms.uDim.value = 1 - 0.8 * lean;
    for (const cloud of clouds) {
      cloud.material.uniforms.uTime.value = time;
      cloud.material.uniforms.uGather.value = Math.min(1, time / 3);
    }
    end.classList.toggle('is-near', progress > 0.97);
    renderer.render(world, camera);
    screens.render(camera, focus);
  });
}

// If the scene cannot load, the stops stay a plain page.
if (supported()) start().catch(() => document.documentElement.classList.remove('walk-live'));
