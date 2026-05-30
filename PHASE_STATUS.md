# PILEUP Phase Status

## Phase Completed

Phase 6 - Enemy framework and Laundry Monster

## Acceptance Criteria Status

- [x] Laundry Monster starts dormant/hidden.
- [x] It reveals/stalks/enters main plane based on triggers.
- [x] It slows/freezes under short flashlight exposure.
- [x] It lunges after overexposure or attack trigger.
- [x] Attack has readable telegraph before damage.
- [x] Player can survive/dodge/stun it through distance and flashlight state windows.
- [x] State labels can be displayed in debug mode.

## Commands Run

- `npm run typecheck`
- `npm run build`
- Browser verification at `http://127.0.0.1:5175/?scene=level`:
  - Confirmed Phase 6 HUD/graybox scene renders with player placeholder, flashlight cone, search/hotbar HUD, and Laundry Monster state label.
  - Confirmed the Laundry Monster starts `Dormant` on the background layer.
  - Confirmed moving toward the laundry-pile hint advances the monster to `Revealed` on the main layer.
  - Confirmed flashlight hits report the monster target through dev telemetry.
  - Confirmed overexposure/close pressure advances through telegraph, attack, and recovery timing.
  - Confirmed attack damage updates player health through `player.healthChanged`.

## Known Issues

See `KNOWN_ISSUES.md`.

## Files Changed

- Implemented the enemy base class and reusable state timer.
- Added a spawn director that maps room enemy hint data into a reachable Phase 6 Laundry Monster spawn.
- Implemented a graybox Laundry Monster with dormant, hint, background stalk, main-plane reveal, telegraph, attack, recovery, and stunned states.
- Wired flashlight hit events into enemy exposure, freeze/slow, stun, and overexposure lunge behavior.
- Added player damage events and HUD health updates.
- Added dev telemetry and in-world state labels for enemy QA.
- Updated README prototype status.

## Next Recommended Phase

Phase 7 - One-room vertical slice.
