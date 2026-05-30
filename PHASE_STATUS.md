# PILEUP Phase Status

## Phase Completed

Phase 8 - Full Level 01 room sequence

## Acceptance Criteria Status

- [x] Player can traverse the full house across Bedroom, Hallway, Bathroom, Kitchen, and Living Room/Front Door.
- [x] Room transitions are visible and paced through full-width room segments.
- [x] Each room has at least one meaningful search decision.
- [x] Key spawn follows fairness rules from level data and avoids blocked nodes.
- [x] Enemy pressure increases through later-room anchors and higher-pressure spawn configs.
- [x] Level can be won or lost through the existing final-door and player-health states.
- [x] Two seeded runs produce different but valid key placement.

## Commands Run

- `npm run typecheck`
- `npm run build`
- Browser verification:
  - Confirmed Phase 8 HUD/graybox scene renders with 14 full-house segments and Bedroom active at start.
  - Confirmed `?scene=level&seed=phase8-a` placed the key at `toy_chest`.
  - Confirmed `?scene=level&seed=phase8-b` placed the key at `trash_bag`.
  - Confirmed seeded runs reported `Phase 8`, active room telemetry, and no browser console errors.
  - Captured viewport smoke screenshot at `/tmp/pileup-phase8-smoke-fixed.png`.

## Known Issues

See `KNOWN_ISSUES.md`.

## Files Changed

- Added a full-house runtime adapter that stitches all Level 01 rooms into one traversable sequence.
- Added seeded search placement with data-driven key placement and dev telemetry for seed/key-node smoke checks.
- Expanded search results across all Level 01 room nodes while preserving objective, survival, junk, empty, and ambush outcomes.
- Expanded enemy spawn direction to all room enemy anchors with multiple archetype configs and later-room pressure scaling.
- Added room transition labels and updated HUD/debug copy for Phase 8.
- Updated README prototype status.

## Next Recommended Phase

Phase 9 - Boss door sequence.
