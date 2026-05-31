# PILEUP Asset Generation Runbook

Use this runbook for every production art batch. It turns the guardrails into the concrete sequence to follow before generating, reviewing, and promoting assets.

## Required Reading Order

1. `docs/PILEUP_Asset_Generation_Quality_Guardrails.md`
2. `data/assets/asset_registry.json`
3. `docs/PILEUP_Art_Bible_and_Asset_Spec.md`
4. `docs/PILEUP_Responsive_Display_and_Asset_Scaling_Spec.md`
5. `data/art_export_targets.json`
6. `data/animation_specs.json`

## Current Source Of Truth

- `data/assets/asset_registry.json` is the design identity registry.
- `data/assets/approved_assets.json` is the current approval index.
- `data/assets/asset_lock_rules.json` defines what may change by lifecycle state.
- `data/assets/asset_generation_manifest.json` records generated batches, prompts, outputs, and review status.
- `data/asset_manifest.json` remains the existing prototype/runtime manifest until runtime art is promoted.

## Canonical Asset IDs

Use these IDs in prompts and new metadata. Existing gameplay keys may remain as aliases until code/data migration.

| Canonical assetId | Existing aliases | Status |
|---|---|---|
| `character.player_child` | `player_child` | concept |
| `enemy.laundry_monster` | `laundry_monster`, `laundry_pile_monster` | candidate |
| `enemy.socklings` | `socklings`, `sock_goblin` | concept |
| `enemy.drawer_mimic` | `drawer_mimic` | concept |
| `enemy.hanging_coat_stalker` | `hanging_coat_stalker`, `hanger_stalker` | concept |
| `enemy.dish_crawler` | `dish_crawler`, `dish_stack_crawler` | concept |
| `boss.door_hoard` | `door_hoard`, `hoard_at_the_door` | concept |
| `room.level01_bedroom` | `level01_bedroom_layers` | candidate |
| `ui.hud_core` | `hud_inventory_bars_objectives` | candidate |
| `vfx.flashlight_cone` | `flashlight_cone_masks` | concept |

## Batch Workflow

1. Select one asset family and one output type. Keep batches small enough to review visually.
2. Read the registry entry and copy its locked identity, do-not-change list, allowed variations, and references into the prompt.
3. Save raw generated outputs under `art/source/...` or `art/paintovers/...`; never overwrite approved contact sheets or runtime files.
4. Add the batch to `data/assets/asset_generation_manifest.json` with prompt, tool, seed when available, source references, output paths, and review status.
5. Create or update a contact sheet in `art/approved_contact_sheets/` only after review. Candidate contact sheets should stay in `art/paintovers/` or batch-specific source folders.
6. Export runtime tiers only after identity review passes.
7. Add runtime files and metadata JSON to `public/assets/...` and update `data/asset_manifest.json` only after technical review passes.
8. Promote the asset in `data/assets/asset_registry.json` and `data/assets/approved_assets.json` only after identity, technical, gameplay, and consistency checks pass.

## First Recommended Batches

Start with identity locks before full animation production:

1. `enemy.laundry_monster` contact sheet and turnaround using prototype references.
2. `character.player_child` contact sheet with flashlight, search, hurt, and door-unlock poses.
3. `room.level01_bedroom` layered room segment paint pass.
4. `ui.hud_core` icon/panel style sheet without baked gameplay text.

Do not start full animation sheets until the corresponding contact sheet is approved.

## Prompt Skeleton

```text
Create [asset output] for PILEUP using [assetId] in lifecycle state [concept/candidate/approved].
Use source references: [paths].
Preserve identity: [lockedIdentity fields].
Do not change: [doNotChange list].
Allowed variation: [allowedVariations relevant to this output].
Use the PILEUP art direction: hand-drawn 2D/2.5D domestic survival horror, layered side-view house diorama, familiar clutter turned threatening, readable silhouettes, not photorealistic.
Output target: [contact sheet / sprite sheet / room layer / prop / UI icon].
Technical requirements: [resolution, alpha/layers, frame count, grid, no text, no baked background, no watermark].
```

## Rejection Triggers

Reject or keep as non-production reference if the output:

- changes the canonical silhouette, palette, face, material origin, or motion language;
- looks like generic haunted-house, fantasy, sci-fi, photorealistic, or cute mobile-cartoon art;
- contains text, labels, watermarks, baked checkerboard, halos, or unrelated objects;
- cannot be sliced, layered, scaled, or reviewed at phone and desktop sizes;
- solves a gameplay-placement problem by redesigning a locked asset.
