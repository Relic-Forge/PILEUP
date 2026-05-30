# PILEUP Build Spec v2.1 — Phaser 4 + TypeScript

**Title:** PILEUP  
**Tagline:** “I’ll deal with it tomorrow.”  
**Alt line:** Famous last words.  
**Pitch line:** Search the clutter, find the key, and survive what you left behind.

This document is the build handoff spec. It converts the PRD/art package into an execution plan for Codex or another implementation agent.

The first production target is a **web-first Phaser 4 + TypeScript + Vite build**. The codebase must remain engine-portable by keeping game rules, level data, enemy behavior, item definitions, and UI layout tokens outside Phaser-specific files wherever practical.

---

## 1. Hard decisions locked for v1

### Engine and language

- Runtime: **Phaser 4.x**.
- Language: **TypeScript**.
- Bundler/dev server: **Vite**.
- Primary output: browser game playable on desktop and phone landscape.
- Later production path: possible migration to Godot/Unity/custom engine if the prototype proves fun.

### Why Phaser 4 for this build

PILEUP is a 2D/2.5D side-scrolling survival horror game with layered parallax, sprite animation, JSON-driven levels, UI overlays, and web/mobile browser targets. Phaser is a browser-first 2D framework, so it is a clean fit for the first playable.

### Important Phaser 4 rules

- Use official Phaser 4 docs/API as the source of truth.
- Do **not** use Phaser 3-only plugins unless verified against Phaser 4.
- Prefer TypeScript interfaces around all game data.
- Keep Phaser-specific code behind scene/systems adapters so the game logic can move later.
- Build with placeholder art first; replace with production assets later.

---

## 2. MVP target

The v1 build is **one complete level** in one family house.

The level must include:

- Main menu.
- One playable house level made from connected room segments.
- 2.5D side-scrolling movement across a floor plane, not a single horizontal lane.
- Player movement left/right and up/down within the walkable floor plane.
- Heavy parallax layers: foreground, main lane, background, far background, FX/light.
- Flashlight system that can influence foreground, main lane, and background threats.
- Search/loot system with clutter piles.
- Five hidden objective items, including the key.
- Randomized search contents with fairness constraints.
- Inventory/hotbar.
- Health, stamina, mess level, clock/objective UI.
- At least three enemy behavior classes in the full v1 level.
- Laundry Monster as the main showcase enemy.
- Boss/escape sequence at the front door.
- Win/loss states.
- Desktop, ultrawide, and phone landscape scaling.

---

## 3. First playable scope

Do not attempt the full level first. Build the smallest complete loop.

### First playable must include

- One room segment.
- Temporary graybox background/foreground layers.
- Player capsule/sprite placeholder.
- One searchable clutter pile.
- One laundry monster placeholder/sprite.
- One key item.
- One exit door.
- Health/stamina/mess/objective HUD.
- Flashlight that can aim at background/main/foreground.
- One win condition: find key, reach door, hold interact to unlock.
- One lose condition: health reaches zero or time/mess condition overwhelms player.

### First playable must not include

- Multiple houses.
- Full art polish.
- All enemies.
- Full item pool.
- Meta progression.
- Complex crafting.
- Story/cutscenes.
- Online features.

---

## 4. Game pillars

### Pillar 1 — Familiar mess becomes horror

The player is not in a gothic castle. The player is in a lived-in home where laundry, toys, dishes, backpacks, and forgotten chores have gained hostile life.

### Pillar 2 — Light is attention

If the lights are off, the player does not have to look at the problem. But the problem keeps moving. The flashlight is not just visibility; it is the player choosing what to face.

### Pillar 3 — Search is risk

The player needs useful items hidden in clutter, but searching takes time, makes noise, and may wake the mess.

### Pillar 4 — Hoarding helps and hurts

Looting gives options, but carrying too much should create pressure. The player is tempted to repeat the behavior that created the nightmare.

### Pillar 5 — Escape is earned, not guaranteed

Finding the key starts the final danger phase. The player still has to reach the door and survive the unlock sequence.

---

## 5. Runtime architecture

### Required project structure

```text
pileup/
  package.json
  index.html
  vite.config.ts
  tsconfig.json
  public/
    assets/
      sprites/
      backgrounds/
      foregrounds/
      ui/
      audio/
      data/
  src/
    main.ts
    config/
      gameConfig.ts
      buildFlags.ts
    scenes/
      BootScene.ts
      PreloadScene.ts
      MainMenuScene.ts
      LevelScene.ts
      UIScene.ts
      GameOverScene.ts
      VictoryScene.ts
    core/
      GameState.ts
      EventBus.ts
      SaveState.ts
      Types.ts
    systems/
      InputSystem.ts
      ResponsiveScaleSystem.ts
      CameraSystem.ts
      ParallaxSystem.ts
      DepthPlaneSystem.ts
      PlayerController.ts
      FlashlightSystem.ts
      SearchSystem.ts
      InventorySystem.ts
      ItemSystem.ts
      EnemySystem.ts
      EnemyStateMachine.ts
      SpawnDirector.ts
      RandomizationSystem.ts
      AudioSystem.ts
      UISystem.ts
      PerformanceMonitor.ts
    entities/
      Player.ts
      Enemy.ts
      SearchPile.ts
      ItemPickup.ts
      Door.ts
      Interactable.ts
    enemies/
      LaundryMonster.ts
      SockGoblin.ts
      HangerStalker.ts
      ToySwarm.ts
      DishCrawler.ts
    ui/
      HUD.ts
      Hotbar.ts
      ObjectivePanel.ts
      TouchControls.ts
    data/
      loaders.ts
      validators.ts
    dev/
      DebugOverlay.ts
      DebugCommands.ts
    tests/
      smoke/
      fixtures/
```

### Scene model

Use Phaser Scenes for lifecycle separation:

- `BootScene`: config, device detection, global settings.
- `PreloadScene`: load JSON, placeholder assets, production assets, audio.
- `MainMenuScene`: title, start game, settings.
- `LevelScene`: gameplay world, camera, player, enemies, collisions, rooms.
- `UIScene`: HUD overlay, inventory, objective, pause, mobile controls.
- `GameOverScene`: failure state.
- `VictoryScene`: escape result.

`LevelScene` and `UIScene` may run simultaneously. `UIScene` must not own gameplay truth.

---

## 6. Engine-portable architecture rules

The code must separate **game rules** from **Phaser rendering**.

### Phaser-specific code allowed in

```text
src/scenes/
src/entities/ rendering wrappers
src/systems/ Phaser adapters
```

### Phaser-independent data/rules preferred in

```text
public/assets/data/*.json
src/core/Types.ts
src/data/validators.ts
state machine definitions
item definitions
enemy behavior config
level segment definitions
```

### Migration rule

If a future Godot/Unity migration happens, the following should be portable:

- room segment JSON
- enemy archetype JSON
- item pool JSON
- animation specs
- world unit scale
- spawn rules
- flashlight behavior matrix
- UI layout tokens
- acceptance tests as behavior descriptions

The following may be rewritten later:

- Phaser Scenes
- Phaser GameObjects
- Phaser input binding
- Phaser camera/rendering code
- Phaser audio wrappers

---

## 7. Coordinate system and movement model

### World units

- Use design-space pixels as world units.
- Base design resolution: `1920 × 1080`.
- Camera viewport scales to device resolution.
- Room length is measured in world units, not image pixels.

### Floor plane

The playable floor is a 2D plane inside the side-view room.

```text
X = horizontal travel through the room/house
Y = depth on the floor plane, visually up/down the screen
```

The player can move:

- left/right along X
- up/down within floor-plane bounds along Y

The player cannot move into far background or foreground layers directly. Those are visual/depth layers, not free roaming zones.

### Y-sort rule

Sprites on the main gameplay plane must depth-sort by their feet/base Y position.

- Lower screen Y renders in front.
- Higher screen Y renders behind.
- Foreground layer always renders above main gameplay unless marked as interactive/pass-through.
- UI always renders above gameplay.

### Collision rule

Collision uses simple gameplay shapes, not art outlines.

Required collision objects:

- player capsule/circle
- enemy capsule/circle
- furniture blockers
- search pile zones
- door interaction zone
- foreground occlusion masks where needed

Do not use complex per-pixel collision.

---

## 8. Parallax room system

### Core rule

A room is not one background. A room is a sequence of segments.

```text
House Level
  Room
    Segment
      Layer
        Props / Search Nodes / Enemy Anchors / Light Zones
```

### Required layer types

Each room segment may contain:

1. `farBackground`
2. `backgroundClutter`
3. `mainGameplay`
4. `foregroundClutter`
5. `fxLighting`
6. `uiOverlay` handled separately by UIScene

### Scroll factors

Default parallax scroll factors:

```json
{
  "farBackground": 0.20,
  "backgroundClutter": 0.45,
  "mainGameplay": 1.00,
  "foregroundClutter": 1.18,
  "fxLighting": 1.00
}
```

Foreground can scroll slightly faster than main gameplay to sell depth.

### Wide-screen rule

Every segment must include horizontal bleed so ultrawide and camera smoothing do not expose blank edges.

Minimum layer bleed:

- 16:9 desktop: 10% beyond viewport on both sides.
- 21:9 ultrawide: 25% beyond viewport on both sides.
- Camera movement buffer: 512 world units preferred.

### Length control rule

Lengthen a level by adding segments, not stretching art.

Segment types:

- `entryBreather`
- `searchPressure`
- `ambush`
- `transition`
- `bossApproach`
- `escapeDoor`

Each segment has its own width, nodes, lights, enemy anchors, and foreground/background details.

---

## 9. Responsive scaling requirements

### Supported display targets

- 1280×720 window/laptop
- 1920×1080 desktop
- 2560×1440 desktop
- 3840×2160 4K
- 21:9 ultrawide
- phone landscape
- tablet landscape

### Portrait phone

MVP requirement: show a rotate-device prompt. Full portrait play is out of scope for v1.

### Core viewport rule

The game should maintain a playable 16:9 safe composition, while wider screens reveal additional horizontal room context.

Do not stretch art non-uniformly.

### UI safe areas

HUD must stay inside safe areas:

- desktop: 32 px minimum margin
- phone landscape: 20 px minimum margin plus notch/safe-area support
- ultrawide: clamp critical HUD within readable central safe zone

### UI scaling

- Use tokenized sizes from `responsive_ui_tokens.json`.
- UI panels should use 9-slice scalable art.
- Icons require high-resolution source and runtime tiering.
- Text must remain readable on small screens.
- Touch targets must be at least 44×44 CSS px, preferred 56×56 px.

---

## 10. Input/control spec

### Keyboard/mouse

```text
A/D or Left/Right     Move horizontally
W/S or Up/Down        Move on floor-plane depth axis
Mouse                 Aim flashlight direction
Mouse wheel or Q/E    Shift flashlight depth target: foreground/main/background
Shift                 Sprint
Ctrl                  Crouch / quiet movement
E                     Search / interact / hold to unlock
Left click            Use selected item / attack
Right click           Focus flashlight beam
1-5                   Select hotbar slot
Esc                   Pause
F3                    Debug overlay
```

### Controller

```text
Left stick            Move on floor plane
Right stick           Aim flashlight direction
LT                    Focus flashlight beam
RT                    Use selected item / attack
A / Cross             Search / interact / hold to unlock
B / Circle            Cancel / backstep if implemented
LB/RB                 Cycle inventory slot
Y / Triangle          Toggle flashlight depth target
Start                 Pause
```

### Phone landscape

```text
Left virtual stick    Move on floor plane
Right drag region     Aim flashlight
Depth toggle button   foreground/main/background
Interact button       Search/unlock
Use button            Use selected item
Sprint button         Hold to sprint
Hotbar                Compact bottom or side rail
Pause                 Top corner
```

Phone controls must be usable without covering the player, objective, or attack telegraphs.

---

## 11. Flashlight system

The flashlight is the signature mechanic. It controls visibility, enemy behavior, search safety, and depth-layer interaction.

### Flashlight states

```text
Off
Weak cone
Normal cone
Focused beam
Flicker / low battery
Overheat / battery drain penalty if abused
```

### Depth targeting

The flashlight can target:

- foreground
- main lane
- background

Depth targeting affects:

- which hidden threats are revealed
- which search piles are safely inspected
- which enemies freeze/lunge/retreat
- which visual details glow or react

### Feedback requirements

When flashlight depth changes:

- subtle UI indicator updates
- beam visually shifts focus/depth
- background/foreground target areas get a faint highlight/focus cue
- enemies in affected layer react only if they are in cone and line-of-sight

### Light/dark behavior language

- Darkness lets some problems move unseen.
- Light freezes some enemies because the player is confronting the problem.
- Light enrages other enemies because attention wakes them up.
- Room lights reduce hiding spots but may make the house louder/more active.

---

## 12. Enemy state machine baseline

All enemies must use an explicit state machine. Do not implement ad hoc behavior inside update loops.

Required generic states:

```text
Dormant
Hinted
StalkingBackground
StalkingForeground
EnteringMainPlane
Revealed
Telegraph
Attacking
Recovering
Stunned
Retreating
DeadOrDisabled
```

### Required generic triggers

```text
playerNear
playerSearching
noiseHeard
flashlightHit
flashlightHeld
roomLightOn
messLevelRaised
timeThresholdReached
playerHasKey
playerLowHealth
attackFinished
stunTimerEnded
```

### Fairness rule

An enemy may stalk from foreground/background, but must provide a readable cue before damaging the player unless the player directly triggers an ambush pile.

Readable cues include:

- glowing eyes
- rustle audio
- foreground object twitch
- background silhouette shift
- UI panic flicker
- dust/lint burst
- claw telegraph animation

---

## 13. Enemy classes for v1

### 13.1 Laundry Monster — main showcase enemy

Role: heavy crawler / pressure enemy.

Behavior:

- Starts dormant in a laundry pile.
- Moves slowly in darkness.
- Can freeze when hit by normal flashlight briefly.
- If flashlight is held too long, it enrages and lunges.
- Can stalk from background clutter before entering main plane.
- Telegraphs attack with cloth swelling, glowing eyes, claw pullback, and low growl.

Minimum animations:

```text
idle: 8 frames
crawl: 8 frames
telegraph: 4 frames
attack: 8 frames
stunned: 4 frames
retreat: 6 frames
death/disabled: 8 frames
```

### 13.2 Sock Goblin / Small Clutter Imp

Role: small fast harasser.

Behavior:

- Spawns from foreground piles or floor clutter.
- Avoids direct flashlight.
- Can steal/delay an item interaction.
- Low health.

### 13.3 Hanger Stalker / Closet Shape

Role: background/foreground stalker.

Behavior:

- Mostly visible as silhouette.
- Moves when player looks away or when flashlight is off.
- Freezes under direct focused beam.
- Attacks only after entering main plane.

### 13.4 Toy Swarm

Role: noise/space denial.

Behavior:

- Starts in toy bins or foreground clutter.
- Rushes across the floor plane.
- Forces player to move up/down, not only left/right.

### 13.5 Dish/Trash Crawler — optional v1 extension

Role: kitchen-specific hazard.

Behavior:

- Reacts to sound and light flicker.
- Can create slippery/trash zones.

---

## 14. Flashlight/enemy behavior matrix

The game must use a data-driven matrix. Initial v1 matrix:

```text
Laundry Monster:
  Darkness: moves slowly toward player
  Weak light: visible but not stopped
  Normal light < 1.5s: slows/freezes
  Normal light > 2.5s: enraged lunge
  Focused beam: stuns if stamina/battery available, otherwise enrages

Sock Goblin:
  Darkness: fast movement
  Weak light: hesitates
  Normal light: retreats
  Focused beam: stunned briefly

Hanger Stalker:
  Darkness: stalks from background/foreground
  Weak light: silhouette revealed
  Normal light: freezes
  Focused beam: forced into retreat or main-plane reveal

Toy Swarm:
  Darkness: spreads
  Weak light: path visible
  Normal light: scattered, slows
  Focused beam: not efficient; drains battery and only clears small cone
```

---

## 15. Search and loot system

### Search node types

```text
laundryPile
toyBin
junkDrawer
backpack
couchCushions
closetFloor
trashBag
underBed
kitchenCounter
bathroomCabinet
```

### Search interaction

- Player holds interact.
- Search progress fills over time.
- Search makes noise.
- Player can cancel search.
- Search may reveal useful item, junk, ambush, clue, or nothing.
- Flashlight aimed at correct depth can reduce ambush risk or reveal warnings.

### Search result classes

```text
objectiveItem
survivalItem
weaponOrTool
junkWeight
ambush
noiseTrap
loreClue
empty
```

### Objective items

Each run hides five important items. One is the front-door key.

Required v1 objective item pool:

```text
Front Door Key
Fresh Batteries
Door Wedge
Cleaning Spray
Family Photo / Comfort Item
```

The key is required to trigger the escape sequence. Other objective items improve survival odds but are not required to win.

---

## 16. Randomness and fairness rules

Randomness must create replayability without cheap failure.

### Required fairness constraints

- Key cannot spawn in the front-door/boss segment.
- Key cannot spawn in the first search pile of the run.
- Key must spawn before the final two room segments.
- At least two valid routes must exist from key location to front door unless the level is in the final boss sequence.
- Required objective items cannot all spawn in one room.
- No room can contain more than two required objective items on Normal difficulty.
- An ambush pile cannot spawn adjacent to the only exit unless there is a clear telegraph.
- A player must encounter at least one resource opportunity after obtaining the key and before the final door event.
- Early run cannot spawn more than one aggressive enemy at the same time.
- Random generation must be seedable for debugging.

### Set vs random content

Set content:

- house layout order
- first room orientation/tutorial beat
- boss door location
- final escape sequence
- core UI
- Laundry Monster introduction beat

Randomized content:

- which piles contain useful items
- which optional item types spawn
- some enemy anchor selection
- some foreground/background stalk cues
- noise traps
- ambush pile selection

---

## 17. Hoard/burden system

The player should benefit from looting but feel consequences for hoarding.

### Inventory model

- 5 quick slots.
- Small backpack reserve for junk/extra consumables.
- Key items do not consume quick slots, but the key triggers final pressure.

### Burden states

```text
Light: normal movement/noise
Carrying: small movement/noise penalty
Hoarding: slower, louder, harder to sprint, more mess attention
Overburdened: cannot sprint, enemies detect more easily
```

### Burden sources

- junk items
- duplicate tools
- heavy improvised weapons
- optional collectibles

### Drop rule

Player can drop non-key items. Dropping creates sound if done while moving/sprinting.

---

## 18. Boss/escape sequence

### Trigger

The boss sequence begins when the player has the Front Door Key and enters the front-door segment.

### Sequence

1. Objective changes to `Unlock the door`.
2. House audio intensity rises.
3. Mess Level jumps or begins increasing faster.
4. Foreground/background threats become more active.
5. Player must hold interact in the door zone.
6. Unlock progress can be interrupted by damage, grab, or forced dodge.
7. Final Laundry Monster variant or combined Hoard appears.
8. Player escapes if unlock completes and exit animation finishes.

### Fairness

- The boss must telegraph attacks.
- Door unlock progress should preserve partial progress unless difficulty is set to Hard.
- Player should have at least one defensive opportunity near the door.
- Boss cannot one-shot a full-health player on Normal.

---

## 19. UI requirements

### HUD elements

- Health bar.
- Stamina bar.
- Mess Level meter.
- Clock/objective panel.
- Hotbar.
- Flashlight depth indicator.
- Search progress indicator.
- Noise indicator.
- Burden state indicator.
- Key/objective item tracker.

### UI state behavior

Search progress:

- Shows circular/progress bar near pile or bottom center.
- Displays risk feedback if noise is high.

Flashlight depth:

- Shows `FG / MAIN / BG` state.
- Highlights the selected depth.
- Can be minimal but must be readable.

Burden:

- Icon or meter changes as player carries too much.
- Do not overload player with text during combat.

Mobile:

- Compact HUD.
- Larger touch buttons.
- Hotbar can collapse to current item + cycle buttons.
- Objective panel can shrink after a few seconds.

---

## 20. Audio design requirements

Audio is gameplay feedback, not polish.

Minimum audio systems:

- room tone loop
- mess intensity loop layers
- flashlight hum/flicker
- search rustle variations
- item found cue
- junk found cue
- enemy telegraph cue
- foreground/background stalk cue
- player hurt cue
- stamina low breath cue
- key found sting
- boss door tension ramp
- dawn/escape release cue

### Positional depth cues

Foreground/background enemies must sound different.

- Foreground: closer, muffled by clutter, left/right stronger.
- Background: distant, room-reflection/reverb, less direct.
- Main lane: clear and immediate.

---

## 21. Performance budgets

### Runtime targets

```text
Desktop 1080p: 60 FPS
Desktop 4K: 60 FPS preferred, 45 FPS minimum during heavy scenes
Phone landscape: 30 FPS minimum, 60 FPS target on stronger devices
```

### Active content limits for v1

```text
Max active major enemies: 2
Max active small enemies: 6
Max total active enemy objects: 8
Max active search nodes in current loaded area: 12
Max visible parallax layers per segment: 5 core + FX
Max particle emitters active: 6 desktop / 3 phone
Max loaded room segments: current + previous + next
Max texture atlas runtime tier phone: 2048 or 4096 depending device capability
Max texture atlas runtime tier desktop: 4096, 8192 only when verified safe
```

### Asset loading

Use lazy/segment-based loading after first playable if needed.

For MVP, it is acceptable to preload the whole Level 01 if memory remains under budget.

---

## 22. Build phases and acceptance criteria

Each phase must finish with a playable/testable result. Do not move to the next phase if acceptance criteria fail.

### Phase 0 — Project scaffold

Goal: clean Phaser 4 + TypeScript + Vite project.

Tasks:

- Create project structure.
- Add Phaser 4 dependency.
- Configure Vite.
- Configure TypeScript strict mode where practical.
- Create Boot, Preload, MainMenu, Level, UI, GameOver, Victory scenes.
- Add placeholder asset loading.
- Add debug overlay toggle.

Acceptance:

- `npm install` succeeds.
- `npm run dev` starts the game.
- `npm run build` completes.
- Browser shows title/menu scene.
- No TypeScript compile errors.
- Debug overlay can show FPS and viewport size.

### Phase 1 — Responsive canvas and camera foundation

Goal: game runs correctly on different display sizes.

Tasks:

- Implement `ResponsiveScaleSystem`.
- Establish 1920×1080 design space.
- Add safe area calculations.
- Add letterbox/expand behavior.
- Add phone landscape detection.
- Add portrait rotate prompt.

Acceptance:

- Works at 1280×720, 1920×1080, 2560×1440, 3840×2160, 21:9, and phone landscape viewport.
- Art is not stretched non-uniformly.
- UI stays inside safe area.
- Ultrawide reveals extra horizontal room context, not blank edges.
- Phone portrait shows rotate prompt.

### Phase 2 — Room segment and parallax renderer

Goal: render one room from JSON using layered segments.

Tasks:

- Load `level_01_family_house.json` or fixture equivalent.
- Create room segment renderer.
- Add far background, background clutter, main plane, foreground clutter, FX layers.
- Add scroll factors.
- Add camera follow and bounds.
- Add basic collision blockers.

Acceptance:

- One room segment renders from data.
- Player camera can move horizontally without exposed blank edges.
- Foreground overlaps main lane.
- Background recedes with parallax.
- Debug overlay can toggle collision and layer labels.

### Phase 3 — Player controller and floor-plane movement

Goal: player moves in a 2.5D floor plane.

Tasks:

- Implement player entity.
- Add keyboard/controller input abstraction.
- Add left/right and up/down floor-plane movement.
- Add sprint/stamina drain.
- Add crouch/quiet movement.
- Add y-depth sorting.
- Add placeholder animations.

Acceptance:

- Player can move left/right and up/down within floor bounds.
- Player cannot pass blockers.
- Player depth-sorts correctly against objects/enemies.
- Sprint drains stamina and recovers when not sprinting.
- Crouch reduces speed and noise.

### Phase 4 — Flashlight system

Goal: flashlight visibly and mechanically targets depth layers.

Tasks:

- Add cone rendering.
- Add foreground/main/background target states.
- Add aim input.
- Add focus beam.
- Add battery/flicker placeholder.
- Add debug collision/cone visualization.

Acceptance:

- Flashlight follows aim direction.
- Player can switch depth target.
- HUD shows selected depth target.
- Cone detects test objects in correct layer only.
- Focus beam has stronger/narrower detection.
- Low battery/flicker state can be triggered in debug.

### Phase 5 — Search, loot, inventory

Goal: player can search clutter and collect/use items.

Tasks:

- Implement search nodes.
- Add hold-to-search progress.
- Add noise output.
- Add search result table.
- Add hotbar.
- Add key item handling.
- Add burden state.

Acceptance:

- Search node can return key, item, junk, empty, or ambush placeholder.
- Search can be cancelled.
- Search creates noise visible in debug/HUD.
- Items appear in hotbar or backpack.
- Burden state changes when carrying junk.
- Key acquisition updates objective.

### Phase 6 — Enemy framework and Laundry Monster

Goal: one real enemy with state machine.

Tasks:

- Implement enemy base class.
- Implement state machine framework.
- Implement Laundry Monster states.
- Add flashlight reactions.
- Add player damage.
- Add telegraph/recovery timing.
- Add debug state label.

Acceptance:

- Laundry Monster starts dormant/hidden.
- It reveals/stalks/enters main plane based on triggers.
- It slows/freezes under short flashlight exposure.
- It lunges after overexposure or attack trigger.
- Attack has readable telegraph before damage.
- Player can survive/dodge/stun it.
- State labels can be displayed in debug mode.

### Phase 7 — One-room vertical slice

Goal: complete one-room version of the game loop.

Tasks:

- Connect player, flashlight, search, key, door, enemy, HUD.
- Add one exit door.
- Add win/loss states.
- Add simple audio placeholders.
- Add one room reset/retry.

Acceptance:

- Player can find key and escape.
- Player can die/fail.
- Laundry Monster can interrupt search and door unlock.
- UI shows health, stamina, mess, objective, hotbar, flashlight depth.
- Full run can be completed in under 3 minutes.
- No console errors during normal play.

### Phase 8 — Full Level 01 room sequence

Goal: implement the one-house MVP level.

Tasks:

- Build Bedroom, Hallway, Bathroom, Kitchen, Living Room/Front Door.
- Implement segment transitions.
- Place search nodes and enemy anchors.
- Add randomized but fair objective item placement.
- Add multiple enemy archetypes.
- Add room-specific clutter and light zones.

Acceptance:

- Player can traverse the full house.
- Room transitions are smooth and not too fast.
- Each room has at least one meaningful search decision.
- Key spawn follows fairness rules.
- Enemy pressure increases over time.
- Level can be won or lost.
- Two seeded runs produce different but valid item/enemy placement.

### Phase 9 — Boss door sequence

Goal: final escape sequence feels tense and fair.

Tasks:

- Add boss trigger after key acquisition.
- Add front-door unlock hold action.
- Add final pressure director.
- Add boss/hoard attack patterns.
- Add escape animation/state.

Acceptance:

- Objective changes after key is found.
- Door unlock takes time and can be interrupted.
- Boss attacks are telegraphed.
- Player has at least one defensive option near door.
- Victory state triggers after successful escape.
- Boss cannot unfairly instant-kill a full-health player on Normal.

### Phase 10 — Audio, feedback, and juice pass

Goal: make the prototype scary/readable/fun.

Tasks:

- Add room tone.
- Add search audio.
- Add enemy telegraph audio.
- Add positional depth cues.
- Add UI warning cues.
- Add camera shake, vignette, dust/lint FX.

Acceptance:

- Player can identify foreground/background threat cues by sound.
- Search risk is understandable without looking at debug tools.
- Key pickup and boss trigger feel significant.
- Flashlight, enemy, and mess meter have readable feedback.

### Phase 11 — Mobile and responsive polish

Goal: playable phone landscape build.

Tasks:

- Add touch controls.
- Add compact HUD layout.
- Add hit target sizing.
- Optimize texture tiers.
- Tune phone camera/safe zones.

Acceptance:

- Phone landscape is playable with touch.
- Touch controls do not cover critical combat area.
- HUD remains readable.
- Phone performance meets 30 FPS minimum on target hardware.
- Portrait mode shows rotate prompt.

### Phase 12 — Hardening and handoff

Goal: build is stable enough for broader testing.

Tasks:

- Add smoke tests/manual QA checklist.
- Add build scripts.
- Add README run instructions.
- Add known issues list.
- Clean debug-only code behind flags.
- Validate JSON on startup.

Acceptance:

- Fresh checkout can run with documented commands.
- Invalid data gives clear error.
- Debug overlay can be disabled for release.
- QA checklist passes.
- Build package is ready for playtest.

---

## 23. Definition of done for v1 MVP

PILEUP v1 is done when:

- A player can start from menu, play one full house level, find key, and escape or fail.
- Movement feels good on a 2.5D floor plane.
- The flashlight meaningfully affects visibility and enemy behavior.
- Search/loot creates risk and reward.
- At least three enemy types appear across the level.
- The Laundry Monster is scary, readable, and memorable.
- Room art/parallax supports longer traversal and does not feel like single-screen rooms.
- UI scales on desktop, ultrawide, and phone landscape.
- Randomization changes runs while obeying fairness rules.
- The boss door sequence creates a final panic moment.
- The codebase remains data-driven and portable enough to migrate later.

---

## 24. Codex implementation rules

Codex should follow these rules:

1. Build phase by phase. Do not jump ahead.
2. After each phase, run the build and fix compile/runtime errors.
3. Keep gameplay rules data-driven.
4. Use placeholders when production art is missing.
5. Do not hardcode level data into scene files.
6. Do not add third-party plugins without explicit reason.
7. Do not use Phaser 3-only APIs unless verified compatible with Phaser 4.
8. Keep files small and cohesive.
9. Add debug overlays for complex systems.
10. Maintain acceptance checklist as work progresses.
11. Prefer deterministic seeded randomness for testing.
12. Keep migration path clean by isolating Phaser-specific rendering/input code.

---

## 25. Immediate next task for Codex

Start with Phase 0 only.

Deliver:

- working Phaser 4 + TypeScript + Vite scaffold
- scene lifecycle in place
- debug overlay
- placeholder title screen
- documented run/build commands

Do not build gameplay until Phase 0 acceptance criteria pass.
