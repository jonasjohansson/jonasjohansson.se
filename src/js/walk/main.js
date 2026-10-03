import '../../css/walk.css';
import * as THREE from 'three';
import { createTimeline } from './timeline.js';
import { standinAlley, ALLEY } from './standin.js';
import { createPoints, setPointScale } from './points.js';
import { createScreens } from './screens.js';

const EYE = 1.62;
const START = 1, END = -ALLEY.length + 3;

function supported() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; }
}

function start() {
  const stops = [...document.querySelectorAll('.stop')].map(element => ({
    element,
    at: Number(element.dataset.at),
    side: Number(element.dataset.side) || 1,
    pose: element.dataset.pose,
  }));
  const timeline = createTimeline(stops, { dwell: 0.14 });
  const zAt = t => START + (END - START) * t;

  // Each person stands a little ahead of their stop, by their wall, facing
  // down the alley and half turned to the wall, so the camera arrives
  // behind them.
  const figures = stops.map(stop => ({
    x: stop.side * 1.15,
    z: zAt(stop.at) - 1.1,
    pose: stop.pose,
    facing: Math.atan2(stop.side * 0.35, -0.94),
  }));
  const phone = matchMedia('(max-width: 768px), (hover: none)').matches;
  const scene = standinAlley({ seed: 11, density: phone ? 0.45 : 1, figures });

  document.documentElement.classList.add('walk-live');
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  renderer.setClearColor(0x050506);
  const pixelRatio = Math.min(devicePixelRatio, 1.5);
  renderer.setPixelRatio(pixelRatio);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  document.body.prepend(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(phone ? 62 : 52, 1, 0.05, 60);
  const world = new THREE.Scene();
  const points = createPoints(scene);
  world.add(points);
  const screens = createScreens(stops, scene.anchors);
  document.body.append(screens.renderer.domElement);

  // The walk wanders a little from one side of the alley to the other.
  const path = new THREE.CatmullRomCurve3(Array.from({ length: 12 }, (_, i) => {
    const t = i / 11;
    return new THREE.Vector3(Math.sin(t * 9.1) * 0.22, EYE, zAt(t));
  }));

  // Over the shoulder, back just far enough for the screen to fill most of
  // the view, whichever way the viewport is turned.
  const shoulders = scene.anchors.map(anchor => ({ eye: new THREE.Vector3(), screen: new THREE.Vector3(...anchor.position) }));
  const frameScreens = () => scene.anchors.forEach((anchor, index) => {
    const tall = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2), wide = tall * camera.aspect;
    const distance = Math.max(anchor.size[1] / (tall * 0.6), anchor.size[0] / (wide * 0.7));
    shoulders[index].eye.fromArray(anchor.over).multiplyScalar(distance).add(shoulders[index].screen);
  });

  const resize = () => {
    renderer.setSize(innerWidth, innerHeight);
    screens.renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    setPointScale(points, camera, innerHeight, pixelRatio);
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
    ahead.y = EYE - 0.12;
    eye.y += Math.abs(Math.sin(stride)) * 0.025 * speed;
    eye.x += Math.sin(time * 0.7) * 0.012 + Math.sin(time * 1.9) * 0.005;
    eye.y += Math.sin(time * 1.1) * 0.008;
    look.copy(ahead);

    if (now.stop >= 0) {
      const lean = THREE.MathUtils.smootherstep(now.focus, 0, 1);
      const shoulder = shoulders[now.stop];
      eye.lerp(shoulder.eye, lean);
      look.lerp(shoulder.screen, lean);
    }
    camera.position.copy(eye);
    camera.lookAt(look);

    points.material.uniforms.uTime.value = time;
    points.material.uniforms.uGather.value = Math.min(1, time / 3);
    end.classList.toggle('is-near', progress > 0.97);
    renderer.render(world, camera);
    screens.render(camera, focus);
  });
}

if (supported()) start();
