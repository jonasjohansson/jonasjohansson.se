# Editing the portfolio

Each project lives in `projects/<slug>/data.md`, alongside its images and videos. Published work uses `type: work`; `type: placeholder` keeps unfinished work out of the public strips and project pages. Work is ordered by date, newest first, with the slug breaking ties. The landing page and project pages use image strips. The open project is omitted from its own strips. The landing page keeps its original introduction and about text. There is no index, view selector or filter toolbar.

Run `npm run build` after editing. Required data and local media paths are validated; errors identify the project and field. Source images are encoded into `.cache/images`, and only assets referenced by the current build are copied to `dist/img`. `npm run clean:dist` preserves the cache; `npm run clean:img` clears it. Share-image filenames change automatically when their source changes.

## Images

Always check available RAW originals before selecting or exporting photographs.
For the Fujifilm camera folders, inspect the matching `RAF` files first, then
compare the camera JPEGs if useful. Keep originals unchanged and record the
source filename and development settings for selected exports.

BorderLAN must not show unaltered faces. Prefer photographs of the empty room,
entrance and equipment. The user also permits people with faces fully obscured,
replaced by character portraits from the games, including Counter-Strike 1.6
and Diablo II. Represent the wider game selection in images and copy. Check every face, including
partly hidden people and reflections. Keep untouched photographs out of the site.

The first block must be an image or video with a meaningful `alt` description. Video heroes also require a local poster image (see below). Describe the visible artwork, material, setting or interaction that matters beyond the surrounding prose. Add descriptions to other informative views too; use `alt: ""` for redundant views or decoration. Descriptions stay in image `alt` attributes and video `aria-label` attributes. Media captions are not rendered.

```yaml
title: Example project
date: 2026-09-01
type: work
tags: [installation, light]
color: "#4D75FF"
blocks:
  - type: image
    src: hero.jpg
    alt: "Visitors walk between suspended blue light tubes in a dark hall."
    focal: "50% 40%"
    mobileFocal: "60% 40%"
    heroFit: cover
```

`focal` and `mobileFocal` set the crop position as horizontal and vertical percentages. `heroFit: contain` keeps the entire artwork visible. Heroes and gallery media reach both screen edges on desktop and mobile; text keeps the 24 px page gutter. Mobile heroes use their natural proportions, capped at 85% of the viewport height. To supply a different mobile composition, add `mobileSrc: hero-mobile.jpg`; its dimensions are read automatically. These options use existing artwork and do not generate or alter source files.

Image dimensions and responsive sources are generated during the build. Leave `ar` unset unless you deliberately need a layout ratio override. Standalone gallery images and videos fill the screen width at their natural proportions. Unplaced portrait images are grouped into balanced rows; an authored `half-left` followed by `half-right` forms a pair. Complete rows can also use `colStart` and `colSpan` within a 12-column grid. Panels share the row in proportion to their aspect ratios, keeping equal heights. Pairs stack at 768 px and below; groups of three or more stay together at every width. Standalone media no longer pairs automatically on wide desktops. Older `pair: false` and `fit: contain` values are unnecessary with this layout.

Text placements can use `size` (`full`, `large`, `left`, `right`, `half-left`, `half-right`, `small-left`, `small-right`) or `colStart` / `colSpan`. They apply above 768 px, within the reading measure. On smaller screens, writing uses the full inset width.

Add `unlisted: true` to a project to keep its page at its URL while leaving it out of the strips, filters, print portfolio and sitemap. The page carries `noindex, nofollow`.

For a closer view inside a gallery image's existing frame, set `zoom: 1.8` and a `focal` point. Zoom accepts values from 1 to 3 and remains fixed on hover. The source photograph and navigation strips keep their original framing.

## Collaborators and attribution

Avoid em dashes in site copy and interface labels. Lead project descriptions
with the work itself, and mention the event only where it adds useful context.

Introduce collaborators in the paragraphs describing their contribution. Avoid a
separate credit list when it repeats the story. Keep photography, film, music,
support and source-asset attribution in the relevant text, including links and
any required copyright wording. Use the first person for Jonas's own role.

## Video and audio

Audio excerpts use `type: audio`, a local `src` and a descriptive `label` that
identifies the music and game samples. They have native controls, load on demand,
and never autoplay. Starting another excerpt or leaving the page pauses playback.

```yaml
  - type: video
    src: sequence.mp4
    poster: sequence-poster.jpg
    ar: 1.777778
    alt: "Bands of blue light travel across the suspended tubes."
```

Set `ar` to width divided by height so the page reserves space before downloading the video. Supply a representative poster image and a concise `alt` description; this labels the video for assistive technology without displaying text below the player. Videos in the page body have native controls. On touch devices, a tap reveals them without changing playback; keyboard activation also works. Controls reset when the video leaves the viewport. Desktop and JavaScript-free pages keep native controls available. Muted previews play when visible unless the visitor prefers reduced motion, and stop when offscreen. Interacting with the controls gives the visitor control of subsequent playback.

A video can be the first block. Hero videos have no visible player controls and show their poster when reduced motion is preferred. The poster supplies the strip thumbnail on every page, sharing preview and initial hero frame. Hero descriptions are available to assistive technology without covering the video. Authored hero crop settings also apply to videos. To use the exact first frame, export it with `ffmpeg -i sequence.webm -frames:v 1 -q:v 1 sequence-first-frame.jpg` and reference that file as `poster`.

## Verification

Cmd/Ctrl+P on the homepage exports a widescreen portfolio with a cover and all
published work, in the site's project order. On a project route it exports only
that project, including after client-side navigation. Each project occupies one
edge-to-edge hero page with its title and first two text blocks over the image.
The title and a visible “View full project” link open the full project. Video heroes use their poster still.
The hero crop is sampled behind the text: dark images print without an overlay; brighter images get a local, nearly black tinted PNG gradient that fades out before the right side. The overlay follows the actual text block height and fades to clear below the project link, over a quarter of the text area’s height, leaving the lower photograph unshaded. The fades are baked into PNG transparency to avoid nested-mask rendering artifacts in PDF viewers. This also prints with Background graphics off.
The cover contains the name, biography, contact details and the site’s CV/profile links. The portfolio ends on the work; single-project exports keep only the project. Project pages have
no footers or separate galleries. Content comes from the existing project data.

Print images are 1600px JPEGs, cropped to fill the widescreen page using the hero’s focal point. They stay lazy
on screen; Cmd/Ctrl+P waits for them and the font before opening the dialog.
Browser-menu printing starts image loading in `beforeprint`, but cannot wait
asynchronously; use the shortcut for reliable first-visit exports. Choose Save
as PDF and disable browser headers/footers. Background graphics are optional.
The CSS requests 338.667 × 190.5mm pages; browsers that ignore custom page sizes
need that paper size selected in their print dialog.

- `npm test` checks project validation, image grouping and sharing-image cache invalidation.
- `npm run build` produces the publishable site in `dist`.
- `npm run test:browser` starts a temporary preview server and checks all project routes, loading geometry, navigation, focus, preferences, touch layouts and the no-JavaScript fallback. It saves results and screenshots under `screenshots/site-smoke`.
- `npm run audit:visual` captures representative pages and detail views at five viewport sizes under `screenshots/visual-audit`, preserving earlier review evidence.
- `npm run test:print` checks image loading, copy fit, theme independence and route selection, and exports review PDFs under `screenshots/print`.

The existing browser scripts use Playwright Chromium or local Google Chrome. The additional `npm run test:accessibility` suite uses Chromium, Firefox and WebKit; run `npx playwright install chromium firefox webkit` to install them. See [browser and accessibility checks](browser-accessibility.md) for coverage and hands-on checks. `AUDIT_BASE_URL` can point the scripts at another preview. For a subdirectory deployment, use the same `PATH_PREFIX` for the build and verification commands. CI runs the build and regression checks before publishing.

## Styles and responsive layout

Shared colour, spacing, type and layout values live in `src/css/modules/variables.css`.
Use `--page-gutter` for inset content, `--media-gap` between gallery panels, and
`--project-*-gap` for project spacing. Project titles and writing share a 64rem
maximum (`--project-measure`) and the same inset grid, with their text aligned.
Titles sit above the full-width hero at every screen size. The preamble-to-body
gap (`--project-lead-gap`) grows with the viewport from 16 to 96 px, plus the
shared 16 px grid gap; consecutive body paragraphs retain their tighter spacing.
Mobile adjusts these tokens rather than
redeclaring margins on every component. Gallery `sizes` hints in
`eleventy.config.js` mirror the 1rem media gap and the 768 px stacking breakpoint;
update them together if either value changes.

The width breakpoints are 600 px (compact type), 768 px (text placement and stacked
pairs), 1025 px (larger
project body text), and 1440 px (more space around text sections). Laptop and
desktop body text scales from 27 to 32 px. Wide screens use 96–144 px text margins,
with 120 px at a 1920 px viewport. Adjacent
paragraph blocks retain their normal spacing. Hover queries control strip
interaction and footer controls; image width is independent of the input device.
Print dimensions and spacing use separate variables in `print.css`.
