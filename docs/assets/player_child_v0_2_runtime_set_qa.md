# Player Child v0.2 Runtime Set QA

Asset ID: `character.player_child`

Batch ID: `character.player_child.runtime_set.v0_2.2026_05_30`

## Generated Package

- Asset-set manifest: `public/assets/characters/player_child/v0_2/player_child_v0_2.asset.json`
- Source pose masters: `art/source/characters/player_child/v0_2/poses_2048`
- Raw walk-cycle source: `art/source/characters/player_child/player_child_walk_cycle_v0_3_raw.png`
- Runtime root: `public/assets/characters/player_child/v0_2`
- Packaging script: `scripts/build-player-asset-set.mjs`

## Resolution Coverage

| Tier | Frame size | Contents |
|---|---:|---|
| source | 2048x2048 | 6 pose masters, 10 walk-cycle masters |
| mobile | 512x512 | 6 poses, 10 animation sheets, per-sheet metadata |
| standard | 768x768 | 6 poses, 10 animation sheets, per-sheet metadata |
| high_4k | 1024x1024 | 6 poses, 10 animation sheets, per-sheet metadata |

## Animation Coverage

The package includes candidate sheets for:

- `idle`
- `walk` - generated v0.3 walk-cycle frames
- `run` - generated v0.3 walk-cycle frames at faster fps
- `depth_step_up`
- `depth_step_down`
- `search`
- `broom_attack`
- `spray_use`
- `hurt`
- `unlock_door`

## QA Result

Pass:

- Source pose masters are 2048x2048 RGBA PNG.
- Runtime tiers match `data/art_export_targets.json` for player sprites.
- Animation state coverage matches `data/animation_specs.json`.
- Each animation sheet has JSON metadata with frame size, frame count, fps, loop, anchor, and source pose.
- Registry and runtime manifest now reference the package.
- Walk/run no longer reuse one shifted pose; they use ten generated frames with alternating leg positions.
- Matte cleanup removes neutral checker pixels, small detached alpha islands, boundary halo pixels, and baked flashlight-cone pixels before runtime sheets are written.
- Walk/run framing is scaled down and palette-normalized toward the standing/search child source.

Caveats:

- Idle, depth, search, attack/use, hurt, and unlock-door states are still candidate/proxy sheets derived from six contact-sheet poses.
- The package should stay in candidate status until art-direction review approves the identity and follow-up animation passes replace the remaining proxy states. A future bespoke walk-cycle paintover should use the standing/search child directly as the model sheet.

Decision:

Use this package for asset pipeline validation and future runtime-loader integration. Do not mark `character.player_child` approved or locked yet.
