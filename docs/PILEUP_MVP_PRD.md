# PILEUP - MVP / Product Requirements Document

**Title:** PILEUP  
**Tagline:** "I'll deal with it tomorrow."  
**Alt line:** Famous last words.  
**Pitch line:** Search the clutter, find the key, and survive what you left behind.  
**Genre:** 2.5D side-scrolling survival horror with replayable loot/search tension.  
**MVP target:** One complete house level, one night, one escape route, one boss-stage escape sequence.

---

## 1. Product thesis

PILEUP is a hand-drawn 2.5D survival horror game about domestic avoidance turned literal. The player moves through a lived-in house at night, searching clutter for five hidden objects they have been meaning to find all week. One of those objects is the key needed to escape. The house is not a flat hallway: it is a layered parallax space with foreground, main play plane, and background depth. The clutter is both set dressing and threat source.

The core feeling is not heroic power. It is scraping by. The player is low on light, low on stamina, unsure which piles are safe, and forced to choose between hiding, searching, carrying too much, or making a desperate run for the door.

The theme is simple: if you leave problems in the dark long enough, they start moving.

---

## 2. Product pillars

### Relatable dread
The horror comes from the familiar: laundry, dishes, backpacks, toy bins, junk drawers, cords, mail piles, trash bags, shoes by the door. The player recognizes these spaces immediately. The nightmare feels personal because the mess belongs to someone.

### The house is a layered threat
Each room is built with visible depth: far background, background clutter lane, main gameplay plane, foreground clutter, and lighting/FX. Enemies can stalk from the foreground or background before entering the play plane. The room itself feels suspicious.

### Light is a mechanic, not just mood
The flashlight reveals, aims into depth, freezes some enemies, triggers others, exposes hidden objects, and makes the player visible. Darkness is tempting because it lets the player avoid seeing the problem, but it also lets the problem move.

### Search versus safety
Every useful item is buried in risk. Searching takes time, creates sound, and can wake or attract enemies. The player must decide whether another pile is worth the danger.

### Hoarding has consequences
Loot gives options, but too much inventory slows movement, raises noise, and increases the mess pressure. The player is tempted to hoard the way the household already did.

---

## 3. MVP scope

The MVP is a vertical slice with one complete playable level: **Level 01 - The Family House**.

### Included in MVP
- One playable character.
- One house level with 5 connected rooms.
- 2.5D movement on a floor plane: left/right movement plus limited up/down depth movement.
- Heavy parallax visual presentation.
- One complete night timer from 12:00 AM to 6:00 AM, compressed into an 8-12 minute run.
- Five hidden objective items per run.
- One required key item to escape through the front door.
- Flashlight with directional depth targeting.
- Search/loot system with noise and ambush risk.
- Hoard/burden meter tied to inventory load.
- Stamina, health, noise, mess level, and light/battery systems.
- Four standard enemy archetypes plus one boss-stage threat.
- Door escape sequence / boss stage after the key is found.
- Replayable item placement and enemy pressure variations.
- HUD, inventory hotbar, basic pause/settings, loss/win screens.

### Not included in MVP
- Multiple houses.
- Full procedural house generation.
- Online co-op.
- Crafting trees beyond simple item use.
- Narrative cutscenes beyond short intro/outro cards.
- Full meta-progression economy.
- Final production-quality full asset set for future houses.

---

## 4. Target player experience

A successful run should feel like this:

1. The player wakes up in a messy room after midnight.
2. The house is quiet, familiar, and wrong.
3. The player sees the front door objective but does not have the key.
4. They search clutter to find five hidden objects.
5. Each search risks noise, battery drain, or enemy activation.
6. Enemies emerge from foreground, background, or the main plane.
7. The flashlight becomes both comfort and liability.
8. The player finds the key but must cross the house while the mess escalates.
9. The front door becomes a boss-stage pressure event.
10. The player escapes barely, or survives until morning by scraping through the night.

The intended mood: scary, funny in premise, tense in play, and relatable enough that players recognize their own habits.

---

## 5. Core game loop

**Explore room -> inspect clutter -> manage light/noise/stamina -> search pile -> collect/drop/use item -> evade/fight/stun enemies -> move deeper through house -> find key -> escape or survive until morning.**

### Micro loop
- Move through the room.
- Aim flashlight into main plane, foreground, or background.
- Identify safe and suspicious piles.
- Search a pile by holding interact.
- React to result: item, junk, noise trap, ambush, clue, or nothing.
- Decide what to carry.
- Avoid or counter enemies.

### Run loop
- Start in bedroom.
- Find five hidden objective items.
- One is the front door key.
- Unlock route to front door.
- Survive escalating mess level.
- Complete boss-stage door escape.

### Replay loop
- Item locations shuffle within rule-safe clutter nodes.
- Enemy spawn pressure changes by seed.
- Some rooms have alternate clutter states.
- The key may appear in different rooms depending on difficulty.
- Optional items and upgrades encourage different strategies.

---

## 6. Movement and camera model

PILEUP should not use a single left/right lane. The player moves on a **2.5D floor plane**.

### Player movement
- Horizontal movement: full left/right traversal across a side-scrolling room.
- Depth movement: limited up/down movement within the main floor plane.
- Collision: furniture and clutter define walkable space.
- Combat/search interactions use proximity and facing.
- Player always remains readable; depth never becomes full 3D navigation.

### Camera
- Side-view camera with slight depth perspective.
- Room-by-room scrolling with subtle camera lead in movement direction.
- Background and foreground layers scroll at different rates.
- Foreground objects may partially occlude player/enemies for tension.
- Camera can slightly zoom and shake during ambushes or boss sequences.

### Room layers
1. **Far background:** walls, photos, drawings, shelves, windows, hallway doors.
2. **Background clutter lane:** piles near walls, closets, counters, beds, shelves.
3. **Main gameplay plane:** player movement, combat, search, primary enemies.
4. **Foreground layer:** baskets, hanging clothes, couch arms, bed frames, toy bins, chair legs.
5. **FX/light layer:** flashlight beam, dust, lint, shadows, eye glows, screen vignette.

Enemies can be assigned a native layer, then transition into the main plane for attacks.

---

## 7. Light and darkness system

The flashlight is the signature mechanic.

### Flashlight capabilities
- Illuminates the main play plane.
- Can be angled up/down to inspect foreground or background clutter.
- Reveals hidden item glints, eyes, silhouette changes, and safe search prompts.
- Freezes certain enemy types.
- Provokes or enrages certain enemy types.
- Drains battery while active.
- Increases detection by light-sensitive enemies.

### Light response enemy types
- **Freezers:** stop moving when held in light, resume in darkness.
- **Lungers:** attack when exposed to direct light for too long.
- **Shadow movers:** only move when not lit.
- **Reveal-only threats:** invisible or disguised until lit.
- **Light hunters:** track the flashlight beam and flank from foreground/background.
- **Comfort enemies:** retreat from room lights but not flashlight.

### Environmental lighting
- Light switches can temporarily stabilize a room.
- Some switches fail, flicker, or overload when mess level rises.
- Lamps and nightlights create safe pockets but can burn out.
- Darkness reduces visual stress but increases hidden movement.

### Design statement
If the lights are off, the player does not have to look at their problems. That should feel emotionally true and mechanically dangerous.

---

## 8. Search, loot, and hoard systems

Searching is the core risk action.

### Search interaction
- Player holds interact near a searchable pile.
- Progress ring fills over 1.5-4.0 seconds depending on pile size.
- Search generates noise over time.
- Player can cancel early, but may lose progress.
- Flashlight can pre-inspect a pile to reduce ambush chance.
- Some piles twitch or breathe before activation.

### Search outcomes
- Required objective item.
- Useful consumable.
- Temporary weapon.
- Junk item.
- Noise trap.
- Enemy ambush.
- Lore/object memory.
- Nothing.

### Five objective item structure
Each run selects five hidden objective items. One is always the front door key. The others can be practical, emotional, or utility-driven.

MVP objective item pool:
- Front Door Key - required to escape.
- Spare Batteries - extends flashlight survival.
- Cleaning Spray - short stun against organic/mess enemies.
- Duct Tape - repairs or reinforces one barricade/tool.
- Family Photo - calms panic/mess pressure and unlocks an upgrade token.
- Missing Wallet - optional score/reward object.
- Phone Charger - enables one emergency ping or map clue.

### Hoard / burden meter
Inventory is useful but costly.

- Light load: fast movement, quiet search, fewer options.
- Normal load: balanced.
- Hoarding load: slower movement, louder steps, slower crawl under obstacles, stronger enemy attraction.

The player must constantly ask: is this useful, or am I becoming part of the pile?

### Inventory
MVP uses a five-slot hotbar plus a small backpack.

Hotbar examples:
1. Flashlight
2. Broom / improvised weapon
3. Spray bottle
4. Key item / quest item
5. Utility / decoy

Backpack junk adds burden. The player can drop items to move faster or reduce noise.

---

## 9. Enemies and AI classes

Enemies are built from shared behavior components so future houses can reskin and extend them.

### Shared enemy components
- Native layer: foreground, background, main plane.
- Entry behavior: creep, pop-out, drop, crawl-in, burst, stalk.
- Light response: freeze, lunge, flee, reveal, ignore, hunt.
- Sound response: attracted, repelled, confused, dormant.
- Search response: ambush pile, fake safe pile, item guardian.
- Attack type: grab, swipe, swarm, block, chase, pounce.
- Telegraph: eyes glow, cloth twitch, dust burst, silhouette shift, audio cue.

### MVP enemy roster

#### Laundry Pile Monster
Large crawling heap of clothes with glowing eyes and clawed limbs. Main identity enemy.
- Native layer: main plane or background clutter.
- Light response: freezes briefly, then lunges if overexposed.
- Attack: heavy swipe/grab.
- Role: pressure enemy and mini-boss variant.

#### Socklings
Small fast swarm enemies made from socks, lint, and cloth scraps.
- Native layer: foreground and main plane.
- Light response: scatter in light.
- Attack: nibble/swarm, stamina drain.
- Role: force movement and punish slow searching.

#### Drawer Mimic
A junk drawer or toy bin that looks searchable until it snaps open.
- Native layer: background/main interactable.
- Light response: can be identified by subtle eye glint.
- Attack: bite/grab during search.
- Role: makes looting tense.

#### Hanging Coat Stalker
A silhouette hidden in foreground hanging clothes or closets.
- Native layer: foreground/background.
- Light response: only moves when not directly watched.
- Attack: lunges from screen edge into the main plane.
- Role: teaches foreground/background paranoia.

#### Dish Stack Crawler
Kitchen-specific enemy made of dirty dishes, utensils, and wet towels.
- Native layer: background counter.
- Light response: reflects light; can be stunned by spray.
- Attack: leaps from counter to main plane.
- Role: room variety.

### Boss-stage enemy: The Hoard at the Door
A mass of accumulated clutter that blocks, grabs, and collapses around the front door after the player finds the key.
- Native layer: all layers.
- Light response: segments react differently.
- Attack: foreground grab, background collapse, main lane lunge.
- Role: final exam for light, movement, inventory, and search pressure.

---

## 10. Boss-stage escape sequence

Finding the key does not end the run. It starts the finale.

### Trigger
When the player picks up the Front Door Key:
- Objective changes to GET TO THE FRONT DOOR.
- Mess level spikes.
- Lights flicker or fail.
- Previously dormant clutter nodes become active.
- The house starts blocking the shortest route.

### Door sequence
At the front door, the player must hold interact to unlock. The unlock process is split into stages so pressure can interrupt it.

Possible MVP stages:
1. Clear clutter from lock area.
2. Insert key and turn deadbolt.
3. Hold door open while The Hoard pulls back.

Each interruption loses partial progress. The player can use flashlight, broom, spray, batteries, dropped junk, and movement to survive.

### Win outcomes
- Escape before 6:00 AM.
- Survive until 6:00 AM without escaping.
- Optional ranking based on found items, burden, damage taken, and time.

---

## 11. Difficulty and pacing

The night is compressed but should feel like a rising panic curve.

| Time | Pressure | Design Intent |
|---|---|---|
| 12:00 AM | Quiet house | Learn controls, search first pile |
| 1:00 AM | Small movement | Introduce Socklings and pile twitches |
| 2:00 AM | Layered threats | Background/foreground enemies begin stalking |
| 3:00 AM | Active hunt | Laundry monster patrols and searches react more loudly |
| 4:00 AM | Scarcity | Battery and stamina pressure peak |
| 5:00 AM | House fights back | More blocked paths, faster enemy transitions |
| Key Found | Escape panic | Boss-stage door event begins |
| 6:00 AM | Dawn | Survive condition resolves if not escaped |

Difficulty should not only mean more enemies. It should mean more difficult decisions.

---

## 12. Randomness model

PILEUP needs replayability without becoming incoherent.

### Fixed elements
- House layout.
- Room order and core exits.
- Boss door location.
- Intro objective.
- Minimum enemy tutorials.
- Critical story beats.

### Randomized elements
- Five objective item locations.
- Which non-key objective items appear.
- Some clutter states and blocked paths.
- Patrol timing.
- Ambush piles.
- Battery/item availability.
- Optional room modifiers.

### Rule-safe randomization
The key cannot spawn behind a lock that requires the key. Items needed for first-run tutorial moments appear within bounded locations. Each room has a maximum number of active threats at once. Randomness should create tension, not unfairness.

---

## 13. Upgrade and progression systems

MVP should keep progression simple.

### In-run upgrades
- Fresh batteries.
- Stronger spray bottle.
- Better broom durability.
- Temporary light boost from lamp/nightlight.
- Quieter search from gloves.
- Extra pocket from backpack.

### Post-run unlocks for later versions
Use the theme of better habits without becoming preachy.

Possible unlock categories:
- Better flashlight lens.
- One extra hotbar slot.
- Quieter rummaging.
- Faster lock interaction.
- Lower starting mess level.
- Better clue detection.
- Stronger panic recovery.

Upgrade language should feel grounded: preparedness, pride in space, knowing where things are. Avoid moralizing the player. Let the game systems make the point.

---

## 14. Art direction

PILEUP should look like a beautiful hand-drawn domestic nightmare.

### Visual style
- 2.5D hand-painted rooms.
- Layered parallax with readable gameplay lanes.
- Warm domestic details contrasted with cold night shadows.
- Slightly exaggerated silhouettes, not pure realism.
- Objects should feel specific and lived-in.
- Horror should come from familiar clutter becoming wrong.

### Environmental storytelling
Each room needs evidence of life:
- Family photos.
- Kids' drawings.
- Half-finished chores.
- School bags.
- Work items.
- Snack wrappers.
- Books.
- Shoes.
- Toys.
- Laundry and dishes.

The home should not feel like a gross-out set. It should feel like people live there, got tired, and put things off.

### Clean versus messy contrast
Future levels can show different homes, incomes, cultures, decades, and design styles. The mechanics remain consistent, while the visual language changes.

The theme is not that one kind of family is messy. The point is broader: everyone deals with avoidance, clutter, pressure, and the cost of not maintaining their space.

---

## 15. Asset production system

All assets must be built to a consistent production standard so the game can scale beyond one house.

### Base runtime target
- Game design canvas: 1920 x 1080.
- Art source target: 2x to 4x runtime resolution.
- Export format: PNG for sprites and layered backgrounds; SVG for select UI only if clean.
- Sprite transparency: true RGBA alpha. No fake checkerboard.
- Naming: lowercase_snake_case.

### Sprite sheet standard
For standard enemies:
- Minimum runtime frame: 512 x 512.
- Preferred source frame: 1024 x 1024.
- MVP sheet layout: 4 columns x 2 rows for 8-frame animations.
- Runtime sheet: 2048 x 1024 for 512 frames.
- High-quality/source sheet: 4096 x 2048 for 1024 frames.
- Each sheet must include JSON metadata.

For large enemies/bosses:
- Minimum runtime frame: 1024 x 1024.
- Preferred source frame: 2048 x 2048.
- Sheet size depends on frame count; keep under engine texture limits.

For player:
- Minimum runtime frame: 512 x 512.
- Preferred source frame: 768-1024 x 768-1024.
- More directional/aim variants needed due to flashlight depth targeting.

### Background layer standard
Each room should be built in separated layers:
- far_bg: 3840 x 2160 source minimum.
- bg_clutter: 3840 x 2160 source minimum.
- main_floor: 4096 x 1024 source strip or modular tiles.
- fg_clutter: 3840 x 2160 source minimum, with alpha.
- light_masks: 1920 x 1080 runtime masks, scalable.
- collision/interaction map: JSON or tile metadata.

### UI standard
- HUD source designed at 1920 x 1080 and tested at 1280 x 720.
- Icons source: 512 x 512, export 256 and 128.
- Text must remain readable at 720p.
- Use clear silhouettes for inventory icons.

### Animation minimums
Player MVP:
- idle: 8 frames
- walk/run: 8-12 frames
- depth step up/down: 6-8 frames
- flashlight aim forward/up/down: 3-5 poses or blendable overlays
- search/rummage: 8-12 frames
- attack with broom: 6-8 frames
- hurt: 4-6 frames
- death/fail: 8-12 frames
- unlock door: 8-12 frames

Enemy MVP per archetype:
- dormant/disguised: 1-3 poses
- awaken: 6-8 frames
- idle/stalk: 8 frames
- move: 8-12 frames
- attack/lunge: 8 frames
- hit/stun: 4-6 frames
- retreat/death: 8 frames
- layer transition: 6-8 frames

---

## 16. Technical/data architecture

The system should be data-driven so future houses can reuse mechanics with different art.

### Core entities
- PlayerController
- RoomScene
- ParallaxLayer
- SearchablePile
- InventoryItem
- EnemyArchetype
- LightResponder
- NoiseEmitter
- HoardMeter
- ObjectiveManager
- EncounterDirector
- DoorEscapeSequence

### Data files
- asset_manifest.json
- enemy_archetypes.json
- animation_specs.json
- level_01_family_house.json
- item_pool.json
- room_theme_manifest.json

### Example enemy configuration
```json
{
  "id": "laundry_pile_monster",
  "nativeLayer": "main_or_background",
  "lightResponse": "freeze_then_lunge",
  "soundResponse": "attracted",
  "attackType": "heavy_swipe_grab",
  "animations": ["dormant", "awaken", "crawl", "attack", "stunned", "retreat"]
}
```

---

## 17. Scalable house system

Future levels should feel different without requiring new mechanics from scratch.

### House theme variables
- Architecture style.
- Income level and density.
- Family structure.
- Culture and domestic details.
- Decade/era.
- Cleanliness baseline.
- Room types.
- Common clutter materials.
- Lighting style.
- Enemy reskins and variants.

### Future house examples
- Modern smart home: cords, devices, glass surfaces, LED light failures.
- Rustic cabin: tools, wood piles, blankets, lanterns, mudroom clutter.
- Quaint older home: heirlooms, doilies, boxes, old portraits, basement storage.
- Apartment: tighter rooms, shared walls, neighbor noise, compact clutter.
- 70s split-level: shag carpet, wood paneling, old toys, basement rec room.
- High-income minimalist house: hidden storage, designer mess, cold lighting, status anxiety.
- Multicultural family homes: distinct domestic objects, food, textiles, generational details.

The game should treat these homes with respect. The horror comes from avoidance and pressure, not from mocking cultures or income levels.

---

## 18. MVP asset list

### Characters
- Player child/young teen.
- Laundry Pile Monster.
- Socklings.
- Drawer Mimic.
- Hanging Coat Stalker.
- Dish Stack Crawler.
- Door Boss / The Hoard at the Door.

### Rooms
- Bedroom.
- Hallway.
- Bathroom.
- Kitchen.
- Living Room / Front Door area.

### Items
- Flashlight.
- Broom.
- Spray bottle.
- Batteries.
- Front door key.
- Duct tape.
- Family photo.
- Phone charger.
- Noise decoy toy.
- Backpack / extra pocket.

### UI
- Health bar.
- Stamina bar.
- Battery indicator.
- Mess level meter.
- Noise indicator.
- Objective panel.
- Hotbar.
- Search progress ring.
- Hold-to-unlock meter.
- Pause/settings.
- Win/loss screens.

### VFX
- Flashlight cone.
- Dust/lint particles.
- Eye glow.
- Pile twitch.
- Search rustle.
- Stun burst.
- Shadow pass.
- Screen vignette.
- Door boss clutter surge.

### Audio
- Room tone.
- Creaks.
- Cloth shifting.
- Search rummage.
- Battery flicker.
- Enemy whispers/rustle.
- Foreground lunge whoosh.
- UI feedback.
- Door unlocking tension.
- Dawn release cue.

---

## 19. Current prototype visual references

The package includes four generated prototype images:

- `laundry_monster_idle_sheet_proto_1774x887_rgb.png`
- `laundry_monster_attack_sheet_proto_1774x887_rgb.png`
- `gameplay_ui_mockup_proto_1672x941_rgb.png`
- `parallax_room_mockup_proto_1672x941_rgb.png`

These are strong direction references, not final game-ready production exports. They are RGB images with prototype composition. Final sprite assets need true alpha transparency, aligned frames, consistent pivots, power-of-two sheet dimensions where useful, and separate source art files.

---

## 20. MVP acceptance criteria

The MVP is successful when a player can:

- Start a run in the bedroom.
- Move left/right and up/down on a readable 2.5D floor plane.
- Use flashlight to inspect main, foreground, and background threats.
- Search clutter piles and discover randomized items.
- Experience at least four enemy behaviors.
- Manage health, stamina, battery, noise, and burden.
- Find five objective items, including the front door key.
- Trigger and complete the door boss sequence.
- Escape or survive until morning.
- Replay with a meaningfully different item/threat layout.

The MVP should be scary enough to create tension, readable enough to feel fair, and funny/relatable enough to make players say, "yeah, I have that pile too."
