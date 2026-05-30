# PILEUP Phase Status

## Phase Completed

Phase 5 - Search, loot, and inventory

## Acceptance Criteria Status

- [x] Search node can return key, item, junk, empty, or ambush placeholder.
- [x] Search can be cancelled.
- [x] Search creates noise visible in debug/HUD.
- [x] Items appear in hotbar or backpack.
- [x] Burden state changes when carrying junk.
- [x] Key acquisition updates objective.

## Commands Run

- `npm run typecheck`
- `npm run build`
- Browser verification at `http://127.0.0.1:5174/?scene=level` in a 1440x900 viewport:
  - Confirmed Phase 5 HUD/graybox scene renders with player placeholder, flashlight cone, and search/hotbar HUD.
  - Confirmed `E` hold starts and completes a nearby search node.
  - Confirmed releasing `E` cancels search progress before completion.
  - Confirmed deterministic search results feed item/key/junk/empty/ambush placeholders.
  - Confirmed hotbar, burden, noise, and objective state update through events and dev telemetry.
  - Confirmed `F` triggers the flashlight flicker/low-battery debug state.

## Known Issues

See `KNOWN_ISSUES.md`.

## Files Changed

- Remapped flashlight debug flicker from `F6` to `F`.
- Implemented searchable graybox piles from room segment search node data.
- Added hold-to-search progress, cancel behavior, search noise, and deterministic result table.
- Implemented inventory/hotbar/burden state updates.
- Added key item handling that updates the objective after pickup.
- Updated `UIScene` to show search progress/noise and hotbar/load state.
- Updated dev-only Phase 5 telemetry for browser QA.
- Updated README prototype status and controls.

## Next Recommended Phase

Phase 6 - Enemy framework and Laundry Monster.
