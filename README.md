# MaliPet

A small desktop cat companion for macOS and Windows, inspired by a real black cat.

**Status: first desktop prototype.** Tauri 2 + TypeScript, with an approved character concept and an initial pose-based motion pass. The walking frames are exploratory, not a finished walk cycle.

## Try it

The desktop pet runs in a transparent floating window. Click her to pet, drag to move her, and release for a gentle drop to the bottom usable screen edge. Right-click for Pause / Resume and Quit. A small menu-bar / system-tray menu also provides an escape hatch and can bring her to the current screen.

Pause stops her autonomous routine and breathing; dragging and the gentle drop remain usable. Her routine includes walking, sitting, loafing, stretching, both approved sleeping poses, and occasional short bleps. No sound, accounts, network service, or autostart.

### Develop

Install Node.js 24+, pnpm (the version in `package.json`), Rust stable, and the [Tauri platform prerequisites](https://v2.tauri.app/start/prerequisites/). On Windows this includes the MSVC C++ build tools and WebView2. On macOS use Xcode Command Line Tools.

```sh
pnpm install
pnpm tauri dev
```

For the browser-only motion study, run `pnpm dev` and open the local address shown. Its pose controls and light/dark preview are development tools, not part of the desktop pet.

The new **continuous 2D rig study** is at `http://127.0.0.1:1420/?study=rig`.
It plays a 24-second walk → stop → sit → lie → curl → sleep → wake → stretch →
walk sequence. Pause, scrub, slow playback, switch backgrounds or enable size
guides. Add `&t=12` to open a paused moment. This is a review preview, not yet the
desktop renderer; the approved sleeping illustrations remain untouched. See
[the rig notes](docs/animation-rig-study.md) for its current limitations.

```sh
pnpm test
pnpm build
cargo test --manifest-path src-tauri/Cargo.toml --locked
pnpm tauri build --bundles app   # macOS
pnpm tauri build --bundles nsis  # Windows
```

Builds are unsigned personal-use prototypes. GitHub Actions builds macOS and Windows artifacts; a successful build is not a substitute for native interaction testing on both platforms.

## Prototype boundaries

- The transparent sprite cutouts are derived from the approved sheet. Original approved artwork is preserved under `art/concepts`. The generated cutouts still need a final likeness review.
- Walking currently alternates two exploratory poses with gentle movement. Breathing and other reactions establish timing; dedicated walk, sit-down and stretch transitions still need to be drawn.
- Hit testing follows the rendered cat's alpha mask at 4 logical-pixel resolution. A native 30 Hz cursor check switches click-through; rapid crossings can have a short delay. This needs hands-on checks on each OS before release.
- Monitor work areas are refreshed while running; mixed-DPI multi-monitor setups, Spaces and fullscreen apps still need broader testing.
- Releasing a drag uses capped downward speed and lands without bouncing or crossing the work-area floor. Positions are not yet saved between launches.
- Tauri's transparent macOS window uses private APIs, so this build targets direct installation rather than the Mac App Store.

## First release

- Walk along the bottom usable edge of the screen.
- Occasionally sit, stretch, and sleep.
- React to petting.
- Allow dragging to another position.
- Offer Pause / Resume and Quit through a right-click menu.
- Coexist with other applications without taking keyboard focus or blocking clicks outside the cat.

Keep this a modest, standalone personal project. Cursor-watching and toys are deferred, along with accounts, chat, and integrations with other projects.

## Character direction

Base the character on the owner's cat: glossy black fur, yellow-green eyes, expressive ears, and a long tail. The reference photos also suggest a distinctive little tongue-out expression and relaxed sleeping poses.

Soft 2D illustration is the chosen direction. The owner approved the [pose sheet](art/concepts/malipet-pose-sheet-v1.png), including sitting, loafing, walking, stretching, petting, and both sleeping poses.

- Use **Walk 2** as the preferred likeness reference for the walking animation; it resembles her more closely than Walk 1.
- Use the approved **black** coat with neutral charcoal highlights. The black versions match her real color better; avoid brown or sepia fur shading.
- Add occasional brief tongue-out expressions at irregular times as an animation variation, not on every loop.
- Preserve both approved sleep poses: curled with a little tongue showing, and partly on her side with paws over her face. In the latter, the upper foreleg comes down from above her head and the lower foreleg comes from underneath, angled up-right.
- Preserve the two individual white chest hairs in their approved location, size, angle and spacing. Do not turn them into a white patch or move them onto other body parts when the chest is hidden.

The sheet is a visual reference, not a completed walk cycle or production sprite atlas. On-screen size and animation timing still need to be worked out in the prototype.

Original reference photographs remain local and are not included in this public repository.

## Implementation

Tauri 2 provides the native window, menu and screen coordinates. Rust owns the pet's movement, pause state, drag/drop and routine; a small TypeScript canvas renderer draws her and supplies the alpha hit mask. The native window is configured to be non-focusable and hidden from the task switcher.

Tauri's transparent windows on macOS require its private-API option, so this approach targets direct installation rather than the Mac App Store. See the [Tauri window configuration documentation](https://v2.tauri.app/reference/config/#windowconfig).

## Small milestones

1. Character concept approved; gentle drop chosen.
2. First native shell and pose-based motion pass.
3. Verify desktop interactions on both operating systems and refine the walk cycle around Walk 2.
4. Add consistent transition frames, complete likeness review, and package the first personal-use release.

## Decisions still open

- On-screen size and animation timing.
- Final transition frames and the walking cycle.
- Source-code and artwork licensing before the first release.
