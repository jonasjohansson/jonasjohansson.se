# Single gallery media and WYSIWYG photographs, 12 September 2026

## Wide-screen gallery layout

The 1440 px desktop rule previously gave every standalone gallery image or
video six columns, including media with no adjacent partner. Vista's square
videos left the right half of the page empty.

After existing authored image rows are grouped, adjacent standalone images
and videos are paired in document order. Heroes, text, audio and authored
rows break these runs. An odd final item remains unpaired. At 1440 px and
above, pairs use the existing half-width layout and single items fill all
twelve columns. Smaller layouts and authored image rows retain their behavior.

Single media frames use their natural proportional height up to the smaller
of 80svh and 56rem. Images and videos fill that frame using object-fit: cover
and the authored focal point, defaulting to the centre. Short panoramas keep
their natural height. Responsive image sizes now distinguish full-width
single images from half-width paired images.

## Additional WYSIWYG photographs

The user supplied two further photographs to include. Their RAW files were
developed and visually inspected before being copied into the project.

| Published source | RAW source | Camera white balance |
| --- | --- | --- |
| `projects/wysiwyg/desert-eyepiece.jpg` | `2026-07-10/RAF/DSCF8382.RAF` | 5964.953 K / tint 3.292 |
| `projects/wysiwyg/sunset-telescope.jpg` | `2026-07-11/RAF/DSCF8450.RAF` | 5703.021 K / tint 8.870 |

RAW sources are under `/Users/jonas/Downloads/Camera/998_FUJI/`. Development
used macOS Core Image CIRAWFilter sensor decoding with camera white balance,
exposure 0 and the decoder's +0.12 EV baseline. Exports are 3200 px on the
long edge, sRGB JPEG at quality 0.94. No crop, added sharpening or generative
editing was applied. Camera originals remain unchanged.

The new portrait joins the existing seated-viewer photograph in an authored
row. The sunset telescope photograph follows the existing sunset viewer at
the end. WYSIWYG now has fourteen gallery images and the flock video.
The three previously excluded photographs remain excluded.

## Validation

The build, seven content tests and all 51 browser checks passed. Pairing tests
cover odd runs, image/video combinations, heroes and intervening text and rows.
Browser checks cover all published projects at 1440, 1850 and 2560 px, including
document order, half-width pairs, full-width single items, bounded frame height,
cropping, responsive source sizes and full-width heroes. Existing checks below
the breakpoint and on mobile passed.

Additional Chrome checks at 390, 1280, 1440 and 1850 px confirmed all fourteen
WYSIWYG images decode without horizontal overflow. At 1440 and 1850 px with a
900 px viewport height, Vista's first gallery video fills the width and has a
720 px frame. The Vista crop at 1850 px and telescope pair at 1440 px were
visually reviewed in `screenshots/single-gallery/`.

## Portrait groups

Vi kommer i fred has a related sequence of two 9:16 stills and one 9:16 video,
authored at columns 1, 5 and 9. The grouping pass now preserves complete authored
rows before pairing standalone media. Row rendering supports videos alongside
images, using their aspect ratios to give the panels equal heights and 16 px gaps.
Automatic portrait grouping also accepts portrait videos. Hero media stay separate.

The sequence now stays in one row above 768 px and stacks with ordinary gaps on
mobile. The landscape photograph after it remains an independent, full-width
frame on large screens. Jagad's authored video pair is also preserved as a row.
An audit of every project's grouping found no other layout changes.

Regression checks cover the triptych at 390, 1280, 1850 and 2560 px, including
uncropped proportions, equal desktop heights, normal mobile gaps, video playback
and tap-to-show controls. Unit checks cover mixed-media groups, incomplete rows,
text breaks and consecutive authored pairs.

The final build, nine content tests and all 59 browser checks passed, including
the subsequent Balena film-scan orientation correction.
