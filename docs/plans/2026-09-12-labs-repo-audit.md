# Additions to the Labs index, 12 September 2026

Reviewed 115 local Git repositories in `org/jonasjohansson`, using their README
files, package metadata, entry points and deployment settings to find reusable
tools missing from Labs. Compared the candidates with the existing 24 entries
and checked their public destinations.

The [working preview](../previews/labs-index.html) adds these eight tools.
The Labs repository and live site remain unchanged.

| Entry | Group | Description |
| --- | --- | --- |
| [Dome Dreaming Generator](https://domedreaming-generator.jonasjohansson.se/) | Design | Build dome geometry and export unfolded layouts. |
| [LEDger](https://ledger.jonasjohansson.se/) | Design | Plan LED layouts, wiring, power and materials. |
| [Lumenati](https://lumenati.jonasjohansson.se/) | Design | Plan projector placement, coverage and brightness. |
| [Nowhere Furniture](https://nowhere-furniture.jonasjohansson.se/) | Design | Design plywood furniture and export material lists and cutting plans. |
| [TuftView](https://klattermusen.jonasjohansson.se/) | Design | Preview tufted rugs, change yarn colours and estimate materials. |
| [Blob](https://blob.jonasjohansson.se/) | Visuals | Move a refractive glass effect with your hands or cursor. |
| [cam2avatar](https://cam2avatar.jonasjohansson.se/) | Visuals | Animate a 3D avatar from a webcam or video. |
| [tonejs-balls](https://jonasjohansson.github.io/tonejs-balls/) | Sound | Make music with bouncing balls, scales and rhythms. |

LEDger is useful beyond the Kagora preset. It handles installation layout,
wiring, power and materials, while the existing Kagora entry focuses on strip
cuts. Both have a place in Design. TuftView and Nowhere Furniture also provide
reusable design tools despite their project-specific names or domains.

Lumenati's repository homepage pointed to an old address that returned 404.
Its current GitHub Pages custom domain, linked above, loads correctly.

## Other candidates

Resolume Controller, the Elverket mapping tool, Celestial and several hardware
bridges could be useful additions once they have a public page or usable
download. They are omitted from the preview for now. No private repository
links were added.

The real-time diffusion repository is public, but requires a local GPU and
model setup. It could belong in a broader experiments collection; it is less
immediately usable than the eight additions above.

Project websites, client work, administration repositories, forks and duplicate
implementations do not automatically belong in a tools index. WYSIWYG and
Balena Voladora already have portfolio pages; their project viewers were not
added as general tools. Games could form a separate group if that scope is
wanted later. Slapp remains excluded following the earlier removal.

## Verification

All eight added destinations returned HTTP 200 and loaded their interfaces in
Chrome without uncaught page errors. Checked visible controls and rendered
canvases as well as page titles. This verifies that the destinations load,
not every feature: camera access, hardware connections, exports and audio
playback were not exercised. Blob displayed its cursor fallback without camera
permission.

All existing destinations are preserved. The grouped preview contains 32 unique
entries, ordered alphabetically within Design, Visuals, Sound, Utilities and
Resources. No repository visibility or deployment settings were changed.
