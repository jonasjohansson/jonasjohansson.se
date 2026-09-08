# Klättermusen image selection — 8 September 2026

The project now opens with a close, frontal view of the finished rug from the 31 August store shoot. Two textile details follow the introduction. The original illustration and yarn preview sit with the design explanation; tracing, tufting, backing and mounting photographs carry the process section. A pair of new store and shopfront photographs closes the sequence. The project prose is unchanged, and descriptions are only in alt attributes.

The source selection is documented in `06 Documentation/README.md` and `06 Documentation/7 Store 2026-08-31/SELECTION.md` in the shared drive `240 KLÄTTERMUSEN`.

| Website asset | Source in `7 Store 2026-08-31/photos/` | Role |
| --- | --- | --- |
| `finished-rug.jpg` | `Aplus_DSCF8998.JPG` | Hero, strips and sharing image |
| `verkstad-detail.jpg` | `Aplus_DSCF8997.JPG` | Raised lettering and pile detail |
| `mouse-detail.jpg` | `Aplus_DSCF8992.JPG` | Mouse motif and wool texture |
| `store-interior.jpg` | `Aplus_DSCF9005.JPG` | Finished piece in the room |
| `shopfront.jpg` | `A_DSCF9001.JPG` | Street-facing view through glass |

All five selected frames contain no people. The source notes flag the remaining new people photographs as not yet cleared for posting; those are outside this selection.

The in-camera JPEGs were chosen over the neutral RAW exports after comparison. The documented difference between the warm room lighting and cooler close-up lighting is retained. Website source exports are at most 3200 px on the long edge, with orientation baked in, sRGB colour and JPEG quality 95. The source files on Drive and the earlier website photographs are retained.

Following review, all five photographs received a brighter, softer tonal grade. `scripts/grade-klattermusen.mjs` reproduces the exports directly from the camera JPEGs using per-channel curves: a stronger midtone/shadow lift for the hero and interior, moderate lift for the textile details and a gentler lift for the shopfront reflections. Small black lifts soften the deepest shadows; the white endpoint is preserved. No crop, sharpening, spatial retouching or generated content is used in the website assets.

To reproduce, run `node scripts/grade-klattermusen.mjs "<7 Store 2026-08-31/photos>" projects/klattermusen` with the actual source directory. Always use the camera originals, never an already graded export.

Klättermusen's desktop hero keeps the photograph's native aspect ratio within the viewport height so the complete rug and rounded image frame remain visible. Other project heroes retain their existing framing.
