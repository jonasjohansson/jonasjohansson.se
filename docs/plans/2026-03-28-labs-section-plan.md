# Labs Section Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a dark-mode `/labs/` single-page section with a TOC and flowing articles, accessible from the intro text.

**Architecture:** Reuse existing project data system (`type: "lab"` in `data.md`), add a new Eleventy global for labs data, a new labs template embedded in the layout, a CSS module for dark styling, and extend the SPA router with a "labs" mode that transitions from the portfolio view.

**Tech Stack:** Eleventy (Nunjucks), vanilla JS (SPA router), CSS modules, markdown-it

---

### Task 1: Add `labsContent` global data in Eleventy config

**Files:**
- Modify: `eleventy.config.js:418-480` (near `projectContent` global)

**Step 1: Add labsContent global data**

After the existing `projectContent` global data (around line 480), add a new global that scans for `type: "lab"` projects and returns simplified data (title, description, slug, markdown body, optional url/image):

```javascript
eleventyConfig.addGlobalData("labsContent", () => {
  const root = "projects";
  if (!existsSync(root)) return [];

  const dirs = readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== "about")
    .map((d) => d.name);

  const labs = [];

  for (const dir of dirs) {
    const dataMdPath = path.join(root, dir, "data.md");
    if (!existsSync(dataMdPath)) continue;
    try {
      const fileContent = readFileSync(dataMdPath, "utf8");
      const parsed = matter(fileContent);
      const { title, type, description, url, date, tocSize } = parsed.data;
      if (type !== "lab") continue;

      const body = parsed.content ? md.render(parsed.content) : "";
      labs.push({
        slug: dir,
        title: title || dir.replace(/[._-]+/g, " ").trim(),
        description: description || "",
        url: url || null,
        tocSize: tocSize || "small",
        date: date ? new Date(date).toISOString() : null,
        body,
      });
    } catch (err) {}
  }

  // Sort by date descending
  labs.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  return labs;
});
```

**Step 2: Verify build still works**

Run: `npx @11ty/eleventy --dryrun 2>&1 | tail -5`
Expected: No errors, build completes

**Step 3: Commit**

```bash
git add eleventy.config.js
git commit -m "feat: add labsContent global data for type=lab projects"
```

---

### Task 2: Create a test lab entry

**Files:**
- Create: `projects/test-lab/data.md`

**Step 1: Create a test lab project**

```markdown
---
title: Test Lab
type: lab
description: A test lab entry for development
date: '2026-01-01'
url: https://github.com/jonasjohansson
tocSize: large
---

This is a test lab entry to verify the labs section works during development.
```

**Step 2: Verify it's excluded from homepage strips**

Run: `npx @11ty/eleventy --dryrun 2>&1 | tail -5`
Expected: No errors. The test-lab project should not appear in projectsForJS.

**Step 3: Commit**

```bash
git add projects/test-lab/data.md
git commit -m "feat: add test lab entry for development"
```

---

### Task 3: Create the labs Nunjucks template

**Files:**
- Create: `_includes/components/labs.njk`

**Step 1: Create the labs template**

This template renders the TOC and all lab articles on a single page. It will be included in the main layout but hidden by default (shown when `data-route="labs"`).

```nunjucks
<div id="labs" class="labs">
  <div class="labs-toc">
    <h2 class="labs-heading">Labs</h2>
    <div class="labs-toc-grid">
      {% for lab in labsContent %}
      <a href="#lab-{{ lab.slug }}" class="labs-toc-item {% if lab.tocSize == 'large' %}labs-toc-large{% endif %}">
        <span class="labs-toc-title">{{ lab.title }}</span>
        {% if lab.description %}
        <span class="labs-toc-description">{{ lab.description }}</span>
        {% endif %}
      </a>
      {% endfor %}
    </div>
  </div>

  {% for lab in labsContent %}
  <article id="lab-{{ lab.slug }}" class="labs-article">
    <div class="project-grid">
      <div class="text-block text-small" style="--col-start: 3; --col-span: 8">
        <h3>{{ lab.title }}</h3>
        {{ lab.body | safe }}
        {% if lab.url %}
        <p><a href="{{ lab.url }}" target="_blank" rel="noopener">View on GitHub</a></p>
        {% endif %}
      </div>
    </div>
  </article>
  {% endfor %}
</div>
```

**Step 2: Verify template syntax**

Run: `npx @11ty/eleventy --dryrun 2>&1 | tail -5`
Expected: No errors

**Step 3: Commit**

```bash
git add _includes/components/labs.njk
git commit -m "feat: add labs template with TOC and article sections"
```

---

### Task 4: Include labs template in the main layout

**Files:**
- Modify: `_includes/layouts/jonasjohansson.njk:23-31`

**Step 1: Add labs component to the layout**

Insert the labs include after the strips component, inside `#content`:

```nunjucks
      <div id="content">
        {% include "../components/intro.njk" %}

        <main id="main">
          {{ content | safe }}
        </main>

        {% include "../components/strips.njk" %}
        {% include "../components/labs.njk" %}
      </div>
```

**Step 2: Verify build**

Run: `npx @11ty/eleventy --dryrun 2>&1 | tail -5`
Expected: No errors

**Step 3: Commit**

```bash
git add _includes/layouts/jonasjohansson.njk
git commit -m "feat: include labs template in main layout"
```

---

### Task 5: Create the labs CSS module

**Files:**
- Create: `src/css/modules/labs.css`
- Modify: `src/css/main.css`

**Step 1: Create labs.css**

```css
/* Labs section: dark-mode TOC + articles */
.labs {
  display: none;
  background-color: var(--color-black);
  color: var(--color-white);
  min-height: 100vh;
  padding: var(--spacing-xl);
}

body[data-route="labs"] .labs {
  display: block;
}

/* Hide intro, strips, projects when in labs mode */
body[data-route="labs"] .intro,
body[data-route="labs"] #strips,
body[data-route="labs"] #projects,
body[data-route="labs"] .projects-container {
  display: none;
}

/* TOC */
.labs-heading {
  font-family: var(--font-family);
  font-size: var(--font-size-large);
  margin: 0 0 var(--spacing-2xl);
}

.labs-toc-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-3xl);
}

.labs-toc-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  padding: var(--spacing-lg);
  text-decoration: none;
  color: var(--color-white);
  border: 1px solid rgba(240, 240, 240, 0.1);
  transition: border-color 0.2s ease;
}

.labs-toc-item:hover {
  border-color: rgba(240, 240, 240, 0.4);
}

.labs-toc-large {
  grid-column: span 2;
}

.labs-toc-title {
  font-size: var(--font-size-medium);
  font-family: var(--font-family);
}

.labs-toc-large .labs-toc-title {
  font-size: var(--font-size-large);
}

.labs-toc-description {
  font-size: var(--font-size-small);
  opacity: 0.6;
}

/* Articles */
.labs-article {
  padding: var(--spacing-3xl) 0;
  border-top: 1px solid rgba(240, 240, 240, 0.1);
}

.labs-article .text-block {
  color: var(--color-white);
}

.labs-article .text-block a {
  color: var(--color-white);
  opacity: 0.8;
}

.labs-article .text-block a:hover {
  opacity: 1;
}

.labs-article h3 {
  font-size: var(--font-size-medium);
  margin: 0 0 var(--spacing-lg);
}

/* Mobile: single column TOC */
@media (max-width: 768px) {
  .labs-toc-grid {
    grid-template-columns: 1fr;
  }

  .labs-toc-large {
    grid-column: span 1;
  }
}
```

**Step 2: Import labs.css in main.css**

Add at the end of `src/css/main.css`:

```css
@import "./modules/labs.css";
```

**Step 3: Verify styles load**

Run: `npx @11ty/eleventy --dryrun 2>&1 | tail -5`
Expected: No errors

**Step 4: Commit**

```bash
git add src/css/modules/labs.css src/css/main.css
git commit -m "feat: add labs CSS module with dark mode styling and TOC grid"
```

---

### Task 6: Extend the SPA router with labs mode

**Files:**
- Modify: `src/js/router.js`
- Modify: `src/js/utils/routeUtils.js`

**Step 1: Update routeUtils.js to recognize labs route**

In `src/js/utils/routeUtils.js`, add `/labs` and `/labs/` to the route detection:

```javascript
// Known non-project routes
const nonProjectPaths = ["/", "/index.html", "/about", "/about/", ""];

export function getCurrentRoute() {
  const currentPath = window.location.pathname;
  const relativePath = pathPrefix ? currentPath.replace(pathPrefix, "") : currentPath;
  const normalized = relativePath.replace(/\/$/, "") || "/";

  if (normalized === "/labs") {
    return "labs";
  }
  if (nonProjectPaths.includes(relativePath) || normalized === "/") {
    return "home";
  }
  return "project";
}
```

**Step 2: Update router.js navigate method**

In `src/js/router.js`, update the `navigate` method to handle `/labs/`:

```javascript
navigate(path, pushState = true) {
  if (this.currentRoute === path) return;

  if (pushState) {
    window.history.pushState({ route: path }, "", path);
  }
  this.currentRoute = path;

  const relativePath = pathPrefix ? path.replace(pathPrefix, "") : path;
  const normalized = relativePath.replace(/\/$/, "") || "/";

  if (normalized === "/labs") {
    this.showLabs();
    this.announce("Labs");
  } else if (normalized === "/" || normalized === "/index.html" || normalized === "/about") {
    this.showHome();
    this.announce("Home");
  } else {
    const slug = normalized.replace(/^\//, "");
    if (slug) this.showProject(slug);
  }
}
```

**Step 3: Add showLabs method to SPARouter**

Add after `showHome()` in `src/js/router.js`:

```javascript
showLabs() {
  document.body.setAttribute("data-route", "labs");
  document.body.classList.remove("project-visible");
  clearExistingProjects();
  resetProjectColors();
  document.documentElement.removeAttribute("data-project");
  this._hooks.hideIntro?.();
  document.title = "Labs — " + (window.__SITE_TITLE__ || "Jonas Johansson");
  window.scrollTo({ top: 0, behavior: "auto" });
}
```

**Step 4: Update showHome to clean up labs state**

No change needed — `showHome` already sets `data-route` to `home`, which will hide labs via CSS.

**Step 5: Verify build**

Run: `npx @11ty/eleventy --dryrun 2>&1 | tail -5`
Expected: No errors

**Step 6: Commit**

```bash
git add src/js/router.js src/js/utils/routeUtils.js
git commit -m "feat: extend SPA router with labs mode and /labs/ route"
```

---

### Task 7: Update route-init.njk for flash prevention

**Files:**
- Modify: `_includes/components/route-init.njk`

**Step 1: Add labs route detection to the inline script**

```javascript
<script>
  (function() {
    const path = window.location.pathname.replace(/\/$/, '') || '/';
    let route = 'home';
    if (path === '/labs') {
      route = 'labs';
    } else if (path !== '/' && path !== '/index.html' && path !== '/about') {
      route = 'project';
    }

    document.body.setAttribute('data-route', route);

    if (route === 'project') {
      document.body.classList.add('project-visible');
    }
  })();
</script>
```

**Step 2: Commit**

```bash
git add _includes/components/route-init.njk
git commit -m "feat: detect labs route in route-init to prevent flash"
```

---

### Task 8: Handle labs route in main.js showContentForRoute

**Files:**
- Modify: `src/js/main.js:24-88`

**Step 1: Add labs case to showContentForRoute**

Add a new `else if` branch for the labs route:

```javascript
async function showContentForRoute(route) {
  const body = document.body;
  body.setAttribute("data-route", route);

  // Show header for all routes
  const header = document.getElementById("header");
  if (header) {
    header.style.display = "flex";
    header.style.visibility = "visible";
    header.style.opacity = "1";
  }

  if (route === "home" || route === "about") {
    initializeStrips();
    showIntro();
  } else if (route === "labs") {
    hideIntro();
    // Labs content is already in the DOM via template, just scroll to top
    window.scrollTo({ top: 0, behavior: "auto" });
  } else if (route === "project") {
    hideIntro();
    // ... existing project code unchanged
  }
}
```

**Step 2: Commit**

```bash
git add src/js/main.js
git commit -m "feat: handle labs route in main.js initialization"
```

---

### Task 9: Add labs link to intro text

**Files:**
- Modify: `_data/site.json:5` (the `intro` field)

**Step 1: Add labs link to the intro text**

In `_data/site.json`, append a labs link to the intro markdown. Add it to the second paragraph alongside CV and Email:

Change the links line from:
```
[CV](https://cv.jonasjohansson.se) · [Email](mailto:j@jonasjohansson.se)
```

To:
```
[CV](https://cv.jonasjohansson.se) · [Email](mailto:j@jonasjohansson.se) · [Labs](/labs/)
```

**Step 2: Make the labs link trigger SPA navigation instead of a full page load**

In `src/js/intro.js`, add a click handler for internal links:

```javascript
export function initIntro() {
  const intro = document.getElementById("intro");
  if (!intro) return;
  document.body.setAttribute("data-intro", "open");

  // Intercept internal links for SPA navigation
  intro.addEventListener("click", (e) => {
    const link = e.target.closest("a[href^='/']");
    if (!link) return;
    e.preventDefault();
    // Dispatch a custom event that main.js can listen to
    window.dispatchEvent(new CustomEvent("spa-navigate", { detail: { path: link.getAttribute("href") } }));
  });
}
```

Then in `src/js/main.js`, listen for this event:

```javascript
// SPA navigation from intro links
window.addEventListener("spa-navigate", (e) => {
  router.navigate(e.detail.path);
});
```

**Step 3: Commit**

```bash
git add _data/site.json src/js/intro.js src/js/main.js
git commit -m "feat: add labs link to intro text with SPA navigation"
```

---

### Task 10: Add escape key handler to exit labs

**Files:**
- Modify: `src/js/main.js`

**Step 1: Add escape key listener**

In `initializeApp()` in `src/js/main.js`, add:

```javascript
// Escape key exits labs mode
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && document.body.getAttribute("data-route") === "labs") {
    router.goHome();
  }
});
```

**Step 2: Commit**

```bash
git add src/js/main.js
git commit -m "feat: escape key exits labs mode"
```

---

### Task 11: Generate the labs page for direct URL access

**Files:**
- Create: `labs.njk` (in project root, alongside `index.njk` and `project.njk`)

**Step 1: Create labs.njk**

For direct URL access to `/labs/`, Eleventy needs to generate an HTML page:

```nunjucks
---
layout: jonasjohansson.njk
permalink: labs/
title: Labs
---
```

No body content needed — the labs content is already included in the layout via the `labs.njk` component. The route-init script will set `data-route="labs"` and CSS will show the labs section.

**Step 2: Verify the page is generated**

Run: `npx @11ty/eleventy --dryrun 2>&1 | grep labs`
Expected: Shows `labs/index.html` in output

**Step 3: Commit**

```bash
git add labs.njk
git commit -m "feat: add labs page template for direct URL access"
```

---

### Task 12: Verify everything works end-to-end

**Step 1: Run the full build**

Run: `npx @11ty/eleventy`
Expected: Build succeeds, `dist/labs/index.html` exists

**Step 2: Start dev server and test manually**

Run: `npx @11ty/eleventy --serve`

Test:
- Home page loads normally, labs link visible in intro
- Clicking "Labs" transitions to dark labs page
- TOC shows test lab entry
- Anchor link scrolls to article
- Escape key returns to home
- Browser back returns to home
- Direct URL `/labs/` loads labs page
- Strips and projects still work normally

**Step 3: Clean up test lab entry (or keep it as a template)**

Delete `projects/test-lab/` or convert it to a real lab entry.

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: labs section complete with dark-mode TOC and articles"
```
