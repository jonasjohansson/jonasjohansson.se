# Website fixes — 7 September 2026

Implemented the functional, design and maintenance changes from the [site review](2026-09-07-site-review.md), with presentation updated following review on 8 September. The landing page retains its image strips and original visible biography and its styling. Project pages use a text index in date order. Both include non-clickable in-progress entries. The toolbar, filters, shuffle and divider above the footer are removed.

## Functional changes

| Review finding | Result |
| --- | --- |
| Collapsed image rows | Rows and mobile children reserve their dimensions before downloads. Equal-height desktop pairs and authored placements are retained. |
| Stale or failed navigation | Requests are cancelled and checked before committing. Failed requests keep the readable page and offer retry and normal navigation. |
| Unlabelled touch landscape strips | Touch layouts provide named image strips on home and project index links with at least 44 px tall targets. |
| Lost keyboard focus | Opening a project focuses its heading; returning restores collection focus and scroll position. Home content is inside `main`. |
| Motion preferences lost on navigation | Shared media setup runs on every mount and responds to preference changes. Body videos have controls; hero videos use their poster when reduced motion is preferred. |
| Incorrect document title and metadata | Direct and client navigation retain project titles and replace descriptions, canonical, social and structured metadata together. |
| Excessive image delivery | Project images use responsive sources. The landing page uses narrow responsive strip crops that upgrade on hover or focus. Project indexes contain no thumbnail markup or downloads. |
| Missing artwork descriptions | All 28 lead artwork images and 18 video clips have authored descriptions. Redundant images retain empty alternatives. |
| Missing deployment triggers | Root templates, scripts and tests trigger the workflow. Build and regression checks run before upload. |
| Incomplete no-JavaScript fallback | Static HTML supplies usable project links, images, headings and the appropriate route presentation. |

Project pages use shared text alignment, centred credits, per-image crop settings, mobile compositions and optional uncropped heroes. Heroes use the earlier 24 px page inset and 12 px rounded corners. The project title sits at the top centre, scrolls with the page and links back to the collection; the separate All projects button and bottom pagination are removed. Theme follows the system; the theme and sound controls were removed, and strip sounds are disabled. In-progress projects share the index with published work as non-clickable entries.

## Build and maintenance

Project parsing, validation and image processing are separate modules. Malformed required content fails with the project and field. Project colours live in project data. Unused interaction modules and the unused font declaration were removed.

The reusable cache lives in `.cache/images`. A generated manifest controls which images are published, and sharing images include a source-content hash. Root and subdirectory deployments use consistent asset paths. The browser and visual audit scripts own temporary preview servers and preserve earlier screenshot evidence. [Content authoring instructions](../content-authoring.md) describe the new fields and verification commands.

## Validation

- Production build and five Node test cases pass.
- Fifteen browser checks pass, including every published project route, blocked-image geometry, delayed Back, request failure/retry, keyboard focus, reduced motion, landscape touch, restored home strips and visible biography, system theme and static HTML. Subdirectory deployment was exercised earlier using `PATH_PREFIX=/preview`.
- Visual captures cover home and six representative projects at five viewport sizes, with additional index, dark-theme and media detail views.
- Every generated image path in the publication manifest exists.
- At 1440 × 900 with a fresh browser context, the homepage transfers approximately 477 kB of strip images before interaction; project indexes download no thumbnails.
- The reusable image cache remains outside the published output.

Browser verification used Chrome with emulated mobile/touch settings. Physical iOS/Safari and the deployed delivery configuration were not tested. Screenshots and machine-readable results are in `screenshots/site-smoke` and `screenshots/visual-audit` (ignored by Git). The initial fixes and media updates deployed successfully in GitHub Actions run 34166177002; the landing-page correction is a follow-up.
