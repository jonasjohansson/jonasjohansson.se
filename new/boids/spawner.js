// spawner.js — loads textures and spawns primitives near the center.

export async function spawnEntities({
  world,
  assets,
  projects,
  count = 200, // default now 200
  spawnRadiusXZ = 12,
  spawnHeightMin = 3,
  spawnHeightMax = 12,
}) {
  // wait for world component to exist
  async function waitForComponent(el, name) {
    if (el.components && el.components[name]) return el.components[name];
    if (!el.hasAttribute(name)) el.setAttribute(name, "");
    return new Promise((resolve) => {
      const onInit = (e) => {
        if (e.detail && e.detail.name === name) {
          el.removeEventListener("componentinitialized", onInit);
          resolve(el.components[name]);
        }
      };
      el.addEventListener("componentinitialized", onInit);
    });
  }

  const worldCmp = await waitForComponent(world, "boid-world");

  // build texture list from projects and preload into a-assets
  const textures = projects.flatMap((p) => [p.hero, ...(p.images || [])]);
  const texIds = [];
  textures.forEach((url, i) => {
    const id = `tex${i}`;
    const img = document.createElement("img");
    img.setAttribute("id", id);
    img.crossOrigin = "anonymous";
    img.src = url;
    assets.appendChild(img);
    texIds.push("#" + id);
  });

  const shapes = ["box", "sphere", "cylinder", "cone", "dodecahedron", "torus", "octahedron"];
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];
  const rand = (a, b) => a + Math.random() * (b - a);

  for (let i = 0; i < count; i++) {
    const pr = projects[i % projects.length];
    const shape = pick(shapes);

    // random disc (√ for central density)
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.sqrt(Math.random()) * spawnRadiusXZ;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = rand(spawnHeightMin, spawnHeightMax);

    const rotY = rand(0, 360).toFixed(2);
    // SCALE −50% (was ~0.8–1.3)
    const s = rand(0.4, 0.65).toFixed(2);

    const ent = document.createElement("a-entity");
    ent.classList.add("pickable");
    ent.setAttribute("position", `${x.toFixed(2)} ${y.toFixed(2)} ${z.toFixed(2)}`);
    ent.setAttribute("rotation", `0 ${rotY} 0`);
    ent.setAttribute("scale", `${s} ${s} ${s}`);
    ent.setAttribute("shadow", "cast: true; receive: true");
    ent.setAttribute("geometry", { primitive: shape });
    ent.setAttribute("material", `src: ${pick(texIds)}; color: #ffffff; metalness: 0; roughness: 1`);

    // start in air; minAltitude ensures no below-ground
    ent.setAttribute("boid", { ground: false, minAltitude: 0.5 });

    // optional metadata
    ent.setAttribute("project-info", { title: pr.title, description: pr.description });

    // hover focus works in ground mode
    ent.addEventListener("mouseenter", () => {
      if (!worldCmp.isFlocking) worldCmp.setHovered(ent);
    });
    ent.addEventListener("mouseleave", () => {
      if (!worldCmp.isFlocking) worldCmp.clearHovered(ent);
    });

    world.appendChild(ent);
    worldCmp.entities.push(ent);
  }
}
