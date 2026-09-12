# Project endings and WYSIWYG concepts, 12 September 2026

## Editorial pass

Reviewed all 33 published work pages. Thirty have adjusted copy or block order;
People in Orbit, Tiny/Massive and Svartljus already end with suitable prose.
Each page now ends with ordinary text, usually bringing together collaborators
and roles. No formal credits component or standardised closing slogan was added.

Moved early lists of collaborators to the closing paragraph where possible.
Names remain in the narrative when they explain how a project began or how a
particular part was made. Existing personal anecdotes are retained. The full
Kagora team and Facing Worlds attribution remain. All unique Markdown
destinations from the pre-edit project text are preserved; names and roles
were reviewed against the previous text. No new biographical stories were added.

The collection header's name is now a plain homepage link. It opens the
landing-page strips instead of restoring a previously saved About position.
The project-title return link and browser Back retain their existing restoration
behaviour. Desktop and mobile regressions exercise entering a project from
About, returning through the name, and using Back to restore both earlier pages.
Both name and project-title links use the clean homepage URL without
`#collection`. The About toggle also drops that redundant fragment from its
return target. Existing bookmarked `#collection` URLs still open the strips.

Balena Voladora also includes two additional film scans and removes the Elsewhere
mention, documented in `2026-09-12-balena-voladora.md`.

## WYSIWYG images and recordings

The user shared the app's local review gallery at
`http://localhost:8123/docs/renders/review-2026-09-12/` and requested more
conceptual composites, with substantially larger walking giants.

Two new composites were generated with the built-in imagegen tool. The original
photographs and first concept are preserved. The published text and alt text
identify the new images as concepts, while the videos are direct app recordings.

| Published asset | Input |
| --- | --- |
| `projects/wysiwyg/desert-giants-concept.png` | RAW-developed DSCF8179 (9 July), plus the app's `05-walking-figures.png` as a particle/pose reference |
| `projects/wysiwyg/desert-flock-concept.png` | RAW-developed `desert-eyepiece.jpg` (DSCF8382, 10 July), plus `03-birds-salt-flats-day.png` as a flock reference |

DSCF8179 was reviewed from its existing 3200 px sensor-data export in
`/private/tmp/wysiwyg-bench-review/exports/`. The second photograph was already
developed from RAW for the page. Both edit targets and reference renders were
visually inspected before generation.

The generated giants image is 1536 × 1024; the flock image is 1024 × 1536.
The giants are deliberately scaled as distant monumental figures. The generated
view gives more space to the sky; it is an illustrative composite rather than
a pixel-identical photograph or a calibrated AR screenshot.

Four 8-second, 1280 × 720, 30 fps H.264 recordings and their PNG posters were
copied unchanged from the app review gallery: salt-flat birds by day, fireflies
at night, walking figures, and the animal stampede. They replace the earlier
flock-only recording and two older isolated renders. Original files remain.
The app repository and its configuration were not modified.

## Generation prompts

Built-in imagegen, one call per composite. Both outputs were visually reviewed.

### Desert giants

```text
Use case: compositing.
Asset: high-resolution wide editorial concept image for WYSIWYG, an augmented-reality telescope.
Input 1 is the edit target, a RAW-developed photograph of the telescope in the desert at dusk. Input 2 supplies ONLY the appearance and walking poses of the virtual particle figures.
Preserve the photographed brass telescope, stepped wooden phone housing, tripod, camera angle, ground, distant red sculpture, buildings and pink sunset. Add two enormous walking human figures made of sparse distinct luminous cyan and pale violet particles to the distant landscape, like the rendering reference. They should read as giants roughly 30 to 50 metres tall: feet planted on the ground beyond the telescope near the far buildings, bodies towering many times higher than those buildings, heads high in the open sky. The closest giant walks across the open right-hand side, reaching almost to the top of the frame; the second is smaller and much further away beyond the left horizon. Their stance, feet, arms and stride should read clearly as walking. Keep distant sky and land visible through the space between particles. Atmospheric depth softens the farther figure. Fine points of light form human shapes, not solid skin, robots or statues. Do not add neon outlines, beams, interfaces, text, extra creatures or birds.
The scale comes from the photographed landscape and distance, not from placing a human-sized figure near the tripod. Keep the telescope unchanged and unobscured. Natural photographic colour and grain, delicate points of light, no oversharpening or fantasy landscape changes. Retain the wide 3:2 photograph composition.
```

### Desert flock

```text
Use case: compositing.
Asset: portrait concept image for the WYSIWYG augmented-reality telescope project.
Input 1 is the photograph to edit: a seated visitor seen from behind looking through a brass telescope, with its stepped wooden phone housing, tripod, flat desert ground, tents, a tower and soft evening sky. Input 2 is the reference for the app's flock: tiny black angular bird silhouettes forming a flowing three-dimensional murmuration.
Preserve the photograph's composition, person, exact telescope construction, colours, sandy ground, distant camp and lighting. Superimpose a large flock of many hundreds of small black low-poly bird silhouettes sweeping and folding through the open sky above the camp. Make one flowing murmuration with varied density and depth, a curved ribbon that folds back on itself, airy at the edges. Birds should be small and dark like the app reference, with near birds a little larger, distant ones tiny, not realistic feathered wildlife. Keep the person and telescope completely unobscured. The flock is virtual imagery conceptually layered over the actual view. Maintain the natural soft photographic texture; no glow, outlines, UI, text, labels, lens border, extra creatures or landscape changes. Keep the portrait 2:3 framing and the person's pose unchanged.
```

## Validation

The production build and all seven content tests passed. The complete Chrome
suite passed 53 checks, including all 33 mobile project routes, closing text,
gallery pairing, the new name-link navigation and moving frames from all four
WYSIWYG videos. The old flock-only test was updated for the replacement clips.

After the final clean-URL adjustment, focused checks at 390 and 1440 px passed
for both return links, the About toggle, Back restoration and existing
`#collection` bookmarks. The final production build and content tests passed
again. Targeted visual checks at 390, 1440 and 1850 px confirmed decoded images,
four videos, no horizontal overflow and twelve Balena photographs. Desktop and
mobile concept layouts, the new film pair, Chorus typography and WYSIWYG's
ending were visually reviewed.
