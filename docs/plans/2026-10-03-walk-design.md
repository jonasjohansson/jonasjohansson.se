# The walk (experiment)

A scroll-driven walk through a dreamlike point-cloud space: an alley, a train
carriage or a forest path. The camera moves forward on a timeline and stops
at people reading a paper, working on a laptop, holding a phone, and looks
over their shoulder at their screen. Each screen is a part of the site.

Lives at `/walk/` as an experimental subpage, unlisted and not indexed. If it
holds up it may become the intro before the landing; the landing itself is
not touched.

Follows from the dropped mosaic (`2026-10-03-mosaic-landing-design.md`): one
thing at a time, found in someone's hands, rather than everything at once.

## Experience

- Arrive in darkness; points gather into the space.
- Scroll walks forward with a faint handheld sway; scrolling back rewinds.
  Arrow keys and space step between stops.
- At a stop the walk slows and the camera turns over a shoulder:
  - **About**: a newspaper, the name as headline, the bio as the article.
  - **CV**: a laptop scrolling the CV; opens the PDF.
  - **Contact**: a phone with an email to Jonas half-written; opens mail.
  More stops come later, so stops are data, not code.
- The path ends at a link to the landing.

## Look

- Only soft round points: fade into black with distance, breathe slightly,
  scatter near the camera. Colour from the scan, muted.
- The screens are the one sharp thing: real DOM elements placed in 3D with
  CSS transforms that follow the camera, so they stay crisp, clickable and
  readable by assistive technology.

## Assets

- Environment: a CC BY scan (credited on the page). People: free scans where
  they exist, otherwise generated from photos or bought.
- A Houdini or Blender step samples surfaces into coloured points and packs
  them into one binary file; phones get a lighter one.
- Until then a procedural stand-in alley with stand-in figures, to judge
  pacing only. Real scans replace it through the same loader.

## Build

- three.js, bundled only into the walk's own entry. The rest of the site is
  untouched.
- One smooth camera path (Catmull-Rom). Each stop: position along the path,
  where the person stands, where the camera looks, what the screen shows,
  where it links.
- Without JavaScript, or with reduced motion, the page shows the three
  screens' content as plain text and links.
