# BorderLAN and WYSIWYG: RAW selection

Reviewed the RAF originals before selecting photographs, following the user's
RAW-first preference. The review covered 500 files: 45 from 23 July, 10 from
24 July, 3 from 8 July, 173 from 9 July, 44 from 10 July, 121 from 11 July,
and 104 from 26 July 2026. The 26 July folder contains both projects.

BorderLAN now uses four photographs showing the empty cellar, entrance,
equipment and candles. The user clarified that no people may be shown, so
DSCF8556, DSCF8538, DSCF8695 and DSCF8560 were removed from the page and their
exported website assets deleted. DSCF8658 now supplies the hero, strips and
sharing image. Each retained photograph was reviewed again from its RAW-derived
preview, including the frame edges and doorway. Camera originals remain intact.

WYSIWYG uses six photographs, starting with the instrument at sunset and
alternating visitors, physical details and its desert and woodland settings.
The user rejected DSCF8212 (dusty visitor portrait) and DSCF8744 (wide grassy
setting) in favour of a tighter selection of the strongest photographs. Both
were removed from the page and their website assets deleted. Repeated views
and unrelated installations were excluded.

## Development

The exports were decoded from sensor data using macOS Core Image
`CIRAWFilter.outputImage`, with camera white balance, default tone and noise
processing, zero added exposure and the decoder's +0.12 EV baseline exposure.
Review previews were 800 px, with larger 1600 px shortlisted previews. Final
JPEGs are sRGB, quality 0.94 and 3200 px on the long edge (3200 × 2134 for
landscapes, 2134 × 3200 for portraits). No crop or generative editing was applied.
Camera originals remain unchanged. The site build creates responsive AVIF and
WebP derivatives.

Source paths below are relative to `Downloads/Camera/998_FUJI`.

## BorderLAN

| Website asset | RAW source | White balance |
| --- | --- | --- |
| `projects/borderlan/entrance.jpg` | `2026-07-24/RAF/DSCF8563.RAF` | 3516 K / tint 3.951 |
| `projects/borderlan/stations.jpg` | `2026-07-26/RAF/DSCF8658.RAF` | 4292 K / tint 5.889 |
| `projects/borderlan/table-detail.jpg` | `2026-07-26/RAF/DSCF8647.RAF` | 3252 K / tint 5.826 |
| `projects/borderlan/candles.jpg` | `2026-07-26/RAF/DSCF8652.RAF` | 3547 K / tint -0.261 |

## WYSIWYG

| Website asset | RAW source | White balance |
| --- | --- | --- |
| `projects/wysiwyg/hero.jpg` | `2026-07-11/RAF/DSCF8453.RAF` | 5917 K / tint 6.666 |
| `projects/wysiwyg/desert-viewer.jpg` | `2026-07-09/RAF/DSCF8334.RAF` | 9884 K / tint 0.828 |
| `projects/wysiwyg/phone.jpg` | `2026-07-11/RAF/DSCF8456.RAF` | 5396 K / tint 9.512 |
| `projects/wysiwyg/housing.jpg` | `2026-07-11/RAF/DSCF8460.RAF` | 6043 K / tint 6.079 |
| `projects/wysiwyg/eyepiece.jpg` | `2026-07-26/RAF/DSCF8710.RAF` | 6406 K / tint 11.834 |
| `projects/wysiwyg/sunset-viewer.jpg` | `2026-07-11/RAF/DSCF8435.RAF` | 5883 K / tint 7.293 |

## Copy sources

Both project entries were previously placeholders. Their descriptions use
photographic evidence and the user's existing local repositories:

- `borderlan` at `adb5d55`: README and conductor documentation describe
  Raspberry Pi 5 game stations, a custom launcher, local networking and
  integration with audio, lights and projections.
- `borderlan.land/main.js` and `index.html`: published event copy establishes
  the earth-cellar setting, four seats, the 2002 theme, games, music and food,
  and Jonas and Rose as hosts. This supports mentioning Rose in the opening
  paragraph without adding a separate credits list.
- `wysiwyg` at `97241de`: README, current application and CAD notes establish
  the phone-based AR telescope, WebAR/Three.js, animated figures and flocks,
  and the brass telescope replacing the early printed optical tube. The
  photographs show the wooden tripod and phone enclosure. Public copy avoids
  treating unimplemented design proposals as completed features.

WYSIWYG collaborator names and specific authorship roles were not supplied,
so none were inferred. The descriptions can be refined when the user provides
further background. Neither source repository was modified.

## Validation

At initial publication, the production build and all 42 existing browser checks passed. Additional
Chrome checks at 1440 px and 390 px confirmed eight loaded images per page,
full-width heroes within the shared 24 px gutter, no horizontal overflow,
48 px desktop / 32 px mobile preamble spacing and 16 px mobile image gaps.
The desktop sequences and mobile portrait pair were visually reviewed.
Review captures are in the ignored `screenshots/summer-projects/` directory.

After the removals, the production build and targeted Chrome checks at 1440 px
and 390 px passed with four BorderLAN images and six WYSIWYG images. All loaded,
the shared gutters and mobile gaps remained correct, and the home strips used
the current heroes. The removed BorderLAN photographs' 24 gallery derivatives
and previous sharing image are absent from both the image manifest and build
output. In total, 41 retired derivatives were excluded from deployment. Updated
visual checks are in `screenshots/summer-projects-curated/`.

## Renders, interfaces and sound

Added on 11 September 2026 after the user requested the digital visuals and
music with game sounds, alongside the selected photographs.

### WYSIWYG

`flock-render.png` (1920 × 1080) and `giant-render.png` (1080 × 1440) are actual
Three.js captures from the local WYSIWYG app at `97241de`. They are not generated
interpretations. Studio mode was used with a separate fitted perspective camera,
a dark `#07070d` background, and the unrelated environment objects hidden during
capture. The live shaders, bird sprites and animated model were preserved.

Render settings included `renderScale: 1`, `dayNight: 0.35`, `autoLight: false`,
`murmurHeight: 6`, `murmurDistance: 16`, `murmurFlyover: 0`, `murmurWander: 0`,
`murmurArc: 30`, `humanDark: false`, `humanGlow: 0.8`, `humanCoverage: 1.3`, and
`humanScale: 1.8`. Figures and flock were captured separately. Camera framing was
fitted before the final render, without upscaling a smaller screenshot. The
renderer’s procedural missing regions are intentional parts of the figure.

### BorderLAN

- `launcher.png`: the actual local launcher at `adb5d55`, captured at 1920 × 1080
  with Diablo II selected. The game list was read from `launcher/games.list`.
  Launch actions were blocked and no game server or hardware controller ran.
- `website.png`: the local `borderlan.land` website at 1920 × 1080, with the
  browser date set to 22 July 2026 and empty booking fixtures. No participant
  data was fetched, entered or published.
- `diablo-preview.mp4`: a silent 12-second excerpt, seconds 4–16 of the existing
  `launcher/trailers/diablo2.mp4`, encoded as H.264 at its native 1280 × 720.
  `diablo-preview.jpg` is its first frame. This is Blizzard's Lord of Destruction
  cinematic used by the launcher, not a recording of guests playing. The source
  list identifies `https://www.youtube.com/watch?v=xp20voR11gs`, starting at 40 s.
- `room-mix-thrown.mp3`: Kiasmos, *Thrown*, source seconds 100–118, with Diablo II
  `d2_cain_stayandlisten` at 2 s, `d2_waypoint_activate` at 7 s and `d2_levelup`
  at 13 s.
- `room-mix-sandstorm.mp3`: Darude, *Sandstorm*, source seconds 92–110, with
  `d2_cain_greetings` at 1 s, `d2_waypoint_activate` at 6 s and `d2_levelup`
  at 12 s.

The music and effects were read from `borderlan/conductor/public/music` and
`samples/diablo`. These are reconstructed examples of the playlist/soundboard
combination, not live room recordings. Both are 18-second, 48 kHz stereo MP3s
at 192 kbps. Music was normalized to -21 LUFS, effects to -18 LUFS, with a
0.5-second music fade-in, a 2-second fade-out and a final peak limiter. Artist
and game names appear beside the players. Audio loads only on interaction;
starting another sample or navigating away pauses the current one.

All captures blocked remote requests and non-GET requests. Source application
repositories, original audio and camera RAW files remain unchanged.

### Diablo face preview

The latest instruction permits people if their faces are obscured, preferably
with Diablo II character portraits. A separate preview is saved at
`docs/visuals/borderlan/diablo-faces-preview.png`, with the exact prompt in
`docs/visuals/borderlan/prompt.txt`. The built-in image generation tool edited
the RAW-derived DSCF8556 export. All five heads, including the standing person,
were visually checked and covered with overt pixel-art character portraits.
This is a review image and is not referenced by the published project. The four
original photographs containing people remain excluded.

The final production build, six content tests and all 44 browser checks passed.
The new playback checks cover desktop and touch screens, no audio downloads on
initial display, actual MP3 decoding, mutually exclusive playback and pausing
across client navigation. Additional 1440 px and 390 px visual checks confirmed
eight WYSIWYG images and six BorderLAN images, one video and two audio samples,
with no overflow. Captures are in `screenshots/summer-media/` (ignored).

## Expanded media and full-width galleries

The user subsequently approved publishing the photographs containing people
with Diablo II heads, requested a moving flock recording, longer mixes with the
full range of soundbanks, and gallery images as wide as the hero.

- `players-diablo.png` now uses the reviewed five-person collage as BorderLAN's
  hero, navigation preview and sharing image. Its complete composition is kept.
- `doorway-diablo.png` is a second built-in imagegen edit, made from the
  RAW-developed `2026-07-24/RAF/DSCF8538.RAF`. The four visible heads are covered
  by Barbarian, Necromancer, Sorceress and Druid portraits. The complete frame was
  reviewed, including the partially concealed standing person. Its exact prompt
  is in `docs/visuals/borderlan/doorway-prompt.txt`. Untouched faces remain absent
  from the published photos.
- `flock-motion.mp4` records 16 seconds of the real WYSIWYG simulation at
  1920 × 1080. A separate camera follows the flock against the same dark
  background as the stills. Camera position follows the simulation and framing
  is gently tracked; the birds and their movement come from the app. The final
  H.264 file uses 30 fps, CRF 24, a 4 Mbps rate ceiling and fast-start metadata.
  The JPEG poster is from the recording. Gallery playback follows the existing
  viewport, reduced-motion and touch-control behavior.
- The two music mixes now last 90 seconds each. They contain 21 and 29 timed
  cues respectively, drawn from all nine soundbanks: Diablo, Age of Empires II,
  StarCraft, Warcraft III, Counter-Strike 1.6, Quake II, Action Quake II,
  OpenArena and Mortal Kombat. Exact source files and cue times are recorded in
  `docs/visuals/borderlan/audio-mixes.json`; `mix-audio.mjs` beside it reproduces
  the mixes from the local source library. Music starts at 60 s for Thrown and
  50 s for Sandstorm. They are mixed as 48 kHz stereo PCM with normalized source
  gains, music ducking around the effects, a one-second fade-in, a four-second
  fade-out and peak headroom, then encoded at 192 kbps. These remain constructed
  soundboard examples, not field recordings.
- Default landscape images, videos and grouped image rows now use the same
  24 px outer gutters as the hero at all viewport widths. Deliberately authored
  column placements and standalone portrait height limits are retained. Image
  `sizes` attributes reflect the wider layout.

The preceding 18-second mix settings and preview-only image status describe the
earlier version and are superseded by these choices.

The final production build, six content tests and all 48 browser checks passed.
The added checks cover equal hero/gallery gutters at phone, desktop and large
desktop widths, actual moving frames in the flock recording, both 90-second
audio files and toggling About immediately after a scroll. Final visual checks
at 1440 px and 390 px confirmed all media decoded without horizontal overflow.
Captures are in `screenshots/summer-media-final/` (ignored).
