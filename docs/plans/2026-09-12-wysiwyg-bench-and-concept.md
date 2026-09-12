# WYSIWYG bench photographs and desert concept, 12 September 2026

## Bench photographs

The user identified Rose Hallgren as the bench's designer and builder and
provided the 5 July camera directory. All 63 RAW files were decoded and reviewed
as contact sheets before selecting two photographs with no people in the frame.

| Published source | RAW source | Camera white balance |
| --- | --- | --- |
| `projects/wysiwyg/bench-desert.jpg` | `2026-07-05/RAF/DSCF8138.RAF` | 6522.089 K / tint 1.610 |
| `projects/wysiwyg/bench-joint.jpg` | `2026-07-05/RAF/DSCF8163.RAF` | 6134.487 K / tint 1.907 |

Camera sources are under `/Users/jonas/Downloads/Camera/998_FUJI/`.
Developed from sensor data using macOS Core Image `CIRAWFilter.outputImage`,
camera white balance, exposure 0 and the decoder's +0.12 EV baseline.
Exports are 3200 px on the long edge, sRGB JPEG at quality 0.94.
No crop, additional sharpening or generative processing was applied to the
bench photographs. Originals remain unchanged. Both final exports were
visually inspected.

The photographs form one row on desktop and stack on mobile. The sentence
“Rose Hallgren designed and built the wooden bench” precedes them, with a link
to her website. This attribution comes directly from the user.

## Desert concept image

The user supplied four telescope photographs and requested a generated concept
showing virtual information superimposed on the desert view. The selected base
is `2026-07-09/RAF/DSCF8179.RAF`, developed to 3200 px using the same RAW
pipeline and inspected before generation. The other two references are the
existing `flock-render.png` and `giant-render.png`, captured from the real app.

Generated with the built-in imagegen tool using the prompt below. The output is
a conceptual composite, not an app screenshot or documentary photograph.
It preserves the recognizable telescope and desert setting while illustrating
the angular bird flock and blue particle figure. It is introduced as a concept
image in the page text and alt text, alongside the actual render captures and
flock recording.

Generated original:
`/Users/jonas/.codex/generated_images/01a08856-238e-7422-9cdb-00ca92c30850/exec-0cf4f238-682a-4b26-ab0f-c1580dc622be.png`

Project copy:
`projects/wysiwyg/desert-concept.png`

The original generated file and camera originals are preserved. The existing
hero remains unchanged, and the three excluded photographs (`U4uadHc2pu`,
`qBp9gDt55V`, `BYYoh2Rjv4`) remain excluded.

### Final prompt

```text
Use case: compositing.
Asset type: a wide, high-resolution concept image for the WYSIWYG augmented-reality telescope project page.
Input 1 is the edit target: an actual RAW-developed photograph of the brass telescope with stepped circular wooden housing and wooden tripod in the desert at dusk. Inputs 2 and 3 are supporting visual references captured from the project's real software: a flock of small flat mint-green and pale yellow bird shapes, and a walking human silhouette made from tiny pale blue particles.
Primary request: keep the real photograph and superimpose those virtual creatures across its desert landscape, making an evocative conceptual illustration of what a viewer can discover through the telescope. Keep the telescope, wood construction, brass patina, tripod, sandy ground, low horizon, distant red sculpture, photographic viewpoint and sunset recognisably faithful to input 1. Do not redesign the physical object.
Place a loose, sweeping flock in the open sky and landscape beyond the telescope, with the simple angular bird geometry and restrained colours of input 2. Add one tall, translucent walking figure in the open middle distance, built from distinct small blue particles like input 3, with the landscape visible through the gaps. Keep the creatures clear of the telescope and integrate their perspective and depth with the photographed landscape. The scene should feel like a photographic AR concept, not a fantasy painting or a screenshot of a futuristic interface.
Preserve the soft dusty pink and blue dusk, natural photographic texture and gentle contrast. Avoid excessive sharpness, HDR, neon glow, lasers or magical energy effects. Remove any small real human figures in the distant background. No new physical people, no identifiable faces. No text, titles, labels, logos, frames, circular eyepiece border, UI controls or watermarks. Landscape composition, approximately 3:2, suitable for a large portfolio image.
```

## Validation

The build and all six content tests passed. Chrome checks at 390, 1280, 1440
and 1850 px confirmed twelve decoded images and the flock video, lazy loading
for gallery images, a full-width hero and no horizontal overflow or browser
errors. The bench pair has aligned edges and matching heights on desktop and
stacks with the normal 16 px gap on mobile. The Rose attribution and concept
description are present, and all three excluded image hashes are absent.
The bench pair at 1440 px and concept placement at 1280 px were visually
reviewed in `screenshots/wysiwyg-bench/`.
