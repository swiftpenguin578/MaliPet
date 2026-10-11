# Prototype verification

## Cross-platform build results — 11 October 2026

[GitHub Actions run 38131221000](https://github.com/swiftpenguin578/MaliPet/actions/runs/38131221000)
passed for commit `2ec694a` on both macOS and Windows. Each job passed the
renderer test, TypeScript production build and five Rust tests, then packaged
and uploaded an unsigned macOS app or Windows NSIS installer.

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

A fresh launch was checked again after resuming: the cat rendered and changed
poses, but coordinate clicks were rejected by the desktop automation tool with
`windowNotFoundAtPosition` or a changed-window error before input was delivered.
This does not establish whether a physical mouse interaction succeeds or fails.

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
