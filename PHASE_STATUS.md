# PILEUP Phase Status

## Phase Completed

Phase 3 - Player controller and floor-plane movement

## Acceptance Criteria Status

- [x] Player can move left/right and up/down within floor bounds.
- [x] Player cannot pass blockers.
- [x] Player depth-sorts correctly against props/enemy placeholders.
- [x] Sprint drains stamina and recovers when not sprinting.
- [x] Crouch reduces speed and noise.

## Commands Run

- `npm run typecheck`
- `npm run build`
- Browser verification at `http://127.0.0.1:5173/` in a 2560x990 ultrawide viewport:
  - Entered `LevelScene`.
  - Confirmed Phase 3 HUD/graybox scene renders with player placeholder, floor-plane props, and JSON room layers.
  - Confirmed no relevant app errors or warnings in the in-app browser console.
  - Exercised movement/camera-follow flow with keyboard controls.
  - Browser screenshot capture timed out late in QA after the initial Phase 3 screenshot succeeded, so final visual proof is partially limited.

## Known Issues

See `KNOWN_ISSUES.md`.

## Files Changed

- Implemented `Player` placeholder entity with basic walk/sprint/crouch visual states.
- Implemented `InputSystem` keyboard abstraction with held-key and short tap-buffer support.
- Implemented `PlayerController` for 2.5D floor-plane movement, floor bounds, blocker collision, sprint stamina, crouch speed, and noise state.
- Implemented `DepthPlaneSystem` for Y-based render depth.
- Updated `LevelScene` to use player camera follow instead of the Phase 2 debug camera anchor.
- Added dev-only Phase 3 telemetry and `?scene=level` shortcut for browser QA.
- Updated `UIScene` to react to stamina changes.

## Next Recommended Phase

Phase 4 - Flashlight depth targeting.
