# BorderLAN and WYSIWYG: RAW selection

Reviewed the RAF originals before selecting photographs, following the user's
RAW-first preference. The review covered 500 files: 45 from 23 July, 10 from
24 July, 3 from 8 July, 173 from 9 July, 44 from 10 July, 121 from 11 July,
and 104 from 26 July 2026. The 26 July folder contains both projects.

Eight photographs were selected for each page. BorderLAN starts with people
playing together, then shows the cellar, entrance and table details. WYSIWYG
starts with the instrument at sunset and alternates visitors, physical details
and its desert and woodland settings. Repeated views and unrelated installations
were excluded.

## Development

The exports were decoded from sensor data using macOS Core Image
`CIRAWFilter.outputImage`, with camera white balance, default tone and noise
processing, zero added exposure and the decoder's +0.12 EV baseline exposure.
Review previews were 800 px, with larger 1600 px shortlisted previews. Final
JPEGs are sRGB, quality 0.94 and 3200 px on the long edge (3200 × 2134 for
landscapes, 2134 × 3200 for portraits). No crop or generative editing was applied.
Camera originals remain unchanged. The site build creates responsive AVIF and
WebP derivatives.

Source paths below are relative to `Downloads/Camera/998_FUJI`.

## BorderLAN

| Website asset | RAW source | White balance |
| --- | --- | --- |
| `projects/borderlan/hero.jpg` | `2026-07-23/RAF/DSCF8556.RAF` | 3516 K / tint 3.951 |
| `projects/borderlan/doorway.jpg` | `2026-07-23/RAF/DSCF8538.RAF` | 3516 K / tint 3.951 |
| `projects/borderlan/entrance.jpg` | `2026-07-24/RAF/DSCF8563.RAF` | 3516 K / tint 3.951 |
| `projects/borderlan/stations.jpg` | `2026-07-26/RAF/DSCF8658.RAF` | 4292 K / tint 5.889 |
| `projects/borderlan/playing.jpg` | `2026-07-26/RAF/DSCF8695.RAF` | 3555 K / tint 4.726 |
| `projects/borderlan/table-detail.jpg` | `2026-07-26/RAF/DSCF8647.RAF` | 3252 K / tint 5.826 |
| `projects/borderlan/candles.jpg` | `2026-07-26/RAF/DSCF8652.RAF` | 3547 K / tint -0.261 |
| `projects/borderlan/together.jpg` | `2026-07-23/RAF/DSCF8560.RAF` | 3516 K / tint 3.951 |

## WYSIWYG

| Website asset | RAW source | White balance |
| --- | --- | --- |
| `projects/wysiwyg/hero.jpg` | `2026-07-11/RAF/DSCF8453.RAF` | 5917 K / tint 6.666 |
| `projects/wysiwyg/desert-viewer.jpg` | `2026-07-09/RAF/DSCF8334.RAF` | 9884 K / tint 0.828 |
| `projects/wysiwyg/dust.jpg` | `2026-07-09/RAF/DSCF8212.RAF` | 10830 K / tint 4.198 |
| `projects/wysiwyg/woodland.jpg` | `2026-07-26/RAF/DSCF8744.RAF` | 6261 K / tint 9.709 |
| `projects/wysiwyg/phone.jpg` | `2026-07-11/RAF/DSCF8456.RAF` | 5396 K / tint 9.512 |
| `projects/wysiwyg/housing.jpg` | `2026-07-11/RAF/DSCF8460.RAF` | 6043 K / tint 6.079 |
| `projects/wysiwyg/eyepiece.jpg` | `2026-07-26/RAF/DSCF8710.RAF` | 6406 K / tint 11.834 |
| `projects/wysiwyg/sunset-viewer.jpg` | `2026-07-11/RAF/DSCF8435.RAF` | 5883 K / tint 7.293 |

## Copy sources

Both project entries were previously placeholders. Their descriptions use
photographic evidence and the user's existing local repositories:

- `borderlan` at `adb5d55`: README and conductor documentation describe
  Raspberry Pi 5 game stations, a custom launcher, local networking and
  integration with audio, lights and projections.
- `borderlan.land/main.js` and `index.html`: published event copy establishes
  the earth-cellar setting, four seats, the 2002 theme, games, music and food,
  and Jonas and Rose as hosts. This supports mentioning Rose in the opening
  paragraph without adding a separate credits list.
- `wysiwyg` at `97241de`: README, current application and CAD notes establish
  the phone-based AR telescope, WebAR/Three.js, animated figures and flocks,
  and the brass telescope replacing the early printed optical tube. The
  photographs show the wooden tripod and phone enclosure. Public copy avoids
  treating unimplemented design proposals as completed features.

WYSIWYG collaborator names and specific authorship roles were not supplied,
so none were inferred. The descriptions can be refined when the user provides
further background. Neither source repository was modified.

## Validation

The production build and all 42 existing browser checks passed. Additional
Chrome checks at 1440 px and 390 px confirmed eight loaded images per page,
full-width heroes within the shared 24 px gutter, no horizontal overflow,
48 px desktop / 32 px mobile preamble spacing and 16 px mobile image gaps.
The desktop sequences and mobile portrait pair were visually reviewed.
Review captures are in the ignored `screenshots/summer-projects/` directory.
