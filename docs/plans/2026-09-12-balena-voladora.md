# Balena Voladora project

New portfolio page at `/balena-voladora/`, requested by Jonas on 12 September 2026.

## Selection

Reviewed all 30 RAF photographs from DSCF8487 through DSCF8516, taken on 11 July. Used the existing RAW-developed review previews, then developed seven candidates at 3200 px and inspected them individually. DSCF8515 was rejected because the motion blur weakened the photograph. Six RAW exports are included.

Also reviewed all 40 photographs in the additional `47644 00000517` folder. It contains JPEG film scans and the lab's `Info_HD.txt`, with no RAW files. Four scans add the workshop, lighting tests, desert assembly and a softer view of the completed piece. Those files were copied without alteration, preserving the grain and colour of the scans.

| Project asset | Original source |
| --- | --- |
| hero.jpg | Camera/998_FUJI/2026-07-11/RAF/DSCF8487.RAF |
| cyan-profile.jpg | Camera/998_FUJI/2026-07-11/RAF/DSCF8491.RAF |
| warm-rear.jpg | Camera/998_FUJI/2026-07-11/RAF/DSCF8492.RAF |
| tail-detail.jpg | Camera/998_FUJI/2026-07-11/RAF/DSCF8493.RAF |
| rib-detail.jpg | Camera/998_FUJI/2026-07-11/RAF/DSCF8494.RAF |
| warm-whale.jpg | Camera/998_FUJI/2026-07-11/RAF/DSCF8496.RAF |
| workshop-build.jpg | 47644 00000517/000005170011.jpg |
| workshop-lights.jpg | 47644 00000517/000005170014.jpg |
| desert-assembly.jpg | 47644 00000517/000005170029.jpg |
| desert-film.jpg | 47644 00000517/000005170040.jpg |

All source paths are relative to `/Users/jonas/Downloads/`. Camera originals and scan originals remain untouched.

RAW processing uses macOS `CIRAWFilter` through the existing `develop.swift` utility. Sensor data is decoded with camera white balance, exposure 0 and the decoder's baseline exposure +0.12 EV, then exported as sRGB JPEG at quality 0.94, 3200 × 2134. No additional crop, sharpening or generative processing. Film scans are 3130 × 2075. The existing Eleventy image pipeline creates responsive AVIF/WebP derivatives for publication.

| RAF | Camera WB (K) | Tint |
| --- | ---: | ---: |
| DSCF8487 | 15168.644 | 10.7273855 |
| DSCF8491 | 14532.668 | 12.329331 |
| DSCF8492 | 14532.668 | 12.329331 |
| DSCF8493 | 12494.861 | 13.979468 |
| DSCF8494 | 12318.581 | 1.8346971 |
| DSCF8496 | 14851.839 | 7.8894196 |

## Copy and evidence

- [Art Grants entry](https://art.nobodies.team/2026/balena-voladora), supplied by Jonas. It needs a JavaScript redirect on first load, so the initial HTTP 404 was followed in Chrome to read the full entry. Credits list Erik, Selim and Albert. It describes a lever-operated kinetic whale, light, wood and metal, and workshop fabrication. The catalogue identifies the event as Elsewhere Burn 2026.
- Local `balena-voladora/README.md` documents Jonas's lighting and design study using Erik Schmitz's model before fabrication. `BOM.md` and the design notes document the calculation of LED runs and lengths. The page links the [working 3D study](https://balena-voladora.jonasjohansson.se/).
- Local `ledzeppelin/examples/projects/balena-voladora.json` contains two DigOcta controllers and sixteen fixtures: twelve ribs, spine, tail and two fins. The page describes that arrangement. Exact LED counts and physical dimensions are omitted because the preset and earlier design BOM are not independent confirmation of the final installed dimensions.
- The page date is the supplied photographic documentation date, 11 July 2026, not a claim about opening day.
- No surnames are inferred for Selim or Albert, and no photographer is assigned to the film scans without confirmation.

Ten photographs in total. The hero preserves its full composition. The existing shared layout pairs adjacent images on wide displays; the final unpaired photograph uses the full row with the shared height cap. The page is tagged Light and is included automatically in the landing and project strip collections.

## Validation

- Production build passed.
- All seven content/unit tests passed.
- Targeted Chrome checks passed at 390, 1280, 1440, 1850 and 2560 px: all ten images decode, the project is present in the strip collection, the study link is present, there is no horizontal overflow or JavaScript error, wide image pairs occupy half rows, and the final image stays full width within the height cap. Mobile image rows use the normal 16 px gap.
- Desktop and mobile screenshots visually reviewed for selection, sequence and spacing.
- Sharing metadata includes the project title, description and generated Open Graph image.
- GitHub's complete browser suite and deployment are followed after push.
