# PILEUP Phase Status

## Phase Completed

Phase 4 - Flashlight depth targeting

## Acceptance Criteria Status

- [x] Flashlight follows aim direction.
- [x] Player can switch depth target.
- [x] HUD shows selected depth target.
- [x] Cone detects test objects in correct layer only.
- [x] Focus beam has stronger/narrower detection.
- [x] Low battery/flicker state can be triggered in debug.

## Commands Run

- `npm run typecheck`
- `npm run build`
- Browser verification at `http://127.0.0.1:5174/?scene=level` in a 1440x900 viewport:
  - Confirmed Phase 4 HUD/graybox scene renders with player placeholder, JSON room layers, and visible flashlight cone.
  - Confirmed `2`/`3` depth targeting detects only same-layer test objects (`main-target`, `foreground-target`).
  - Confirmed `Space` focus state is sampled by the debug state and narrows/strengthens the beam.
  - Confirmed `F6` triggers the flashlight flicker/low-battery debug state.
  - Confirmed portrait mode suppresses the HUD behind the rotate prompt.

## Known Issues

See `KNOWN_ISSUES.md`.

## Files Changed

- Implemented `FlashlightSystem` with cone rendering, depth-layer targeting, focus beam geometry, battery drain, flicker state, and layer-filtered target detection.
- Extended `InputSystem` with flashlight depth controls, focus input, and flicker debug input.
- Added Phase 4 graybox test targets for background, main, and foreground layers.
- Updated `UIScene` to show flashlight depth, battery, focus, and flicker state.
- Updated dev-only Phase 4 telemetry for browser QA.
- Updated README prototype status and controls.

## Next Recommended Phase

Phase 5 - Search, loot, and inventory.
