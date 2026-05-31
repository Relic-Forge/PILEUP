# Horror Lighting System Implementation

## Goal

Turn the current flashlight from a visible debug-style triangle into a horror lighting system where darkness owns the scene, the flashlight reveals playable space, and unlit areas creep back into darkness.

The player should feel three things immediately:

1. The house is dark by default.
2. The flashlight creates a soft, animated area of visibility based on aim, focus, battery, and active depth layer.
3. The existing triangle cone still exists, but only as deterministic gameplay logic and optional debug visualization.

This implementation should lead directly into a shadow system. The first version should support blocker-aware light clipping and should introduce clean data structures that can later evolve into true shadow casters.

---

## Current State

The current flashlight implementation lives primarily in `src/systems/FlashlightSystem.ts`.

Current behavior:

- Tracks active depth layer: `background`, `main`, `foreground`.
- Resolves aim from mouse position first, movement direction second.
- Supports focus mode.
- Drains battery.
- Flickers under low battery or debug flicker input.
- Detects targets using cone math.
- Emits `flashlight.hitEnemy` when enemies are inside the active cone and matching layer.
- Renders the flashlight as one filled triangle with two edge lines.

This is a strong gameplay foundation. Do not remove the cone math. The new system should make the triangle invisible during normal play and replace the visual output with layered darkness/reveal rendering.

---

## Target Player Experience

The final in-game feel should be closer to a 2D horror game flashlight:

- The map is visible only where the player has light.
- Darkness returns after the beam moves away.
- The beam has a broad soft reveal area, not just a hard triangle.
- A smaller refracted beam effect sits inside the broader reveal.
- Focus tightens and strengthens the center of the light.
- Low battery makes the darkness feel aggressive.
- Background, main, and foreground flashlight modes reveal different parts of the room in distinct ways.
- Walls, blockers, furniture, piles, and foreground clutter can interrupt or shape the light.

The flashlight should feel like a physical object in a hostile space, not a flat overlay.

---

## Non-Goals For The First Pass

Do not build a full physically accurate lighting engine yet.

Do not replace enemy detection with pixel/shader sampling.

Do not require authored normal maps.

Do not make Phaser's built-in Lights Manager the core system. It can be used later for supporting glows, but the core horror effect should be driven by darkness overlays, reveal masks, and controlled render passes.

Do not delete the existing debug beam logic. It should become an optional debug overlay.

---

## High-Level Architecture

Separate gameplay from presentation.

```text
FlashlightSystem
  - Owns player aim, layer, focus, battery, flicker, gameplay cone, target hits
  - Returns a FlashlightState every frame
  - Emits gameplay events

DarknessSystem
  - Owns darkness overlay
  - Owns reveal memory / darkness creep
  - Consumes FlashlightState
  - Draws player safety glow, broad reveal field, focus core, vignette

BeamFXSystem or internal BeamFX renderer
  - Draws refracted animated beam haze
  - Draws edge shimmer, dust, endpoint bloom, origin glow
  - Presentation only

Future ShadowSystem
  - Owns blockers, occluders, shadow casters, ray samples
  - Produces clipped light polygons
  - Feeds DarknessSystem and BeamFXSystem
```

First implementation can keep `BeamFXSystem` folded into `DarknessSystem` or `FlashlightSystem` if that keeps the build smaller. The important boundary is this:

```text
Gameplay cone is clean and deterministic.
Visual light is soft, animated, imperfect, and presentation-only.
```

---

## New Files

### `src/systems/DarknessSystem.ts`

Primary new system.

Responsibilities:

- Render the full-scene darkness overlay.
- Render soft reveal shapes from flashlight state.
- Support darkness creep / reveal persistence.
- Render camera vignette.
- Optionally render the first version of refracted beam atmosphere.
- Expose debug controls.
- Accept room/world bounds and optional blockers.

### Optional Later File: `src/systems/LightOcclusionSystem.ts`

Do not build the full version unless the first pass is stable.

Responsibilities:

- Convert room blockers and future shadow casters into light occlusion geometry.
- Sample rays across the flashlight cone.
- Return clipped polygon points for visual reveal.
- Later support hard shadows, soft penumbra, and foreground silhouettes.

### Optional Later File: `src/systems/BeamFXSystem.ts`

Split this out only if `DarknessSystem` gets too large.

Responsibilities:

- Draw visible beam haze.
- Draw inner core.
- Draw shimmer edges.
- Draw origin and endpoint glow.
- Draw dust motes if they are not handled by a separate atmosphere system.

---

## Existing Files To Touch

### `src/systems/FlashlightSystem.ts`

Update to expose richer state.

Keep:

- layer selection
- battery drain
- focus input
- flicker state
- target detection
- `flashlight.hitEnemy` event

Change:

- Stop making the hard filled triangle the primary player-facing effect.
- Move current triangle render behind a debug flag.
- Add `originX`, `originY`, `range`, `halfAngle`, and `focus01` to returned state.
- Add aim smoothing for visual state if not handled elsewhere.

### `src/scenes/LevelScene.ts`

Update lifecycle.

Add:

- `private darknessSystem?: DarknessSystem;`
- Create it after player and room exist.
- Update it after `flashlightSystem.update()` returns state.
- Destroy it on scene shutdown.
- Reconfigure it when room renders/resizes.
- Pass room width, design height, floor bounds, and blockers.

### `src/core/Types.ts`

Add event types if needed.

Suggested events:

```ts
| { type: 'flashlight.focusStarted' }
| { type: 'flashlight.focusEnded' }
| { type: 'flashlight.depthSwitch'; layer: DepthLayer }
| { type: 'flashlight.flickerBurst'; battery: number }
| { type: 'flashlight.batteryCritical' }
```

Do not add all events unless the code uses them. Keep this clean.

### `src/systems/AudioSystem.ts`

Optional first-pass support.

Add lightweight audio hooks for:

- focus start
- focus end
- depth switch
- battery critical
- flicker burst

Keep sounds subtle. The flashlight is active constantly, so avoid audio fatigue.

### `src/scenes/UIScene.ts`

Optional first-pass support.

Keep existing text HUD. Add only small visual feedback if needed:

- battery pulse below 30%
- flicker label instability
- active layer indicator polish

Do not let HUD work block the lighting implementation.

---

## Proposed Type Changes

### Extend `FlashlightState`

In `src/systems/FlashlightSystem.ts`:

```ts
export interface FlashlightState {
  layer: DepthLayer;
  focus: boolean;
  flicker: boolean;
  battery: number;
  aimAngle: number;
  hitIds: string[];
  intensity: number;

  // New: presentation and downstream lighting data
  originX: number;
  originY: number;
  range: number;
  halfAngle: number;
  focus01: number;
  visualAimAngle: number;
  batteryInstability01: number;
}
```

Notes:

- `aimAngle` should remain the gameplay angle.
- `visualAimAngle` can lag, sway, or jitter.
- `focus01` should animate from 0 to 1 instead of snapping.
- `batteryInstability01` should map battery into visual instability.

Suggested calculation:

```ts
const batteryInstability01 = Phaser.Math.Clamp((35 - this.battery) / 35, 0, 1);
```

### New Darkness Config

In `src/systems/DarknessSystem.ts`:

```ts
interface DarknessSystemConfig {
  worldWidth: number;
  worldHeight: number;
  debug?: boolean;
}
```

### New Runtime Blocker Shape

Use existing blocker data first. If the available blocker type is awkward, normalize internally:

```ts
interface LightBlocker {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  layer?: DepthLayer | 'all';
  castsShadow?: boolean;
}
```

This interface is also the bridge into the later shadow system.

---

## DarknessSystem Behavior

### Rendering Model

Start with `Phaser.GameObjects.Graphics` for simplicity.

Use this stack:

```text
Depth 1390: darkness base / reveal composite
Depth 1395: vignette
Depth 1450: visible beam haze / bloom / dust
Depth 2350: debug overlays
```

Current flashlight beam uses depth `1450`, so coordinate with that. The goal is that darkness sits above the world and beam FX sits inside or above it.

If `Graphics` proves too limited, move to `RenderTexture` / `DynamicTexture` in the second pass.

### Minimum Viable First Version

Draw every frame:

1. Full world darkness rectangle.
2. Player safety reveal bubble.
3. Broad directional reveal field.
4. Focus core reveal.
5. Refracted visible beam haze.
6. Vignette.
7. Optional debug cone/rays.

Because Phaser `Graphics` cannot truly erase from a filled rectangle without extra render/mask work, first implementation can fake the reveal by drawing translucent light shapes over the dark scene and reducing the base darkness alpha enough to preserve playability.

Target first-pass look:

- Base darkness: alpha 0.72-0.86.
- Player bubble: low-alpha warm/cool light shape.
- Directional reveal: larger transparent colored shape.
- Focus core: narrower, brighter shape.

Better second-pass look:

- Use render texture/mask/erase workflow to punch real holes in the darkness.
- Use reveal memory texture for darkness creep.

Do not block first implementation on perfect masking.

---

## Darkness Creep

Darkness should return after the flashlight moves away.

### First Implementation: Reveal Stamps

Use an array of recent reveal stamps.

```ts
interface RevealStamp {
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
  angle: number;
  strength: number;
  ageMs: number;
  durationMs: number;
  layer: DepthLayer;
}
```

Each frame:

- Add one player glow stamp.
- Add one directional reveal stamp.
- Add one focus core stamp when focus is active or focus01 > 0.05.
- Age old stamps.
- Remove expired stamps.
- Render active stamps with fade-out alpha.

Fade curve:

```ts
const life01 = Phaser.Math.Clamp(stamp.ageMs / stamp.durationMs, 0, 1);
const fade = 1 - Phaser.Math.SmoothStep(life01, 0, 1);
```

Layer-specific creep timings:

```ts
const DARKNESS_RETURN_MS: Record<DepthLayer, number> = {
  background: 360,
  main: 650,
  foreground: 480,
};
```

Interpretation:

- Background fades fastest. It should feel uncertain.
- Main holds the longest. It is the playable plane.
- Foreground creeps back unevenly and quickly enough to feel claustrophobic.

### Second Implementation: Reveal Memory Texture

Later, replace reveal stamps with a low-resolution texture buffer.

Every frame:

1. Draw a translucent darkness layer into the memory texture to fade old reveals.
2. Stamp new light shapes into the buffer.
3. Use the buffer as a mask or composite source.

This gives smoother creeping darkness and better performance once tuned.

---

## Light Shape Recipe

The player should not only have a cone. Use three reveal components.

### 1. Player Safety Bubble

Purpose: keep player readable and prevent total disorientation.

Suggested values:

```ts
radiusX: 130
radiusY: 100
strength: 0.24
```

Behavior:

- Always present while flashlight has any battery.
- Shrinks slightly at critical battery.
- Warms/cools based on layer.
- Follows player with no lag.

### 2. Broad Directional Reveal

Purpose: show the general area of the map the player is looking at.

This is the main horror flashlight reveal, not the hard triangle.

Suggested normal values:

```ts
range: 520
radiusX: 360
radiusY: 165
strength: 0.38
```

Position it along aim direction:

```ts
const centerDistance = range * 0.46;
const centerX = originX + Math.cos(visualAimAngle) * centerDistance;
const centerY = originY + Math.sin(visualAimAngle) * centerDistance;
```

Rotate the oval to match aim direction.

If rotated ellipse drawing is awkward with `Graphics`, approximate with a polygon or several circles along the aim vector.

Simple circle-chain approximation:

```ts
for (let i = 0; i < 5; i += 1) {
  const t = i / 4;
  const distance = Phaser.Math.Linear(90, range * 0.82, t);
  const radius = Phaser.Math.Linear(105, 190, 1 - Math.abs(t - 0.45));
  drawRevealCircle(origin + direction * distance, radius, strength * falloff);
}
```

This avoids needing a perfect soft rotated ellipse.

### 3. Focus Core

Purpose: keep current focus mechanic visually meaningful.

Suggested values:

```ts
range: 660
halfAngle: 13 degrees
strength: 0.70-0.90
```

Visual behavior:

- Narrower than broad reveal.
- Longer than broad reveal.
- More stable.
- Less edge haze.
- Stronger endpoint bloom.

Use `focus01` to interpolate normal to focused state.

---

## Refracted Beam FX

The visible beam should be a refracted animated artifact inside the reveal field.

It should not be a hard filled triangle.

Draw these passes:

### Outer Haze

- Wide cone.
- Low alpha.
- Layer color.
- Slight width noise.

### Main Beam Body

- Similar to current cone but much softer.
- Lower alpha.
- Animated edge points.

### Inner Core

- Narrower cone.
- More visible during focus.
- Slight pulse tied to battery/focus.

### Edge Shimmer

- Two line strips along beam edges.
- Alpha changes over time.
- Points wiggle slightly.

### End Bloom

- Soft circle/ellipse at beam end.
- Stronger during focus.
- Flickers under low battery.

### Origin Glow

- Small glow around player hand/flashlight.
- Pulses during focus.
- Weakens under low battery.

Suggested renderer methods:

```ts
private renderBeamHaze(light: FlashlightState): void;
private renderBeamCore(light: FlashlightState): void;
private renderBeamEdges(light: FlashlightState): void;
private renderBeamBloom(light: FlashlightState): void;
private renderOriginGlow(light: FlashlightState): void;
```

Avoid object allocation in these methods. Reuse vectors or plain numbers.

---

## Focus Animation

Focus should not snap.

Add to `FlashlightSystem`:

```ts
private focus01 = 0;
```

Update per frame:

```ts
const focusTarget = input.focus ? 1 : 0;
const focusSpeed = input.focus ? 9.0 : 5.5;
this.focus01 = Phaser.Math.Linear(
  this.focus01,
  focusTarget,
  1 - Math.exp(-focusSpeed * deltaSeconds),
);
```

Use `focus01` for range, angle, and intensity:

```ts
const range = Phaser.Math.Linear(RANGE, FOCUS_RANGE, this.focus01);
const halfAngle = Phaser.Math.Linear(CONE_HALF_ANGLE, FOCUS_HALF_ANGLE, this.focus01);
const intensity = Phaser.Math.Linear(0.62, 1, this.focus01);
```

Battery drain can still treat focus as boolean for now. Later, drain can scale by `focus01`.

Validation:

- Pressing Space should visibly tighten the light over a fraction of a second.
- Releasing Space should relax more slowly than it tightens.
- Enemy hit behavior should remain close to the current feel.

---

## Aim Smoothing

Add visual aim smoothing without changing gameplay aim detection.

Add to `FlashlightSystem`:

```ts
private visualAimAngle = 0;
```

Update:

```ts
const targetAimAngle = this.aimAngle;
const turnRate = input.focus ? 10.0 : 13.5;
this.visualAimAngle = Phaser.Math.Angle.RotateTo(
  this.visualAimAngle,
  targetAimAngle,
  turnRate * deltaSeconds,
);
```

Low battery jitter:

```ts
const jitter = Math.sin(this.scene.time.now * 0.031) * 0.018 * batteryInstability01;
const visualAimAngle = this.visualAimAngle + jitter;
```

Keep `aimAngle` for target detection. Use `visualAimAngle` for rendering.

Validation:

- Fast mouse movement should feel slightly weighted.
- Gameplay hits should still feel accurate.
- Low battery should create subtle instability without making control frustrating.

---

## Layer-Specific Lighting Profiles

Add a profile map in `DarknessSystem.ts`.

```ts
interface LayerLightProfile {
  color: number;
  darknessAlpha: number;
  revealMultiplier: number;
  broadRangeMultiplier: number;
  broadWidthMultiplier: number;
  focusStrengthMultiplier: number;
  creepMs: number;
  hazeAlpha: number;
  vignetteAlpha: number;
}
```

Suggested values:

```ts
const LAYER_LIGHT_PROFILES: Record<DepthLayer, LayerLightProfile> = {
  background: {
    color: 0x86a9d8,
    darknessAlpha: 0.86,
    revealMultiplier: 0.78,
    broadRangeMultiplier: 1.08,
    broadWidthMultiplier: 1.22,
    focusStrengthMultiplier: 0.82,
    creepMs: 360,
    hazeAlpha: 0.22,
    vignetteAlpha: 0.42,
  },
  main: {
    color: 0xf4e7a8,
    darknessAlpha: 0.82,
    revealMultiplier: 1.0,
    broadRangeMultiplier: 1.0,
    broadWidthMultiplier: 1.0,
    focusStrengthMultiplier: 1.0,
    creepMs: 650,
    hazeAlpha: 0.18,
    vignetteAlpha: 0.36,
  },
  foreground: {
    color: 0xf3b28d,
    darknessAlpha: 0.88,
    revealMultiplier: 0.88,
    broadRangeMultiplier: 0.88,
    broadWidthMultiplier: 0.86,
    focusStrengthMultiplier: 0.92,
    creepMs: 480,
    hazeAlpha: 0.25,
    vignetteAlpha: 0.46,
  },
};
```

Expected feel:

- Background: wider, blurrier, uncertain.
- Main: cleanest and most playable.
- Foreground: close, warm, claustrophobic.

Validation:

- Switching 1/2/3 should visibly change the lighting mood.
- Player should be able to identify active layer without reading the HUD.
- Background mode should feel less safe than main mode.
- Foreground mode should feel cramped.

---

## First Shadow-System Bridge

This lighting pass should prepare the repo for shadows.

Do not build full shadows immediately. Build the data pathway.

### Step 1: Normalize Light Blockers

In `LevelScene.renderRoom()` or near room setup, pass blockers to `DarknessSystem`.

```ts
this.darknessSystem?.setBlockers(
  this.room.segments.flatMap((segment) => segment.blockers),
);
```

Inside `DarknessSystem`, normalize them into `LightBlocker[]`.

### Step 2: Add Optional Ray Sampling Debug

Add a debug method that samples rays across the gameplay cone.

```ts
private sampleLightRays(light: FlashlightState): LightRayHit[];
```

Types:

```ts
interface LightRayHit {
  angle: number;
  distance: number;
  x: number;
  y: number;
  blocked: boolean;
  blockerId?: string;
}
```

For first pass, only draw debug rays. Do not rely on them for final rendering until stable.

### Step 3: Build Clipped Polygon

Once debug rays are stable, build the reveal polygon from ray endpoints.

```ts
private buildOccludedLightPolygon(light: FlashlightState): Phaser.Geom.Point[];
```

Use 9 rays initially.

```ts
const RAY_COUNT = 9;
```

Ray march settings:

```ts
const STEP_PX = 24;
const MAX_DISTANCE = light.range;
```

Intersection behavior:

- If ray hits a blocker, endpoint is the hit location.
- If ray hits nothing, endpoint is full range.
- Add origin as first polygon point.

### Step 4: Use Polygon For Reveal

Replace full cone reveal with clipped polygon once stable.

This becomes the seed for the later `ShadowSystem`.

---

## Future ShadowSystem Direction

After the horror lighting pass works, introduce a dedicated shadow system.

Target responsibilities:

```text
ShadowSystem
  - owns shadow caster registration
  - converts blockers/props/doors/foreground clutter into occluders
  - returns hard and soft shadow geometry
  - supports per-depth-layer shadow behavior
  - provides debug visualization
```

Future types:

```ts
export interface ShadowCaster {
  id: string;
  layer: DepthLayer | 'all';
  shape: 'rect' | 'circle' | 'polygon';
  bounds?: Rect;
  points?: Vec2[];
  softness: number;
  opacity: number;
}
```

Desired later behavior:

- Main objects cast strong shadows in main mode.
- Foreground objects cast heavy silhouettes in foreground mode.
- Background objects cast weak soft shadows in background mode.
- Enemies can cast distorted moving shadows when partially revealed.
- Boss door can cast a long unnatural shadow during the final sequence.

Do not hard-code all of this into `DarknessSystem`. Keep blocker/caster data clean so `ShadowSystem` can own it later.

---

## Implementation Plan For Codex

### Task 1: Extend FlashlightState

File:

- `src/systems/FlashlightSystem.ts`

Changes:

- Add `originX`, `originY`, `range`, `halfAngle`, `focus01`, `visualAimAngle`, `batteryInstability01`.
- Add `private focus01 = 0;`.
- Add `private visualAimAngle = 0;`.
- Animate focus instead of snapping.
- Use interpolated focus values for range, angle, intensity.
- Return new fields from `update()`.

Validation:

- `npm run typecheck` passes.
- Debug state still publishes flashlight layer/focus/flicker/battery/hits.
- Focus mode still hits enemies.
- Battery still drains.

### Task 2: Hide hard triangle behind debug mode

File:

- `src/systems/FlashlightSystem.ts`

Changes:

- Keep existing `render()` logic but make it debug-only.
- Add a class flag:

```ts
private debugBeamVisible = import.meta.env.DEV;
```

Or default it off:

```ts
private debugBeamVisible = false;
```

- Current hit markers should also be debug-only or significantly toned down.

Validation:

- Normal play no longer shows the hard filled triangle.
- Debug mode can still show the cone and hit markers.

### Task 3: Create DarknessSystem

File:

- `src/systems/DarknessSystem.ts`

Implement:

```ts
export class DarknessSystem {
  constructor(scene: Phaser.Scene, config: DarknessSystemConfig) {}
  setWorldBounds(width: number, height: number): void {}
  setBlockers(blockers: LightBlocker[]): void {}
  update(light: FlashlightState | undefined, deltaMs: number): void {}
  destroy(): void {}
}
```

Internal objects:

```ts
private readonly darkness: Phaser.GameObjects.Graphics;
private readonly reveal: Phaser.GameObjects.Graphics;
private readonly beamFx: Phaser.GameObjects.Graphics;
private readonly vignette: Phaser.GameObjects.Graphics;
private readonly debug: Phaser.GameObjects.Graphics;
private revealStamps: RevealStamp[] = [];
```

Depths:

```ts
darkness: 1390
reveal: 1391
beamFx: 1450
vignette: 1460
debug: 2350
```

Validation:

- Scene runs with no console errors.
- A dark overlay appears over the room.
- Player remains readable.
- Flashlight direction creates a visible reveal field.
- Destroy/restart scene does not leave duplicate overlays.

### Task 4: Wire DarknessSystem into LevelScene

File:

- `src/scenes/LevelScene.ts`

Changes:

- Import `DarknessSystem`.
- Add private field.
- Instantiate after player exists.
- In `renderRoom()`, set world bounds and blockers.
- In `update()`, after flashlight update, call:

```ts
this.darknessSystem?.update(flashlightState, delta);
```

- Destroy on shutdown.

Validation:

- Starting a level shows darkness and reveal field.
- Resizing window does not break lighting.
- Returning to main menu and restarting does not duplicate lighting objects.

### Task 5: Add layer profiles

File:

- `src/systems/DarknessSystem.ts`

Changes:

- Add `LAYER_LIGHT_PROFILES`.
- Use active `light.layer` to determine darkness alpha, reveal color, creep timing, haze alpha, and vignette alpha.

Validation:

- Pressing 1/2/3 changes lighting mood.
- Main mode is clearest.
- Background mode is cooler and hazier.
- Foreground mode is warmer and more claustrophobic.

### Task 6: Add darkness creep with reveal stamps

File:

- `src/systems/DarknessSystem.ts`

Changes:

- Add `RevealStamp` type.
- Stamp player glow, broad reveal, and focus core.
- Age and expire stamps.
- Draw stamps with fade curve.

Validation:

- Lighted areas linger very briefly after the beam leaves.
- Darkness returns smoothly instead of snapping.
- Different layers have different return speeds.
- No unbounded memory growth in reveal stamps.

### Task 7: Add refracted beam FX

File:

- `src/systems/DarknessSystem.ts` or `src/systems/BeamFXSystem.ts`

Changes:

- Draw outer haze.
- Draw inner core.
- Draw edge shimmer.
- Draw origin glow.
- Draw endpoint bloom.
- Use `light.visualAimAngle`, `light.focus01`, `light.batteryInstability01`, `light.flicker`, and `light.layer`.

Validation:

- Beam looks animated and atmospheric.
- Hard triangle is no longer the visual identity.
- Focus produces a visible tightening effect.
- Low battery produces instability.

### Task 8: Add blocker debug rays

File:

- `src/systems/DarknessSystem.ts`

Changes:

- Normalize blockers.
- Add `sampleLightRays()`.
- Draw debug rays when debug is enabled.
- Keep rendering unchanged for this task.

Validation:

- Debug rays stop at blockers.
- Debug rays reach full range when unobstructed.
- No visible behavior change when debug is off.

### Task 9: Use blocker polygon for reveal

File:

- `src/systems/DarknessSystem.ts`

Changes:

- Build polygon from ray hits.
- Use the polygon for focus core or main directional reveal.
- Keep a fallback to non-occluded reveal if blockers are unavailable.

Validation:

- Light visibly stops at blockers.
- Beam does not punch through obvious walls/furniture.
- Polygon remains stable during fast aim movement.
- Performance remains acceptable.

---

## Debug Controls

Add simple debug flags inside `DarknessSystem` first. Do not overbuild input plumbing yet.

Suggested flags:

```ts
private debugEnabled = import.meta.env.DEV;
private debugShowRays = false;
private debugShowRevealStamps = false;
private debugShowOcclusionPolygon = false;
```

Later, wire to existing debug commands.

Debug visual colors:

- Gameplay cone: yellow
- Visual aim: pale blue
- Rays: green if clear, red if blocked
- Reveal stamps: purple/white circles
- Occlusion polygon: cyan outline

Update `window.__PILEUP_DEBUG__` in `LevelScene.publishDebugState()` once useful:

```ts
darkness: {
  stampCount,
  blockerCount,
  rayCount,
  occluded,
}
```

Do not block the first implementation on debug state plumbing.

---

## Validation Checklist

Run these after each task group.

### Automated

```bash
npm run typecheck
npm run build
```

Expected:

- No TypeScript errors.
- Vite build completes.

### Manual Smoke Test

Start dev server:

```bash
npm run dev
```

Open the level and verify:

- Game loads without console errors.
- Darkness overlay appears.
- Player is still readable.
- Mouse aim moves the reveal field.
- WASD/arrow fallback aim still works when pointer is near the player.
- Space focus tightens the light.
- 1/2/3 switch depth profiles.
- F debug flicker still works.
- Enemies still receive light exposure.
- Stun behavior still works.
- Search and door interactions still work.
- ESC back to menu and re-enter does not duplicate lighting objects.

### Horror Feel Test

This is the subjective acceptance pass.

The feature is working when:

- Unlit areas feel dangerous.
- The player naturally sweeps the room with the flashlight.
- The light has a readable broad visibility area.
- The refracted cone feels like atmosphere, not geometry.
- Darkness creeps back after the beam leaves.
- Main layer feels safest.
- Background layer feels uncertain.
- Foreground layer feels tight and oppressive.

### Performance Check

Use browser dev tools and in-game feel.

Watch for:

- Frame drops during fast mouse movement.
- Excessive `Graphics` allocations.
- Reveal stamps growing without bound.
- Duplicate objects after scene restart.
- Mobile viewport issues.

Hard rule:

- No new Game Objects should be created every frame during normal update.
- Reveal stamps are plain data objects and must be capped.

Suggested cap:

```ts
const MAX_REVEAL_STAMPS = 48;
```

If cap is exceeded, remove oldest stamps first.

---

## Tuning Constants

Start here, then tune by feel.

```ts
const DARKNESS_BASE_ALPHA = 0.82;
const PLAYER_BUBBLE_RADIUS_X = 130;
const PLAYER_BUBBLE_RADIUS_Y = 100;
const PLAYER_BUBBLE_STRENGTH = 0.24;

const BROAD_REVEAL_RANGE = 540;
const BROAD_REVEAL_RADIUS = 170;
const BROAD_REVEAL_STRENGTH = 0.38;

const FOCUS_REVEAL_RANGE = 670;
const FOCUS_REVEAL_STRENGTH = 0.78;

const ORIGIN_GLOW_RADIUS = 34;
const END_BLOOM_RADIUS = 92;

const MAX_REVEAL_STAMPS = 48;
const REVEAL_STAMP_INTERVAL_MS = 40;

const LOW_BATTERY_THRESHOLD = 30;
const CRITICAL_BATTERY_THRESHOLD = 12;
```

Avoid over-tuning before the full stack exists. Get the architecture working first.

---

## Risks And Mitigations

### Risk: The darkness makes gameplay unreadable

Mitigation:

- Keep player safety bubble always active.
- Keep base darkness alpha tunable.
- Main layer should be the clearest profile.
- Add debug query param later if needed: `?lighting=off` or `?darkness=0`.

### Risk: Graphics rendering becomes expensive

Mitigation:

- Reuse graphics objects.
- Cap reveal stamps.
- Use simple circle-chain reveals before complex masks.
- Add quality levels later.

### Risk: Visual aim desync frustrates combat

Mitigation:

- Gameplay cone still uses precise aim.
- Visual lag should be subtle.
- Focus can reduce jitter.

### Risk: Occlusion breaks target detection

Mitigation:

- First occlusion pass is visual only.
- Keep gameplay cone unchanged.
- Add occlusion-aware enemy detection only after visual occlusion is stable.

### Risk: Layer profiles confuse the player

Mitigation:

- Main remains the most neutral and useful.
- Layer colors match current HUD colors.
- Depth switch should include a small visual pulse/click.

---

## Definition Of Done

The implementation is complete when:

- `DarknessSystem` exists and is wired into `LevelScene`.
- Current hard triangle is hidden during normal play.
- Flashlight creates a soft reveal field.
- Darkness returns after the beam leaves.
- Focus tightens and strengthens the reveal.
- Battery affects lighting stability.
- Depth layer changes visual lighting profile.
- Existing enemy hit/exposure logic still works.
- Existing search/door flow still works.
- Scene shutdown destroys lighting objects cleanly.
- `npm run typecheck` passes.
- `npm run build` passes.

The implementation is ready for the next shadow-system pass when:

- `DarknessSystem` can accept blocker data.
- Debug ray sampling exists or has a clear TODO location.
- Occlusion polygon generation is either implemented or stubbed behind a method boundary.
- Lighting code does not hard-code room geometry assumptions that would block future shadow casters.

## Current Implementation Snapshot

Status after the initial Phase 11 darkness groundwork:

- `DarknessSystem` exists and is wired into `LevelScene`.
- The normal flashlight view uses a darkness render texture with erase-mask reveal stamps instead of the old hard triangle.
- Depth profiles control darkness alpha, reveal behavior, creep timing, haze, and vignette.
- Player readability, broad reveal, focus reveal, beam edge shimmer, origin glow, endpoint bloom, and low-battery instability are implemented.
- Focus reveal and endpoint bloom follow the current cursor/lock target distance instead of always landing at a static far point.
- Blocker data is accepted and debug ray sampling can show blocked rays.
- The darkness and vignette surfaces use viewport overscan so camera-follow movement and scaling do not expose bright edge strips.

Remaining darkness work:

- Convert blocker ray hits into an occluded reveal polygon so light visibly stops at walls, furniture, and foreground/background occluders.
- Split reusable shadow-caster data into a future `ShadowSystem` instead of growing permanent room-geometry assumptions inside `DarknessSystem`.
- Add richer debug controls for reveal stamps, occlusion polygons, and lighting quality/tuning.
- Add a `?lighting=off` or `?darkness=0` development escape hatch if darkness tuning blocks QA.
- Tune darkness readability across desktop, ultrawide, and phone landscape once production room art replaces graybox shapes.
- Consider a reveal-memory texture if reveal stamps become visually choppy or too expensive.

---

## Recommended First PR Scope

Keep the first PR tight:

1. Extend `FlashlightState`.
2. Add focus smoothing.
3. Add visual aim angle.
4. Create `DarknessSystem`.
5. Wire it into `LevelScene`.
6. Draw base darkness, player bubble, broad reveal, focus core, and simple beam haze.
7. Hide old hard triangle outside debug.
8. Validate build and gameplay behavior.

Leave blocker occlusion and shadow polygon rendering for the second PR unless the first pass lands cleanly fast.

This gives the game the horror-lighting direction immediately while keeping the codebase stable enough for the shadow system to follow.
