# Flashlight Feature Pass

## Intent

The flashlight is already more than a visual effect. It is an aiming tool, a layer-selection mechanic, a battery pressure system, and an enemy interaction system. This pass turns it into one of PILEUP's signature mechanics.

The goal is to make the flashlight feel animated, physical, and alive without breaking the current gameplay logic. Keep the deterministic cone math for target detection. Upgrade the visual, audio, and world-response layers around it.

## Current Implementation Snapshot

Current code path:

- `src/scenes/LevelScene.ts`
  - Creates `FlashlightSystem` with the player and target list.
  - Refreshes flashlight targets every frame.
  - Calls `flashlightSystem.update(input, delta)` after player and enemy updates.
  - Publishes flashlight debug state.

- `src/systems/FlashlightSystem.ts`
  - Tracks active depth layer: `background`, `main`, `foreground`.
  - Tracks battery, focus mode, flicker, aim angle, intensity, and hit IDs.
  - Resolves aim from mouse position first, movement direction second.
  - Uses custom cone math for target detection.
  - Emits `flashlight.hitEnemy` events.
  - Draws the beam as one filled triangle with two edge lines.

- `src/systems/InputSystem.ts`
  - Space = focus.
  - Q = cycle depth.
  - 1/2/3 = direct depth selection.
  - F = debug flicker.

- `src/systems/EnemySystem.ts` and `src/enemies/LaundryMonster.ts`
  - Enemies expose themselves as flashlight targets.
  - Light exposure accumulates over time.
  - Focused light can stun enemies.
  - Overexposure can push an enemy into telegraph behavior.

This is a good foundation. The next pass should not replace it. The pass should separate the mechanic into three layers:

1. Gameplay cone
2. Visual beam system
3. World reaction layer

## Design Pillars

### The flashlight should feel physical

The player should feel the flashlight has weight, inertia, battery behavior, and hand movement. It should not feel like a mouse cursor with a triangle attached.

### The flashlight should make the house feel deep

Depth selection is one of the strongest hooks already in the mechanic. Background, main, and foreground modes should feel like refocusing the beam into different layers of the house.

### The flashlight should reveal, not just illuminate

The beam should brush across search targets, enemy eyes, piles, doors, dust, clues, and props. Light should cause small reactions before the player formally interacts.

### Gameplay should stay deterministic

Enemy hits, target exposure, and interaction affordances should continue to use simple cone math and target objects. Visual bloom, flicker, dust, darkness overlays, and shader-style polish should not become the source of truth for gameplay.

---

# Feature Pass

## 1. Split flashlight logic into gameplay and presentation

`FlashlightSystem` currently owns both detection and rendering. Keep it as the root system, but make the internal boundary clearer.

Recommended structure:

```ts
interface FlashlightGameplayState {
  layer: DepthLayer;
  focus: boolean;
  flicker: boolean;
  battery: number;
  aimAngle: number;
  range: number;
  halfAngle: number;
  intensity: number;
  hitIds: string[];
}

interface FlashlightVisualState extends FlashlightGameplayState {
  origin: Phaser.Math.Vector2;
  visualAimAngle: number;
  visualRange: number;
  visualHalfAngle: number;
  jitter: number;
  focus01: number;
  batteryInstability01: number;
}
```

Gameplay state remains stable. Visual state can breathe, flicker, lag, and distort.

## 2. Add aim smoothing and beam weight

Current aim updates directly from pointer/movement direction. Add smoothing so the beam rotates toward the desired angle instead of snapping.

Behavior targets:

- Normal aim: responsive, lightly softened.
- Focus aim: slower and steadier.
- Sprinting aim: more lag, wider shake.
- Crouching aim: stable and controlled.
- Low battery: occasional micro-slip.
- Hurt state: short violent shake.

Implementation sketch:

```ts
const targetAngle = Math.atan2(aim.y, aim.x);
const turnRate = focus ? 9.5 : sprinting ? 7.25 : 12.5;
this.visualAimAngle = Phaser.Math.Angle.RotateTo(
  this.visualAimAngle,
  targetAngle,
  turnRate * deltaSeconds,
);
```

The gameplay cone can still use the precise `aimAngle`. The visible cone can use `visualAimAngle`.

## 3. Replace the flat triangle with a multi-pass beam

Current visual beam:

- One filled triangle
- Two edge lines

New beam stack:

1. Outer spill cone
   - Wide, low-alpha, soft color.
   - Communicates ambient light bleed.

2. Main cone
   - Existing gameplay shape, but animated.
   - Uses the active depth color.

3. Core shaft
   - Narrower brighter cone inside the beam.
   - More visible during focus.

4. Edge shimmer
   - Two unstable edge strokes.
   - Small sine/noise offset over time.

5. End bloom
   - Soft oval/arc near the beam end.
   - Stronger in fog/dust/low battery flicker.

6. Origin glow
   - Small bloom at the player's hand/flashlight.
   - Pulses during focus and flicker.

Suggested tuning:

```ts
const outerHalfAngle = halfAngle * 1.32;
const coreHalfAngle = Phaser.Math.Linear(halfAngle * 0.42, halfAngle * 0.28, focus01);
const outerAlpha = baseAlpha * 0.28;
const mainAlpha = baseAlpha * 0.72;
const coreAlpha = baseAlpha * Phaser.Math.Linear(0.22, 0.48, focus01);
```

Use a small pool of `Graphics` objects rather than creating/destroying them every frame.

## 4. Add focus transition instead of instant focus

Focus currently changes width/range/intensity immediately. Make it animate in over roughly 120ms and release over roughly 180ms.

Add:

```ts
private focus01 = 0;
```

Update:

```ts
const focusTarget = input.focus ? 1 : 0;
const focusSpeed = input.focus ? 9.0 : 5.5;
this.focus01 = Phaser.Math.Linear(
  this.focus01,
  focusTarget,
  1 - Math.exp(-focusSpeed * deltaSeconds),
);
```

Then interpolate:

```ts
const range = Phaser.Math.Linear(RANGE, FOCUS_RANGE, this.focus01);
const halfAngle = Phaser.Math.Linear(CONE_HALF_ANGLE, FOCUS_HALF_ANGLE, this.focus01);
const intensity = Phaser.Math.Linear(0.62, 1, this.focus01);
```

Focus should feel like the player is holding their breath.

Presentation hooks:

- Beam narrows smoothly.
- Origin glow tightens.
- Small audio whine rises.
- Dust motes accelerate slightly.
- Enemy rim light gets harsher.

## 5. Make battery feel like a living system

Battery is currently a percentage and a low-battery flicker threshold. Keep the drain values, but make battery affect presentation across the whole range.

Battery bands:

### 100-65%

Stable, confident beam.

- Strong center.
- Clean edge.
- Very low random flicker.

### 64-30%

Slight fatigue.

- Mild warmth drop.
- Slow amplitude pulse.
- Rare brightness dips.

### 29-13%

Noticeable instability.

- Beam edge jitters.
- End bloom fades unevenly.
- Occasional 60-100ms dips.

### 12-1%

Critical behavior.

- Existing flicker kicks in.
- Add intermittent partial blackouts.
- Audio crackle/coil whine.
- Beam aim can micro-slip.
- Enemy silhouettes appear in flashes.

### 0%

Do not simply turn the flashlight off.

- Leave a tiny emergency cone.
- Allow rare, weak flashes.
- Focus input produces a dry click.
- Enemy eyes can still catch light for split-seconds.

This preserves tension without fully removing player agency.

## 6. Use depth planes as the signature mechanic

The current active layer colors are already good:

- Background: cool blue
- Main: warm yellow
- Foreground: orange

Make each mode feel physically different.

### Background beam

Purpose: reveal what is behind the room.

Visual behavior:

- Wider, hazier beam.
- Lower brightness.
- More dust/fog in the cone.
- Background objects catch soft blue rim light.
- Main-plane objects can partially obscure it.

Gameplay behavior:

- Best for spotting stalkers before they enter the main plane.
- Enemy bodies remain vague; eyes and silhouettes read first.

### Main beam

Purpose: direct survival and interaction.

Visual behavior:

- Cleanest beam.
- Strongest center shaft.
- Best focus response.
- Search piles and enemies read clearly.

Gameplay behavior:

- Best stun reliability.
- Best search-target readability.

### Foreground beam

Purpose: expose what is close, hidden, or crossing in front.

Visual behavior:

- Warmer edge bounce.
- Foreground clutter cuts across the beam.
- Shorter-feeling throw even if gameplay range stays similar.
- Stronger occlusion silhouettes.

Gameplay behavior:

- Reveals foreground ambush tells.
- Finds close hidden props/clues.

Layer switching should feel like lens refocus, not just a HUD color change:

- Quick aperture pulse.
- Brief chromatic shift.
- Soft click sound.
- 80-120ms blur/settle animation.

## 7. Add beam occlusion against blockers

The room already has blockers. Use them to make light stop against physical objects.

First implementation should be practical, not perfect.

Approach:

- Sample 9 rays across the cone.
- Step each ray in 24px increments.
- Stop at first blocker rect intersection.
- Build a polygon from the ray endpoints.
- Draw the main beam from that polygon instead of a full triangle.

Recommended ray count:

- Normal: 9 rays
- Focus: 7 rays
- Debug/high quality: 13 rays

Keep enemy detection cone-based initially. Once the visual occlusion feels good, optionally add occlusion to target detection.

Useful helper shape:

```ts
interface FlashlightRayHit {
  angle: number;
  distance: number;
  x: number;
  y: number;
  blocked: boolean;
}
```

Occlusion will immediately make furniture, door frames, piles, and foreground clutter feel solid.

## 8. Add dust motes and air movement

Dust sells the flashlight in a dark house.

Implementation:

- Create a small pooled set of particles in world/camera space.
- Use tiny circles or 1-2px sprites.
- Drift slowly.
- Only brighten particles inside the visual cone.
- Give particles different response by depth layer.

Behavior:

- Idle: slow float.
- Walking: slight horizontal disturbance.
- Sprinting: visible air movement around the player.
- Focus: dust compresses visually into the beam shaft.
- Flicker: particles blink unevenly.

Start with 60 particles. Increase only if performance is clean.

## 9. Add flashlight reactions to targets

Extend `FlashlightTarget` so the beam can interact with more than enemies.

Recommended shape:

```ts
export type FlashlightTargetKind = 'enemy' | 'searchNode' | 'door' | 'prop' | 'clue';

export interface FlashlightTarget {
  id: string;
  kind: FlashlightTargetKind;
  layer: DepthLayer;
  x: number;
  y: number;
  radius: number;
  object: Phaser.GameObjects.GameObject;
}
```

New events:

```ts
{ type: 'flashlight.targetEntered'; targetId: string; kind: FlashlightTargetKind; layer: DepthLayer }
{ type: 'flashlight.targetExited'; targetId: string; kind: FlashlightTargetKind; layer: DepthLayer }
{ type: 'flashlight.targetHeld'; targetId: string; kind: FlashlightTargetKind; layer: DepthLayer; durationMs: number; intensity: number }
```

Target reactions:

### Search nodes

- Faint outline when brushed by the beam.
- Slight label/glint before pressing `E`.
- Small dust pop if held in the beam.
- Subtle audio tick for important nodes.

### Doors

- Lock metal glints.
- Keyhole catches light.
- Boss door can pulse or breathe under focus.

### Props

- Edges rim-light briefly.
- Clutter silhouettes throw shape into the beam.
- Suspicious props can twitch under flicker.

### Clues

- Small highlight only in correct layer.
- Maybe require focus to fully reveal.

## 10. Make enemy reveal progressive

Enemies already accumulate exposure. Use that same exposure visually.

Suggested enemy light response stages:

### 0-150ms exposure

- Eyes catch light.
- Body remains mostly hidden.
- Small pupil/eye flicker.

### 150-500ms exposure

- Silhouette emerges.
- Body alpha rises.
- Edges get rim light.

### 500-1200ms exposure

- Details become readable.
- Enemy slows.
- Body squashes slightly under light pressure.

### Focused exposure

- Harsh rim light.
- Stun buildup visual.
- Short static/sizzle audio.

### Stunned

- Overbright wash.
- Twitching animation.
- Eyes desaturate or flare.

### Overexposed

- Do not make it feel safe.
- Push into aggression/telegraph.
- Visual language shifts from reveal to threat.

This turns light into pressure instead of simple visibility.

## 11. Add a darkness overlay pass

The beam should feel like it is cutting into darkness, not sitting on top of the room.

Start simple:

- Add a world-space darkness graphics layer above the room.
- Draw semi-transparent black over the camera/world area.
- Draw flashlight beam and bloom on top.
- Add a camera vignette.

Better version:

- Use a `RenderTexture` or mask-style pass.
- Fill darkness.
- Erase/brighten beam shape.
- Composite beam color and bloom.

Avoid tying gameplay detection to this pass. It is presentation only.

## 12. Add flashlight audio events

`AudioSystem` is already event-driven. Add flashlight-specific events and lightweight generated tones first, then swap to authored audio later.

Recommended events:

```ts
{ type: 'flashlight.focusStarted' }
{ type: 'flashlight.focusEnded' }
{ type: 'flashlight.depthSwitch'; layer: DepthLayer }
{ type: 'flashlight.flickerBurst'; battery: number }
{ type: 'flashlight.batteryCritical' }
{ type: 'flashlight.hitEnemyStarted'; enemyId: string }
{ type: 'flashlight.hitSurface'; surfaceId: string }
```

Sound direction:

- Depth switch: small tactile click.
- Focus start: rising electric whine.
- Focus end: short release/drop.
- Low battery: uneven filament crackle.
- Enemy hit: static hiss / fabric burn / wet squeal.
- Stun: brittle pop.

Audio should be subtle. The flashlight is used constantly, so avoid fatigue.

## 13. Add HUD feedback without overloading text

The HUD already shows layer, battery, focus, and flicker. Keep the text for debug clarity, but add visual state.

Ideas:

- Battery text pulses only under 30%.
- Critical battery briefly desaturates the HUD light label.
- Depth mode has a small three-position lens indicator.
- Focus squeezes the light indicator horizontally.
- Flicker causes the HUD light label to blink imperfectly.

Do not add too much UI chrome. The world should carry most flashlight feedback.

---

# Implementation Order

## Pass 1: Beam feel

Files likely touched:

- `src/systems/FlashlightSystem.ts`
- `src/core/Types.ts` if new events are added
- `src/systems/AudioSystem.ts` for focus/depth/flicker hooks

Deliverables:

- Aim smoothing
- Visual aim lag
- Focus transition
- Multi-pass beam graphics
- Origin glow
- End bloom
- Better flicker curve

Acceptance checks:

- Beam no longer snaps like a cursor.
- Focus feels like a physical narrowing action.
- Low battery feels unstable before the HUD says `FLICKER`.
- Enemy detection behavior remains unchanged.

## Pass 2: Layer personality

Files likely touched:

- `src/systems/FlashlightSystem.ts`
- `src/systems/ParallaxSystem.ts`
- `src/scenes/UIScene.ts`
- `src/systems/AudioSystem.ts`

Deliverables:

- Different visual profile per depth layer
- Depth switch pulse/click
- Background haze behavior
- Foreground occlusion silhouettes or warm spill
- HUD indicator polish

Acceptance checks:

- Background, main, and foreground modes feel meaningfully different.
- Player can tell the active layer without only reading text.
- Layer switching feels like refocusing the flashlight.

## Pass 3: Target reactions

Files likely touched:

- `src/systems/FlashlightSystem.ts`
- `src/systems/SearchSystem.ts`
- `src/systems/DoorSystem.ts`
- `src/enemies/LaundryMonster.ts`
- `src/core/Types.ts`

Deliverables:

- `FlashlightTargetKind`
- Enter/exit/held target events
- Search pile glints
- Door/keyhole glints
- Enemy reveal stages

Acceptance checks:

- Searchable objects react before pressing `E`.
- Enemies reveal progressively instead of binary on/off.
- Door and boss-door objects feel responsive to the beam.

## Pass 4: Occlusion

Files likely touched:

- `src/systems/FlashlightSystem.ts`
- `src/scenes/LevelScene.ts`
- Possibly room/blocker data types if additional metadata is needed

Deliverables:

- Blocker-aware beam polygon
- Ray debug visualization
- Optional occlusion-aware target checks

Acceptance checks:

- Beam stops on walls, doors, piles, and large blockers.
- Visual polygon remains stable during fast mouse motion.
- No major frame drops from ray sampling.

## Pass 5: Darkness and atmosphere

Files likely touched:

- `src/systems/FlashlightSystem.ts`
- New `src/systems/DarknessSystem.ts` if the logic grows
- `src/systems/ParallaxSystem.ts`

Deliverables:

- Darkness overlay
- Camera vignette
- Dust motes
- Flicker swallowing darkness
- Optional render texture/mask pass

Acceptance checks:

- The room feels darker, but still playable.
- Beam feels like it cuts through darkness.
- Dust makes empty space feel alive.
- Presentation can be disabled or simplified if performance requires it.

---

# Practical Notes

## Keep detection cheap

The existing cone math is good. It is easy to debug and lines up with the current enemy exposure design. Do not replace gameplay detection with render texture sampling, masks, or shader output.

## Use pooling

The flashlight updates every frame. Avoid creating/destroying particles, graphics, circles, or markers during normal updates.

## Make debug modes useful

Add debug toggles for:

- Gameplay cone
- Visual cone
- Raycast endpoints
- Hit targets
- Occlusion blockers
- Active depth layer
- Exposure accumulation

The existing debug data pattern through `window.__PILEUP_DEBUG__` is already useful. Extend it rather than inventing a second debug surface.

## Watch mobile performance

PILEUP uses responsive scaling and Phaser resize behavior. Keep the visual beam scalable:

- Low quality: 3 beam passes, 0-30 dust motes, no occlusion or 5 rays.
- Medium: 4 beam passes, 60 dust motes, 9 rays.
- High: full beam stack, 100+ dust motes, 13 rays, darkness pass.

Expose the quality choice internally first. It can become a settings option later.

---

# Recommended First Commit

Start with a focused implementation pass in `FlashlightSystem.ts` only:

1. Add `focus01`.
2. Add `visualAimAngle`.
3. Add smoothed visual aim.
4. Replace single triangle render with outer/main/core beam passes.
5. Add origin glow and end bloom.
6. Keep current target detection untouched.

This gives the biggest immediate visual improvement with the lowest risk.

Once that feels good, wire in layer personality, target reactions, and occlusion.

## Success Criteria

This feature pass is successful when the flashlight feels like a character-level object:

- It breathes when the player stands still.
- It shakes when the player runs.
- It tightens when focused.
- It struggles when the battery is low.
- It reveals enemies in stages.
- It makes the house feel layered.
- It gives the player information before text does.
- It still uses simple, reliable gameplay detection under the hood.
