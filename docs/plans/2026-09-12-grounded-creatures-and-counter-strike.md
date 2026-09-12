# WYSIWYG and BorderLAN image selections, 12 September 2026

## Validation

Production build, ten Node checks and all 63 Chrome checks passed. Additional
checks at 390, 1440, 1850 and 2560 px verified that the combined concept and
original eyepiece view each appear once, all four app recordings remain, both
new bench photographs decode and align as a desktop row or a mobile stack
with the normal 16 px gap, and the Counter-Strike replacement is present.
The combined concept was visually reviewed at 2560 px with no cropping.

## WYSIWYG

- Keep the original `desert-eyepiece.jpg` visitor photograph (previously shared as `y2EZorEPn8`). Remove the two older concept panels from the page to avoid repeating it.
- Publish one combined concept, `projects/wysiwyg/desert-creatures-concept.png`: birds above two particle figures walking on sand in front of the camp. An explicit `fit: contain` keeps heads and grounded feet visible inside the bounded frame on large displays. Other gallery images retain their existing crops.
- Add `projects/wysiwyg/bench-sunset.jpg` from `2026-07-05/RAF/DSCF8143.RAF` and `projects/wysiwyg/bench-seat-detail.jpg` from `2026-07-05/RAF/DSCF8155.RAF`. The first shows the bench in use from behind; the second shows the seat and peg joinery.

Camera directory: `/Users/jonas/Downloads/Camera/998_FUJI/`. These were selected from the 63 RAW photographs reviewed as contact sheets. Sensor data was decoded through Core Image `CIRAWFilter.outputImage`, with camera white balance, exposure 0, decoder baseline +0.12 EV, 3200 px long edge and sRGB JPEG quality 0.94. No generative edits were applied to the bench photographs. The full exports were inspected before use. Original camera files remain unchanged.

The combined concept uses the RAW-developed `DSCF8179.RAF` photograph and the existing `walking-figures.png` and `birds-day.png` app recordings as references. Generated with the built-in imagegen tool. Original output: `/Users/jonas/.codex/generated_images/01a08856-238e-7422-9cdb-00ca92c30850/exec-c9448b36-a6df-477a-9b4c-79967a457e7f.png`.

### Final WYSIWYG prompt

```text
Use case: compositing.
Asset: one wide landscape concept photograph for the WYSIWYG augmented-reality telescope portfolio, combining walking particle avatars and a bird flock.
Input 1 is the edit target, the real RAW-developed desert telescope photograph at sunset. Input 2 supplies only the appearance and walking poses of the cyan and violet particle figures. Input 3 supplies only the appearance of the tiny black angular birds.
Keep the photographed brass telescope, its stepped circular wooden phone housing, patina, tripod, red sculpture, desert terrain, distant camp and soft pink-blue dusk recognizable and faithful. Keep the telescope in the lower left foreground, unobstructed. Use a wide 3:2 landscape composition, with enough sky to see the complete figures and enough open sand to see where their feet land. A modest reframing for that composition is welcome, but do not change or redesign the instrument.
Add two very large, transparent human figures made of distinct, delicate cyan and pale lavender particles, walking across the OPEN SAND IN FRONT OF THE DISTANT CAMP. Bring them closer than the horizon. Their grounded feet are the most important requirement: each figure must have a planted foot visibly touching a clear patch of sandy ground well BELOW the horizon and BELOW the camp, with the other leg in a natural walking stride. Do not put their feet on the skyline, on roofs, or in the sky. Keep the sand visible around and between the feet so the contact plane reads unambiguously. The closer figure stands on the right, its planted foot at roughly 80 percent down the image and its head high in the sky; a second figure farther back near the middle has a planted foot around 65 to 70 percent down the image. They must still feel monumental, many times taller than the distant people and tents, not human-sized characters beside the tripod. Subtle soft light spilling onto the sand directly under the luminous feet can establish contact; no hard spotlights or solid shadows from transparent bodies. Preserve the airy, open particle construction of the software reference, with the landscape visible through it.
In the same scene, add one loose flowing murmuration of hundreds of tiny dark angular bird silhouettes sweeping across the upper sky, curving through the space around the figures without obscuring their silhouettes. Use the app reference's simple black bird shapes and depth variation, not realistic feathered birds. This is one integrated composition, not panels or a collage.
Natural photographic texture, soft dusty sunset, restrained glow and contrast. Avoid oversharpening, HDR, dense solid bodies, robots, statues, floating feet, horizon-standing figures, beams, futuristic UI, labels, text, logos, eyepiece borders, watermarks or extra creatures. Preserve the real photograph's atmosphere. High-resolution landscape output.
```

## BorderLAN

Replace `doorway-counter-strike.png` in the page with `projects/borderlan/players-counter-strike.png`. Keep the existing Diablo hero. Source: `/Users/jonas/Desktop/IMG_7849.DNG`, decoded from Apple ProRAW sensor data before review with Core Image, camera white balance, exposure 0 and the decoder's +2.4439695 EV baseline. The intermediate export is 3200 × 2400 sRGB JPEG. It is not included in the repository or published.

The built-in imagegen tool replaced all four photographed heads with classic Counter-Strike heads, using the previous doorway composite as a style reference. The room, table, equipment, bodies and clothing are retained. All four replacements were visually inspected. Original output: `/Users/jonas/.codex/generated_images/01a08856-238e-7422-9cdb-00ca92c30850/exec-6e82cc59-9f21-4346-ad77-e620d85f2cba.png`. Original DNG and generated output remain unchanged.

### Final BorderLAN prompt

```text
Use case: compositing.
Asset: BorderLAN portfolio photograph with people's identities replaced by classic Counter-Strike game heads.
Input 1 is the edit target, a RAW-developed photograph of four people playing games in a stone cellar. Input 2 is STYLE REFERENCE ONLY for the deliberately low-polygon Counter-Strike 1.6 heads already used on the site. Do not use its doorway or its composition.
Change only the FOUR heads in input 1. Replace each person's entire face, hair and head with a distinct classic Counter-Strike 1.6 character head, convincingly superimposed at the correct size, neck position, direction and perspective. Front left: olive balaclava terrorist head; rear left: black SAS gas-mask head with round opaque lenses; rear right: beige wrapped terrorist head; front right: navy counter-terrorist helmet and dark face shield. These must be visibly old-game low-poly geometry and low-resolution painted textures, like reference 2, rather than realistic modern tactical masks. Any eye area must be invented game texture, never the photographed person's own eyes. None of the four real faces or identifying hair may remain visible. Retain their headphones fitted over the game heads.
Preserve all four bodies, poses, hands and clothing exactly as in input 1. Preserve the photograph's 4:3 framing and wide angle, the vaulted stone cellar, ceiling bulbs, red table, four monitors and wooden mounting posts, keyboards, mice, candles, plants, drinks, cables and projection on the far wall. The real room and all areas other than the heads must stay photographic and faithful to the source. Match warm red table light and cool ceiling light on the inserted game heads. Keep the original softness, texture and exposure. No changes to the room or furniture; no new people, weapons, game HUD, captions, logos, text or watermarks. High-resolution output.
```
