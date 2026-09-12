# Det Mörka Ljuset / Elverket

Replaced the placeholder with a project page at `/det-morka-ljuset/`, requested by Jonas on 12 September 2026. The page covers the film and his wider work with Elverket. It is tagged Audiovisual, Exhibition and, through its date, 2026.

## Current publication

After reviewing the first version, Jonas requested a minimal page until more imagery is available. The published page now keeps the hero, introduction, a short account of his role and a brief closing collaborator paragraph with a full-credits link. All selected media remains in the repo for later use.

The [extended copy draft](../drafts/det-morka-ljuset.md) expands the project story, retains the full collaborator text, maps the supporting sources, and identifies imagery needed for each section. It is excluded from the site build. The record below documents the fuller first version, preserved in commit `db36f59`.

The minimal revision passes the production build and all ten content/unit checks. Chrome review at 390 and 1440 px confirms one hero, three text blocks, no gallery video, correct sharing metadata and no horizontal overflow or browser errors. Confirmed that `dist/docs` is absent, so the extended draft is not published as a website page.

## Copy and sources

The opening introduces Lars Lerin, Sara Broos and the film. The body describes Jonas's technical producer and animation roles, the room model, browser and desktop previews, mapping, Lofoten studies, delivery tools, Mellanrummet and the film website. The collaborators appear in closing prose. There is no invented personal anecdote or concluding slogan.

- [Elverket's production page](https://elverket.com/produktioner/lars-lerin) supplies the film synopsis, public opening date of 26 September 2026, and credited roles. The project date is the opening date, not the date of this portfolio update. The page does not claim that the public exhibition has already opened.
- Local `detmorkaljuset.se/en/index.html` supplies the full credits, including Pia Åstrand's project management at Chimney. The site is linked as [detmorkaljuset.se](https://detmorkaljuset.se/).
- Local `elverket` documents the browser room model, individual projection surfaces, panorama loading, seated and headset views, openings, exit signs and measurements. The current model bounds in `assets/js/3d/config.js` support the rounded dimensions used in the copy: 34 metres long and eight metres high.
- `elverket/docs/WALL-NAMING.md` identifies the underlying imported architecture model. The copy credits Jonas with building the 3D preview, not with creating the architect's source model.
- Local `elverket-viewer` documents the desktop player and synchronised wall and floor playback.
- Local `elverket-resolume-mapping-tool` documents projection mapping and Resolume exports.
- Local `elverket-uploader` documents large-file delivery, versions and media validation.
- Local `elverket-lars-lerin` documents the transition, point-cloud and flocking studies.
- The mounted `231 ELVERKET` shared Drive supplies the Lofoten compositions, animation test and Mellanrummet delivery notes. Mellanrummet's projection wall is fourteen metres wide. The working layouts and tests support the descriptions of Jonas's animation work.

The public production page currently spells the animator's name Deniz Özumagi, while the local film website uses Ösumagi. This page follows Elverket's public credit. Film duration is omitted because the sources consulted do not all give the same running time.

## Media selection

Six stills and one silent room-preview recording are included. Exhibition photography can replace or supplement this selection when the better imagery Jonas mentioned becomes available. Production studies are identified in the surrounding text and alt descriptions.

| Asset | Source |
| --- | --- |
| `hero.jpg` | `detmorkaljuset.se/assets/images/hero-exhibition-2400.jpeg`, the exhibition image already used by the official film site |
| `birds-in-the-room.jpg` | `Downloads/dml-instagram/797150044_18089905418268395_1715992752526238455_n.jpg` |
| `calibration.jpg` | `Downloads/dml-instagram/1x1-alternativ/02_kalibrering_1x1.jpg`; the square export keeps more of the view visible than the heavily letterboxed 4:5 export |
| `preview-tool.jpg` | New Chrome capture of the existing Elverket room model with its numbered grids and surface controls |
| `room-study.jpg` | `Downloads/2026/Image/08/elverket_2026-08-20T18-45-54-518Z.png` |
| `lofoten-layout.jpg` | Shared Drive `Det Mörka Ljuset/01_SOURCE/10_LOFOTEN/Jonas/JPG/10_LOFOTEN-Collage-Serie2_Panorama-v3.jpg` |
| `lofoten-room.mp4` | New recording of the existing room model playing the Lofoten test described below |
| `lofoten-room-poster.jpg` | Frame at one second from that recording |

The official hero's source is [Elverket's Sanity image asset](https://cdn.sanity.io/images/nvb5rzwz/production/23cdf19bfc252bec558d8a24a20016a06d27deea-7680x5120.png). The already-prepared 2400-pixel JPEG was reused. Still sources remain untouched; publication copies use sRGB JPEG and the site's existing responsive AVIF/WebP pipeline. No generative edits were made. No installation photographer is inferred from a filename. Kristoffer Andrén's credit in the text is specifically for photographing the paintings.

The Drive inventory was checked for RAW sources before selection. Its fourteen ARW files are painting reproductions, not RAW versions of these installation views. The chosen documentation consists of supplied image exports and rendered production studies.

## Motion preview

Source: shared Drive `Det Mörka Ljuset/01_SOURCE/10_LOFOTEN/Tests/LOFOTEN_PANORAMA_v19_preview_3840x1636_half_0626_0904.mp4`. The encoded source is 1920 × 818 despite its filename. Selected approximately 112–136 seconds from the 184.6-second production test and applied it using the model's existing panorama-video texture mapping.

The capture uses the existing model, doorway geometry and exit signs, with a camera at `(7, 6.7, -12)`, looking toward `(9, 6.8, 12)` at a 64° field of view. The player UI is omitted from the motion capture and retained in the separate grid screenshot. The source repo and its deployed access settings were not changed.

Published recording: 1920 × 1080, 25 fps, H.264/yuv420p, 22.96 seconds, fast-start MP4, 4.14 MB, silent. It presents an animation test inside a model, not a recording of the final exhibition. The full film and audio are not included.

## Validation

- Production build and all ten content/unit checks pass.
- Targeted Chrome review at 390, 1440, 1920 and 2560 px: no horizontal overflow or JavaScript errors; the hero fills the shared page width; image groups follow the shared responsive layout; the video plays and has no controls before interaction on mobile.
- Desktop and mobile captures reviewed for the hero, installation views, production preview and ending text.
- The original HTML contains the hero-derived 1200 × 630 JPEG for Open Graph, Twitter and structured data. The new page appears in the project strips and sitemap.
- Updated browser checks that assumed Society Expo was the only Exhibition project. Real collection counts now come from the project data. A local test fixture preserves the separate case where a category belongs only to the open project, so the empty-result guard remains covered as the collection grows.
- All 63 browser checks pass locally, including the new project's route and hero-sharing metadata. GitHub Pages deployment is followed before reporting the page live.
