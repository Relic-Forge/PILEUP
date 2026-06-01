# PILEUP Phase Status

## Phase Completed

Phase 10 - Flashlight feedback pass

## Acceptance Criteria Status

- [x] Flashlight visual aim now eases toward the deterministic gameplay aim instead of snapping.
- [x] Focus has an animated transition with a narrowing beam, stronger core shaft, origin glow, and end bloom.
- [x] Background, main, and foreground depth modes have distinct visual beam profiles and a switch pulse.
- [x] Low battery affects presentation before the critical flicker state through dimming, edge shimmer, and aim instability.
- [x] Flashlight focus, depth switch, flicker, critical battery, and first enemy-hit moments emit audio events.
- [x] HUD keeps the debug text while adding a small lens indicator and low-battery pulse.
- [x] Gameplay target detection still uses the existing deterministic cone math.

## Commands Run

- `npm run typecheck`
- `npm run build`
- Browser verification:
  - Confirmed `?scene=level&seed=flashlight-pass-a` boots into Phase 10 telemetry.
  - Confirmed the HUD lens indicator renders and flashlight debug telemetry reports `focus01`, `visualRange`, and `batteryInstability01`.

## Known Issues

See `KNOWN_ISSUES.md`.

## Post-Phase Lighting Fixes

- Added `DarknessSystem` as the first darkness-atmosphere pass for Phase 11 groundwork.
- Confirmed the hard flashlight triangle remains debug-only while the normal view uses a dark overlay, reveal stamps, vignette, origin glow, beam edge shimmer, and endpoint bloom.
- Fixed camera-follow darkness coverage so the overlay no longer ends after walking right through the level.
- Added screen-surface overscan to the darkness and vignette passes to cover viewport edge slivers during camera movement and scaling.

## Backpack Menu + HUD Overhaul Intake

- Added structured backpack, inventory, lost-items, item-use, and toast events while keeping temporary `hotbar.changed` / `checklist.created` compatibility.
- Moved item definitions toward the data-driven `data/item_pool.json` source with runtime labels, descriptions, stack counts, burden, hotbar assignment, and disabled-use text.
- Replaced the always-visible lost-items paper with a compact gameplay HUD, visual hotbar, backpack button, contextual search/door feedback, and toast stack.
- Added a Phaser-rendered backpack overlay with inventory, lost-items, and notes tabs, selected item details, burden/objective status, close control, keyboard tab/selection handling, and a Use action.
- Wired `spare_batteries` through `inventory.useRequested` so it restores flashlight battery and consumes one stack; unsupported item uses now return visible feedback instead of doing nothing.
- Reserved hotbar slot 1 for the flashlight, shifted collected hotbar inventory to slots 2-5, and centered the quick inventory strip at the bottom of the HUD.
- Added dev helpers for `?giveItems=all` and `?backpackOpen=1`.
- Validation run: `npm run typecheck` and `npm run build` passed. In-app Browser visual QA was attempted but blocked by the local URL policy before page inspection.

## Files Changed

- Upgraded `FlashlightSystem` with visual aim smoothing, focus interpolation, layered beam rendering, depth personality, low-battery instability, hurt shake, and flashlight-specific event emission.
- Added generated audio responses for flashlight focus, depth switch, flicker, critical battery, and first enemy contact.
- Added HUD lens/battery feedback and expanded dev debug telemetry for flashlight presentation state.
- Updated README and visible phase labels to Phase 10.
- Added `DarknessSystem` wiring, blocker intake, reveal-stamp darkness creep, layer-specific darkness profiles, debug ray sampling, and viewport overscan.
- Added backpack menu/HUD overhaul scaffolding and the first usable item flow.

## Next Recommended Phase

Phase 11 - Target reactions, occlusion, and darkness atmosphere. The basic darkness/reveal pass is in place; remaining work should focus on target reactions, visual occlusion, shadow-caster structure, and final tuning.
