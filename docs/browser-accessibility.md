# Browser and accessibility checks

Run after changes to navigation, controls, templates or responsive styles:

```sh
npm ci
npx playwright install --with-deps chromium firefox webkit
npm run build
npm test
npm run test:browser
npm run test:accessibility
```

Deployment runs these checks before publishing. `test:browser` retains the
existing Chromium checks, including touch gestures and media playback.
`test:accessibility` covers Chromium, Firefox and WebKit, with touch emulation
in Chromium and WebKit. Firefox does not support Playwright's mobile emulation.

The accessibility suite runs axe against every work project and the homepage
in desktop Chromium. Each other browser/device mode scans the homepage and
representative image, video-hero, audio and custom-font projects. No axe rules
or page regions are excluded. Functional checks cover:

- Skip links, named headings, keyboard activation, focus restoration and route announcements.
- Filters, search, touch previews and project navigation.
- Reduced-motion video controls, MP4 decoding and preservation of a manual pause.
- Page reflow and contact access at 320 CSS pixels.
- Navigation and native hero-video controls without JavaScript.

Use `AUDIT_BROWSERS=webkit npm run test:accessibility` to investigate one engine.
`AUDIT_BASE_URL` can target another served build. Detailed violations and axe's
manual-review findings are saved to `screenshots/accessibility/results.json`;
GitHub Actions retains this report and screenshots for seven days.

## Hands-on checks still required

Passing automation is not a claim of complete accessibility. WebKit emulation
is not a physical iPhone or the installed Safari browser, and accessibility-tree
checks do not run a screen reader. Before calling the audit complete:

- Check VoiceOver on Safari/iPhone and TalkBack on Android, including the strip
  names, activation, route announcements, filters and native media controls.
- Check finger scrubbing, orientation changes, text enlargement and playback on
  physical phones, including a device with reduced motion enabled.
- Review videos and audio samples for meaningful speech or sound that needs
  captions/transcripts, and visual information needing description. An accessible
  label identifies a clip; it is not a transcript or audio description. Axe flags
  video-caption checks for manual review rather than deciding this from the media.
- Evaluate how easily people can select narrow strips on touch screens. The
  proposed optional text index is a design decision still under discussion.

The September 2026 pass adds an accessible homepage heading, restores mobile
contact links, gives hero videos playback controls, and lets keyboard/assistive
activation enter a project directly on touch devices. The skip link explicitly
focuses the main content so WebKit's fragment history cannot move focus back to
the project collection. Media dimensions, image
encoding and image resolution are unchanged.
