import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

// The screens are the page's own articles, placed in the scene with CSS 3D
// transforms. They stay real HTML: sharp at any distance, clickable, and read
// by assistive technology in page order. Each glows faintly from afar and
// comes up to full as the camera looks over its holder's shoulder.

export function createScreens(stops, anchors) {
  const renderer = new CSS3DRenderer();
  renderer.domElement.classList.add('walk-layer');
  const scene = new THREE.Scene();
  const objects = stops.map((stop, index) => {
    const anchor = anchors[index];
    const surface = stop.element.firstElementChild;
    const object = new CSS3DObject(stop.element);
    object.position.set(...anchor.position);
    // Face back toward the holder, tipped up toward their eyes.
    object.rotation.order = 'YXZ';
    object.rotation.y = anchor.facing + Math.PI;
    object.rotation.x = -anchor.tilt;
    object.scale.setScalar(anchor.size[0] / surface.offsetWidth);
    scene.add(object);
    return object;
  });
  return {
    renderer,
    render(camera, focus) {
      stops.forEach((stop, index) => {
        // Lit screens glow from down the carriage; paper only shows up close.
        const glow = stop.pose === 'paper' ? 0.2 : 0.75;
        stop.element.style.opacity = String(glow + (1 - glow) * focus[index]);
        stop.element.classList.toggle('is-near', focus[index] > 0.5);
      });
      renderer.render(scene, camera);
    },
    objects,
  };
}
