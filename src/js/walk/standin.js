// A stand-in alley until a real scan is chosen: wet cobbles, two uneven brick
// walls with windows, a few lamps, wires overhead, and a figure at each stop.
// It exists to judge pacing and the look of the points, not to be the place.
// It returns what the scan loader will: positions in metres (x across, y up,
// z along the alley, walking toward -z) and 0-255 colours, three per point.

export const ALLEY = { width: 3.4, length: 60, height: 9 };

function random(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Where each figure's hands are, in its own frame: x to its right, y up,
// z the way it faces. The screen sits here, tilted toward the face.
const HOLD = {
  paper: { at: [0, 1.0, 0.36], tilt: 0.25, size: [0.56, 0.4] },
  laptop: { at: [0, 0.78, 0.42], tilt: 0.3, size: [0.34, 0.22] },
  phone: { at: [0.04, 1.3, 0.28], tilt: 0.55, size: [0.075, 0.155] },
};

export function standinAlley({ seed = 1, density = 1, figures = [] } = {}) {
  const rand = random(seed);
  const positions = [], colors = [];
  const lamps = [];
  for (let z = -6; z > -ALLEY.length; z -= 11 + rand() * 4) {
    lamps.push([rand() < 0.5 ? -1 : 1, 3.4, z]);
  }
  // Light falls off from each lamp; far from all of them only a cold
  // ambient remains.
  const lit = (x, y, z, r, g, b) => {
    let warm = 0;
    for (const [side, ly, lz] of lamps) {
      const d2 = (x - side * ALLEY.width / 2) ** 2 + (y - ly) ** 2 + (z - lz) ** 2;
      warm += 6 / (1 + d2);
    }
    const k = 0.35 + warm;
    positions.push(x, y, z);
    colors.push(
      Math.min(255, r * k + warm * 60),
      Math.min(255, g * k + warm * 34),
      Math.min(255, b * k * 0.9 + 18),
    );
  };
  const count = area => Math.round(area * 300 * density);

  // Cobbles: a slight camber toward the drain in the middle.
  for (let i = 0, n = count(ALLEY.width * ALLEY.length); i < n; i++) {
    const x = (rand() - 0.5) * ALLEY.width, z = -rand() * ALLEY.length;
    const stone = Math.sin(x * 9) * Math.sin(z * 9) > 0 ? 1 : 0.8;
    lit(x, Math.abs(x) * 0.02 + rand() * 0.01, z, 70 * stone, 74 * stone, 86 * stone);
  }

  // Walls: one building after another, each its own height and brick tone,
  // with rows of windows, a few of them lit.
  for (const side of [-1, 1]) {
    for (let z0 = 2; z0 > -ALLEY.length - 2;) {
      const span = Math.min(5 + rand() * 7, z0 + ALLEY.length + 2), top = 4.5 + rand() * (ALLEY.height - 4.5);
      const tone = [96 + rand() * 50, 70 + rand() * 30, 60 + rand() * 30];
      const inset = rand() * 0.25;
      const windows = [];
      for (let wz = z0 - 1; wz > z0 - span + 1; wz -= 1.6 + rand()) {
        for (let wy = 1.6; wy < top - 1; wy += 2.8) windows.push([wz, wy, rand() < 0.15]);
      }
      for (let i = 0, n = count(span * top); i < n; i++) {
        const z = z0 - rand() * span, y = rand() * top;
        const window = windows.find(([wz, wy]) => z < wz && z > wz - 0.9 && y > wy && y < wy + 1.3);
        const x = side * (ALLEY.width / 2 + inset + (window ? 0.12 : 0));
        if (window?.[2]) { positions.push(x, y, z); colors.push(230, 170, 90); continue; }
        if (window) { lit(x, y, z, 20, 22, 28); continue; }
        const brick = (Math.floor(y / 0.075) + Math.floor((z + (Math.floor(y / 0.075) % 2) * 0.11) / 0.22)) % 3;
        const shade = 0.85 + brick * 0.08;
        lit(x, y, z, tone[0] * shade, tone[1] * shade, tone[2] * shade);
      }
      z0 -= span;
    }
  }

  // Lamps glow; wires sag from wall to wall.
  for (const [side, ly, lz] of lamps) {
    for (let i = 0; i < 400 * density + 40; i++) {
      const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * 0.12;
      positions.push(side * (ALLEY.width / 2 - 0.4) + Math.cos(a) * r, ly + Math.sin(a) * r * 0.6, lz + (rand() - 0.5) * 0.2);
      colors.push(255, 214, 150);
    }
  }
  for (let wire = 0; wire < 7; wire++) {
    const z = -rand() * ALLEY.length, y = 5 + rand() * 2, sag = 0.3 + rand() * 0.4, skew = (rand() - 0.5) * 3;
    for (let i = 0; i < 200 * density + 20; i++) {
      const u = rand();
      lit((u - 0.5) * ALLEY.width, y - sag * 4 * u * (1 - u), z + skew * (u - 0.5), 30, 30, 34);
    }
  }

  // Figures: capsules for limbs, a sphere for the head, posed to hold
  // something. Seated figures get a crate to sit on.
  const anchors = figures.map(figure => {
    const { x: fx, z: fz, facing = 0, pose = 'phone' } = figure;
    const cos = Math.cos(facing), sin = Math.sin(facing);
    const world = (lx, ly, lz) => [fx + lx * cos + lz * sin, ly, fz - lx * sin + lz * cos];
    const tone = [120 + rand() * 60, 100 + rand() * 50, 110 + rand() * 60];
    const capsule = (a, b, radius, n, color = tone) => {
      for (let i = 0; i < n; i++) {
        const u = rand(), theta = rand() * Math.PI * 2, phi = Math.acos(2 * rand() - 1);
        const p = [0, 1, 2].map(k => a[k] + (b[k] - a[k]) * u);
        const r = radius * (0.9 + rand() * 0.1);
        lit(...world(p[0] + r * Math.sin(phi) * Math.cos(theta), p[1] + r * Math.cos(phi), p[2] + r * Math.sin(phi) * Math.sin(theta)), ...color);
      }
    };
    const n = Math.round(9000 * Math.max(density, 0.25));
    const seated = pose !== 'phone';
    const hip = seated ? 0.5 : 0.95, shoulder = seated ? 1.05 : 1.45;
    const hold = HOLD[pose];
    if (seated) {
      capsule([-0.25, 0.22, -0.15], [0.25, 0.22, -0.15], 0.22, n * 0.08, [60, 52, 44]);
      for (const s of [-1, 1]) {
        capsule([s * 0.1, hip, 0], [s * 0.1, hip, 0.42], 0.075, n * 0.06);
        capsule([s * 0.1, hip, 0.42], [s * 0.1, 0.05, 0.46], 0.06, n * 0.05);
      }
    } else {
      for (const s of [-1, 1]) capsule([s * 0.1, hip, 0], [s * 0.11, 0.05, 0.02], 0.07, n * 0.1);
    }
    capsule([0, hip, 0], [0, shoulder, 0.04], 0.17, n * 0.28);
    capsule([0, shoulder + 0.08, 0.04], [0, shoulder + 0.1, 0.04], 0.1, n * 0.12, [tone[0] * 1.1, tone[1] * 0.95, tone[2] * 0.85]);
    for (const s of [-1, 1]) {
      const hand = [hold.at[0] + s * Math.min(0.12, hold.size[0] / 2), hold.at[1] - 0.04, hold.at[2] - 0.02];
      const elbow = [s * 0.2, (shoulder + hand[1]) / 2 - 0.1, 0.12];
      capsule([s * 0.2, shoulder - 0.03, 0.03], elbow, 0.05, n * 0.05);
      capsule(elbow, hand, 0.045, n * 0.05);
    }
    // The way to the camera's place over the right shoulder, or the left
    // one when the right faces the wall: up and back from the hands, past
    // the head. How far along it depends on the screen the walk is seen on.
    const side = world(1, 0, 0)[0] - fx > 0 === fx < 0 ? 1 : -1;
    const [ox, oy, oz] = world(side * 0.35, 0.55, -0.75);
    const length = Math.hypot(ox - fx, oy, oz - fz);
    return {
      position: world(...hold.at),
      over: [(ox - fx) / length, oy / length, (oz - fz) / length],
      facing, tilt: hold.tilt, size: hold.size,
    };
  });

  return {
    positions: Float32Array.from(positions),
    colors: Uint8Array.from(colors, Math.round),
    count: positions.length / 3,
    anchors,
  };
}
