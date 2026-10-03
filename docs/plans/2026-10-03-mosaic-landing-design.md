# Mosaic landing (experiment)

The landing wall of vertical strips becomes a mosaic covering the whole
screen. Behind `?mosaic` until it has been seen next to the strips.

## Decisions

- **Landing only.** The "More projects" strips under a project stay strips.
- **Full bleed, one screen.** No gutter, no gaps, no scroll, on every screen.
- **Chrome floats.** The folded About sentence sits in a plate at the top
  left; the caption, links and filter sit in plates along the bottom, in the
  style of the floating project title.
- **Mixed sizes, packed.** The wall keeps its colour order. Size follows date:
  the newest project is 3x3, the next two 2x2, the next five 2x1 or 1x2 by the
  shape of their photograph, the rest 1x1.
- **CSS draws, JS counts.** A CSS grid with `grid-area: var(--y) / var(--x) /
  span var(--h) / span var(--w)`. CSS cannot count the visible tiles, and
  `grid-auto-flow: dense` leaves holes once a big tile falls late in the
  colour order, so a small pure function (`src/js/mosaic.js`) picks the
  column count closest to square cells and each tile's cell: big tiles where
  their place in the colour order falls, the rest filling free cells in
  reading order, a few two cells wide to use up the leftovers.
  `tests/mosaic.test.js` checks every count on five screen shapes fills
  exactly.
- **Hover** names the tile in the caption, keeps the cursor pan, and dims the
  rest through `:has()`. Touch works as it does now: first tap names, second
  opens.
- **Filters** re-lay the grid for what is left, animated with a view
  transition where supported.

## Size data

The build ranks listed work by date and sets `mosaicSize` (`xl`, `l`, `m`)
on the newest eight. The strip carries it as `data-size`.
