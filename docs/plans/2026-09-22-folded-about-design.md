# Folded About on desktop

## Goal

The landing shows only the first sentence of the bio, so the project wall starts
higher. Pressing the sentence unfolds the rest of the text; the wall eases
shorter to make room. This applies on desktop and mobile alike (extended to
touch screens on 2026-09-26); without JavaScript the full text shows.

## Design

- Build time: an Eleventy filter `introLead` splits `site.intro` at the first
  full stop. `intro.njk` renders the lead paragraph with a `More` button inline,
  then the remainder in a `.intro-more` block. Print and metadata keep using the
  whole intro.
- CSS (`intro.css`): under `.enhanced` the remainder is a grid with
  `grid-template-rows: 0fr` that transitions to `1fr` when the intro has
  `data-open`.
- JavaScript (`home.js`): the button toggles `data-open` and `aria-expanded`,
  and flips its label between More and Less. A `ResizeObserver` on `#strips`
  (in `strips.js`) recomputes image widths while the wall height changes.
- The lead is the first sentence, not the first visual line, so the wall top is
  stable at every desktop width.
