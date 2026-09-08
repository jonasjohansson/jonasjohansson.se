# Klättermusen image selection — 8 September 2026

The project now opens with the sewing-mouse textile detail from the 31 August store shoot, bringing the colour, character and wool texture into the hero. A photograph of Rose marking the partly tufted rug follows the introduction, replacing the frontal finished-rug view and lettering detail. The original illustration and yarn preview sit with the design explanation; a textile-only flower detail, tufting, backing and mounting photographs carry the process section. The tracing shot and repeated wide photograph of Rose on benches are removed to give the textile more space. A pair of new store and shopfront photographs closes the sequence. The project prose is unchanged, and descriptions are only in alt attributes.

The source selection is documented in `06 Documentation/README.md` and `06 Documentation/7 Store 2026-08-31/SELECTION.md` in the shared drive `240 KLÄTTERMUSEN`.

| Website asset | Source in `7 Store 2026-08-31/photos/` | Role |
| --- | --- | --- |
| `finished-rug.jpg` | `Aplus_DSCF8998.JPG` | Retained export, removed from the page |
| `verkstad-detail.jpg` | `Aplus_DSCF8997.JPG` | Retained export, removed from the page |
| `mouse-detail.jpg` | `Aplus_DSCF8992.JPG` | Hero, strips and sharing image |
| `flower-detail.jpg` | `A_DSCF8995.JPG` | Textile-only close-up beside the tufting-gun photograph |
| `store-interior.jpg` | `Aplus_DSCF9005.JPG` | Finished piece in the room |
| `shopfront.jpg` | `A_DSCF9001.JPG` | Street-facing view through glass |

All six selected store-shoot frames contain no people. The source notes flag the remaining new people photographs as not yet cleared for posting; those are outside this selection.

The in-camera JPEGs were chosen over the neutral RAW exports after comparison. The documented difference between the warm room lighting and cooler close-up lighting is retained. Website source exports are at most 3200 px on the long edge, with orientation baked in, sRGB colour and JPEG quality 95. The source files on Drive and the earlier website photographs are retained.

Following review, the store photographs received a brighter, softer tonal grade. `scripts/grade-klattermusen.mjs` reproduces the exports directly from the camera JPEGs using per-channel curves: a stronger midtone/shadow lift for the full rug and interior, moderate lift for the textile details and a gentler lift for the shopfront reflections. The flower detail uses the same curve as the mouse hero. Small black lifts soften the deepest shadows; the white endpoint is preserved. No crop, sharpening, spatial retouching or generated content is used in the website assets.

To reproduce, run `node scripts/grade-klattermusen.mjs "<7 Store 2026-08-31/photos>" projects/klattermusen` with the actual source directory. Always use the camera originals, never an already graded export.

Klättermusen's desktop hero keeps the photograph's native aspect ratio within the viewport height so its composition and rounded image frame remain visible. Other project heroes retain their existing framing.

`marking-in-progress.jpg` is exported from `3 Selection/photos/A_IMG_8014.JPG` at up to 3200 px, sRGB, JPEG quality 95, with orientation baked in and no additional grade. The existing `02.jpg` illustration uses an authored `botanical-circle` CSS mask following its inset perimeter; its black surround is hidden on both light and dark pages while the source artwork remains unchanged.
