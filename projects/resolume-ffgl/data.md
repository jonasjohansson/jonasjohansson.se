---
title: Resolume FFGL Shaders
type: lab
description: Custom ISF shaders compiled as FFGL plugins for Resolume Arena
date: '2026-01-01'
url: https://github.com/jonasjohansson/resolume-ffgl
---

Custom ISF (Interactive Shader Format) shaders I write for live visuals in Resolume Arena. Compiled to FFGL plugins using [ffgl-rs](https://github.com/edeetee/ffgl-rs). Most share a common gradient mask system for controlling where effects apply.

- **AquarelaMask** — watercolor paint effect with Kuwahara smoothing
- **BlurMask** — gaussian blur with gradient mask control
- **EdgeGrow** — organic lichen-like growth from edges of source shapes
- **EnergyPulse** — expanding pulse that illuminates shapes as it sweeps through
- **GhostTrail** — ethereal ghost copies drifting from source shapes
- **GradientAlpha** — gradient-based alpha control
- **PulseRings** — concentric rings rippling outward from shape edges
- **ShapeGen** — graphic score generator with 3 tracks of organic shapes
- **SlitScreen** — repeats boundary pixels outward from a mask edge
- **SmartVignette** — vignette with round/square modes, movable center, optional image mask
- **SmokeDissipation** — content wisps away like rising smoke with curl noise turbulence
- **WarpFBM** — domain-warped FBM that organically warps source content with animated noise

[GitHub](https://github.com/jonasjohansson/resolume-ffgl)
