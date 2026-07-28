# Site audit: jonasjohansson.se

Everything below is measured, not inferred. Line numbers are current as of `0d1ad70`. I did not edit anything.

---

## What is already good

Worth saying first, because most of this report is about a handful of surfaces and not about the site as a whole.

- **The pairing is hand-tuned and it works.** 23 of the 31 half-left/half-right pairs match within 2px because you matched the source aspect ratios by eye. That is the hard part and it is done.
- **Zero broken image references site-wide.** Every `src` in every `data.md` resolves.
- **The text conventions hold 26/26.** Statement block at default size, every subsequent block `fontSize: small`. One exception in the whole corpus (lyra).
- **UK English is clean** in all curated copy. The only two American spellings are in lab bodies, not project prose.
- **The credits grouping logic is correct** for the case it was designed for. `harpa` collapses 7 entries into 5 sensible lines; that is intended and it renders well.
- **Placeholders are properly partitioned** to the end of the strips regardless of their missing dates, so the wall never shows an empty project ahead of real work.
- **The accent-colour system** (`[data-project]` scoping, `variables.css:62-82`) is clean and the router resets it correctly.

---

## 1. The four things most worth doing, in order

### 1. Fix the media box. This is the whole desktop presentation problem.

Two defects, one surface, and they are the biggest visual gap on the site.

**(a) 86 of 116 in-body images are letterboxed.** `project.css:152-161` sets `width: 100%` (definite) plus `max-height` plus `object-fit: contain`. The height clamps but the box never re-narrows, so the picture shrinks inside a full-track box. Measured on `dome-dreaming` image 1 at a 1920×950 viewport: img box **1501×745**, painted picture **497×745**, so **502px of transparent dead air on each side**. Worst case is `vi-kommer-i-fred/05.jpg` at 538px per side. Those gutters land on no column line and change on every resize.

Side effect nobody had noticed: `border-radius: var(--radius-sm)` (`project.css:160`) is applied to that img box, which for those 86 images is transparent padding. **The 4px radius is invisible on 74% of the site's images.**

**(b) The ≥1800px rule silently discards your authored placements.** `project.css:269`, specificity (0,4,0), beats the inline `[style*="--col-start"]` rule at line 254, specificity (0,1,0). Confirmed in a live browser: on `/vi-kommer-i-fred/` at 1920px your authored triptych (`--col-start: 1/5/9`, `--col-span: 4`) renders as **three stacked 1501px images**. Restore authored placement with an injected override and it snaps back to three 581px images at left 56 / 669 / 1283. Same for `dome-dreaming/04` and `vista/06` at 4/6.

This is the cheapest fix on the page and the most visible. Implementation in section 3.

**One correction to note, because it changes what the fix should be:** the ragged pairs and the letterboxed pairs are **disjoint populations**. A pair is ragged only if at least one half falls *under* the height cap; if both are clamped they are flush by construction. So any fix based on cropping both halves to a shared aspect ratio would crop the seven pairs that currently have zero dead air, while doing nothing for the sixteen that are actually broken. The flex-ratio approach fixes both populations with **zero crop**.

### 2. Alt text: 142 images, zero authored alt strings

`alt:` appears zero times across all 48 `data.md` files. `eleventy.config.js:464` falls back to `alt: alt || projectTitle`, so every image on a page gets the same string. In the built output: `dist/dome-dreaming/index.html` emits `alt="Dome Dreaming"` **24 times**; nava 11; eastern-city-portal 11; firestarter 10; jag-ar-gud 10; svartljus 9; tufting-ex-machina 9; icehotel 8.

A screen reader reads the project name 24 times in a row. This is the only genuine accessibility defect on the site and it is content work, not code work.

Videos are not part of this: `project.njk:28-36` renders them `aria-hidden="true"` with no alt attribute, so the computed video alt at `eleventy.config.js:465` is dead data.

**Do:** write real alt on the hero and on any image carrying information (people, sites, mechanisms). For genuinely decorative frames write `alt: ""` explicitly, so screen readers skip them rather than hearing the title again.

### 3. Credits: one rendering bug plus a normalisation pass

`visualia` renders wrong today. Everything else is consistency. Full plan in section 2.

### 4. Image ladder and `sizes`

`eleventy.config.js:102` caps at `widths: [640, 1280, 1920]`, confirmed against `dist/img` (no file exceeds 1920w). The hero is full-bleed and occupies ~1920 CSS px at a 1920 viewport, needing 3840 device px on a 2x display. **Retina heroes are painted at roughly 2x upscale**, and 20 of the 26 hero sources have more resolution on disk than the pipeline emits (up to 6000px; 15 exceed 2048).

Separately, `eleventy.config.js:176` falls back to `sizes="100vw"` and `project.njk:24` never passes one, so a 426px plate advertises 100vw and downloads the 1920w file.

Encoding measurements reproduce (I re-ran them):

```
                 source        1920/q75   2560/q58   2560/q75
heroes/01.jpg    6000x4000      220KB      238KB      359KB
visualia/01.jpg  4787x2509      116KB      102KB      168KB
harpa/01.jpg     2400x1350       48KB       39KB       63KB
```

2560 at q58 is byte-neutral to better. **The width bump and the quality drop must ship in the same commit** — at q75, 2560 costs +45% to +63%.

```js
// eleventy.config.js:102
widths: [640, 960, 1280, 1600, 1920, 2560]
```

Keep webp at 90 (`eleventy.config.js:87`). Do not add `chromaSubsampling` to AVIF; sharp's AVIF default is already 4:4:4 (`node_modules/sharp/lib/output.js:1034`).

---

## 2. Credits: exact normalisation plan

57 entries across 25 blocks. 40 parse as `Role: value`; 17 do not.

### 2a. The one thing that renders wrong

`projects/visualia/data.md:47-48`. Both entries fail the role regex (line 47 has a `[` before its first colon, inside a URL; line 48 has no colon), so both land in the `role === ""` bucket and are comma-joined at `eleventy.config.js:493`. Because `.credit-support` is `display: block` (`project.css:237-240`), the span breaks to its own line and the joining comma is left stranded:

```
Run with Rose Hallgren, Bengt Johansson,
Supported by Region Halland
```

**Fix, content-side, one line:**

```yaml
- "Run with: [Rose Hallgren](https://rosehallgren.se/), [Bengt Johansson](https://www.bengtjohansson.se)"
```

That pulls line 47 out of the `""` bucket and leaves the span alone on its own line. This is the only place a `display: block` element ends up inside a merged value, and the only use of `.credit-support` anywhere.

### 2b. Role labels: standardise on sentence case

Sentence case is already the majority, 10 distinct labels against 5 Title Case. Four labels to change, plus one ampersand:

| File:line | Now | Change to |
|---|---|---|
| `chorus/data.md:46` | `Creative Coding` | `Creative coding` |
| `emerging-sensation/data.md:43` | `Creative Coding` | `Creative coding` |
| `danny-saucedo/data.md:47` | `Technical Director` | `Technical director` |
| `harpa/data.md:96` | `Artistic Lead` | `Artistic lead` |
| `jag-ar-gud/data.md:84` | `Light & Video` | `Light and video` |

The clearest conflict today is `Creative Coding` (chorus:46) against `Hardware coding` (harpa:101) in the same corpus. `Light & Video` is the only `&` in any credits entry.

Labels render verbatim (`project.njk:53`, no `text-transform` in `project.css:226-246`), so this is a pure content edit across five lines.

### 2c. Give the bare entries a role

Ten entries render as anonymous comma-joined name soup because they carry no role.

**`harpa/data.md:97-99`** — three bare markdown links merge into one unlabelled line inside the middle of the block. These are the NAVA co-founders:

```yaml
- "Made with: [Atlí Bollason](https://atlibollason.com/), [Owen Hindley](https://www.owenhindley.co.uk/), [Rasmus Stride](https://www.instagram.com/rasmus.stride/)"
```

**`svartljus/data.md:83-89`** — seven bare names collapse into one ~122-character centred line, and they restate verbatim the same seven people, in the same order, that the prose block directly above (`data.md:72-80`) already names. Either give it one deliberate label:

```yaml
- "Core group: Jonas Johansson, Olle Bjerkås, Per-Olov Jernberg, Servando Barreiro, [Rose Hallgren](https://rosehallgren.se/), Elias Aabjerg, Lior Nønne Malue Hansen"
```

...or drop the credits block and let the prose carry the names. Do not leave both.

**`people-in-orbit/data.md:61`** — a single unlabelled link that states nothing about who did what. Needs a role, something like `"Band: [People in Orbit](...)"`.

**Prose-shaped entries** that parse to no role but read fine as sentences: `firestarter:58` ("Help from Josep Giribet"), `lights-for-ukraine:36` ("Mounted with"), `tinymassive:64` ("A [NAVA](/nava/) project"), `emerging-sensation:42` ("Initiated by"). These are deliberate and they render correctly. Leave them, or convert to labels if you want the block fully uniform.

### 2d. Near-duplicate labels

- `danny-saucedo:48` `Co-design, 3D modelling and animation` vs `sala-hjartslag:27` `3D modelling and animation` — same collaborator (Smash Studio), two labels. Fine if the roles genuinely differed.
- `Made with` (10 projects) vs `Initiated and made with` (`embed:26`) vs `Initiated by` (`emerging-sensation:42`). Three phrasings of one idea.

### 2e. Links to make consistent

**Insecure scheme, 8 occurrences across 4 files.** Every other external link under `projects/` (244 of them) is https.

```
http://owenhindley.co.uk/  →  https://www.owenhindley.co.uk/
  harpa/data.md:20,  harpa/data.md:98
  nava/data.md:21,   nava/data.md:137
  tinymassive/data.md:60,  tinymassive/data.md:63

http://davidgiese.com/  →  https://davidgiese.com/
  chorus/data.md:32,  chorus/data.md:49
```

`http://davidgiese.com/` serves 200 in the clear without upgrading, so that one is the more exposed of the two. (Redirect behaviour was checked over the network in an earlier pass; I re-verified the file occurrences directly, not the redirects.)

Leave `scripts/visual-audit.mjs:6` alone — that is the localhost dev default.

**Same entity, two URL forms:**

```
NAVA:     https://www.nava.community    visualia:18, tinymassive:19, harpa:86, dome-dreaming:118, nava:13
          https://nava.community        tufting-ex-machina:24   ← normalise to www

Aavistus: https://aavistusfestival.fi   dome-dreaming:32, dome-dreaming:115
          https://www.aavistusfestival.fi/   nava:91, tufting-ex-machina:21   ← normalise to www + slash
```

**One missing link:** Annie Tådne is linked at `nava/data.md:122` (`https://annietadne.com/`) but bare at `visualia/data.md:30`. Note the nine other residents named in that same visualia sentence are bare everywhere, so the passage is internally consistent; Annie is the only name in it that carries a link elsewhere. Your call.

Jordi Claramunt is **not** a second instance: linked at `icehotel:22` (first mention) and `icehotel:87` (credits), bare only at `icehotel:59` as a repeat mention. That is normal link-on-first-mention practice.

### 2f. One open editorial question

Jonas is credited by role in 10 of 25 blocks and omitted from 15. Of the 15 omissions, 13 use authorship-implying phrasing ("Made with", "Run with", "Mounted with", "Initiated and made with"), which reads fine on your own portfolio. Two do not: `sala-hjartslag:27` and `people-in-orbit:61` state nothing about who did what.

Pick a rule: either "Made with X" always means you plus X and you are never listed (then drop the `Creative coding: Jonas Johansson` lines and give collaborators roles instead), or you always get an explicit role line. Either way `people-in-orbit:61` needs a label.

---

## 3. Desktop presentation: implementation

Four stages, each shippable on its own. Stage 0 needs no build change to see the win.

### Stage 0 — Stop the ≥1800px rule from flattening authored placement

The `:not([class*="size-"])` guard cannot work, because `project.njk:23` emits `--col-start`/`--col-span` unconditionally on every media figure. Stop emitting defaults, then target the absence of the property.

`eleventy.config.js:456-461` — leave placement undefined rather than defaulting to 1/12:

```js
const resolved = size && SIZE_MAP[size] ? SIZE_MAP[size] : {};
const colStart = explicitColStart ?? resolved.colStart ?? null;
const colSpan  = explicitColSpan  ?? resolved.colSpan  ?? null;
```

`project.njk` — emit the properties only when placement was authored:

```njk
<figure class="media-item{% if loop.first %} hero{% endif %}{% if block.size %} size-{{ block.size }}{% endif %}"
  {% if block.colStart %}style="--col-start: {{ block.colStart }}; --col-span: {{ block.colSpan }}"{% endif %}>
```

`project.css`:

```css
.project-grid > .media-item { grid-column: 1 / -1; }

@media (min-width: 1800px) {
  /* Only un-authored media narrows. This rule's (0,4,0) specificity previously
     beat [style*="--col-start"] (0,1,0) and flattened every authored placement:
     vi-kommer-i-fred's triptych, dome-dreaming/04 and vista/06 at 4/6. */
  .project-grid > .media-item:not(.hero):not([style*="--col-"]):not([class*="size-"]) {
    grid-column: 2 / 12;
  }
}
```

I tested `grid-auto-flow: dense` for backfill on both stress cases (`dome-dreaming`, `vi-kommer-i-fred`) with the override neutralised. DOM order and visual order are identical. No reflow risk.

### Stage 1 — Measure aspect ratio at build time

`sharp` is already imported at `eleventy.config.js:6` and used at `146-148`. Add above the `projectContent` scanner:

```js
const _arCache = new Map();
async function intrinsicAr(absPath) {
  if (_arCache.has(absPath)) return _arCache.get(absPath);
  let ar = null;                       // null, not a guess: a wrong default
  try {                                // silently reintroduces letterboxing
    const { width, height } = await sharp(absPath).metadata();
    if (width && height) ar = +(width / height).toFixed(4);
  } catch { console.warn(`[ar] could not read ${absPath}`); }
  _arCache.set(absPath, ar);
  return ar;
}
```

Use `null` rather than a numeric default. A 0.667 portrait defaulting to 1.5 gets a `max-width` 2.25x too generous and letterboxes again, without warning.

### Stage 2 — Kill the letterbox

The height ceiling belongs on the **box**, not the picture. Replace `project.css:152-161`:

```css
/* dome-dreaming img 1 measured 1501x745 around a 497x745 picture:
   502px of dead air per side, on 86 of 116 non-hero images. */
.media-item:not(.hero) {
  max-width: calc(var(--media-max-h) * var(--ar, 999));
  justify-self: center;
}

.media-item img,
.media-item video {
  width: 100%;
  height: auto;
  display: block;
  border-radius: var(--radius-media);
  /* no max-height, no object-fit: the box now has the picture's shape, so the
     radius finally clips the photograph instead of transparent padding */
}
```

`var(--ar, 999)` makes the fallback a no-op rather than a constraint, so an unmeasured image renders exactly as it does today.

`variables.css`:

```css
:root {
  --media-max-h: calc(100dvh - 2 * var(--spacing-3xl));  /* 758px at 1920x950 */
  --gutter-pair: var(--spacing-md);
  --radius-media: 0px;   /* was an invisible 4px; 0 reads as print */
}
```

### Stage 3 — Pairs: proportional width, zero crop

Group in the build, after `.filter(Boolean)`:

```js
const grouped = [];
for (let i = 0; i < content.length; i++) {
  const a = content[i], b = content[i + 1];
  if (a?.size === "half-left" && b?.size === "half-right" && a.ar && b.ar) {
    grouped.push({ type: "pair", items: [a, b], arSum: +(a.ar + b.ar).toFixed(4) });
    i++;
  } else grouped.push(a);
}
```

```css
.media-pair {
  grid-column: 1 / -1;
  display: flex;
  gap: var(--gutter-pair);
  align-items: flex-start;
  max-width: calc(var(--media-max-h) * var(--ar-sum) + var(--gutter-pair));
  margin-inline: auto;
}

/* Width proportional to ratio, so heights are identical by construction,
   with no crop. min-width:0 is load-bearing: flex items default to
   min-width:auto, which for a box containing a replaced element resolves to
   its intrinsic width and silently defeats the ratio split. */
.media-pair > .media-item {
  flex: var(--ar) 1 0;
  min-width: 0;
  max-width: none;
}

@media (max-width: 768px) {
  .media-pair { flex-direction: column; gap: var(--spacing-xl); max-width: none; }
}
```

Worked against the measurements:

- `dome-dreaming 07+12` (both ar 0.667, arSum 1.334) → pair box 1027px, each image 505×758, centred. Replaces today's two 505px pictures sitting in two 888px boxes with 383px of dead air each.
- `vista 05+07` (arSum 3.111) exceeds the 1808px track, so the row fills it: 1024×576 and 768×576. **Δ167px becomes Δ0px, zero crop.**

One rule, both populations.

### Spacing, while you are in here

`--spacing-xl` (32px) currently does three jobs in `.project-grid`: column-gap (`:93`), row-gap (`:94`), and the grid's own padding (`:98`). So the gutter between the two halves of a pair is identical to the gap separating that pair from the next row, and identical to the page inset. There is no proximity hierarchy telling the eye that a pair is one unit.

Split the tokens: a tight intra-pair gutter (16-24px), a larger inter-row gap (48-64px), and a page margin distinct from both. That single change does more for the editorial read than any new size token.

### The hero

`project.css:106-111` pins height, min-height and max-height all to `calc(100dvh - var(--spacing-lg) * 2)`, with `object-position: center` hardcoded at `:131` and no override path anywhere in the schema. Because the box tracks the viewport rather than the image, all 26 heroes are cropped by an amount that depends on window shape. At 1920×950 the mean crop is 29%; five lose more than 40% (lights-for-ukraine 69%, dome-dreaming 68%, eastern-city-portal 61%, tufting-ex-machina 52%, people-in-orbit 45%). On a 390×844 phone the box goes to ~0.49 AR and the ten 16:9 heroes lose roughly 72% horizontally.

Cheapest real fix, two lines plus a token:

```css
.project-hero img { object-position: var(--focal, center); }
```

...fed by an optional `focal:` key on the first block. That fixes the five worst heroes immediately without touching layout. Eyeball all 26 before reaching for automated cropping; `sharp.strategy.attention` will misfire on flat fields.

Also: the hero sits 24px from the viewport edge while full-width media inside the grid sit at 56px, and it carries `--radius-md` (12px) against `--radius-sm` (4px) everywhere else. It is neither full-bleed nor grid-aligned. Pick one.

### Gate separately: the typographic spine

Measured on `/dome-dreaming/` at 1920px, there are **four unrelated left edges**: media at 56, `text-large` at 182, `text-small` at 422, narrowed plate at 516. Text never touches a column line, because `eleventy.config.js:470-471` places it at colStart 2 / colSpan 10 and then `project.css:163-165` throws that away with `max-width: 65ch; margin-inline: auto`. The 12-column grid is decorative for all 110 text blocks at desktop widths.

Dropping `margin-inline: auto` and letting text hang off a real column line (colStart 2 for body, colStart 7 for asides, measure controlled by colSpan rather than ch) is the single biggest perceived-quality gain and nearly free. **But** it reverses a choice you documented in the code at `project.css:166-167`, so it is your call and should be decided on its own, not smuggled in with the media work.

Related: the 1800px breakpoint currently widens body copy from 65ch to 80ch and the statement from 40ch to 60ch. At the clamped 21.6px `--font-size-small`, 80ch is ~860px of running text, past the 45-75ch band. Consider capping `.project-grid` at 1600-1800px with `margin-inline: auto` instead, and holding the measure constant. A capped grid makes the `grid-column` swap at `:269` unnecessary entirely.

---

## 4. Everything else worth knowing

**Five-minute fixes:**

- **Video captions are written and never rendered.** `eleventy.config.js:455` does not destructure `caption`/`link`, and `:465` does not return them, so the `figcaption` branch at `project.njk:37-41` can never fire. `projects/nava/data.md` lines 30-31, 66-67, 72-73 carry three YouTube performance links that do not exist in the build. Confirmed: zero `figcaption` in any built HTML. Commit `df7839f` added the data intending it to render. Fix is adding two words to the destructure and two to the return. Also makes `project.css:50-60` and `base.css:136` live again.
- **Two American spellings:** `exploring-technology/data.md:9` ("organized" → "organised") and `organize-downloads/data.md:9` ("customize" → "customise"). Leave the product name in the title.
- **`lyra/data.md:12-13`** is the only two-sentence statement in 26. Fuse: "A playable light instrument: strings hung floor to ceiling in a darkened room, each one triggering light and sound when plucked."
- **`tufting-ex-machina/data.md:20`** is the only markdown bold in all 48 files. Drop the `**`.
- **`visualia/data.md:31`** puts a comma inside the closing quote, US-style. Every other quoted title on the site does the opposite (`chorus:21` is the identical construction). Move it outside.
- **Festival name capitalised two ways:** `Allt Ljus på Uppsala` (`resonance:22`) vs `Allt ljus på Uppsala` (`chorus:13`), same link. The festival itself uses both, so there is no external correct answer, just pick one.

**Worth a decision:**

- **Dates are placeholders.** 30 of the 40 dated projects are exactly `YYYY-01-01`. The seven-way 2024-01-01 tie (danny-saucedo, eastern-city-portal, firestarter, jag-ar-gud, resonance, sala-hjartslag, tufting-ex-machina) occupies wall positions 3-9 and currently orders alphabetically by filesystem accident. Give that cluster real months if you care where they land.
- **Oxford comma** is the de facto house style (~30 uses) with 9 stragglers: `chorus:30`, `danny-saucedo:48`, `dome-dreaming:42/94/96`, `harpa:87`, `nava:14/78`, `tinymassive:37`. Do not touch `jag-ar-gud:61` — that is inside a quoted SvD review.
- **`embed` and `heroes` have no first-person voice.** Both are entirely passive and never say what you did, against a norm of 24 of 26 prose-bearing projects. One clause each, naming what you actually built, matching the pattern in `resonance` ("I built them with Arduino") and `sala-hjartslag` ("I worked as technical lead").
- **`emerging-sensation/data.md:18`** is the only block using a YAML literal scalar (`content: |`) against 109 folded ones, and the only text block anywhere that renders two `<p>` from one block. Effect is that its paragraphs sit 1rem apart where the house pattern is 2rem. Split into two blocks and convert to `content: >-`.
- **`vista` is the only content project with no credits block.** Almost certainly deliberate (solo decade-long series), no rendering impact. Just confirm it.
- **28 orphaned image files, 209MB (~29% of the projects/ tree)**, in dome-dreaming (16), nava (6), svartljus (3), vista (3). Unpicked frames from raw shoot dumps. Not deployed and not a build problem, just repo weight.

**Dead code, no user impact, safe to delete:**

- `resetProjectColors()` (`router.js:9-14` and its call at `:116`) clears three custom properties nothing sets and no CSS reads. The real accent reset is the `removeAttribute("data-project")` on the next line.
- `selected`/`not-selected` strip classes are read at `stripAnimation.js:81` and removed at `router.js:86`/`:200` but added nowhere. Orphaned by commit `93cb9b0`, which removed the writers and left the readers. The "ease toward centre for seamless hero transition" behaviour no longer exists.
- `--cursor-x`/`--cursor-y` (`stripAnimation.js:67`, `:71`) are written but read by nothing. Do **not** remove the neighbouring per-strip `--bg-x`/`--bg-y` — those are live at `strips.css:81`.
- `.header-title` CSS (`header.css:87-94`, `120-126`, `128-135`) matches no element in any template or built HTML. Worse, the intended focus ring targets `.header-center:focus-visible .header-title` on a plain `<div>` that never receives focus. The actually focusable element, `a#header-toggle`, gets no author focus ring at all, unlike `.strip` (`strips.css:103-106`).
- Legacy `/work/` routing: `eleventy.config.js:563-585` creates 48 empty `dist/work/<slug>` directories every build that nothing links to, and `main.js:70-82` is an unreachable fallback (`app-data.njk:5-7` always injects `__INITIAL_PROJECT__` on project pages).
- `PROJECT_COLORS` (`eleventy.config.js:342`) is missing `dome-dreaming` (`#c75200`, defined in `variables.css:63`). Effect: the dome-dreaming strip sorts into the trailing colourless group in hue-sort while still painting its orange accent from CSS. Better than adding the entry: emit the `[data-project]` block from `PROJECT_COLORS` at build time so there is one source of truth.
- Six of the eight `SIZE_MAP` variants are dead in all three places they appear (`eleventy.config.js:418-421,424-425`; `project.css:258-261,264-265`; mobile resets at `project.css:315-318,321-322`). Only `half-left`/`half-right` are used. Delete the six; do **not** collapse the two mechanisms, because the inline `--col-start` path is the sole placement for text blocks, credits blocks, and the authored colStart/colSpan media.

**A claim I checked and could not support:** I scanned all 32 pairs for `half-left`/`half-right` desync and found **zero** unmatched. The failure mode that a `size:` vocabulary migration would protect against has never occurred here. Not a reason to migrate.

---

## What I could not verify

- **No aesthetic judgement.** Every number above is measured geometry from a live browser at 1920×950. None of it is a visual assessment. Stages 2-3 need an eyeball pass across `dome-dreaming` (24 images, portrait pairs), `nava` (widest ratio spread), `tufting-ex-machina` (all 1:1) and `icehotel` (already correct, must not move).
- **Video aspect ratios** beyond `nava/01` and the four `vista` `.webm` files. The 16:9 default's accuracy across all 16 video blocks is unconfirmed.
- **`--media-max-h` uses `dvh`**, which changes on mobile URL-bar collapse. Desktop only was tested.
- **Wall tie-ordering** was verified on this macOS/APFS checkout. The site builds on `ubuntu-latest` where ext4 `readdir` returns hash order, so the deployed order within a tie may differ from what you see locally.
- **Link redirect behaviour** (owenhindley www-canonicalisation, davidgiese serving 200 over plain http) comes from an earlier network check, not from this pass. I verified the file occurrences directly.
- **The 1:1 crop figure.** A 1:1 plate at span 6 is 888px tall against an 817px cap, so all nine `tufting-ex-machina` squares crop ~8% today. Any "zero crop on a normal desktop" claim only holds once a page max-width ships.