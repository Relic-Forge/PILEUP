# PILEUP - Level Length and Parallax Extension Spec

## Purpose

The current visual direction depends on rooms feeling like lived-in spaces, not quick static backdrops. A room should have enough horizontal distance, clutter density, foreground occlusion, and background detail to support exploration, tension, search decisions, enemy stalking, and replay variation.

The level system should make room length easy to tune without repainting the entire game from scratch.

## Core rule

A room is not one background image.

A room is a sequence of **room segments** placed on a 2.5D floor plane. Each segment contains layered art, search nodes, clutter zones, spawn points, light zones, and parallax objects.

This allows the designer to lengthen or shorten a level by adding, removing, or resizing segments.

```text
Room = Segment A + Segment B + Segment C + Exit Segment
```

For the MVP, rooms should feel longer than one screen but not huge.

Recommended target:

```text
Viewport: 1920 x 1080
Small room: 1.5-2.0 screens wide
Medium room: 2.0-3.0 screens wide
Large/finale room: 3.0-4.0 screens wide
```

The player should not cross most rooms in only a few seconds unless sprinting through danger.

## Gameplay distance targets

Use abstract gameplay units so art and mechanics stay scalable.

```text
1 screen width = 100 gameplay units
Player walk speed = 12-16 units/sec
Player sprint speed = 22-26 units/sec
```

Suggested room widths:

| Room Type | Width in Screens | Width in Units | Expected Walk Time |
|---|---:|---:|---:|
| Small connector | 1.5 | 150 | 10-13 sec |
| Standard room | 2.25 | 225 | 15-19 sec |
| Search-heavy room | 2.75 | 275 | 18-23 sec |
| Finale room | 3.5 | 350 | 23-30 sec |

These are traversal-only estimates. Searching, hiding, combat, and backtracking should make the real room time longer.

## MVP Level 01 target length

Level 01 should use 5 connected rooms. The full house should feel like a short but complete survival run.

```text
Bedroom: 2.25 screens
Hallway: 1.75 screens
Bathroom: 1.5 screens
Kitchen: 2.75 screens
Living Room / Front Door: 3.5 screens
```

Total horizontal distance:

```text
11.75 screen widths
```

This creates enough room to support a 8-12 minute first-run target with searching, pressure, and boss escalation.

## Room segment model

Each room should be built from named segments.

Example:

```json
{
  "room_id": "bedroom",
  "width_screens": 2.25,
  "segments": [
    {
      "id": "bed_left_start",
      "width_screens": 0.75,
      "purpose": "safe_start_and_tutorial",
      "search_nodes": ["backpack", "dresser_drawer"],
      "foreground_sets": ["laundry_basket_left", "hanging_hoodie"],
      "background_sets": ["family_photos", "bookshelf", "kid_drawings"],
      "enemy_spawns": []
    },
    {
      "id": "bed_center_mess",
      "width_screens": 0.85,
      "purpose": "first_search_pressure",
      "search_nodes": ["laundry_pile", "toy_bin"],
      "foreground_sets": ["toy_bin_occluder"],
      "background_sets": ["bed", "under_bed_shadow"],
      "enemy_spawns": ["socklings", "laundry_pile_monster_hint"]
    },
    {
      "id": "bed_right_exit",
      "width_screens": 0.65,
      "purpose": "door_to_hallway",
      "search_nodes": ["under_bed"],
      "foreground_sets": ["bed_frame_edge"],
      "background_sets": ["doorway", "closet_shadow"],
      "enemy_spawns": ["hanging_coat_stalker_hint"]
    }
  ]
}
```

## Segment types

Use repeatable segment roles to keep level building fast.

### Safe Start Segment
- Low enemy pressure.
- Teaches movement, flashlight, and search.
- Warm family details still visible.
- Usually 0.5-1.0 screen wide.

### Search Pressure Segment
- Contains 1-3 clutter search nodes.
- Has background/foreground hiding spots.
- Noise and flashlight choices matter.
- Usually 0.75-1.25 screens wide.

### Ambush Segment
- Contains suspicious foreground/background clutter.
- Enemy can stalk before entering main plane.
- Needs clear telegraphing.
- Usually 0.5-1.0 screen wide.

### Breather Segment
- Lower density area after danger.
- Lets the player reorient, reload flashlight, drop items, or choose route.
- Usually 0.5-0.75 screen wide.

### Exit Gate Segment
- Connects room to next room.
- May have a locked door, stuck door, barricade, or noisy interaction.
- Usually 0.5-1.0 screen wide.

### Finale Segment
- Larger combat/search area.
- Boss mechanics and escape interaction.
- Should be 1.0-2.0 screens by itself.

## Background and foreground art requirements

Each room segment must include enough detail to sell the space.

### Far background
- Wall material/color.
- Family photos, drawings, shelves, windows, doors.
- Cultural/home-style details.
- Low movement, least parallax.

### Background clutter lane
- Clutter piles against walls, under furniture, near counters.
- Searchable and non-searchable visual clutter.
- Enemy hint zones: eyes, subtle motion, cloth twitching, shadow shapes.
- Medium parallax.

### Main floor plane
- Walkable floor space.
- Search nodes within reach.
- Collision objects.
- Player/enemy combat path.
- This layer determines gameplay length.

### Foreground clutter
- Large overlapping elements: baskets, couch edge, bed frame, table legs, hanging clothes.
- Must create depth without hiding unavoidable damage.
- Foreground enemies can peek, grab, or lunge from here.
- Fastest parallax.

### FX/light layer
- Flashlight cone.
- Dust/lint particles.
- Eye glows.
- Room light pools.
- Shadow masks.

## Modular extension rule

To make a level longer, add one or more of these:

1. Add a Search Pressure Segment.
2. Add a Breather Segment between high-pressure areas.
3. Increase a segment's width from 0.75 to 1.25 screens.
4. Add optional alcove-style depth pockets where foreground/background enemies stalk.
5. Add 1-2 more clutter nodes and one extra hiding/stalking zone.

To make a level shorter:

1. Remove optional Breather Segments.
2. Reduce standard rooms to 1.5-2.0 screens.
3. Lower search node count.
4. Keep exits and boss trigger fixed.
5. Never remove tutorial-critical or key-critical nodes.

## Art production strategy

Do not require one giant unique painting for every possible room length.

Use a hybrid:

```text
Hero background panels + modular clutter overlays + foreground occluders + lighting masks
```

Each room can have:

- 2-4 unique hero background panels.
- 6-12 modular clutter overlays.
- 4-8 foreground occlusion pieces.
- 3-6 suspicious/animated clutter variants.
- 1 collision/interaction map.

This keeps rooms expandable while preserving a hand-painted premium look.

## Source and runtime resolution

Production art should support 1080p gameplay and mild camera zoom.

### Per room segment source targets

For a 1920x1080 game viewport:

```text
Source art per 1-screen segment: 2560 x 1440 minimum
Preferred hero art: 3840 x 2160
Runtime export: engine-dependent, usually 1920x1080-equivalent slices or packed atlases
```

### Long room source approach

Avoid single huge 10,000px-wide files when possible. Instead use segment exports:

```text
room_bedroom_segment_01_far_bg.png
room_bedroom_segment_01_bg_clutter.png
room_bedroom_segment_01_main_floor.png
room_bedroom_segment_01_fg_clutter.png
room_bedroom_segment_01_light_mask.png
```

Then stitch segments in-engine using room JSON.

### Layer scale minimums

```text
Far BG: 2560x1440 per screen segment minimum
BG clutter: 2560x1440 per screen segment minimum, alpha where needed
Main floor: 2560x720 or 2560x1080 per screen segment depending camera angle
FG clutter: 2560x1440 per screen segment minimum, alpha required
Light masks: 1920x1080 or generated dynamically
```

For boss/finale rooms, prefer 3840x2160 source panels because the camera may zoom.

## Designer-tunable fields

Every room definition should include:

```json
{
  "width_screens": 2.25,
  "target_traversal_seconds_walk": 17,
  "target_search_time_seconds": 75,
  "clutter_density": "medium_high",
  "foreground_occlusion_density": "medium",
  "background_threat_density": "medium",
  "segment_count": 3,
  "min_search_nodes": 4,
  "max_search_nodes": 6,
  "optional_segments_enabled": true
}
```

This lets the same room become shorter, longer, easier, or harder without changing the core system.

## Randomness without breaking level design

Randomize inside fixed segments, not the whole room structure.

Fixed:
- Room order.
- Exit locations.
- Boss location.
- Required tutorial moments.
- Minimum item availability.

Randomized:
- Which clutter nodes contain useful items.
- Which clutter nodes are ambushes.
- Which background/foreground threat hints activate.
- Optional junk loot.
- Secondary path blockers.
- Some decoration variants.

This keeps the level replayable while still allowing strong authored art and pacing.

## Foreground/background enemy integration

Enemies should not simply spawn on top of the player. They should have visible layer states.

```text
Dormant in clutter -> hinted movement -> visible stalk -> layer transition -> attack -> recovery/retreat
```

Example:

```json
{
  "enemy_id": "hanging_coat_stalker",
  "native_layer": "foreground",
  "dormant_asset": "fg_hanging_coat_suspicious_01",
  "hint_triggers": ["flashlight_sweep", "noise_high", "mess_level_50"],
  "transition_animation": "foreground_drop_to_main",
  "attack_plane": "main_floor",
  "recovery_behavior": "retreat_to_background_or_die"
}
```

## Acceptance criteria

The level-length system is working when:

- A designer can make a room 30-50% longer by adding segments in JSON.
- Art can support that longer room without obvious stretching.
- Parallax still works across the full room width.
- Search nodes remain distributed across the space.
- Enemies can stalk from background/foreground at multiple points.
- The player does not reach the next room too quickly during normal walking.
- Foreground clutter sells depth without creating unfair visibility problems.
- The final escape room supports a longer boss sequence without feeling like a single static screen.

## MVP recommendation

For v1, build the bedroom first as a 2.25-screen room with three segments. Prove that:

1. The player can move left/right and up/down on the main floor plane.
2. The camera scrolls across more than one screen.
3. Foreground and background layers parallax at different rates.
4. A laundry monster can emerge from background/main clutter.
5. A foreground threat can hint before attacking.
6. Search nodes are spread across the room so movement matters.

After that works, extend the same segment model to hallway, bathroom, kitchen, and living room/front door.
