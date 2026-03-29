# Labs Section Design

## Overview

A single-page dark-mode section at `/labs/` that showcases tools, experiments, and snippets. Accessible via a link in the intro text. One scrolling page with a table of contents at the top and articles flowing below.

## Data

- Lab entries stored as `type: "lab"` projects in `projects/[slug]/data.md`
- Simplified content: title, description (one-liner for TOC), and markdown body
- No blocks system needed, just frontmatter + markdown content
- Each entry can optionally include a link to a GitHub repo/demo and an image/screenshot
- New `labsForJS` Eleventy global that collects `type: "lab"` projects

## Routing

- `/labs/` route in the SPA router
- `data-route="labs"` on the html element
- No sub-routes, everything is one page
- TOC items are anchor links scrolling to article sections

## Transition

- Entering: intro + strips slide out, dark background fades in, labs page appears
- Exiting: reverse, back to portfolio
- Triggered by: link in intro text, browser back, escape key

## TOC

- Dark background using `--color-black` (#1a1a1a), light text using `--color-white` (#f0f0f0)
- Heading: "Labs"
- Mixed sizing: some items large, some small (controlled by `tocSize` in frontmatter, default small)
- CSS grid, 2-3 columns, items flow with size variation
- Each item: title + one-line description
- Hover: subtle highlight

## Articles

- Flow below the TOC on the same page
- Each article is a section using the existing 12-column grid
- Dark styling throughout
- Content: title, a paragraph or two of writing, link to repo/demo, optional image
- Minimal, not full case studies

## Entry/Exit

- Entry: link in intro text navigates to `/labs/`
- Exit: browser back, escape key, or a link back to home

## New Files

- `src/css/modules/labs.css`: dark mode styling, TOC layout, article sections
- `labs.njk`: template for the labs page (TOC + all articles)

## Modified Files

- `eleventy.config.js`: add `labsForJS` collection
- `_includes/components/intro.njk` or intro content: add labs link
- `src/css/main.css`: import labs module
- `src/js/router.js`: add labs mode
- `_includes/layouts/jonasjohansson.njk`: include labs container in DOM

## Colors

- Background: `--color-black` (#1a1a1a)
- Text: `--color-white` (#f0f0f0)
- Same typeface as rest of site
