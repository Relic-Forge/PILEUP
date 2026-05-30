# PILEUP Phase Status

## Phase Completed

Phase 7 - One-room vertical slice

## Acceptance Criteria Status

- [x] Player can find the key and escape.
- [x] Player can die/fail.
- [x] Laundry Monster can interrupt search and door unlock.
- [x] UI shows health, stamina, mess, objective, hotbar, flashlight depth, search progress, and door progress.
- [x] Full run can be completed in under 3 minutes.
- [x] No console errors during normal play.

## Commands Run

- `npm run typecheck`
- `npm run build`
- Browser verification:
  - Confirmed Phase 7 HUD/graybox scene renders with player placeholder, flashlight cone, search/hotbar HUD, Laundry Monster state label, and front-door unlock prompt.
  - Confirmed searching the laundry pile collects the Front Door Key and changes the objective to reach the front door.
  - Confirmed holding interact at the exit door advances door progress and transitions to `VictoryScene`.
  - Confirmed enemy damage routes through player health and can reach `GameOverScene`.
  - Confirmed retry from victory/game-over restarts the room.

## Known Issues

See `KNOWN_ISSUES.md`.

## Files Changed

- Added a graybox exit door entity and door system with key-gated hold-to-unlock progress.
- Wired player, search, key inventory, door, enemy, HUD, victory, game over, and retry into one playable room loop.
- Added damage interruption for active searches and door unlocks.
- Added lightweight event-driven audio placeholders for search, item, enemy, damage, and door events.
- Added Phase 7 dev telemetry for door progress and unlock state.
- Updated README prototype status.

## Next Recommended Phase

Phase 8 - Full Level 01 room sequence.
