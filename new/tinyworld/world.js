// world.js — preload your GLBs, spawn a small world, and skin each model with a project texture.

const MODEL_BASE = "./models/"; // adjust if needed
const THREE = window.THREE;

// Your GLB filenames
const GLB_FILES = [
  "Bowl Dirty.glb",
  "Bowl Small.glb",
  "Bowl.glb",
  "burger bun bottom.glb",
  "Burger bun top.glb",
  "Burger buns.glb",
  "Burger patty.glb",
  "Burger.glb",
  "Burnt Burger.glb",
  "burnt ham.glb",
  "Carrot cut.glb",
  "Carrot.glb",
  "Chair Stool.glb",
  "Chair-eGccH9cqom.glb",
  "Chair.glb",
  "Cheese cut.glb",
  "Cheese slice.glb",
  "Cheese.glb",
  "Chef Knife.glb",
  "Cooked ham.glb",
  "Cooked Vegie burger.glb",
  "Crate Cheese.glb",
  "Crate Lettuce.glb",
  "Crate of Buns.glb",
  "Crate of Carrots.glb",
  "Crate of Ham.glb",
  "Crate of Onions.glb",
  "Crate of Potatoes.glb",
  "Crate of steaks.glb",
  "Crate of Tomatoes.glb",
  "Crate.glb",
  "Cut carrots.glb",
  "Cut tomatoes.glb",
  "Cutting Board.glb",
  "Dinner.glb",
  "Dirty Plate.glb",
  "Dishrack-cyhc2Sj4Uy.glb",
  "Dishrack.glb",
  "Door-MSIuI2jpqb.glb",
  "Door.glb",
  "Extractorhood.glb",
  "Floor Kitchen.glb",
  "Food Burger.glb",
  "Fridge.glb",
  "Jars.glb",
  "Ketchup.glb",
  "Kitchen Cabinet Corner-Pieyzl60FA.glb",
  "Kitchen Cabinet Corner.glb",
  "Kitchen Cabinet-cxxC9yz390.glb",
  "Kitchen Cabinet.glb",
  "Kitchen Table-BAT1fix4uD.glb",
  "Kitchen Table-jrwQfpN0LV.glb",
  "Kitchen Table-ocdwmd2IKZ.glb",
  "Kitchen Table.glb",
  "Kitchentable Sink La.glb",
  "Kitchentable Sink.glb",
  "Large pot.glb",
  "Lettuce cut.glb",
  "Lettuce-yC6B73sG9s.glb",
  "Lettuce.glb",
  "Lid A.glb",
  "Lid B.glb",
  "Lid Large.glb",
  "Menu.glb",
  "Modular Kitchen Parts.glb",
  "Modular Walls.glb",
  "Mustard Bottle.glb",
  "Onion cut.glb",
  "Onion rings.glb",
  "Onion.glb",
  "Oven.glb",
  "Pan A.glb",
  "Pan-2ShlDi3R6e.glb",
  "Pan.glb",
  "Paper Towel.glb",
  "Pillar B.glb",
  "Pillar.glb",
  "Planks.glb",
  "Plate Small.glb",
  "Plate.glb",
  "Pot A.glb",
  "Pot of Stew-1D2tRExbVX.glb",
  "Pot of Stew.glb",
  "Pot.glb",
  "Potato Cut.glb",
  "Potato-acwBoZQNdm.glb",
  "Potato.glb",
  "Raw ham.glb",
  "Raw steak cubes.glb",
  "Raw steak.glb",
  "Round Table-KZXCuGx1WZ.glb",
  "Round Table.glb",
  "Shelf Papertowel-6fdQlKgcP4.glb",
  "Shelf Papertowel.glb",
  "Stew Bowl.glb",
  "Stew-rPa4vEsC9c.glb",
  "Stew.glb",
  "Stove Single.glb",
  "Stove with multi burner.glb",
  "Stove-LdFYthYpQ9.glb",
  "Stove.glb",
  "Table Round A Small.glb",
  "Table with food.glb",
  "Table with sink.glb",
  "Table.glb",
  "Tomato-EVTveOjwHG.glb",
  "Tomato.glb",
  "Towel Rail.glb",
  "Vegetable burger.glb",
  "Vegie burger patty.glb",
];

// ---------- Utilities ----------
function addAssetItem(assets, id, src) {
  const it = document.createElement("a-asset-item");
  it.setAttribute("id", id);
  it.setAttribute("src", src);
  it.setAttribute("response-type", "arraybuffer");
  it.setAttribute("crossorigin", "anonymous");
  assets.appendChild(it);
  return "#" + id;
}
function addImage(assets, id, src) {
  const img = document.createElement("img");
  img.setAttribute("id", id);
  img.setAttribute("src", src);
  img.setAttribute("crossorigin", "anonymous");
  assets.appendChild(img);
  return "#" + id;
}
function* textureIdsGenerator(assets, projects) {
  const ids = [];
  projects.forEach((p, i) => {
    ids.push(addImage(assets, `p${i}-hero`, p.hero));
    (p.images || []).forEach((url, j) => ids.push(addImage(assets, `p${i}-img${j}`, url)));
  });
  let k = 0;
  while (true) yield ids[k++ % ids.length];
}
function ringPositions(count, radius, y = 0) {
  const arr = [];
  for (let i = 0; i < count; i++) {
    const t = (i / count) * Math.PI * 2;
    arr.push(new THREE.Vector3(Math.cos(t) * radius, y, Math.sin(t) * radius));
  }
  return arr;
}
function jitter(v3, xz = 0.8, y = 0.2) {
  v3.x += (Math.random() * 2 - 1) * xz;
  v3.y += (Math.random() * 2 - 1) * y;
  v3.z += (Math.random() * 2 - 1) * xz;
  return v3;
}

// ---------- Component: apply-project-texture ----------
AFRAME.registerComponent("apply-project-texture", {
  schema: {
    src: { type: "selector" }, // <img> element (from <a-assets>)
    filter: { type: "string", default: "" }, // optional regex to target mesh names
    roughness: { type: "number", default: 1 },
    metalness: { type: "number", default: 0 },
  },
  init() {
    this.onLoaded = this.onLoaded.bind(this);
    this.el.addEventListener("model-loaded", this.onLoaded);
  },
  remove() {
    this.el.removeEventListener("model-loaded", this.onLoaded);
  },
  onLoaded() {
    const texImg = this.data.src;
    if (!texImg) return;
    const tex = new THREE.TextureLoader().load(texImg.getAttribute("src"));
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;

    const filterRe = this.data.filter ? new RegExp(this.data.filter) : null;
    this.el.object3D.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      if (filterRe && !filterRe.test(o.name)) return;
      const baseMat = o.material.isMaterial ? o.material : o.material[0];
      if (!baseMat) return;
      const mat = baseMat.clone();
      mat.map = tex;
      mat.emissiveMap = null;
      if (mat.emissive) mat.emissive.set(0x000000);
      mat.metalness = this.data.metalness;
      mat.roughness = this.data.roughness;
      mat.needsUpdate = true;
      o.material = mat;
      o.castShadow = true;
      o.receiveShadow = true;
    });
  },
});

// ---------- NEW: generate a checkered texture in <a-assets> ----------
export function makeCheckerTexture(
  assets,
  {
    size = 64, // tile pixel size
    tiles = 2, // squares per side inside the generated image
    a = "#272f46",
    b = "#1c2438",
    id = "checkerTex",
  } = {}
) {
  const dim = size * tiles;
  const c = document.createElement("canvas");
  c.width = c.height = dim;
  const ctx = c.getContext("2d");
  for (let y = 0; y < tiles; y++) {
    for (let x = 0; x < tiles; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? a : b;
      ctx.fillRect(x * size, y * size, size, size);
    }
  }
  const img = document.createElement("img");
  img.id = id;
  img.crossOrigin = "anonymous";
  img.src = c.toDataURL("image/png");
  assets.appendChild(img);
  return `#${id}`;
}

// ---------- NEW: lightweight fake God Rays ----------
// Volumetric light shaft as a tapered cylinder + custom shader.
// Usage (created by addGodRays): <a-entity volumetric-ray="..."></a-entity>
if (!AFRAME.components["volumetric-ray"]) {
  AFRAME.registerComponent("volumetric-ray", {
    schema: {
      length: { type: "number", default: 24 },
      radius0: { type: "number", default: 0.12 }, // near origin
      radius1: { type: "number", default: 1.8 }, // far end
      color: { type: "color", default: "#ffb67a" },
      opacity: { type: "number", default: 0.12 },
      timeScale: { type: "number", default: 0.2 }, // flow speed
      target: { type: "vec3", default: { x: 0, y: 2, z: 0 } }, // aim point
    },
    init() {
      const THREE = window.THREE;
      const d = this.data;

      // Tapered cylinder along +Y, we’ll rotate to face target.
      const geo = new THREE.CylinderGeometry(d.radius1, d.radius0, d.length, 16, 1, true);
      geo.translate(0, d.length * 0.5, 0); // base at y=0 (origin), tip at y=length

      // Simple animated noise in fragment for banding
      const mat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        depthTest: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        uniforms: {
          uColor: { value: new THREE.Color(d.color) },
          uOpacity: { value: d.opacity },
          uTime: { value: 0 },
          uTimeScale: { value: d.timeScale },
        },
        vertexShader: `
          varying vec2 vUv;
          varying float vY;
          void main(){
            vUv = uv;
            vY = position.y;            // 0 at base, length at tip
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
          }
        `,
        fragmentShader: `
          varying vec2 vUv;
          varying float vY;
          uniform vec3  uColor;
          uniform float uOpacity;
          uniform float uTime;
          uniform float uTimeScale;

          // cheap 2D noise
          float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
          float noise(vec2 p){
            vec2 i = floor(p), f = fract(p);
            float a = hash(i), b = hash(i+vec2(1,0));
            float c = hash(i+vec2(0,1)), d = hash(i+vec2(1,1));
            vec2 u = f*f*(3.0-2.0*f);
            return mix(a,b,u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
          }

          void main(){
            // radial fade from cylinder side toward center
            float r = abs(vUv.x - 0.5) * 2.0;         // 0 center .. 1 edge
            float radial = smoothstep(1.0, 0.0, r);   // bright center, fade edges

            // longitudinal fade: fade-in from base, fade-out toward tip
            float y01 = clamp(vY / 24.0, 0.0, 1.0);   // 24 is just a typical length; not critical
            float head = smoothstep(0.0, 0.15, y01);
            float tail = smoothstep(1.0, 0.65, y01);
            float axial = head * tail;

            // soft animated banding
            float n = noise(vec2(vUv.x*3.0, (vUv.y + uTime * uTimeScale)*2.0));
            float bands = mix(0.85, 1.0, n);

            float a = uOpacity * radial * axial * bands;
            if (a < 0.01) discard;

            gl_FragColor = vec4(uColor, a);
          }
        `,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.frustumCulled = true;
      this.el.setObject3D("mesh", mesh);

      // Aim toward target
      const obj = this.el.object3D;
      const tgt = new THREE.Vector3(d.target.x, d.target.y, d.target.z);
      const dir = new THREE.Vector3().subVectors(tgt, obj.position).normalize();
      const yaw = Math.atan2(dir.x, dir.z);
      const pitch = Math.asin(dir.y);
      obj.rotation.set(-pitch, yaw, 0);
    },
    tick(t, dt) {
      const m = this.el.getObject3D("mesh");
      if (!m) return;
      const mat = m.material;
      if (mat && mat.uniforms && mat.uniforms.uTime) {
        mat.uniforms.uTime.value = (t || 0) * 0.001;
      }
    },
    remove() {
      this.el.removeObject3D("mesh");
    },
  });
}

// ---------- NEW: SSAO postprocessing (best-effort, optional) ----------
export function enableSSAO(sceneEl, { kernelRadius = 16, minDistance = 0.0001, maxDistance = 0.1 } = {}) {
  const scene = sceneEl.object3D;
  const renderer = sceneEl.renderer;
  const camera = sceneEl.camera;

  if (typeof THREE.EffectComposer === "undefined" || typeof THREE.RenderPass === "undefined" || typeof THREE.SSAOPass === "undefined") {
    console.warn("[SSAO] EffectComposer/SSAOPass not available — skipping.");
    return;
  }

  try {
    const composer = new THREE.EffectComposer(renderer);
    const rp = new THREE.RenderPass(scene, camera);
    const ssao = new THREE.SSAOPass(scene, camera, sceneEl.canvas.width, sceneEl.canvas.height);

    ssao.kernelRadius = kernelRadius;
    ssao.minDistance = minDistance;
    ssao.maxDistance = maxDistance;

    composer.addPass(rp);
    composer.addPass(ssao);

    // Replace default render with composer
    const origRender = sceneEl.render.bind(sceneEl);
    sceneEl.render = function (time, dt) {
      rp.camera = sceneEl.camera;
      ssao.camera = sceneEl.camera;
      composer.setSize(sceneEl.canvas.width, sceneEl.canvas.height);
      composer.render(dt);
    };

    // Keep composer sized
    sceneEl.addEventListener("rendererresize", () => {
      composer.setSize(sceneEl.canvas.width, sceneEl.canvas.height);
    });

    console.log("[SSAO] enabled");
  } catch (err) {
    console.warn("[SSAO] failed to initialize — skipping.", err);
  }
}

// ---------- Main: build world ----------
export async function buildWorld({
  scene,
  assets,
  root,
  projects,
  useAllModels = true,
  ringRadius = 4,
  innerRadius = 2,
  yJitter = 0.2,
  scale = 0.8,
}) {
  if (!assets || !root) throw new Error("Missing assets or root");

  // Preload GLBs
  const modelIds = GLB_FILES.map((name, idx) => {
    const id = `m${idx}`;
    const url = MODEL_BASE + encodeURIComponent(name);
    return addAssetItem(assets, id, url);
  });

  // Preload textures
  const texGen = textureIdsGenerator(assets, projects);

  // Wait for <a-assets> to finish
  await new Promise((resolve) => {
    if (assets.hasLoaded) return resolve();
    assets.addEventListener("loaded", resolve, { once: true });
  });

  // Decide how many to place
  const N = useAllModels ? modelIds.length : Math.min(modelIds.length, 48);

  // Build positions (two rings + inner scatter)
  const outer = ringPositions(Math.ceil(N * 0.5), ringRadius);
  const inner = ringPositions(Math.ceil(N * 0.3), innerRadius, 0.05);
  const left = ringPositions(Math.max(0, N - outer.length - inner.length), (innerRadius + ringRadius) * 0.5, 0.1);
  const positions = [...outer, ...inner, ...left].slice(0, N).map((p) => jitter(p, 0.9, yJitter));

  // Spawn entities
  for (let i = 0; i < N; i++) {
    const ent = document.createElement("a-entity");
    ent.setAttribute("position", positions[i]);
    ent.setAttribute("rotation", `0 ${(Math.random() * 360) | 0} 0`);
    ent.setAttribute("scale", `${scale} ${scale} ${scale}`);
    ent.setAttribute("shadow", "cast: true; receive: true");

    // Model
    ent.setAttribute("gltf-model", modelIds[i]);

    // Project texture (round-robin)
    const texId = texGen.next().value;
    ent.setAttribute("apply-project-texture", `src: ${texId}; roughness: 1; metalness: 0`);

    root.appendChild(ent);
  }

  // Optional: add a few feature items near center
  const featureIdx = ["Kitchen Table.glb", "Fridge.glb", "Oven.glb", "Stove.glb"].map((n) => GLB_FILES.indexOf(n)).filter((i) => i >= 0);

  featureIdx.forEach((idx, k) => {
    const e = document.createElement("a-entity");
    e.setAttribute("position", `${-2 + k * 1.8} 0 ${-2 + (k % 2) * 1.4}`);
    e.setAttribute("rotation", `0 ${k * 45} 0`);
    e.setAttribute("scale", `${scale * 1.1} ${scale * 1.1} ${scale * 1.1}`);
    e.setAttribute("shadow", "cast: true; receive: true");
    e.setAttribute("gltf-model", modelIds[idx]);
    e.setAttribute("apply-project-texture", `src: ${texGen.next().value}; roughness: 1; metalness: 0`);
    root.appendChild(e);
  });
}
