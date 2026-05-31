# PILEUP Asset Generation Quality Guardrails

**Purpose:** prevent asset drift while creating new art in phases.

PILEUP can use AI-assisted asset generation, manual paintovers, sprite cleanup, and Phaser placement tools, but the game cannot slowly redesign itself every time a new asset is requested. This document defines the quality-control system for generating, approving, versioning, exporting, and using assets without losing the look of the game.

This document is mandatory for any task that creates or changes character art, enemy art, room backgrounds, foreground clutter, props, UI icons, animation sheets, VFX, or audio-reactive visual assets.

---

## 1. Core Rule

Approved assets are locked design references.

Once an asset is approved, later work may create new animations, export tiers, hitboxes, metadata, Phaser prefab mappings, or room placements for that asset. Later work must not redesign the approved asset unless a new version is explicitly requested and approved.

Correct:

```text
Create laundry_monster_hurt using the approved Laundry Monster v1.0 design.
Create a 1024 px runtime export of the approved broom weapon icon.
Add the approved hallway background to the Level 01 scene.
```

Incorrect:

```text
Create a new scary laundry monster.
Make the laundry monster look cooler.
Regenerate the bedroom in a slightly different style.
Make a new version of the player with a different outfit because it looks better.
```

The approved design wins over a cool new generation.

---

## 2. Source of Truth Hierarchy

Use this hierarchy when deciding what an asset is supposed to look like.

```text
1. Approved asset registry
2. Approved contact sheet / turnaround / style sheet
3. Art bible and palette notes
4. Existing production source files
5. Runtime exports
6. Prototype references
7. New AI generation output
```

A new AI output never outranks an approved reference.

If an AI-generated result looks good but conflicts with the approved asset identity, reject it or route it as a candidate for a new version. Do not silently replace the asset.

Current repo contract:

```text
data/assets/asset_registry.json              design identity registry
data/assets/approved_assets.json             approval index
data/assets/asset_lock_rules.json            lifecycle change rules
data/assets/asset_generation_manifest.json   generated batch log
data/asset_manifest.json                     existing prototype/runtime manifest
```

Use `data/assets/asset_registry.json` for art identity, prompts, lifecycle state, and approval decisions. Use `data/asset_manifest.json` only for existing prototype references and promoted runtime references until the runtime loader is migrated to the asset registry.

---

## 3. Asset Lifecycle States

Every meaningful asset must have one of these states.

```text
concept       - rough idea, not stable, may change heavily
candidate     - good enough for review, not approved
approved      - design is accepted, can be used as a reference
locked        - production identity is frozen; only technical exports/animations may change
deprecated    - no longer used, retained only for history/reference
```

Lifecycle rule:

```text
concept -> candidate -> approved -> locked
```

No asset should jump from concept directly to locked.

Lifecycle promotion requires evidence:

```text
concept   -> candidate  after generated/source art exists and is stored
candidate -> approved   after identity, technical, gameplay, and consistency review pass
approved  -> locked     after the asset is chosen as the stable production identity
```

Do not mark prototype references as approved or locked just because they are currently useful.

---

## 4. Required Asset Registry Fields

Every approved or locked asset must be represented in an asset registry file.

Concept and candidate assets should also be represented when they are MVP-critical, have aliases in code/data, or will be used in generation prompts.

Recommended location:

```text
data/assets/asset_registry.json
```

Required fields:

```json
{
  "assetId": "enemy.laundry_monster",
  "displayName": "Laundry Monster",
  "category": "enemy",
  "status": "locked",
  "artVersion": "1.0.0",
  "owner": "art-direction",
  "sourceReference": "assets/reference/prototype_sprites/laundry_monster_idle_prototype.png",
  "approvedContactSheet": "art/approved_contact_sheets/enemy_laundry_monster_v1_contact_sheet.png",
  "runtimeFiles": [
    "public/assets/enemies/laundry_monster/laundry_monster_idle_1024.png",
    "public/assets/enemies/laundry_monster/laundry_monster_attack_1024.png"
  ],
  "lockedIdentity": {
    "silhouette": "bulky low crawling laundry mound",
    "face": "dark hooded void under stained off-white sheet",
    "eyes": "orange-yellow glow",
    "palette": "dirty off-white, gray, muted blue, brown, purple, faded green",
    "limbs": "gray-purple clawed arms with dark talons",
    "motionLanguage": "heavy, twitchy, dragging, lurching"
  },
  "doNotChange": [
    "core silhouette",
    "eye color",
    "hooded sheet face",
    "low crawling body posture",
    "dirty mixed-laundry material identity"
  ],
  "allowedVariations": [
    "pose",
    "cloth twitching",
    "attack extension",
    "damage state",
    "lighting intensity",
    "minor cloth arrangement changes that preserve silhouette"
  ],
  "notes": "This is the primary Level 01 enemy. Do not redesign during implementation phases."
}
```

---

## 5. Folder Structure

Keep source art, approved references, and runtime exports separate.

```text
art/
  source/
    enemies/
    characters/
    rooms/
    props/
    ui/
  approved_contact_sheets/
  style_refs/
  paintovers/

assets/
  reference/
    prototype_sprites/
    concept_drawings/
    pileup_reference_contact_sheet.png
  production_targets/

public/assets/
  runtime/
  spritesheets/
  atlases/
  audio/
  backgrounds/
  enemies/
  characters/
  rooms/
  props/
  ui/
  fx/

data/assets/
  asset_registry.json
  approved_assets.json
  asset_lock_rules.json
  asset_generation_manifest.json
  export_manifest.json
```

Rules:

- `art/source/` contains editable art source files and high-resolution masters.
- `assets/reference/` contains concept references and prototype art.
- `public/assets/` contains game-ready exports consumed by Phaser.
- Runtime exports should be replaceable without changing game logic.
- Code should reference stable `assetId` values through manifests, not random filenames.
- Candidate and generated source files should remain outside approved/runtime folders until review passes.
- Approved contact sheets are references, not sprite atlases. Runtime atlases belong under `public/assets/atlases/` or the matching runtime category.

Canonical IDs for new art metadata and prompts:

```text
character.player_child
enemy.laundry_monster
enemy.socklings
enemy.drawer_mimic
enemy.hanging_coat_stalker
enemy.dish_crawler
boss.door_hoard
room.level01_bedroom
ui.hud_core
vfx.flashlight_cone
```

Existing gameplay keys such as `laundry_monster`, `laundry_pile_monster`, `sock_goblin`, `hanger_stalker`, and `door_hoard` are aliases until code/data migration. Do not introduce new aliases during asset generation.

---

## 6. Phaser Editor Boundary

Phaser Editor may be used to arrange, configure, and preview approved assets. It is not the source of truth for final artwork.

Editable/configurable in Phaser Editor:

```text
room layout
object placement
spawn points
search-node positions
parallax layer positions
prefabs
collision zones
physics bodies
hitboxes
interaction zones
animation assignments
lighting volumes
foreground occlusion regions
```

Do not use Phaser Editor as the primary tool for:

```text
painting final sprites
redesigning characters
changing color language
editing final background art
changing UI illustration style
replacing approved designs
```

If visual placement reveals that an asset needs modification, create a new art task and export a revised version through the asset pipeline.

---

## 7. Art Direction Locks

PILEUP’s visual identity is:

```text
hand-drawn 2D / 2.5D domestic survival horror
layered side-view house dioramas
relatable family clutter becoming dangerous
strong foreground/background parallax depth
warm domestic details corrupted by night lighting
readable silhouettes over excessive rendering detail
scary, slightly uncanny, not photorealistic
```

Do not drift into:

```text
full 3D realism
flat mobile-cartoon cuteness
generic haunted mansion art
random fantasy monsters
sci-fi horror
overly clean vector art
busy painterly images that do not read at gameplay size
```

The horror should come from familiar household spaces turning against the player.

---

## 8. Asset Categories and Quality Targets

### 8.1 Player Character

Required animation families:

```text
idle
walk
run
crouch
search
flashlight aim
melee swing / shove
hurt
grabbed
recover
escape / door unlock
```

Quality requirements:

- Source frame target: 2048 x 2048 preferred.
- Runtime frame tiers: 512, 768, 1024.
- Must read clearly at phone scale.
- Must support flashlight orientation without changing character identity.
- Must have consistent pivots across all frames.

### 8.2 Primary Enemy: Laundry Monster

Required animation families:

```text
dormant pile
idle twitch
stalk
emerge from background
emerge from foreground
crawl
telegraph
attack
light freeze
light enrage
hurt / stunned
retreat
death / collapse into laundry
```

Quality requirements:

- Source frame target: 2048 x 2048 minimum, 4096 x 4096 preferred for boss-scale variants.
- Runtime frame tiers: 512, 768, 1024.
- True RGBA transparency.
- No baked checkerboard.
- Consistent low crawling silhouette.
- Stable anchor/pivot at floor contact center.
- Attack frames must preserve identity and not become a different creature.

### 8.3 Room Segment Art

Each room segment should be exported in layers.

```text
far_background
background_clutter
main_floor
foreground_clutter
light_fx
occlusion_masks
collision_guides
```

Quality requirements:

- Preferred source segment: 5120 x 2880 or larger.
- Runtime export tiers: 1920 x 1080, 2560 x 1440, 3840 x 2160.
- Must include extra bleed beyond visible camera bounds.
- Foreground and background layers must support parallax without exposing empty edges.
- Important interaction objects must remain readable on phone.
- Do not stretch a room to make it longer. Add room segments instead.

### 8.4 Props and Search Piles

Prop classes:

```text
DecorativeProp
SearchablePile
StorageContainer
NoiseTrap
ForegroundOccluder
BackgroundThreatAnchor
LightReactiveProp
EnemyEmergencePoint
DoorTransition
BossLockPoint
```

Quality requirements:

- Props must have a clear gameplay classification.
- Searchable objects must be visually readable without looking like UI buttons.
- Dangerous piles must have subtle tells, not obvious fake-game objects.
- Foreground props may occlude the player but must not hide required gameplay feedback unfairly.

### 8.5 UI Assets

Quality requirements:

- UI icon source target: 1024 x 1024 preferred.
- Runtime tiers: 128, 256, 512.
- HUD panels should support 9-slice scaling where possible.
- UI must remain readable at phone landscape and 4K desktop.
- Icons must remain consistent in weight, distress level, color family, and silhouette clarity.

---

## 9. Sprite Sheet Production Rules

All production sprite sheets must include:

```text
true transparent alpha
consistent cell size
consistent character scale
consistent pivot point
no baked background
no labels/text in image
no extra objects outside frames
metadata file describing animations
hitbox/hurtbox data where relevant
```

Recommended sprite sheet naming:

```text
{category}_{assetName}_{animation}_{frameSize}_v{version}.png
```

Example:

```text
enemy_laundry_monster_attack_1024_v1.0.0.png
enemy_laundry_monster_attack_1024_v1.0.0.json
```

Metadata example:

```json
{
  "assetId": "enemy.laundry_monster",
  "animation": "attack",
  "artVersion": "1.0.0",
  "frameWidth": 1024,
  "frameHeight": 1024,
  "columns": 4,
  "rows": 2,
  "frameCount": 8,
  "fps": 10,
  "loop": false,
  "pivot": { "x": 512, "y": 840 },
  "hitboxes": [
    { "frame": 4, "x": 220, "y": 410, "w": 520, "h": 320, "type": "damage" }
  ],
  "notes": "Attack frames preserve Laundry Monster v1.0 locked identity."
}
```

---

## 10. AI Generation Protocol

Every generation prompt must include:

```text
assetId
asset lifecycle state
approved version reference
locked identity traits
allowed variations
do-not-change list
target use case
required export format
camera/perspective
resolution target
background/alpha requirements
animation frame count, if applicable
```

Every generation batch must also be recorded in:

```text
data/assets/asset_generation_manifest.json
```

Record the prompt, negative prompt, source references, tool/model, seed when available, output files, review status, and QA notes. Generated outputs begin as `candidate` or `needs_review`; promotion happens only after review.

Prompt template:

```text
Create [asset output] for PILEUP using approved [assetId] v[version].
Preserve the locked identity: [locked identity traits].
Do not change: [do-not-change list].
Allowed variation: [pose/motion/context only].
Use the PILEUP art direction: hand-drawn 2D/2.5D domestic survival horror, layered side-view house diorama, familiar clutter turned threatening, readable silhouettes.
Output target: [sprite sheet / room layer / prop / UI icon].
Technical requirements: [RGBA transparency / grid / frame size / layer size / no text / no baked background].
```

Bad prompt pattern:

```text
Make a scary new monster for the game.
```

Good prompt pattern:

```text
Create an 8-frame hurt animation sprite sheet for enemy.laundry_monster v1.0.0. Preserve the bulky low crawling laundry mound silhouette, stained off-white hooded sheet face, orange-yellow eyes, dirty muted fabric palette, and gray-purple clawed limbs. Do not redesign the creature. Show the same monster reacting to a flashlight stun and collapsing slightly back into the laundry pile. Use a 4x2 grid, true transparent background, consistent scale, no text, no extra objects, production-ready sprite layout.
```

---

## 11. Review Checklist Before Approval

A generated asset is not approved until all checks pass.

### Identity

- Does it match the approved asset identity?
- Does the silhouette still read at gameplay size?
- Did the design drift into another style or genre?
- Are key locked traits preserved?

### Technical

- Is the background truly transparent where required?
- Is the resolution high enough for runtime tiers?
- Are frames evenly sized and aligned?
- Are pivots stable?
- Are there visible artifacts, halos, text, watermarks, baked checkerboards, or random objects?
- Can the asset be sliced predictably?

### Gameplay

- Does the pose communicate the intended state?
- Does the attack/hurt/search feedback read quickly?
- Will it work on phone scale?
- Does it support foreground/main/background layer behavior where needed?
- Does it avoid hiding critical gameplay information?

### Consistency

- Does it match the current room, enemy, and UI style?
- Does it use the approved palette and lighting logic?
- Does it look like it belongs in PILEUP rather than another game?

Only after passing review should the asset move from `candidate` to `approved`.

---

## 12. Runtime Export Validation

Before a runtime asset is committed, validate:

```text
file naming follows convention
asset registry updated
manifest references updated
metadata JSON present
source reference retained
runtime tier generated
alpha transparency checked
frame dimensions checked
pivot checked
hitboxes/hurtboxes checked
Phaser loader key assigned
no code references raw temporary filenames
```

Suggested validation fields:

```json
{
  "assetId": "enemy.laundry_monster",
  "exportStatus": "validated",
  "alpha": true,
  "bakedCheckerboard": false,
  "frameAlignment": "pass",
  "pivotConsistency": "pass",
  "runtimeTiers": [512, 768, 1024],
  "metadataPresent": true,
  "manifestUpdated": true
}
```

---

## 13. Versioning Rules

Use semantic art versions.

```text
1.0.0 = approved locked identity
1.0.1 = technical cleanup, no visible design change
1.1.0 = new animation or approved minor visual extension
2.0.0 = major redesign requiring explicit approval
```

Allowed without new design approval:

```text
alpha cleanup
sprite slicing correction
pivot correction
export tier generation
minor artifact cleanup
hitbox metadata updates
```

Requires approval:

```text
new silhouette
new palette
new costume/outfit
new monster face
new body proportions
new room style direction
new UI style direction
major lighting/art-style shift
```

---

## 14. Room Style Consistency Across Future Houses

Future levels may include different houses, neighborhoods, income levels, cultures, decades, and design styles.

The mechanics remain consistent:

```text
search clutter
manage light and darkness
move through layered side-view rooms
deal with foreground/background threats
find required items
escape through a boss pressure sequence
```

The art may vary by home, but the PILEUP style remains consistent.

Allowed future house variation:

```text
modern home
rustic home
older suburban home
apartment
small rental
wealthy house
multigenerational family home
1980s/1990s/2000s/modern decade styling
culture-specific household details
regional design details
```

Not allowed:

```text
turning future homes into unrelated genres
changing the camera system per house
changing the UI art language per house
making enemies look like they belong to separate franchises
removing the domestic realism that grounds the horror
```

Every future house should reinforce the theme:

```text
Everyone deals with the mess they avoid.
```

---

## 15. Implementation Instruction for Codex

When working on gameplay phases, Codex must not regenerate or replace art unless the task explicitly says it is an asset-generation task.

During gameplay implementation:

```text
Use existing approved assets.
Use placeholders only when approved assets do not exist.
Reference assets through manifest keys.
Do not rename runtime assets casually.
Do not create new art styles to solve code problems.
Do not replace locked assets with newly generated alternatives.
```

During asset-generation phases:

```text
Read this document first.
Read the asset registry.
Read the art bible.
Use approved references.
Generate candidates.
Save candidates separately.
Do not overwrite approved files.
Run review checklist.
Only promote after approval.
```

---

## 16. Minimum Definition of Done for New Assets

A new asset is done only when:

```text
1. It has a stable assetId.
2. It has source/reference files stored in the correct folder.
3. It has a lifecycle state.
4. It passes identity review.
5. It passes technical review.
6. It has runtime exports at required tiers.
7. It has metadata JSON when needed.
8. It is registered in asset_registry.json.
9. It is referenced through the manifest.
10. It has not overwritten an approved asset without version approval.
```

If any item fails, the asset remains a candidate.

---

## 17. Practical Rule

Do not chase better-looking one-off generations.

PILEUP will look professional when all assets feel like they belong to the same game. Consistency beats novelty. A slightly less flashy asset that matches the approved style is better than a beautiful asset that creates drift.
