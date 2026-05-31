# PILEUP

**Title:** PILEUP  
**Tagline:** "I'll deal with it tomorrow."  
**Alt line:** Famous last words.  
**Pitch:** Search the clutter, find the key, and survive what you left behind.

This repo contains the PILEUP v2 MVP/PRD package plus the Phaser 4 + TypeScript + Vite prototype.

## Run and build

Requirements:

- Node.js 20 or newer.
- npm.

Install dependencies:

```sh
npm install
```

Start the local dev server:

```sh
npm run dev
```

Build and typecheck:

```sh
npm run build
```

Run typecheck only:

```sh
npm run typecheck
```

Current prototype status: Phase 10. The full-house graybox now includes the final boss-door sequence plus a flashlight feedback pass: visual aim has weight, focus narrows smoothly, depth modes have distinct beam profiles, low battery destabilizes the beam, and flashlight focus/depth/flicker events drive subtle audio and HUD feedback.

Controls:

- `Enter` or click start: enter the level.
- `WASD` or arrow keys: move on the floor plane.
- `Shift`: sprint.
- `C`: crouch.
- Mouse: aim flashlight.
- `1` / `2` / `3`: target background, main, or foreground depth.
- `Space`: focus flashlight beam.
- `E`: hold to search nearby clutter or unlock the exit door after finding the key.
- `F3`: debug overlay.
- `F4`: world layer/collision labels.
- `F`: trigger flashlight flicker/low-battery debug state.

## Folder structure

```text
PILEUP_MVP_PRD_Package/
  PILEUP_MVP_PRD.docx
  README.md
  docs/
    PILEUP_MVP_PRD.md
    PILEUP_Art_Bible_and_Asset_Spec.md
    PILEUP_Systems_Design_Notes.md
    PILEUP_Production_Asset_Checklist.md
  data/
    asset_manifest.json
    animation_specs.json
    enemy_archetypes.json
    item_pool.json
    level_01_family_house.json
  assets/
    reference/
      prototype_sprites/
      concept_drawings/
      pileup_reference_contact_sheet.png
    production_targets/
  templates/
    naming_conventions.txt
    sprite_metadata_template.json
```

## Prototype art included

- Laundry monster idle/prototype sprite sheet.
- Laundry monster attack/prototype sprite sheet.
- Earlier gameplay UI mockup.
- Parallax room gameplay mockup.
- Contact sheet of all prototype visuals.

These are direction references, not final production exports. The final art pipeline should rebuild them as true RGBA sprites and layered room assets with clean frame alignment, pivots, hitboxes, and metadata.

## MVP definition

The v1 playable target is one complete level: a single family house at night. The player searches clutter for five hidden items, including the key to escape, while enemies emerge from the main plane, foreground, and background. The flashlight can inspect different depth layers and changes enemy behavior depending on enemy type.

The design is intended to scale into future houses with different design styles, family details, income levels, decades, and cultural textures while preserving the same core mechanics.

## Addendum: level length and parallax scalability

This package now includes `docs/PILEUP_Level_Length_and_Parallax_Extension_Spec.md` and `data/room_segment_schema.json`. These define room width in screen units, segment-based room construction, parallax layer exports, traversal-time targets, and designer-tunable fields so levels can be lengthened or shortened without repainting every background from scratch.


## v2 responsive display update

This package now includes `docs/PILEUP_Responsive_Display_and_Asset_Scaling_Spec.md`, `data/display_scaling_profile.json`, `data/ui_layout_breakpoints.json`, and `data/art_export_targets.json`.

The update locks the game to a scalable presentation strategy: segmented layered room art, resolution-tiered exports, safe-area UI anchoring, phone landscape support, 4K/ultrawide quality checks, and source-art requirements that prevent backgrounds and sprites from becoming blurry on large monitors.

## v2.1 Build Spec Addendum

This package now includes a Phaser 4 + TypeScript implementation handoff. Start here before coding:

```text
docs/PILEUP_Build_Spec_Phases_and_Acceptance.md
docs/PILEUP_Technical_Implementation_Spec_Phaser4.md
docs/PILEUP_Codex_Execution_Plan.md
docs/PILEUP_Acceptance_Test_Checklist.md
docs/PILEUP_Engine_Migration_Path.md
```

Supporting implementation data:

```text
data/build_milestones.json
data/control_map.json
data/flashlight_enemy_matrix.json
data/runtime_world_units.json
data/performance_budget.json
templates/package_json_phaser4_template.json
```

Implementation rule: build phase-by-phase and do not advance until the acceptance criteria for the current phase pass.

## Asset generation quality guardrails

Before generating, replacing, or promoting any new art asset, read:

```text
docs/PILEUP_Asset_Generation_Quality_Guardrails.md
docs/PILEUP_Asset_Generation_Runbook.md
data/assets/asset_registry.json
```

Core rule: approved assets are locked design references. Gameplay implementation phases may place, configure, animate, export, or reference approved assets, but they must not redesign or replace approved art unless a new asset version is explicitly requested and approved.

Generated assets start as candidates. Record generation batches in `data/assets/asset_generation_manifest.json`, keep source/candidate art out of approved/runtime folders until review passes, and promote only after the checklist in the guardrails is satisfied.
