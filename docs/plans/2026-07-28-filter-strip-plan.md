# Filter Strip Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Bring the tag filter back as a pinned cell inside the strip wall, and dock the desktop title readout to the bottom of the wall on the landing page.

**Architecture:** The filtering logic in `stripFiltering.js` already works and is untouched. The filter's markup moves inside `#strips` as a `.strip` cell, pinned first by the same partition `strips.js` already uses to pin placeholders last. Styling moves from an edge-docked tab bar to six bands down a column (desktop) or a chip row (mobile). Separately, `main.js` docks the home header to the bottom of the wall instead of the top.

**Tech Stack:** Eleventy (Nunjucks), vanilla JS, CSS modules

**Verification:** This repo has no test framework. Each task ends with `npm run build` plus a Playwright check against `dist/` served on port 8899, which is how the strip work in this session has been verified throughout.

**Design:** `docs/plans/2026-07-28-filter-strip-design.md`

---

### Task 1: Restructure the filter markup into a strip cell

**Files:**
- Modify: `_includes/components/strips.njk:40-50`

Replace the `.filter-dropdown` wrapper and its `.filter-dropdown-button` with a strip cell. Keep the `.filter-dropdown-content` and `.filter-option` class names: `getSelectedFilters()` queries `.filter-dropdown-content input[type="checkbox"]:checked` and `initFilters()` binds `.filter-option`, so renaming them breaks filtering.

```njk
<div class="strip strip-filter" aria-label="Filter projects by tag">
  <div class="filter-dropdown-content" id="filter-dropdown">
    {% for tag in site.tags | sortByLength %}
    <label class="filter-option">
      <input type="checkbox" value="{{ tag }}" data-type="category" />
      <span>{{ tag }}</span>
    </label>
    {% endfor %}
  </div>
</div>
```

Move it above the `{% for project in projectsForJS %}` loop so it is first in source order.

**Verify:** `npm run build`, then confirm `dist/index.html` contains one `strip strip-filter` and six `filter-option` labels.

---

### Task 2: Drop the dropdown button and its retry guard

**Files:**
- Modify: `src/js/stripFiltering.js` — `initFilters()`

`initFilters()` returns early and re-schedules itself every 100ms when `.filter-dropdown-button` is missing. Task 1 deletes that button, so this guard must go with it or the site spins forever.

Remove from `initFilters()`:
- the `buttons` lookup and the `buttons.length === 0` retry block
- the `buttons.forEach` block wiring focus/mousedown/click
- `closeAllDropdowns` and the document-level click listener that calls it

Keep the `.filter-option` click handlers and `preserveScroll`.

**Verify:** `npm run build`, load the page, confirm no console errors and that no timer is re-firing.

---

### Task 3: Style the filter strip

**Files:**
- Modify: `src/css/modules/filter.css`

Delete `.filter-dropdown { display: none }` and the `.filter-dropdown-button` rule.

Desktop: the strip is a column of six equal bands, each label rotated to run up its band, matching `.strip-placeholder .strip-label`.

```css
.strip.strip-filter {
  background: color-mix(in srgb, var(--text-primary) 7%, var(--bg-primary));
  cursor: default;
}

.strip-filter .filter-dropdown-content {
  flex-direction: column;
  height: 100%;
}

.strip-filter .filter-option {
  flex: 1 1 0;
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  padding: var(--spacing-md) 0;
  font-size: var(--font-size-xs);
  letter-spacing: var(--letter-spacing-wide);
}

.strip-filter .filter-option + .filter-option {
  box-shadow: inset 0 -1px 0 color-mix(in srgb, var(--text-primary) 14%, transparent);
}
```

Mobile, inside `@media (hover: none) and (orientation: portrait)`: chips in a row, strip height scaled down like the placeholder rows.

Keep the existing inverted checked state (`.filter-option:has(input:checked)`).

**Verify:** screenshot at 1440x900 and iPhone 13.

---

### Task 4: Pin the filter strip first and keep it out of the count

**Files:**
- Modify: `src/js/strips.js:175-200` (the shuffle partition)
- Modify: `src/js/stripFiltering.js` — `updateStripCount()`
- Modify: `src/css/modules/filter.css`

In `strips.js`, extend the existing partition. `madeStrips` currently excludes placeholders; it must exclude the filter strip too, and the result becomes `[filterStrip, ...orderedStrips, ...placeholderStrips]`.

In `updateStripCount()`, skip `.strip-filter` — it is a control, not a project, and the count drives the xylophone's pitch mapping.

In `filter.css`, exempt it from self-hiding. `body.filter-active .strip { display: none }` is (0,2,1), so the exemption needs to beat it:

```css
body.filter-active .strip.strip-filter { display: block; }
```

**Verify:** the filter strip is leftmost on every reload; `data-visible-count` on `#strips` is 26 on desktop.

---

### Task 5: Make the filter strip inert

**Files:**
- Modify: `src/js/stripInteraction.js`

Extend the placeholder guards to cover `.strip-filter`:
- `attachStripEventListeners()` — skip it, so it never navigates, preloads or scrambles the header
- the `mouseleave` guard `.strip:not(.strip-placeholder)` — also exclude `.strip-filter`
- the `touchmove` lookup `.strip:not(.strip-placeholder)` — also exclude it, so scrubbing treats it as empty space
- the `touchend` tap branch — return early, letting the `.filter-option` handlers do their own work

In `filter.css`, stop it expanding on hover: `.strip.strip-filter:hover { flex-grow: 1 }`.

**Verify:** hovering the filter strip leaves the header on "PROGRESS NOT PERFECTION"; clicking a band toggles that tag and filters the wall; the strip does not expand.

---

### Task 6: Dock the home title readout to the bottom

**Files:**
- Modify: `src/js/main.js:163-168` (`placeForRoute`)
- Modify: `src/css/modules/header.css`

In `placeForRoute()`, the `route === "home"` branch currently calls `strips.prepend(header)` and removes `header-bottom`. Change it to append and add `header-bottom`.

Two CSS consequences follow:

`header.header-hidden` translates up by `100%`. Bottom-docked that slides the pill up over the strips rather than out of view, so add:

```css
header.header-bottom.header-hidden {
  transform: translateX(-50%) translateY(100%);
}
```

The `pointer-events: none` rules are written against `#strips > header:not(.header-bottom)`. Once the home header is bottom-docked they stop applying and the pill steals `:hover` from the strip beneath, collapsing it and flickering. Rescope them to the route, not the dock position, because the bottom-docked header on a project page is a real link home and must stay clickable:

```css
body[data-route="home"] #strips > header,
body[data-route="home"] #strips > header .header-content {
  pointer-events: none;
}
```

Check the `#strips > header:not(.header-bottom) .header-content` padding rule too — it needs to apply to the home header in its new docked position.

**Verify:** on desktop home, the title pill sits at the bottom of the wall, slides down out of view when nothing is hovered, and slides up when a strip is hovered. Hovering across strips near the pill does not flicker. On a project page, the header still starts at the top of the body and docks to the bottom on scroll, and still navigates home when clicked.

---

### Task 7: Full verification

- `npm run build`
- Desktop 1440x900: filter strip leftmost, six bands, no placeholders, title pill bottom
- Click a tag: wall narrows to matches, filter strip stays, placeholders stay gone
- Clear the tag: full wall returns
- iPhone 13: filter chip row on top, placeholder rows with the "Coming" marker at the bottom
- No console errors on either
- Commit
