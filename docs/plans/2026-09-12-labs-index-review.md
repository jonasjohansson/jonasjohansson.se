# Labs as an index, 12 September 2026

## Recommendation

Use a compact index grouped by purpose: Design, Visuals, Sound, Utilities and
Resources. Keep alphabetical order within each group, the same typeface and one
short description per entry. Use the full available width, without a visible
Labs heading, search, an entry count or introductory copy.

[Open the working preview](../previews/labs-index.html). It contains all 24
current entries and eight additions from the [local repository review](2026-09-12-labs-repo-audit.md),
with proposed shorter copy.
It is a review artifact in the portfolio repository, excluded from the
production build. The Labs repository and live site have not been changed.

## What I reviewed

The complete Labs source at commit `0658bd8`: `index.html`, `styles.css`,
`tools.js`, README and static assets. I inspected the live page in Chrome at
1440 × 1000 and 390 × 1000, checked console errors and overflow, disabled
JavaScript, and requested all 24 linked destinations.

All 24 destinations returned HTTP 200 and recognisable destination titles.
This establishes that the links resolve; it is not a functional test of every
tool. Both page sizes had no horizontal overflow or uncaught browser errors.

The existing implementation is small and straightforward: static HTML, CSS and
a grouped JavaScript array. It does not need a framework or a larger design
system.

## Why the current page feels weak

**The type is excessively pale.** Group headings use 40% opacity and descriptions
55%. Against the daytime background, their calculated contrast ratios are
2.33:1 and 3.45:1 respectively. Most of the useful information recedes. The
preview uses actual text colours, with secondary text at 6.66:1 in light mode
and 8.10:1 in dark mode.

**There is too much space for the amount of information.** The desktop page is
2084 px tall at a 1440 × 1000 viewport. Only 11 entry titles appear in the first
screen. A 64 px header gap, 64 px section spacing, large descriptions and two
columns spread the catalogue out. Reading order also moves back and forth
across the page.

**The descriptions have inconsistent levels of detail.** Mio has three words;
LedZeppelin explains a workflow, a comparison with Resolume, controller hardware
and a transport protocol. That imbalance makes the entries feel unfinished
even though the underlying projects have substance.

**The categories do not reliably tell visitors what will open.** Apps includes
GitHub repositories, Ratbat and LedZeppelin websites. Browser tools includes
the Helpers repository. The useful distinction at the moment of clicking is
whether the destination is a tool, GitHub or a resource. The preview makes that
visible in a quiet column.

**The list depends entirely on JavaScript.** With JavaScript disabled, the live
page contains zero links, only the title and introductory sentence. For an
index, the links should be the HTML document itself. The preview needs no JavaScript.

## Proposed treatment

- One column of entries using the full window width, aligned by name,
  description and destination, with 24 px desktop and 20 px mobile gutters.
- All names underlined at rest, with an obvious keyboard focus outline.
- Five plain category headings, with entries alphabetised within each group.
  These describe what the tools do, rather than their platform or packaging.
- No visible Labs heading, column labels, search, counts, filter chips or
  introductory paragraph. A hidden page heading provides document structure
  for screen readers.
- The existing SeasonMix typeface at a readable, consistent size.
- On mobile, the description sits directly below its name; the destination
  remains beside the name.
- All links and descriptions in the initial HTML, with no runtime JavaScript.
- Colour preference follows the operating system in the preview. The current
  site changes at 18:00 regardless of the visitor's preference.
- Ordinary same-tab links, leaving the visitor free to open a new tab. The
  current page forces a new tab for every entry.

The preview preserves the recent decision to remove the masthead back link.
It does not add screenshots, favicons beside every item, availability badges,
animated hover previews or a new logo.

## Copy examples

| Entry | Proposed description |
| --- | --- |
| LedZeppelin | Make visuals, map fixtures and send them to addressable LEDs. |
| Grappa | Turn an image’s colours into a gradient map and .cube LUT. |
| Matte | Make animated black-and-white transition mattes. |
| Godnapp | Listen to Sveriges Radio with a sleep timer. |
| Wendigo | Bring NDI and Syphon video into a browser. |
| Kagora | Plan LED strip cuts and materials for Kagora. |

The full set of 32 proposed descriptions is in the preview. These describe the
existing functions without adding personal anecdotes or claims about how often
the tools are used. Detailed formats, protocols and export options belong on
the tool's own page.

## Preview checks

The grouped layout passed checks at 320, 390, 720, 768, 1440 and 2560 px in Chrome,
in both light and dark modes. Each list fills the space between its gutters.
The checks covered horizontal overflow, all 32 entries with JavaScript disabled,
the five groups and their alphabetical order, preservation of the existing
destinations, font loading and keyboard focus. The preview contains no search
input or script.

## If this direction is adopted

Keep one source of truth for entries. A small generator can write the complete
index into static HTML from the current data. The current GitHub Pages
deployment can remain static, with no JavaScript shipped to the browser.

The main editorial task is to decide which experiments belong in the catalogue
and maintain their concise descriptions. Do not infer activity from repository
commit dates or add active/archived labels without reviewing the projects.
