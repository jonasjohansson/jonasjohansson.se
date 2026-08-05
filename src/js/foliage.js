// Foliage shadows — a fixed WebGL overlay that casts slow, dappled tree
// shadows over the page, like sun through a canopy. Multiplied over the
// light theme; sparse warm light pools (screen) over the dark theme.
//
// ONE pass, over everything. It was once two, bracketing the media layer so
// photographs took less of the light than paper did — but any element the
// light does not reach equally becomes a visible island: the header's white
// title box sat above both passes and stayed pure white against a shaded
// page, reading as a rectangle. Shadows fall on whatever is in front of them,
// so this sits above the whole stack at one strength and everything below it
// — paper, type, pictures, chrome — takes exactly the same light.
// Progressive enhancement: no WebGL, no effect.

const FPS_INTERVAL = 1000 / 30;
const RES_SCALE = 0.75; // of CSS pixels, independent of devicePixelRatio
const BLEED = 80; // horizontal overhang; must match --foliage-bleed in foliage.css
const MARGIN = 500; // vertical slack above and below the viewport, so scrolling
// rarely reaches an edge of the drawn window
const MAX_DIM = 1500; // cap the buffer's larger dimension
const TIME_PERIOD = 3600; // re-seed period so float32 sin-hash precision holds up
const FADE_S = 10; // crossfade at each period fold, so the wind never reverses

const VERT = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

const FRAG = `
precision highp float;

uniform vec2 u_res;
uniform float u_px; // buffer px per CSS px
uniform float u_time;
uniform float u_seed;
uniform float u_time2; // previous period, only sampled while u_blend < 1
uniform float u_seed2;
uniform float u_blend;
uniform float u_dark;
uniform float u_scroll; // page offset in css px, so the light lies on the document
uniform float u_boost; // ?foliage=boost — amplified debug rendering

// Scene time and per-period seed offset, set in main before evaluating a scene
float T;
float SD;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

vec2 hash2(vec2 p) {
  return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.03 + 17.7;
    a *= 0.5;
  }
  return v;
}

// Canopy density carries energy at every scale — with a textbook 1/2 falloff
// the fine octaves vanish and the silhouette reads as fog, so these decay
// slowly and the 100-300px structure survives into the shade outline as
// filaments and limbs. Normalised, so the mean stays at 0.5.
float fbmRough(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  float n = 0.0;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    n += a;
    p = p * 2.11 + 17.7;
    a *= 0.68;
  }
  return v / n;
}

// ---------------------------------------------------------------------------
// The branch skeleton.
//
// A tree shadow only reads as a tree if the leaf mass is visibly HUNG on
// something. Density fields cannot do that: they make clumps denser here and
// sparser there, but nothing in them says WHICH clumps belong to each other,
// so the result is leaves floating in the air. What is needed is an actual
// curve to attach to.
//
// The median isoline of a warped noise field is exactly that: a set of
// wandering, forking curves with no lattice in them. Better, it is an IMPLICIT
// curve, so one evaluation answers all three questions at once. Write
// f = noise(p) - 0.5; then |f| / |grad f| is a first-order distance to the
// curve (so leaves can cluster on it and thin out away from it), the sign of f
// says which side we are on (so the leaf lattice can be pulled onto it), and
// the perpendicular of grad f is the curve's own direction (so a spray lies
// along its branch instead of pointing at random).
//
// Returned as: .x signed distance in css px, .yz unit tangent.
vec3 filament(vec2 p, float scale, float sd) {
  vec2 q = p / scale + sd;
  const float e = 0.16;
  float f0 = noise(q);
  vec2 g = vec2(noise(q + vec2(e, 0.0)) - f0, noise(q + vec2(0.0, e)) - f0) / e;
  // The cubic interpolant's gradient vanishes at the noise lattice corners,
  // which would send the distance estimate to infinity on a grid. Flooring the
  // magnitude biases those points toward "on the line" — a locally fatter
  // filament, which is invisible, rather than a grid of holes, which is not.
  float gl = max(length(g), 0.40);
  return vec3(clamp((f0 - 0.5) / gl, -1.6, 1.6) * scale, -g.y / gl, g.x / gl);
}

// One filament drawn as its own shadow: a firm core with a bounded penumbra,
// killed off by a life field so that half of every curve is simply ABSENT.
// That last part is the whole game — an unbroken isoline network closes into
// cells and reads as cracked glass or a river delta. Broken, what survives are
// arcs: twigs that enter the frame, wander, fork, thin out and end.
float strand(float d, float w, float soft, float life) {
  return (1.0 - smoothstep(w, w + soft, abs(d))) * life;
}

mat2 rot(float a) {
  float c = cos(a);
  float s = sin(a);
  return mat2(c, -s, s, c);
}

// ---------------------------------------------------------------------------
// Wind as a RIGID TRANSFORM — not as an animated noise domain.
//
// Scrolling time through a domain warp is the cheap way to make a canopy move,
// and it is the reason such things look like oil on water: every shape is
// continuously re-melted, so nothing keeps its identity from one second to the
// next. A canopy in wind does the exact opposite. A limb ROTATES about where it
// is attached and carries its entire spray with it, unchanged. What changes on
// the wall is which layer is in front of which — near foliage slides across a
// far gap and closes it — not the shape of any leaf.
//
// So every field below is FROZEN in its own space, and only the sampling point
// moves. Each depth gets a translation plus a rotation about an anchor off the
// top of the page, which is where a limb would join the tree.
// ---------------------------------------------------------------------------

// The sun's projection: one shared rotation and squeeze, so sun images land
// slightly elongated on the wall. Linear, so it can be applied after the wind.
vec2 toSun(vec2 c) {
  const float SA = -0.55;
  vec2 r = vec2(c.x * cos(SA) + c.y * sin(SA), c.y * cos(SA) - c.x * sin(SA));
  r.x *= 0.78;
  return r;
}

// One depth layer's wind state: a slow bough band (~9-12s) and a fast flick
// band (~2-3s), combined into a translation in css px plus a rotation angle.
// The phase is a per-layer CONSTANT, never a field — a phase that varies from
// pixel to pixel is a deformation wearing a rigid motion's clothes.
vec3 layerWind(vec2 dir, float ph, float amp, float rotAmp, float gust) {
  float slow = 0.62 * sin(T * 0.53 + ph) + 0.38 * sin(T * 0.71 + ph * 1.9 + 1.7);
  float fast = 0.5 * sin(T * 1.93 + ph * 3.1) + 0.5 * sin(T * 2.63 + ph * 5.3 + 0.8);
  float g = 0.38 + 0.62 * gust;
  vec2 perp = vec2(-dir.y, dir.x);
  vec2 tr = dir * (slow * amp * g) + (dir * 0.72 + perp * 0.69) * (fast * amp * 0.40 * g);
  return vec3(tr, (slow * 0.74 + fast * 0.26) * rotAmp * g);
}

// Rotate about the anchor, then translate. The angle is zero at the anchor,
// peaks at the reach distance, and decays beyond it — a cantilever, so the base holds
// still and the tips travel. Decaying rather than growing also bounds the
// DISPLACEMENT (r * angle tends to 2 * rotAmp * reach), which matters because
// the light is glued to the document: a page ten screens tall must not swing
// ten times as far at the bottom as at the top. Far from the anchor the map
// degenerates to a pure translation, which is as rigid as it gets.
//
// The angle varies over the scale of the reach — order 1e-5 radians per px — so
// across one leaf clump this is a rotation to five decimal places. It bends at
// branch scale and is rigid at leaf scale, which is exactly what wood does.
vec2 windXform(vec2 p, vec2 anchor, vec3 w, float reach) {
  vec2 v = p - anchor;
  float r2 = dot(v, v);
  float a = w.z * 2.0 * reach * sqrt(r2) / (r2 + reach * reach);
  float c = cos(a);
  float s = sin(a);
  return anchor + vec2(v.x * c - v.y * s, v.x * s + v.y * c) + w.xy;
}

// ---------------------------------------------------------------------------
// Komorebi as pinhole optics, light-first: the ground state is CONNECTED
// SHADE, and every gap in the canopy projects a round image of the sun — a
// soft coin whose penumbra grows with the gap's height. Coins accumulate
// (saturating add of light) toward paper white; crisp near-leaf silhouettes
// cut back into the bright pools. Nothing slides: the openness field and each
// coin's occlusion are what animate, so pools swell, merge, split and close.
// ---------------------------------------------------------------------------

// Territory: the canopy's largest structure — which side of the page the tree
// has left open. Features run 1.5-3 viewport widths, so the frame is never an
// even field: one region lies blown open while another stays dense lacework.
// This one term does drift (slowly, ~2 css px/s), because in the reference the
// bright territory visibly advances across the wall over tens of seconds —
// the sun moving relative to the canopy. Everything finer morphs in place.
float territory(vec2 sp) {
  vec2 p = (sp + vec2(T * 1.1, T * -0.6)) / 1150.0 + SD * 0.31;
  return (noise(p) + 0.55 * noise(p * 2.17 + 4.9) + 0.3 * noise(p * 4.3 + 1.7)) / 1.85 - 0.5;
}

// Canopy openness: where gaps let sun through. Territory biases whole regions
// open or shut; a mid-scale field (features ~600-900 css px) carves the actual
// gaps.
//
// Two warp scales do the real work of making this read as a tree. The coarse
// one bends whole regions; the fine one frays their outlines into branching,
// tapering filaments, so shade arrives as connected lacework with limbs and
// points rather than a field of smooth blobs. Warping, not thresholding, is
// what separates an organic silhouette from a procedural one.
//
// The warp is SPATIAL ONLY — no time anywhere in it. Advancing a domain warp
// is what makes a canopy melt: the gaps stop being holes that something moved
// in front of and become puddles that flow into each other. Frozen, this field
// is a fixed photograph of a canopy, and it is the caller's job to move where
// the photograph is sampled from.
float openness(vec2 sp) {
  vec2 w1 = vec2(noise(sp / 430.0 + SD),
                 noise(sp / 430.0 + SD + 7.7)) - 0.5;
  vec2 w2 = vec2(noise(sp / 155.0 + w1 * 1.6 + SD + 3.3),
                 noise(sp / 155.0 + w1 * 1.6 + SD + 11.1)) - 0.5;
  float mid = fbmRough(sp / 620.0 + w1 * 0.98 + w2 * 0.28 + SD) - 0.5;
  // Contrast-expanded, so the canopy commits: decisively open gaps inside
  // decisively closed shade, rather than a lukewarm everywhere-a-little field.
  // Territory only biases — if it leads, the page reads as one smooth ramp.
  return (mid * 2.30 + territory(sp) * 0.72) * 1.10 + 0.56;
}

// One scale of sun coins on a jittered grid. cell in (sun-space) css px;
// r0..r1 the radius range in cell units; soft is where the penumbra begins
// (0 = gaussian-soft high gap, 0.55 = crisper low gap); rate the breathing
// tempo. Each coin needs the canopy above it to be open: hashed thresholds
// stagger arrivals and a slow detuned breath carries coins over the line and
// back, so they pop in, swell, shrink and close out of step — never a sprinkle,
// because open clusters them into archipelagos inside the shade.
// wob is the edge irregularity: a real gap image is never a perfect disc, so
// two angular harmonics wobble the rim (more on low crisp gaps, barely on the
// gaussian high ones). Each coin also gets its own orientation + elongation
// jitter on top of the shared sun-axis squeeze, so no two coins share an
// outline or an axis — that is what kills lattice chains and, together with
// the lobed leaf cuts, the repeated eclipse motif.
//
// A coin's OUTLINE is frozen: rim harmonics and radius are pure functions of
// its cell id, with no time in them. A coin that smoothly morphs from one
// outline into another is the single most liquid thing on the page, because
// the eye tracks it as an object and watches the object melt. What still
// breathes is only whether it is there and how much of it is: the canopy
// layers slide over each other and cover it, which is what actually happens.
float coins(vec2 sp, float cell, float r0, float r1, float soft, float rate, float open, float breeze, float wob, float seed) {
  float t = T;
  seed += SD;
  vec2 q = sp / cell;
  vec2 i = floor(q);
  vec2 f = fract(q);
  float acc = 0.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 id = i + g + seed;
      // Jitter past the cell bounds so no lattice alignment survives
      vec2 r = g + hash2(id) * 1.35 - 0.175 - f;
      float thr = 0.50 + 0.34 * hash(id + 5.2);
      float ph = hash(id + 27.3) * 6.283;
      // A whisper of independent breath, well under the openness the moving
      // layers hand in — enough that a still frame is not a dead one, far too
      // little to read as a coin pulsing on its own clock
      float br = sin(t * rate * (0.6 + 0.8 * hash(id + 31.9)) + ph);
      float vis = smoothstep(thr, thr + 0.17, open + 0.035 * br + 0.04 * breeze);
      vec2 rr = rot(6.283 * hash(id + 9.1)) * r;
      rr.x *= mix(0.60, 1.05, hash(id + 15.4));
      // Wide radius spread (biased small) so neighbours never read as a set
      float rad = mix(r0, r1, pow(hash(id + 3.7), 1.6)) * (1.0 + 0.03 * br);
      float d = length(rr) / max(rad, 1e-4);
      float an = atan(rr.y, rr.x);
      d *= 1.0 + wob * (0.6 * sin(2.0 * an + ph) + 0.4 * sin(5.0 * an + ph * 2.3));
      float p = 1.0 - smoothstep(soft, 1.0, d);
      acc += vis * p * p;
    }
  }
  return acc;
}

// Near leaves: crisp sprays from low branches, the sharp half of the
// sharp-inside-soft signature. Each clump is a trifoliate SPRIG — two opposite
// leaflets on a short rachis and one at the tip — laid out along the twig's own
// direction. That layout is doing real work: a rosette of leaflets at random
// angles reads as a flower or a splat, whereas leaflets in opposite pairs up a
// stem is the compound leaf the reference actually casts, and it states "this
// grew on something" in a way no scatter of marks can.
//
// tang is the direction of the actual filament this patch of foliage hangs
// on, handed in from the skeleton — so a spray runs WITH its branch. Only a
// modest per-clump scatter is added on top: enough that no two clumps are the
// same mark, not so much that the alignment is lost. dens likewise is not a
// free-floating density field but PROXIMITY TO THE NEAREST TWIG, so clumps
// fire densely along the filaments and die out between them. Together those
// two are what turn a sprinkle of dark marks — which always reads as confetti
// dropped on the page — into sprays of leaves strung along wood.
// Clumps flutter at 0.5-1.5 Hz, stirred by gusts. That flutter is a rigid
// translate-and-rock of the whole sprig — a leaf turning on its petiole — and
// it is the ONLY motion a leaf has of its own. Its position otherwise comes
// from the swayed twig space it is sampled in, so it always moves AROUND where
// its branch put it and never slides free of it. Nothing in the leaflet's own
// outline is a function of time; a leaf that changes shape is not a leaf.
// across is the perpendicular stretch the pull-onto-the-filament has already
// applied to screen space; the clump shape divides it back out, so leaves can
// be dragged hard onto their twig without smearing into slivers across it.
float leaves(vec2 sp, float breeze, float branchNear, vec2 tang, float dens, float across, float seed) {
  float t = T;
  seed += SD;
  vec2 q = sp / 46.0;
  vec2 i = floor(q);
  vec2 f = fract(q);
  float famp = 0.030 + 0.085 * max(breeze - 0.30, 0.0);
  float sil = 0.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 id = i + g + seed;
      // Presence is decided FIRST by how close this patch is to a twig. A
      // free-floating density field can make leaves thicker here and thinner
      // there, but it can never say which stem they are on, and the eye reads
      // that immediately as leaves hanging in mid air. Gated on proximity, a
      // clump only exists where there is wood to hang it from: dens near 1 on
      // a filament fires nearly every cell, dens near 0 fires almost none.
      float gate = 0.90 - 0.14 * branchNear - 1.02 * dens;
      float pres = step(0.12, hash(id + 13.1)) * smoothstep(gate, gate + 0.15, noise(id * 0.21 + seed) + 0.22 * branchNear);
      float fr = 3.2 + 6.0 * hash(id + 51.3); // 0.5-1.5 Hz, detuned per clump
      float ph = hash(id + 41.7) * 6.283;
      // Blur class: a clump's distance from the wall, drawn per clump so a
      // gauzy high-canopy blob and a razor-crisp near leaf can sit side by
      // side in one frame. Distance also makes it bigger and fainter — a
      // blurred shadow has spread its light loss over more wall.
      float blur = pow(hash(id + 91.4), 2.0);
      float edge = 0.04 + 0.48 * blur;
      vec2 r = g + hash2(id) - f + famp * vec2(sin(t * fr + ph), cos(t * fr * 1.13 + ph * 1.6));
      // Spray frame: the twig's own direction, scattered a little per clump and
      // rocking a few degrees in the flutter. Built from the tangent vector
      // rather than an angle, because a line has no orientation — mixing
      // angles would wrap and snap wherever the gradient's sign flips.
      // The rock is a rotation of the WHOLE sprig, so the sprig turns; every
      // leaflet in it keeps its own outline and its place on the rachis.
      float sc = (hash(id + 8.8) - 0.5) * mix(1.35, 0.62, branchNear) + 0.19 * sin(t * fr * 0.6 + ph);
      float cs = cos(sc);
      float sn = sin(sc);
      vec2 tc = vec2(tang.x * cs - tang.y * sn, tang.x * sn + tang.y * cs);
      vec2 rr = vec2(dot(r, tc), dot(r, vec2(-tc.y, tc.x)));
      // Squashed across the twig, so the clump reads as a spray running along
      // the branch. It has to out-squash the lattice's pull onto the filament,
      // which stretches screen space a little in this same direction.
      rr.y *= across * (0.94 + 0.34 * hash(id + 23.5));
      // Wide, small-biased size spread so a clump is never a repeat of its
      // neighbour — but with a real FLOOR under it. Clumps allowed to shrink
      // toward nothing land under a pixel at render scale and smear into
      // commas and brush strokes, which is what turns a spray of leaves into
      // a spray of ink. A leaflet has to be several pixels across to read as
      // a leaf at all.
      float rad = (0.34 + 0.56 * pow(hash(id + 3.7), 1.5)) * (1.0 + 0.45 * blur);
      // The sprig: leaflets 1 and 2 opposite each other partway up the rachis,
      // leaflet 0 at its tip. Placed in the twig frame, so the whole sprig
      // points down its own branch.
      float c = 0.0;
      for (int k = 0; k < 3; k++) {
        float fk = float(k);
        float h = hash(id + 60.0 + fk * 3.1);
        float side = fk < 0.5 ? 0.0 : (fk < 1.5 ? 1.0 : -1.0);
        float run = fk < 0.5 ? 0.88 : 0.22;
        // Set close enough that the three leaflets touch: a compound leaf is
        // one silhouette with notches, not three separate dots in a row.
        vec2 rk = rr - rad * vec2(run * (0.85 + 0.35 * h), side * (0.56 + 0.22 * h));
        float an = atan(rk.y, rk.x);
        // Leaflets are near-round with only a whisper of rim harmonic. Strong
        // harmonics would make each clump a legible star, and a legible shape
        // repeated a hundred times across a page is a motif, not foliage.
        float rl = rad * (0.55 - 0.15 * hash(id + 83.0 + fk * 2.3))
                 * (1.0 + 0.11 * sin(3.0 * an + ph + fk * 2.1)
                        + 0.07 * sin(6.0 * an + ph * 2.7));
        c = max(c, smoothstep(rl + edge * rad * 0.5, rl - edge * rad, length(rk)));
      }
      sil = max(sil, pres * c * (1.0 - 0.38 * blur));
    }
  }
  return sil;
}

vec3 scene(vec2 css) {
  float t = T;
  vec2 cssDim = u_res / u_px;

  // Traveling gusts: an amplitude wave with spatial phase along the wind
  // line, so the wind visibly arrives on one side of the page, opens the
  // canopy as it crosses, and leaves the other — a crest every ~10-20s.
  vec2 wdir = normalize(vec2(0.89, 0.45));
  float along = dot(css, wdir);
  float gust = smoothstep(0.40, 0.74, fbm(vec2(along / 900.0 - t * 0.085, t * 0.03) + 2.4 + SD));
  float breeze = 0.30 + 0.70 * gust;

  // ---- Three depths, three rigid transforms --------------------------------
  // Everything below this point is a frozen function of the coordinate handed
  // to it. The picture changes only because these three frames MOVE, and they
  // move by different amounts in different directions — so the layers slide
  // across one another and genuinely occlude. That crossing is where the
  // opening and closing of gaps comes from: a near leaf moves off a gap and
  // the gap appears, which is what really happens on a wall. Nothing anywhere
  // deforms in order to produce it.
  //
  // Far is the high canopy mass: heavy, barely stirs. Near is the tree in
  // front of it — wood, twigs and every leaf on them — which travels furthest
  // and rotates most.
  // Amplitudes deliberately small: on a still page any motion reads as much
  // larger than it measures, and a canopy that travels far enough to notice
  // stops looking like weather and starts looking like an effect.
  vec3 wFar = layerWind(normalize(rot(-0.27) * wdir), 0.7 + SD * 0.31, 4.0, 0.0022, gust);
  vec3 wMid = layerWind(wdir, 2.9 + SD * 0.57, 8.5, 0.0050, gust);
  vec3 wNear = layerWind(normalize(rot(0.31) * wdir), 4.6 + SD * 0.83, 14.0, 0.0095, gust);
  // Anchors sit off the top of the first screen: a limb pivots where it joins
  // the tree, so a frame swings about a point outside it rather than sliding
  // bodily like a pane of glass.
  vec2 cFar = windXform(css, vec2(cssDim.x * 0.74, cssDim.y * 1.45), wFar, 1500.0);
  vec2 cMid = windXform(css, vec2(cssDim.x * 0.44, cssDim.y * 1.15), wMid, 980.0);
  vec2 cNear = windXform(css, vec2(cssDim.x * 0.18, cssDim.y * 0.92), wNear, 720.0);
  vec2 spFar = toSun(cFar);
  vec2 spMid = toSun(cMid);
  vec2 spNear = toSun(cNear);

  // Wood as actual occluding silhouettes, not just density bias: a wandering
  // near-vertical trunk column and two boughs leaving it — bands with a firm
  // core and a bounded penumbra, so a coin crossing one is visibly cut in two.
  // Each also casts a broad soft halo used only to bias the canopy shut.
  //
  // All three are built in cNear, the tree's own frame, and every wobble along
  // them is frozen. Previously the trunk's centreline was a function of time,
  // which made it writhe like a snake in place; now it is a fixed crooked
  // column that the wind carries bodily, which is what a trunk does.
  float txc = cssDim.x * 0.42 + 64.0 * (noise(vec2(cNear.y / 520.0, SD)) - 0.5);
  float dx = cNear.x - txc;
  float tw = 16.0 + 9.0 * noise(vec2(cNear.y / 210.0, SD + 4.4));
  float trunkOcc = 1.0 - smoothstep(tw, tw + 58.0, abs(dx));
  float trunkSoft = exp(-dx * dx / 22000.0);
  // Bough one: leaves the trunk mid-page heading up-right, tapering.
  vec2 bp = cNear - cssDim * vec2(0.44, 0.62);
  vec2 bdir = normalize(vec2(0.90, 0.30));
  float alongB = dot(bp, bdir);
  float acrossB = dot(bp, vec2(-bdir.y, bdir.x)) + 34.0 * (noise(vec2(alongB / 360.0, SD + 3.1)) - 0.5);
  float bw = mix(10.0, 4.5, smoothstep(0.0, 1000.0, alongB));
  float boughOcc = (1.0 - smoothstep(bw, bw + 40.0, abs(acrossB))) * smoothstep(-60.0, 80.0, alongB);
  float boughSoft = exp(-acrossB * acrossB / 26000.0) * smoothstep(-140.0, 60.0, alongB);
  // Bough two: thinner, up-left from lower on the trunk.
  vec2 b2p = cNear - cssDim * vec2(0.42, 0.30);
  vec2 b2dir = normalize(vec2(-0.78, 0.40));
  float alongB2 = dot(b2p, b2dir);
  float acrossB2 = dot(b2p, vec2(-b2dir.y, b2dir.x)) + 26.0 * (noise(vec2(alongB2 / 300.0, SD + 8.6)) - 0.5);
  float b2w = mix(7.0, 3.0, smoothstep(0.0, 800.0, alongB2));
  float bough2Occ = (1.0 - smoothstep(b2w, b2w + 30.0, abs(acrossB2))) * smoothstep(-50.0, 70.0, alongB2);
  float bough2Soft = exp(-acrossB2 * acrossB2 / 16000.0) * smoothstep(-120.0, 50.0, alongB2);
  float wood = max(trunkOcc, max(0.72 * boughOcc, 0.58 * bough2Occ));
  float branchNear = clamp(1.3 * boughSoft + 1.3 * bough2Soft + 0.5 * trunkSoft, 0.0, 1.0);
  vec2 boughDir = bough2Soft > boughSoft ? b2dir : bdir;

  // ---- Skeleton ------------------------------------------------------------
  // Three filament levels below the wood, each warped by the FLOW of the one
  // above it, so twigs leave branches at shallow angles instead of crossing
  // them at random. That nesting is what makes the network read as one tree
  // rather than three unrelated meshes laid over each other.
  //
  // Critically, all three are evaluated in ONE space — spNear, the tree's own
  // frame — so the entire skeleton is a single frozen picture that the wind
  // carries as a body. Giving each level its own share of the sway, as before,
  // seemed physical (a bough is stiff, a twig gives) but it slid the levels
  // through each other: the twig network crept off the bough it grew from, and
  // the nesting term then reflowed the whole mesh as the levels drifted apart.
  // A tree whose branches slide relative to their trunk is not a tree, and a
  // mesh that reflows is the liquid look itself. The difference in whip is
  // recovered from the cantilever instead — tips are further from the anchor
  // than the trunk is, so they travel further, and the tree stays one object.
  vec2 wC = vec2(noise(spNear / 560.0 + SD + 1.3), noise(spNear / 560.0 + SD + 6.7)) - 0.5;
  vec2 spB = spNear + wC * 320.0;
  vec3 fB = filament(spB, 355.0, SD + 2.2);
  vec2 spT = spNear + wC * 155.0 + fB.yz * 54.0;
  vec3 fT = filament(spT, 138.0, SD + 6.4);
  vec2 spF = spNear + fT.yz * 22.0;
  vec3 fF = filament(spF, 57.0, SD + 13.9);

  // Where the foliage hangs is now a question about the skeleton: distance to
  // the nearest filament, not an unrelated blob field. Two things are being
  // built at once, and the reference has both — a CHAIN of small clumps
  // running along each twig, and a THICKET wherever a filigree crosses a twig,
  // which is where a real branch carries its heaviest spray. Hence the product
  // terms as well as the sums. A broad regional field on top leaves some
  // branch systems coming through nearly bare.
  float thick = smoothstep(0.30, 0.72, fbm(spNear / 380.0 + SD + 9.3));
  // The bands are generous — a twig carries foliage a good way out from
  // itself, and in the reference a branch system reads as a MASS of leaves
  // with stem glimpsed inside it, not as a bead chain threaded on a wire.
  // Too tight a band is as wrong as no band at all: it just moves the failure
  // from floating leaves to leaves painted on a line.
  float onTwig = smoothstep(76.0, 3.0, abs(fT.x));
  float onFine = smoothstep(34.0, 2.0, abs(fF.x));
  float onBough = smoothstep(96.0, 6.0, abs(fB.x));
  float lace = clamp((0.62 * onTwig + 0.34 * onFine + 0.95 * onTwig * onFine
                      + 0.34 * onBough * onFine + 0.34 * branchNear)
                     * (0.62 + 0.70 * thick), 0.0, 1.0);
  // The canopy's mass rides with the skeleton too, so the sky BETWEEN branch
  // systems is genuinely open rather than evenly veiled everywhere.
  float canopy = smoothstep(120.0, 10.0, abs(fT.x)) * (0.45 + 0.55 * thick);

  // One noise per level does double duty as that level's life field and its
  // width, so a filament necessarily thins as it dies out — which is exactly
  // how a twig ends...
  float vB = noise(spB / 330.0 + SD + 51.0);
  float vT = noise(spT / 150.0 + SD + 61.0);
  float vF = noise(spF / 72.0 + SD + 71.0);
  // ...and a second, finer sample per level earns its cost twice over: it
  // KINKS the drawn line sideways and it beats the width along the run. Both
  // matter, because the isoline of a single smooth noise is a clean arc, and
  // clean arcs of even gauge read as wire strung across the page — the exact
  // failure that separates a twig from a scratch.
  float kB = noise(spB / 88.0 + SD + 81.0) - 0.5;
  float kT = noise(spT / 46.0 + SD + 91.0) - 0.5;
  float kF = noise(spF / 23.0 + SD + 101.0) - 0.5;
  float carry = smoothstep(80.0, 14.0, abs(fT.x));
  // Level one is a BOUGH — a wide soft band rather than a line, because at
  // this scale a crisp filament is a cable, not a limb. Level two is the twig
  // that actually carries foliage: thin and crisp. Level three is filigree,
  // barely there, and only where there is a twig near enough to carry it.
  // Each width is multiplied by its own life, so a strand does not simply stop
  // where the life field runs out — it narrows to nothing first, which is the
  // difference between a twig ending and a wire being cut.
  // Bitten hard, so a bough is present for a stretch and then simply gone.
  // The level-one isolines are 350px curves; left continuous they close into
  // cells and the page reads as cracked glass, or at best as vines.
  float lifeB = smoothstep(0.44, 0.72, vB);
  float lifeT = smoothstep(0.38, 0.66, vT);
  float lifeF = smoothstep(0.48, 0.76, vF);
  // A visible hierarchy, tapering in weight and in darkness down the levels:
  // a bough is the widest and the FAINTEST, the twig below it is thin and firm
  // and is what actually carries foliage, and the filigree is finer and
  // quieter again, only where a twig is near enough to carry it.
  float lB = strand(fB.x + 52.0 * kB, (1.5 + 3.0 * vB) * (0.40 + 0.70 * lifeB), 4.5, lifeB);
  float lT = strand(fT.x + 17.0 * kT + 5.0 * kF, (0.7 + 2.1 * vT) * (0.35 + 0.75 * lifeT), 2.4, lifeT);
  float lF = strand(fF.x + 6.0 * kF, (0.4 + 0.9 * vF) * (0.4 + 0.7 * lifeF), 1.6, lifeF) * (0.30 + 0.80 * carry);
  // Twigs live INSIDE the foliage. In the reference you catch a filament in
  // the gaps between clumps of leaves; you never see one stretched alone
  // across open sky — and a lone smooth arc across open shade is exactly what
  // reads as wire, or worse as cracked glass. So the skeleton is weighted hard
  // by the leaf density and is very nearly absent without it: what survives is
  // the glimpse of stem between clumps, which is all the proof of connection
  // the eye needs and the only part that looks like a plant.
  // The bough level is deliberately the QUIETEST of the three despite being
  // the biggest. Drawn at full strength a network of 350px filaments reads as
  // grey cables or piping laid across the page — the diagrammatic failure. The
  // one bough the eye should be able to follow is the explicit trunk-and-limb
  // silhouette above, which is singular the way a real one is; this level is
  // here to shade underneath the twigs, not to be followed.
  float strands = clamp(0.14 * lB + 0.96 * lT + 0.56 * lF, 0.0, 1.0) * (0.06 + 1.06 * lace);

  // Canopy openness drives everything: gusts open it, wood and skeleton close
  // it. The field itself is frozen; it is sampled through the FAR frame, so
  // the whole near tree — wood, twigs, leaves — slides across it and closes
  // its gaps by covering them. That is the parallax the pattern lives on.
  float open = openness(spFar) + 0.06 * gust
             - 0.28 * canopy - 0.15 * strands
             - 0.22 * trunkSoft - 0.15 * boughSoft - 0.10 * bough2Soft;

  // The widest gaps project their own shape, not a disc: a high gap's sun
  // image IS the gap, blurred by the penumbra. So the top of the light budget
  // comes straight off the openness field — huge, irregular, gauzy pools with
  // connected shade branching between them, and no grid anywhere in them.
  // Kept to the very top of the openness distribution, so it fires as the
  // occasional blown-open pool rather than flooding half the frame and
  // drowning the coin structure underneath it.
  float wide = smoothstep(0.72, 1.00, open);

  // Then sun coins at three gap heights, all gated by the same openness so the
  // bright archipelagos sit inside that shade. High gaps: big, gaussian-soft,
  // near-round, nearly still. Low gaps: small, crisp, ragged, and fluttering —
  // one frame carrying the reference's whole range of blur at once. The small
  // layer also gates on a coarse cluster field, which both keeps it from
  // stringing into chains and gives the lacework its dense and sparse regions.
  float clus = thick;
  // Radii stay well under the cell so the coins do NOT tile the open regions:
  // shade has to survive between them, or the archipelago melts into one wash.
  // Each coin scale belongs to the depth it is a gap in — big gaussian coins
  // to the far canopy, small crisp ones to the near tree — so the three sets
  // travel at three different rates. Coins do not morph; they are covered and
  // uncovered as the layers cross, and their number and size on screen change
  // for that reason alone.
  float acc = 0.55 * wide * wide
            + 1.15 * coins(spFar, 300.0, 0.17, 0.54, 0.26, 0.055, open + 0.02, breeze, 0.06, 0.0)
            + 1.00 * coins(spMid, 160.0, 0.14, 0.50, 0.36, 0.11, open, breeze, 0.13, 5.0)
            + (0.34 + 0.60 * clus) * coins(spNear, 86.0, 0.10, 0.42, 0.62, 0.20, open - 0.05 - 0.10 * (1.0 - clus), breeze, 0.22, 11.0);
  // Saturating add of light: overlapping coins run up to full page white.
  float E = 1.0 - exp(-3.90 * acc);

  // Wood interrupts the light with a firm cut, and so do the twigs — a branch
  // occludes the sun as surely as a leaf does. Drawn thin and crisp against
  // the bright pools, these lines are the visual PROOF of connection: the
  // thing you follow from one clump of leaves to the next.
  E *= 1.0 - 0.80 * wood;
  E *= 1.0 - 0.52 * strands;

  // The leaf lattice is ADVECTED onto the filaments: every sample is displaced
  // along the filament normal toward the curve, so clumps do not merely
  // cluster near the wood, they land on it. A saturating displacement keeps
  // distant foliage from being dragged the whole way in and keeps the map
  // smooth. R below is each pull's reach in css px — 40 for the twig, 17 for
  // the filigree.
  float qT = 1.0 + fT.x * fT.x / 1600.0;
  float qF = 1.0 + fF.x * fF.x / 289.0;
  vec2 pT = vec2(fT.z, -fT.y) * (fT.x * inversesqrt(qT));
  vec2 pF = vec2(fF.z, -fF.y) * (fF.x * inversesqrt(qF));
  // Compressing space toward a line stretches what is drawn in it ACROSS the
  // line by exactly 1 / (1 - k d(sat)/dd) — which near a twig would smear every
  // clump into a sliver lying the wrong way. The factor is known in closed
  // form, so hand it to the clumps and let them divide it straight back out;
  // that buys a hard pull with no smearing at all.
  // Enough pull that a spray visibly sits ON its twig, not so much that the
  // foliage is crushed onto the centreline. Past about a third the clumps
  // stop being leaves near a branch and become paint applied to a curve.
  const float pullT = 0.30;
  const float pullF = 0.24;
  // Sampled from the SAME frame the filaments were drawn in, with no extra
  // offset of its own. Any offset here, however small, is the leaves sliding
  // off the twig they were just pulled onto.
  vec2 spLeaf = spF - pT * pullT - pF * pullF;
  float across = clamp(1.0 / ((1.0 - pullT / (qT * sqrt(qT))) * (1.0 - pullF / (qF * sqrt(qF)))), 1.0, 2.2);
  // Spray axis: the local filament direction, yielding to the bough's own
  // direction near the wood, where the bough IS the branch it hangs on
  vec2 tg = fT.yz + fF.yz * 0.55 + boughDir * (branchNear * 1.5);
  tg /= max(length(tg), 1e-3);
  // The crisp near-leaf sprays then carve INTO the bright pools with a tight
  // penumbra — the sharp end of the blur range.
  float leaf = leaves(spLeaf, breeze, branchNear, tg, lace, across, 17.0);
  E *= 1.0 - 0.85 * leaf;

  // Light theme (multiply): connected shade ~9-16% below paper, deepening
  // where the canopy is dense and along the wood, and mottled by a fine grain
  // so even deep shade is never a flat printed tint. The shade stays WARM —
  // sky-blue shadow is technically defensible but on paper it reads as dead
  // grey; sun through leaves is a warm light, and the shade under it carries
  // bounce from the same sun. E carves it back to paper white at the coin
  // cores, with a warm lift, so the contrast reads as sunlight, not as dirt.
  float grain = noise(spNear / 105.0 + SD + 21.0) + 0.5 * noise(spNear / 43.0 + SD + 8.2);
  // Twigs go into the shade term as well as into E: in the reference a twig is
  // visibly darker than the grey it crosses, not just a bite out of a bright
  // pool — so it has to read against shade too, or the skeleton disappears
  // everywhere the canopy is closed.
  float shDeep = clamp(smoothstep(0.60, 0.14, open) + 0.45 * wood + 0.45 * leaf + 0.46 * strands + 0.22 * canopy + 0.34 * (grain / 1.5 - 0.5), 0.0, 1.0);
  // Every term above contributes a little almost everywhere, and their sum was
  // a faint tint over the entire page — a veil, not shadows. Below this floor
  // there is no shadow at all, so it cuts to exactly nothing and open sky keeps
  // the page's own white; what survives is rescaled to keep its full depth.
  shDeep = smoothstep(0.38, 1.0, shDeep);
  // Open sky is left at pure paper white, so the page's own colour shows
  // through untouched wherever the canopy is open — the overlay reads as
  // shadows lying on the page rather than as a tint laid over all of it.
  vec3 shadeCol = mix(vec3(1.0), vec3(0.906, 0.895, 0.877), shDeep);
  vec3 sunCol = mix(vec3(1.0), vec3(1.014, 1.002, 0.974), smoothstep(0.45, 0.95, E));
  vec3 light = clamp(mix(shadeCol, sunCol, E), 0.0, 1.0);

  // Dark theme (screen): the same tree, lit from behind rather than in front.
  // The polarity has to match the day — light arrives through the GAPS and the
  // canopy occludes it. Inverting the daylight shade into glow would light the
  // leaves and darken the gaps, which reads as a photographic negative of the
  // tree rather than the tree at night.
  // It is driven by the openness field, not by E: E only runs high inside the
  // sun coins, a small part of the frame, which is what left the night version
  // nearly empty. The same wood, twigs and leaves are then cut out of it, so
  // the structure reads in the glow exactly as it reads in the shade.
  float openGlow = smoothstep(0.28, 0.86, open)
                 * (1.0 - 0.80 * leaf)
                 * (1.0 - 0.75 * strands)
                 * (1.0 - 0.65 * wood);
  vec3 dark = vec3(1.0, 0.87, 0.62) * openGlow * 0.115;

  // Debug amplification (?foliage=boost): stretch the multiply signal away
  // from white so the shape language can be judged against the reference.
  light = clamp(mix(light, vec3(1.0) - (vec3(1.0) - light) * 3.5, u_boost), 0.0, 1.0);

  if (u_boost > 1.5) {
    if (u_boost < 2.5) return vec3(1.0 - leaf);
    if (u_boost < 3.5) return vec3(1.0 - lace);
    if (u_boost < 4.5) return vec3(1.0 - strands);
    return vec3(1.0 - clamp(0.9*leaf + 0.9*strands, 0.0, 1.0));
  }
  return mix(light, dark, u_dark);
}

void main() {
  // CSS-pixel coordinates, so leaf clumps keep one physical size on every
  // viewport instead of inflating on phones
  vec2 css = gl_FragCoord.xy / u_px;
  // Anchor the canopy to the document rather than the screen: the buffer stays
  // viewport-sized, but sampling shifts with the scroll, so the light lies on
  // the page and you scroll through it. A page of any height costs one viewport.
  css.y -= u_scroll;

  T = u_time;
  SD = u_seed;
  // The sun projection is applied per depth layer inside the scene, AFTER that
  // layer's wind transform — the wind moves the tree, the sun projects it.
  vec3 color = scene(css);
  // At each hour fold the noise domains are re-seeded and crossfaded, so
  // u_time stays small for float32 without the wind ever running backwards.
  // The second evaluation only runs during the ~10s fade window.
  if (u_blend < 0.999) {
    T = u_time2;
    SD = u_seed2;
    color = mix(scene(css), color, u_blend);
  }
  // Dither the soft gradients — but only where there is a gradient to band.
  // On untouched white half of its samples darken the page, which is itself a
  // veil, and the one thing this overlay must never do is tint clean paper.
  float minc = min(min(color.r, color.g), color.b);
  color += (hash(gl_FragCoord.xy) - 0.5) / 128.0 * smoothstep(0.0, 0.015, 1.0 - minc);
  gl_FragColor = vec4(color, 1.0);
}
`;

let canvas = null;
let gl = null;
let program = null;
let uRes = null;
let uPx = null;
let uTime = null;
let uSeed = null;
let uTime2 = null;
let uSeed2 = null;
let uBlend = null;
let uDark = null;
let uScroll = null;
let uBoost = null;
let raf = 0;
let resizeRaf = 0;
let scrollRaf = 0;
let winTop = 0; // document y of the drawn window's top edge
let boxW = 0;
let boxH = 0;
let lastFrame = 0;
let lastTime = 120;
let pxScale = 1;
let reducedMotion = false;
let contextLost = false;

// A hashed, bounded domain offset per TIME_PERIOD, so each period plays a
// fresh stretch of forest instead of the palindrome reversing the wind
function epochSeed(epoch) {
  const x = Math.sin((((epoch % 4096) + 4096) % 4096) * 12.9898 + 78.233) * 43758.5453;
  return (x - Math.floor(x)) * 80;
}

function compile(type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function setup() {
  const vert = compile(gl.VERTEX_SHADER, VERT);
  const frag = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vert || !frag) return false;

  program = gl.createProgram();
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return false;
  gl.useProgram(program);

  // One triangle covering the viewport
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, "a_pos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  uRes = gl.getUniformLocation(program, "u_res");
  uPx = gl.getUniformLocation(program, "u_px");
  uTime = gl.getUniformLocation(program, "u_time");
  uSeed = gl.getUniformLocation(program, "u_seed");
  uTime2 = gl.getUniformLocation(program, "u_time2");
  uSeed2 = gl.getUniformLocation(program, "u_seed2");
  uBlend = gl.getUniformLocation(program, "u_blend");
  uDark = gl.getUniformLocation(program, "u_dark");
  uScroll = gl.getUniformLocation(program, "u_scroll");
  uBoost = gl.getUniformLocation(program, "u_boost");
  return true;
}

// The overlay is a window onto the document, taller than the viewport, placed
// IN the page rather than pinned to it. The browser scrolls it like any other
// element, so the light cannot lag the text it falls on. It only has to be
// moved when the viewport approaches an edge of the window — a few times per
// page, not a redraw per frame.
// The page's own height. An absolutely positioned element is NOT counted in its
// parent's layout height, so measuring body this way excludes the overlay —
// which matters, because otherwise the window would measure itself, grow the
// page, and grow again on the next frame.
function pageHeight() {
  return Math.max(document.body.offsetHeight, window.innerHeight || 1);
}

// How tall the window is allowed to be. Being in the document means it also
// EXTENDS the document: a window hanging past the last element adds that much
// empty space below the footer, so it is never taller than the page it lights.
function fitHeight() {
  return Math.min((window.innerHeight || 1) + MARGIN * 2, pageHeight());
}

function resize() {
  boxW = (window.innerWidth || 1) + BLEED * 2;
  boxH = fitHeight();
  let scale = RES_SCALE;
  const largest = Math.max(boxW, boxH) * scale;
  if (largest > MAX_DIM) scale *= MAX_DIM / largest;
  canvas.width = Math.max(1, Math.round(boxW * scale));
  canvas.height = Math.max(1, Math.round(boxH * scale));
  canvas.style.width = boxW + "px";
  canvas.style.height = boxH + "px";
  canvas.style.left = -BLEED + "px";
  pxScale = canvas.width / boxW;
  gl.viewport(0, 0, canvas.width, canvas.height);
  setTop(true);
}

// Slide the window, clamped inside the document so it can never push the page
// taller. The pattern is anchored by the same offset the element is positioned
// at, so moving it does not shift a single leaf.
function setTop(force) {
  const vh = window.innerHeight || 1;
  const slack = Math.max(0, (boxH - vh) / 2);
  const maxTop = Math.max(0, pageHeight() - boxH);
  const y = window.scrollY || window.pageYOffset || 0;
  const want = Math.max(0, Math.min(Math.round(y - slack), maxTop));
  if (!force && Math.abs(want - winTop) < Math.max(1, slack * 0.5)) return false;
  winTop = want;
  canvas.style.top = winTop + "px";
  return true;
}

// Keep the window over the viewport, re-sizing it first if the page itself has
// changed height (an SPA route change swaps the whole document under us).
function place(force) {
  if (Math.abs(fitHeight() - boxH) > 1) {
    resize();
    return true;
  }
  return setTop(force);
}

function draw(seconds) {
  lastTime = seconds;
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  const epoch = Math.floor(seconds / TIME_PERIOD);
  const phase = seconds - epoch * TIME_PERIOD;
  // Crossfade the first FADE_S seconds of each period against the previous
  // period running on (skipped for the very first period after load)
  let blend = 1;
  if (epoch > 0 && phase < FADE_S) {
    const b = phase / FADE_S;
    blend = b * b * (3 - 2 * b);
  }
  gl.uniform2f(uRes, canvas.width, canvas.height);
  gl.uniform1f(uPx, pxScale);
  gl.uniform1f(uTime, phase);
  gl.uniform1f(uSeed, epochSeed(epoch));
  gl.uniform1f(uTime2, phase + TIME_PERIOD);
  gl.uniform1f(uSeed2, epochSeed(epoch - 1));
  gl.uniform1f(uBlend, blend);
  gl.uniform1f(uDark, isDark ? 1 : 0);
  gl.uniform1f(uScroll, winTop);
  { const m = /[?&]foliage=(boost|leaf|lace|strands|both)/.exec(location.search);
    gl.uniform1f(uBoost, m ? ["boost","leaf","lace","strands","both"].indexOf(m[1]) + 1 : 0); }
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

function frame(now) {
  raf = requestAnimationFrame(frame);
  if (now - lastFrame < FPS_INTERVAL) return;
  lastFrame = now - ((now - lastFrame) % FPS_INTERVAL);
  // Scrolling is the browser's job now — this only has to move the window when
  // the viewport nears an edge, and that redraw is free of scroll timing
  place(false);
  draw(now / 1000);
}

function start() {
  if (raf || reducedMotion || contextLost) return;
  raf = requestAnimationFrame(frame);
}

function stop() {
  cancelAnimationFrame(raf);
  raf = 0;
}

export function initFoliage() {
  if (canvas) return;
  const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  reducedMotion = mq?.matches ?? false;

  canvas = document.createElement("canvas");
  canvas.className = "foliage-canvas";
  canvas.setAttribute("aria-hidden", "true");

  const opts = { alpha: false, antialias: false, depth: false, stencil: false };
  gl = canvas.getContext("webgl2", opts) || canvas.getContext("webgl", opts) || canvas.getContext("experimental-webgl", opts);
  if (!gl || !setup()) {
    canvas = null;
    return;
  }

  // On <body>, above every stacking context on the page — the header included,
  // so no element can sit outside the light and read as an unlit island
  document.body.appendChild(canvas);
  resize();

  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    contextLost = true;
    stop();
    // A lost drawing buffer reads as black, and black under multiply would
    // black out the page — so take the overlay out of the compositing
    canvas.classList.add("is-lost");
  });
  canvas.addEventListener("webglcontextrestored", () => {
    // Only unblock start() once the restored context actually compiles
    if (setup()) {
      contextLost = false;
      resize();
      reducedMotion ? draw(120) : start();
      canvas.classList.remove("is-lost");
    }
  });

  // The static reduced-motion frame bakes in the theme; redraw if it changes
  new MutationObserver(() => {
    if (reducedMotion && !contextLost) draw(120);
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  mq?.addEventListener?.("change", () => {
    reducedMotion = mq.matches;
    if (reducedMotion) {
      stop();
      draw(120);
    } else {
      start();
    }
  });

  window.addEventListener("resize", () => {
    // A resized buffer presents as black, so redraw promptly — but coalesce
    // to one realloc+draw per frame so a window drag can't thrash
    if (resizeRaf) return;
    resizeRaf = requestAnimationFrame(() => {
      resizeRaf = 0;
      resize();
      draw(reducedMotion ? 120 : lastTime);
    });
  });

  // The window rides along with the page on its own, so a scroll costs nothing
  // until the viewport nears an edge. Checked per scroll frame rather than on
  // the 30fps loop, so a hard flick cannot outrun the drawn window — and when
  // it has not moved far enough to matter, this does nothing at all.
  window.addEventListener(
    "scroll",
    () => {
      if (contextLost || scrollRaf) return;
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = 0;
        if (place(false)) draw(reducedMotion ? 120 : lastTime);
      });
    },
    { passive: true }
  );

  document.addEventListener("visibilitychange", () => {
    document.hidden ? stop() : start();
  });

  // Draw immediately so the multiply overlay never presents undrawn black
  draw(reducedMotion ? 120 : performance.now() / 1000);
  if (!reducedMotion) start();
}
