# PILEUP Phase Status

## Phase Completed

Phase 9 - Boss door sequence

## Acceptance Criteria Status

- [x] Objective changes after key is found.
- [x] Key pickup triggers a dedicated final door-hoard pressure sequence.
- [x] Front-door unlock takes time and can be interrupted by releasing interact, leaving range, or taking damage.
- [x] Boss attacks are telegraphed with a visible warning lane and debug telemetry.
- [x] Player has a defensive porch-light spill near the door; focusing the main-plane flashlight there stuns the hoard and lowers pressure.
- [x] Victory state triggers after the successful escape state and camera fade.
- [x] Boss attacks are capped below full health on Normal and cannot instantly kill a full-health player.

## Commands Run

- `npm run typecheck`
- `npm run build`
- Browser verification:
  - Confirmed `?scene=level&seed=phase9-a` boots into Phase 9 telemetry.
  - Confirmed initial level load reports the expected seed, active room, inactive boss state, and no browser console errors.

## Known Issues

See `KNOWN_ISSUES.md`.

## Files Changed

- Added `BossDoorSequenceSystem` for key-triggered final pressure, telegraphed hoard attacks, defensive porch-light stun, and boss debug telemetry.
- Wired Phase 9 boss state into `LevelScene` update/debug flow and escape fade.
- Updated key-found objective copy and Phase 9 menu/build-status labels.
- Updated README prototype status.

## Next Recommended Phase

Phase 10 - Audio, feedback, and juice pass.
