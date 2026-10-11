# Continuous 2D rig study

Open `/?study=rig` while the local Vite server runs. The study lasts 24 seconds
and stops at the end; Replay starts it again. It supports scrubbing, chapter
navigation, half-speed playback, light/dark backgrounds, and size guides.
Reduced-motion preferences start it paused. `&t=17.8` opens a paused stretch.

## Consistency

- A single generated parts atlas supplies the entire sequence. Body, legs and
  tail reuse the same textures, with no pose-specific recoloring.
- The head remains 76 × 84 rig units throughout. Awake and closed-eye artwork
  blend only during the eyelid transition. These two drawings still need a
  final likeness/alignment review.
- Every pose uses a shared ground line at y=266. We do not fit each pose to a
  bounding box. Lower poses change posture, rather than scaling the whole cat.
- Body folding changes trunk width/height together, approximately retaining
  projected area. This is a simple deformation, not a final anatomical mesh.
- The same chest detail stays on the torso texture, following the chest as it
  rotates. It is not independently redrawn per animation frame.

## Motion

Named key poses interpolate smoothly. Legs use a two-bone joint calculation
and smoothly bent texture strips. Near limbs tuck behind the trunk as she
lies down. The tail root follows the rotated rump, then wraps in front during
curling. Sleeping has a small breathing movement; paused playback freezes it.

Tests sample all 24 seconds at 120 samples/second for coordinate continuity,
finite positions and foot targets at or above the ground. They also check
reachable joint lengths and returning to the initial master pose. Visual
inspection covered standing/walking, sleep and stretch, including dark
backgrounds. These checks are not a substitute for animation/likeness approval.

## Still an animation study

The textured puppet demonstrates continuous motion rather than swapping whole
pose drawings. Folded leg silhouettes, paw contact and the curl-up pose still
need refinement; some transitions will benefit from specially drawn in-between
frames. This is not a production-ready walk cycle or a replacement for either
approved sleeping illustration. It has not been wired into the native app.

Artwork: `public/assets/motion/rig-parts-v1.png`, generated with the built-in
image-generation tool using approved illustration references only. The two
prompts are saved in `art/animation/rig-v1-prompts.txt`. No personal photographs
were added or uploaded to the repository. Original approved art is unchanged.
