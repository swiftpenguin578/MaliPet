# MaliPet

A small desktop cat companion for macOS and Windows, inspired by a real black cat.

**Status: planning.** No application or installable release exists yet. The visual style is being agreed before prototype development begins.

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

Soft 2D illustration is the chosen direction. The first concept will be reviewed before animation development. Use subtle charcoal highlights so the black silhouette remains readable against dark desktops.

Original reference photographs remain local and are not included in this public repository.

## Proposed approach

Tauri 2, TypeScript, and animated 2D sprites are the initial recommendation, not a finalized implementation decision. Validate transparent windows, dragging without keyboard focus, and click-through outside the cat on both platforms before investing in production animation.

Tauri's transparent windows on macOS require its private-API option, so this approach targets direct installation rather than the Mac App Store. See the [Tauri window configuration documentation](https://v2.tauri.app/reference/config/#windowconfig).

## Small milestones

1. Agree the visual style and what happens when the cat is dropped above the bottom edge.
2. Prove desktop window and interaction behavior on macOS and Windows using a placeholder cat.
3. Add the agreed character and first-release animations.
4. Verify both platforms and package the first personal-use release.

## Decisions still open

- Approval of the illustrated character design and on-screen size.
- Whether dragging leaves the cat at the dropped position or returns it to the bottom edge.
- Petting gesture and reaction.
- Source-code and artwork licensing before the first release.
