# Filter Strip Design

## Overview

Bring the tag filter back as a cell inside the strip wall rather than a separate control docked to an edge. Leftmost column on desktop, top row on mobile, pinned in place. At the same time, move the desktop title readout from the top of the wall to the bottom on the landing page.

The filtering logic already works. `stripFiltering.js` runs on every load, the checkboxes render in `strips.njk`, and `filter.css` carries the checked and unchecked styling. One line, `.filter-dropdown { display: none }`, has been hiding it since commit 03dd3a0. This is a placement and styling change, not a rebuild.

## Tags

Six, from `_data/site.json`: light, installation, education, av, mixed reality, stage.

## Placement

- The filter markup moves inside `#strips` as a cell carrying the `.strip` class, so it inherits the flex sizing every other strip gets.
- It is partitioned out of the shuffle in `strips.js` and pinned first, the same way placeholder strips are pinned last. It never moves between loads and never takes part in the hue sort.
- Because it is a `.strip`, it needs an explicit exemption from `body.filter-active .strip { display: none }` or it hides itself on the first click.

## Desktop

- One narrow column divided into six bands, one per tag.
- Each label is rotated to run up its band, matching the placeholder titles so the two read as one system.
- A hairline separates the bands, as between placeholder strips.
- Selected tags invert: `--text-primary` fill, `--bg-primary` text. This is what `filter.css` already does for `.filter-option:has(input:checked)`.

## Mobile

- One row at the top of the stack, six chips laid out horizontally.
- Shorter than a project row, like the placeholder rows.

## Interaction

- Click or tap a band toggles that tag. Multi-select, tags OR'd together. All existing `stripFiltering.js` behaviour, unchanged.
- The strip never expands on hover, never navigates, never scrambles the header title. Same guards the placeholder strips use in `stripInteraction.js`.
- Non-matching projects disappear and matches stretch to fill, which `body.filter-active` already does.
- Placeholder strips carry no tags, so they drop out while a filter is active and return when it clears. They are not work yet, so they should not survive a filter for a category.

## Title readout at the bottom

On the landing page the header pill is currently prepended to the top of `#strips` and shows the hovered project's name. It moves to the bottom, docking the same way it already does on project pages when scrolled.

Three things follow from the move:

- `header.header-hidden` translates upward by `100%`. Bottom-docked, that slides the pill up over the strips instead of out of view. It needs a downward translate when docked at the bottom.
- The `pointer-events: none` rules are written against `#strips > header:not(.header-bottom)`. Once the home header is bottom-docked those stop applying, and the pill starts stealing `:hover` from the strip beneath it, which collapses the strip and flickers. The rules need rescoping to the home route rather than to the dock position, because on project pages the bottom-docked header is a real link home and must stay clickable.
- Mobile home hides the header entirely, so none of this affects touch portrait.

## Scope

- `_includes/components/strips.njk` — restructure the filter markup into a strip cell
- `src/css/modules/filter.css` — band layout, rotated labels, mobile chip row
- `src/css/modules/header.css` — bottom-docked hidden state, pointer-events rescoped to route
- `src/js/strips.js` — pin the filter strip first, keep it out of the visible count
- `src/js/stripInteraction.js` — make it inert
- `src/js/main.js` — dock the home header to the bottom of the wall

No change to the filtering logic itself.

## Trap

`initFilters()` bails and re-schedules itself every 100ms when it finds no `.filter-dropdown-button`. That button is rendered but hidden today. Deleting it during the restructure without also dropping the retry guard leaves the site spinning forever.
