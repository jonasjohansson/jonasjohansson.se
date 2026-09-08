# Project media update — 7 September 2026

Vi kommer i fred now opens with `02-2x.webm`, upscaled from `02.webm` in DaVinci Resolve Studio. Its exact first decoded frame, exported with FFmpeg to `02-2x-first-frame.jpg` at 2560 × 1708, supplies the video poster, landing-page strip and sharing image. Project pages use image strips below the content, showing only other published projects. The former hero `01.jpg` takes the video's previous place after the introduction. The Resolume screenshot `08.jpg` is removed from the page. The laptop photograph uses a new 3:2 landscape edit. Hero videos have no player controls; media descriptions stay in image alt text and video accessible labels without visible captions.

Jagad uses a horizontally outpainted joystick photograph as its desktop hero and strip image. The supplied original portrait is copied to `projects/jagad/joystick-original.jpg` and used as the mobile hero. The previous building hero remains in the project body with its upper shadows and sky corrected. The daylight controller snapshot `03.jpg` was removed following review. Its former partner `04.jpg` is paired with `controller-facade-first-frame.png`: the first decoded frame from `/Users/jonas/Downloads/2026/Video/06/IMG_9693.MOV`, exported with FFmpeg at 1440 × 1920, with the source rotation applied and colour converted to sRGB. The original movie remains untouched.

All source photographs are retained. The three edited photographs below were made with the built-in imagegen tool, and the selected PNG outputs are saved in the project folders. The tool returned the pixel dimensions listed below; the site generates its usual responsive AVIF/WebP derivatives. Outpainted areas and photo corrections are AI-generated edits.

Validation: production build and five Node tests pass. Fifteen browser regression checks pass, including direct/client video hero navigation, the first-frame poster, playback and reduced motion. Both projects also passed focused checks at desktop, mobile portrait and touch landscape sizes; the Jagad mobile hero selects the original portrait source. Neither page has missing local asset paths. Media screenshots are in `screenshots/project-media/`; current strip captures are in `screenshots/site-smoke/`. The media updates deployed successfully in GitHub Actions run 34166177002.

## Vi kommer i fred Resolve upscale

DaVinci Resolve Studio 21.0.4.5 rendered a separate local project using clip-level **2× Enhanced Super Scale**, sharpness 0.3 and noise reduction 0.2. The timeline and ProRes 422 HQ master are 2560 × 1708 at the original 30 fps, with all 453 frames and the original 15.1-second duration retained. A ProRes intermediate was used to import the VP9 source; FFmpeg only handles format conversion and final web compression.

The web asset `02-2x.webm` uses VP9 at CRF 30 and is 6,908,546 bytes. The source `02.webm` remains untouched. The Resolve project backup, render job details and master are kept locally in `.cache/resolve/vi-kommer-i-fred/`; they are excluded from deployment. The first frame was checked against the source for matching composition and colours.

## Jagad wide joystick hero

Saved asset: [joystick-hero.png](../../projects/jagad/joystick-hero.png) (1536 × 1024).

Final prompt:

```text
Use case: precise-object-edit.
Asset type: wide photographic hero for the Jagad interactive arcade installation portfolio page.
Image 1 is the edit target, an original portrait photograph: a hand gripping a glowing white arcade joystick, purple and blue event lighting, shiny metal shaft and a clear glossy controller panel reflecting the hand and light.
Primary request: outpaint this photograph horizontally into a seamless landscape 3:2 composition, ideally 3072 by 2048 pixels. Preserve the original vertical photograph and its subject in the centre, extending the scene only to the left and right. Keep the hand and luminous joystick as the clear dominant focal point near the centre, with the reflective controller surface continuing naturally across the lower frame.
Preserve exactly: the existing hand's anatomy, number of fingers, pose, skin texture, joystick shape and angle, white glow, metal shaft, controller construction, all original purple/blue lighting, shallow focus and the original reflection. The source is a real installation photograph, so this must remain documentary and photographic.
Outpaint only softly focused dark purple/blue surroundings and the same glossy controller surface where necessary. Do not invent extra hands, people, joysticks, screens, buttons, logos, text, cables or scenery. No visual redesign, no change in viewpoint, no dramatic extra glow. Maintain natural texture and restrained highlights. Create one wide hero photograph, not a mockup or collage.
```

## Jagad corrected building photograph

Saved asset: [01-corrected.png](../../projects/jagad/01-corrected.png) (1448 × 1086).

Final prompt:

```text
Use case: lighting-weather.
Asset type: corrected documentary installation photograph in an artist's portfolio.
Image 1 is the edit target: an existing photograph of Jagad projected onto a Stockholm building at night.
Primary request: gently correct the exposure and colour of ONLY the dark upper storey, roof and adjacent upper sky so the upper part no longer looks muddy, flat grey or nearly crushed black. Lift the roof and upper façade shadows modestly, reveal the existing architectural detail and give the sky a natural deep blue night tone. Smooth the tonal transition into the brightly projected lower façade. Keep the scene clearly at night with believable contrast.
Invariants: preserve the exact photograph, composition, crop, camera perspective, building/window/roof geometry, visible signs and all text, tree branches, pavement, snow, people and the original projected game imagery. The luminous blue/orange game projection and lower street exposure are already good: leave them unchanged. Do not extend the projection into the upper storey, add windows or lights, change the game, redraw lettering, replace the sky with dramatic clouds, or brighten this into twilight/daylight. No outpainting and no invented details. Keep the original 4:3 aspect ratio. This is a restrained local photo correction, not a reimagining.
```

## Vi kommer i fred wide laptop photograph

Saved asset: [09-wide.png](../../projects/vi-kommer-i-fred/09-wide.png) (1536 × 1024).

Final prompt:

```text
Use case: precise-object-edit.
Image 1 is the sole edit target and the original documentary photograph. Produce a landscape 3:2, high resolution version for a website, ideally 3072x2048. Treat the entire original photograph, especially every pixel of the laptop screen, as protected content: do not regenerate, redraw, reinterpret or change it. Keep the original perspective, tilt and shape of the laptop exactly. Do not straighten the laptop or change the camera position.
Make the frame wider primarily by extending the existing soft-focus dark night street to the LEFT of the original image. The original laptop should remain against the right edge, with no newly invented screen area to its right. A modest crop of the empty sky at the top is allowed. The original image's screen UI, tiny text, buttons, layered interface and alien craft preview MUST remain visually identical to the input, including its existing softness. Do not replace unreadable UI text with invented legible text. Keep the original blurred street lights and night tones. No new objects, people, screens, signs or sharp architecture. This must be the same photograph with more canvas and gently improved resolution, not a new picture of a similar laptop.
```
