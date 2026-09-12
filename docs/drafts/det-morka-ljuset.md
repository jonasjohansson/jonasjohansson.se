# Det Mörka Ljuset / Elverket: extended copy

Prepared 12 September 2026. Jonas asked for a minimal live page while better imagery is pending, with the fuller story written and ready here. This document is excluded from the website build by the existing `docs/**` ignore rule. It remains part of the Git repository.

The sections below are a text bank for the expanded page. They can sit between future image groups; the headings are editorial markers, not proposed page furniture. The draft describes working tools and animation studies where that is what the sources establish. It does not treat every experiment as part of the finished film.

## Opening

Lars Lerin's paintings, voice and archives surround the audience in [Det Mörka Ljuset](https://detmorkaljuset.se/), a film by Sara Broos made for the walls and floor of [Elverket](https://elverket.com/) in Stockholm.

I'm the technical producer and part of the animation team. My work with Elverket includes the moving images, the tools we use to see them in the room, projection mapping and the system for collecting the team's deliveries. I also made the presentation for Mellanrummet, the smaller space beside the hall, and the website for the film.

## The film and the room

The film follows Lars from his childhood in Värmland to Lofoten and further travels, through paintings, home movies, photographs and his own telling of his life. Sara developed the concept, directed and edited the film. Alongside the places and people in the paintings, the story follows his experiences of belonging, loneliness and finding a way to be himself.

The main hall is roughly 34 metres long, eleven metres wide and eight metres high. There are images on all four walls and on the floor. A composition can surround you, but you can only look at part of it at once. Turning toward another wall changes what you see. Sitting down changes the relationship between the paintings above you and the image under your feet.

That scale affects small decisions in the animation. An edge in a painting can meet the corner of the room. A house can extend across a wall, while water or mist continues onto the floor. A door opening can interrupt a face or a line of text. We need to see those relationships while the images are still being made.

## Lofoten

For Lofoten I worked with groups of paintings arranged around the room. Some compositions hold many smaller images together. Others give more space to a house, a mountain or a stretch of water. The working layouts let us compare those changes of scale across the whole room.

The floor has its own composition, continuing colours and reflections below the paintings on the walls. In one of the studies, houses line the walls while mist moves across the floor. In the flat production image the floor sits beneath the wall strip. Inside the preview it becomes the surface you are standing on, and the relationship is much easier to judge.

There are several Lofoten arrangements and transition tests in the working material. Keeping those versions together makes it possible to go back to a painting or composition and try a different timing without rebuilding the room around it.

## Moving between paintings

I made tools for testing how one painting could move into another. The studies include spreading pigment, wet edges, blooms, water ripples, light and mist. Each starts with the paintings themselves, with controls for how the next image appears and how much of the paper remains visible.

The wet-edge studies bring an image in from an uneven boundary. Other tests let colour collect or spread, or use light areas of a painting as the starting points for a reveal. I can change the timing and behaviour while looking at the two images, then export a sequence for use in the animation.

I also explored point clouds, sampling a painting's colours into many small points. That gives me another way to move through or between images. In the painting-series studies, points move away from the edges while the central image stays recognisable. Several paintings can sit beside one another, with movement carrying across the series.

These are production studies, with different approaches tested alongside one another.

## Birds

Another study follows a flock of birds through the model of the hall. I can place points on the walls or in open space and draw a route for the flock. The birds follow that route while responding to one another, so the path sets the overall movement and the flock keeps changing within it.

Their wing movements and shadows are visible in the preview. Working in the room model lets me look at the birds against the walls and floor, rather than judging their movement against an empty background. A recording of the study would show this more clearly than a still.

## Seeing the room while working

I built a browser preview around the architecture model and the measured projection surfaces. We can put an image or film on each wall and on the floor, or load a single layout that contains all the surfaces. The view can move through the hall, sit at audience height or be explored with a headset.

The doors and exit signs are included. They are useful reference points when checking where a painting, a face or a subtitle will land. Seated figures help with scale. I can also switch to numbered grids to compare positions between the preview, a flat layout and the actual room.

The model was adjusted to the finished projection surfaces using measurements from the venue. The building drawings and the on-site dimensions were close, but at this size even a small difference changes where an image lands. Keeping the model aligned with the room makes it a useful shared reference for the team.

## Playing the larger files

I built a separate desktop preview for the larger video files. It plays the four wall videos and the floor together inside the model, with a shared timeline and synchronisation between the surfaces. We can move between chapters, isolate a surface or look at the full composition.

The desktop player uses hardware decoding where the format supports it. That matters when several large videos need to play at the same time. It also lets us load a separate sound file, inspect the flat layout, take a still or record a view from inside the room.

The short Lofoten recording prepared for this page comes from the browser model playing an existing animation test. It is a way of showing the production work while the exhibition documentation is still being gathered.

## Mapping and delivery

The film is delivered as a separate file for each wall and for the floor, across its chapters. Those files have to agree on their timing and on where each part of the composition belongs. I made templates and mapping tools to help keep the images aligned from the working layouts through to playback.

There is a related set of tools for working with perspective in Resolume. They use a shared model of the room and camera to turn a viewpoint into a projection layout. I can preview a camera position, save it and produce a corresponding output preset, or move the viewpoint in a live effect.

For deliveries, I built an uploader organised by chapter. The team can send large masters and see what has already arrived. Files with the same name are given another version rather than replacing the earlier delivery. The tool checks the video format and reports differences in dimensions or frame rate, so those can be dealt with before playback.

The delivery system also accepts stills, with additional image formats for the credits material. A still and a finished movie need different checks. Keeping them in the same chapter view lets the team see the material together without treating every file as a video master.

## Mellanrummet

Mellanrummet is the smaller projection room beside the main hall. Its screen is fourteen metres wide, with a much lower ceiling and a different viewing distance. I added it to the browser preview so we could check its presentation as well as the main film.

It has its own media, separate from the five surfaces in the hall. The model includes the connecting doorways, so the presentation can also be seen from the main room. This makes it possible to look at the relationship between the spaces while working on their content.

I made a presentation combining paintings and text for that long wall. The working exports include image sequences and text layouts sized for the projection.

## The film website

I also built [detmorkaljuset.se](https://detmorkaljuset.se/). It brings together the film's introduction, imagery, credits and visitor link in Swedish and English.

## Closing collaborators text

[Sara Broos](https://www.sarabroos.com/) developed the concept, directed and edited the film, with paintings and narration by [Lars Lerin](https://sandgrund.org/lars-lerin/). I worked alongside Joacim Jardenäs, Elverket's technical director. The producers are Lars Beckung, Lisa Berggren Eyre, Jesper Kurlandsky and Fredrik Wikingsson, with Pia Åstrand managing the project at Chimney.

Animation and visual effects are shared with [Tone Bjordam](https://www.tonebjordam.com/), [Johannes Ferm Winkler](https://johannesfermwinkler.se/), [David Giese](https://davidgiese.com/), Jacob Gåfvels, [Boris Nawratil and David Nord](https://www.davidboris.se/), Deniz Özumagi, Jon Skår, [Annie Tådne](https://tadne.se/), Viktor Tegréus and [Linn Willebrand](https://www.linnwillebrand.com/).

Alexander Berggren made the sound design and mix, with original music by Pelle Ossler and Joe Wilkinson and music supervision by Magnus Palmborg. Kristoffer Andrén photographed the paintings. The archives include Lars's own films and photographs and VHS footage by Marc Broos. [Full film credits and visitor information](https://elverket.com/produktioner/lars-lerin).

---

## Editorial notes for expansion

The full text is deliberately longer than the likely final page; use the sections supported by the final image selection. The short paragraph identifying the retained browser recording is only needed if that recording is used again.

### Image plan

| Section | Best material to add | Material already retained |
| --- | --- | --- |
| Opening and scale | A strong finished room view showing walls, floor and audience scale | `hero.jpg`, `birds-in-the-room.jpg` |
| Lofoten | Wide installation views of two different compositions, plus a detail showing the painting surface | `lofoten-layout.jpg`, `lofoten-room.mp4` and its poster |
| Transitions | Short exports showing a complete transition between two paintings | Original transition exports in the Lofoten/Jonas Drive folder |
| Birds and point clouds | Clean motion recordings of the actual studies | Working prototypes in `elverket-lars-lerin` |
| Preview and mapping | A finished room view paired with the same composition in the model | `preview-tool.jpg`, `room-study.jpg`, `calibration.jpg` |
| Production | A good photograph of the team working or reviewing, if available | No suitable new selection established |
| Mellanrummet | Finished room, connecting doorway and a legible view of the presentation | Working image/text layouts and delivery notes on Drive |
| Website | One concise view if it adds something to the film story | Local `detmorkaljuset.se` site |

All named portfolio media remains in `projects/det-morka-ljuset/`. The earlier complete page and its image order are preserved in commit `db36f59`. New camera photographs should be reviewed from RAW first. Avoid using several versions of the same composition merely to make the gallery longer.

### Facts and limits

- Public opening date: 26 September 2026, from Elverket's production page. Keep this separate from dates of tests and previews.
- Main hall model: 33.971 × 11.222 metres, approximately 7.98 metres high. The prose rounds these to 34 × 11 × 8 metres.
- Five principal media surfaces: four walls and the floor. Mellanrummet is separate.
- Mellanrummet screen: fourteen metres wide. Earlier design notes disagree about some model orientation and screen-height details, so this draft uses the established width and avoids obsolete wall-letter references.
- Bird, particle and transition tools establish that the studies were made. They do not establish that every study is in the final film. Confirm the final selection with Jonas before changing that wording.
- The Resolume tools establish software capabilities. The draft does not attribute Elverket's entire physical projection system, installation or engineering to Jonas.
- The underlying architecture model was supplied; Jonas's work is the preview, scene handling, measurement alignment and associated tools.
- Film duration is omitted because the sources consulted differ. Exact projector counts, total projected resolution, production hours and audience capacity are not established here.
- Confirm the spelling of Deniz Özumagi / Ösumagi against the final credits. The text currently follows Elverket's public page.
- Kristoffer Andrén's documented credit is for photographing paintings. Do not assign the exhibition photographs to him without their photographer credits.
- The logo-builder repo contains a study tool based on the unfolded projection surfaces. There is no basis here for claiming that Jonas designed Elverket's adopted identity, so it is not included in the article.
- A personal account of how Jonas joined the project, particular exchanges with Sara or Lars, and what changed during on-site rehearsals would add to this. Those memories have not been supplied and are not invented in the draft.

### Source map

Public film and credit information: [Elverket's production page](https://elverket.com/produktioner/lars-lerin) and the Swedish/English content in local `detmorkaljuset.se`.

Local repos under `org/jonasjohansson`:

| Source | Supports |
| --- | --- |
| `elverket/assets/js/3d/config.js`, `docs/WALL-NAMING.md` | Measured room, five surfaces, doors and signs; distinction between supplied architecture and preview work |
| `elverket/assets/js/3d/`, Mellanrummet design and implementation | Browser previews, panorama mapping, viewpoints, headset support and the second room |
| `elverket-lars-lerin/transition-v1`, `transition-v2` | Image transition studies, including implemented wet-edge and pigment functions |
| `elverket-lars-lerin/pointcloud*`, `series-v1`, `series-v2` | Point-cloud and painting-series studies |
| `elverket-lars-lerin/birds-v1` | Room-based flocking, path editing, animated wings and shadows |
| `elverket-viewer/README.md`, `video.py`, `ui_panel.py` | Desktop playback, synchronisation, hardware decoding, viewpoints, snapshots and recording |
| `elverket-resolume-mapping-tool/README.md` | Camera/perspective tools, preset export and live effect |
| `elverket-uploader/public/index.html`, `src/worker.js` | Chapter delivery, version preservation, format checks and media metadata warnings |
| `detmorkaljuset.se/en/index.html` and Swedish page | Film synopsis, website scope and credits |

Shared Drive `231 ELVERKET / Det Mörka Ljuset`:

- `01_SOURCE/10_LOFOTEN/Jonas/JPG`: multiple composition series and panorama layouts.
- `01_SOURCE/10_LOFOTEN/Jonas/Transitions`: exported wet-edge, bloom, light, ripple and other animation studies.
- `01_SOURCE/10_LOFOTEN/Tests`: the Lofoten panorama test used for the retained room recording.
- `01_SOURCE/EFTERTEXTER & MELLANRUMMET/MELLANRUMMET/07_RENDER/DELIVERY.md` and its associated working files: presentation material and delivery specification. Folder names may contain Unicode combining characters or trailing spaces.

The [original media and source record](../plans/2026-09-12-det-morka-ljuset.md) has the exact selected filenames and recording provenance. The draft contains no delivery-system access links or credentials.
