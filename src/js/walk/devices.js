import * as THREE from 'three';

// The things people hold, made of the same points as the world, built around
// each screen so the page's content sits in the device rather than in front
// of it: a laptop's lid, bezel, hinge and keyboard; a phone's frame and back.
// A newspaper needs none; the paper is the page.

// The screen's own frame, matching how screens.js turns the HTML: x across
// the glass, y up it, z out of it toward the holder's face.
export function screenFrame(anchor) {
  const frame = new THREE.Object3D();
  frame.position.fromArray(anchor.position);
  frame.rotation.order = 'YXZ';
  frame.rotation.y = anchor.facing + Math.PI;
  frame.rotation.x = -anchor.tilt;
  frame.updateMatrixWorld(true);
  return frame.matrixWorld;
}

function random(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function devicePoints(anchors, kinds, { seed = 3, density = 1 } = {}) {
  const rand = random(seed);
  const positions = [], colors = [];
  const v = new THREE.Vector3();
  anchors.forEach((anchor, index) => {
    const kind = kinds[index];
    if (kind === 'paper') return;
    const matrix = screenFrame(anchor);
    const [w, h] = anchor.size;
    const put = (x, y, z, shade) => {
      v.set(x, y, z).applyMatrix4(matrix);
      positions.push(v.x, v.y, v.z);
      colors.push(shade, shade, shade + 4);
    };
    // A rectangle's ring between an inner and an outer size: the bezel.
    const ring = (iw, ih, ow, oh, z, n, shade) => {
      for (let i = 0; i < n; i++) {
        const x = (rand() - 0.5) * ow, y = (rand() - 0.5) * oh;
        if (Math.abs(x) < iw / 2 && Math.abs(y) < ih / 2) continue;
        put(x, y, z, shade + rand() * 12);
      }
    };
    const slab = (sw, sh, z, n, shade) => {
      for (let i = 0; i < n; i++) put((rand() - 0.5) * sw, (rand() - 0.5) * sh, z, shade + rand() * 10);
    };
    const n = 6000 * density;
    if (kind === 'phone') {
      ring(w, h, w + 0.008, h + 0.016, -0.001, n * 0.5, 34);
      slab(w + 0.008, h + 0.016, -0.009, n * 0.5, 26);
      return;
    }
    // Laptop: lid around the glass, its back, then the base folding toward
    // the holder from the hinge, with the keys a shade lighter.
    ring(w, h, w + 0.03, h + 0.035, -0.002, n * 0.35, 30);
    slab(w + 0.03, h + 0.035, -0.008, n * 0.25, 22);
    // The base lies flat, from the lid's bottom edge toward the holder.
    const hinge = new THREE.Vector3(0, -(h + 0.035) / 2, -0.004).applyMatrix4(matrix);
    const across = new THREE.Vector3(1, 0, 0).transformDirection(matrix);
    const toward = new THREE.Vector3(0, 0, 1).transformDirection(matrix).setY(0).normalize();
    const depth = h + 0.01;
    for (let i = 0; i < n * 0.4; i++) {
      const x = (rand() - 0.5) * (w + 0.03), along = rand() * depth;
      const key = Math.abs(x) < w * 0.42 && along > depth * 0.12 && along < depth * 0.58
        && (Math.floor((x + w) / 0.019) + Math.floor(along / 0.019)) % 2 === 0;
      v.copy(hinge).addScaledVector(across, x).addScaledVector(toward, along);
      positions.push(v.x, v.y, v.z);
      const shade = (key ? 52 : 28) + rand() * 10;
      colors.push(shade, shade, shade + 4);
    }
  });
  return { positions: Float32Array.from(positions), colors: Uint8Array.from(colors, Math.round), count: positions.length / 3 };
}

// Where each screen's light comes from and which way it shines.
export function screenLights(anchors, kinds) {
  return anchors.map((anchor, index) => {
    const matrix = screenFrame(anchor);
    const origin = new THREE.Vector3().applyMatrix4(matrix);
    const normal = new THREE.Vector3(0, 0, 1).transformDirection(matrix);
    const strength = { laptop: 1, phone: 0.55, paper: 0 }[kinds[index]] ?? 0;
    return { origin, normal, strength };
  });
}
