# Prototype verification

## Verified locally on macOS

- TypeScript compilation and Vite production build.
- Five Rust tests: capped gentle drop with no floor overshoot, click versus drag,
  drop while paused, frozen autonomous motion while paused, negative display
  coordinates and alpha-mask hit testing at Retina scale.
- Renderer alpha-mask test and Rust Clippy with warnings denied.
- Standalone unsigned `.app` build and native launch; the cat rendered in its
  desktop window.
- Browser motion study reviewed for the approved poses, black coat, breathing
  and brief tongue-out variation. This is an exploratory two-pose walk, not a
  completed walk cycle.

## Still needs hands-on verification

Desktop automation could inspect the native window and screenshot, but lost its
window connection when attempting the context menu. Do not treat that as a
passed native interaction test.

- Click the cat to pet; drag upward and release to check the gentle landing.
- Type in another app while Mali walks; verify she never takes keyboard focus.
- Click through transparent space, including gaps around her legs and tail.
- Right-click for Pause / Resume and Quit; check the menu-bar / tray controls.
- Repeat on Windows, plus mixed-DPI displays, display removal, Spaces and
  fullscreen applications.

GitHub Actions builds the macOS app and Windows installer. Compilation alone
does not establish that these desktop interactions work on Windows.

## Next animation pass

Draw a consistent full walk cycle around the approved Walk 2 likeness, then
sit/stand and stretch transitions. Review her face and the two small chest hairs
at actual desktop size. Keep both approved sleeping poses and occasional bleps.
