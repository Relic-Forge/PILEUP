# PILEUP Technical Implementation Spec — Phaser 4 + TypeScript

This spec defines implementation contracts for Codex. Use it alongside `PILEUP_Build_Spec_Phases_and_Acceptance.md`.

---

## 1. Recommended package baseline

Use these as starting constraints:

```json
{
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "phaser": "^4.1.0"
  },
  "devDependencies": {
    "@vitejs/plugin-basic-ssl": "latest",
    "typescript": "latest",
    "vite": "latest"
  }
}
```

If Phaser 4 package availability or API surface changes, Codex must pin the latest stable Phaser 4.x version that installs successfully and document the pinned version in `README.md`.

---

## 2. TypeScript data contracts

Create `src/core/Types.ts` with contracts equivalent to the following.

```ts
export type DepthLayer = 'foreground' | 'main' | 'background';
export type RoomLayerId = 'farBackground' | 'backgroundClutter' | 'mainGameplay' | 'foregroundClutter' | 'fxLighting';
export type SearchResultType = 'objectiveItem' | 'survivalItem' | 'weaponOrTool' | 'junkWeight' | 'ambush' | 'noiseTrap' | 'loreClue' | 'empty';
export type EnemyState =
  | 'Dormant'
  | 'Hinted'
  | 'StalkingBackground'
  | 'StalkingForeground'
  | 'EnteringMainPlane'
  | 'Revealed'
  | 'Telegraph'
  | 'Attacking'
  | 'Recovering'
  | 'Stunned'
  | 'Retreating'
  | 'DeadOrDisabled';

export interface Vec2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RoomSegmentData {
  id: string;
  roomId: string;
  segmentType: 'entryBreather' | 'searchPressure' | 'ambush' | 'transition' | 'bossApproach' | 'escapeDoor';
  widthWorld: number;
  floorBounds: Rect;
  layers: RoomLayerData[];
  blockers: Rect[];
  searchNodes: SearchNodeData[];
  enemyAnchors: EnemyAnchorData[];
  lightZones: LightZoneData[];
  exits: ExitData[];
}

export interface RoomLayerData {
  id: RoomLayerId;
  assetKey: string;
  scrollFactor: number;
  depth: number;
  offset: Vec2;
  bleedWorld: number;
}

export interface SearchNodeData {
  id: string;
  type: string;
  position: Vec2;
  radius: number;
  depthLayer: DepthLayer;
  baseSearchSeconds: number;
  noiseOnSearch: number;
  allowedResultTypes: SearchResultType[];
  tags: string[];
}

export interface EnemyAnchorData {
  id: string;
  enemyType: string;
  position: Vec2;
  startingLayer: DepthLayer;
  activationTags: string[];
  difficultyWeight: number;
}

export interface LightZoneData {
  id: string;
  area: Rect;
  state: 'off' | 'flicker' | 'on';
  affectsLayers: DepthLayer[];
}

export interface ExitData {
  id: string;
  targetRoomId?: string;
  targetSegmentId?: string;
  area: Rect;
  lockedBy?: string;
}
```

---

## 3. System ownership

### `ResponsiveScaleSystem`

Owns:

- design resolution
- viewport classification
- safe area
- device pixel ratio policy
- phone portrait prompt
- UI scale value

Must not own:

- gameplay camera logic
- player movement
- level data

### `CameraSystem`

Owns:

- following player
- clamping to segment/room bounds
- camera dead zone
- camera smoothing
- ultrawide reveal behavior

Must not stretch world art.

### `ParallaxSystem`

Owns:

- creating layer containers
- applying scroll factors
- ordering layers
- loading segment art
- culling/unloading offscreen segment layers later if needed

### `DepthPlaneSystem`

Owns:

- Y-depth sorting
- mapping main floor Y to render depth
- tagging objects as foreground/main/background
- determining if flashlight can hit target by layer

### `FlashlightSystem`

Owns:

- active/off state
- cone/focused beam geometry
- selected depth layer
- hit detection against enemies/search nodes
- battery/flicker state
- flashlight event output

Outputs events only. Enemy logic decides what to do with light events.

### `EnemySystem`

Owns:

- enemy updates
- enemy registration
- state machine ticking
- collision/hit checks
- damage events

Does not own player input or UI.

### `RandomizationSystem`

Owns:

- seeded RNG
- objective item placement
- loot tables
- fairness validation
- debug seed display

Must be deterministic for a given seed.

---

## 4. Event bus events

Use a typed event bus or minimal strongly-typed wrapper.

Required events:

```ts
type GameEvent =
  | { type: 'player.healthChanged'; value: number; max: number }
  | { type: 'player.staminaChanged'; value: number; max: number }
  | { type: 'player.burdenChanged'; state: string; value: number }
  | { type: 'mess.changed'; value: number; max: number }
  | { type: 'objective.changed'; text: string }
  | { type: 'hotbar.changed'; slots: unknown[] }
  | { type: 'flashlight.depthChanged'; layer: DepthLayer }
  | { type: 'flashlight.hitEnemy'; enemyId: string; layer: DepthLayer; intensity: number; durationMs: number }
  | { type: 'search.started'; nodeId: string }
  | { type: 'search.cancelled'; nodeId: string }
  | { type: 'search.completed'; nodeId: string; resultType: SearchResultType }
  | { type: 'item.collected'; itemId: string }
  | { type: 'enemy.stateChanged'; enemyId: string; state: EnemyState }
  | { type: 'enemy.attackTelegraph'; enemyId: string }
  | { type: 'door.unlockStarted'; doorId: string }
  | { type: 'door.unlockProgress'; doorId: string; progress01: number }
  | { type: 'door.unlocked'; doorId: string }
  | { type: 'run.seeded'; seed: string };
```

---

## 5. Data validation

On preload/startup, validate:

- every level references existing asset keys
- every segment has positive width
- every segment has valid floor bounds
- every search node has valid result types
- every enemy anchor references known enemy type
- every objective item can spawn in at least two valid locations unless intentionally fixed
- required v1 objective item count is exactly five
- at least one key exists in objective item pool

Invalid data should fail loudly in development mode and show a readable error in production mode.

---

## 6. Debug overlay requirements

F3 toggles debug overlay.

Overlay must show:

- FPS
- viewport size
- device category
- camera world X/Y
- player X/Y
- selected flashlight depth
- current room/segment
- seed
- mess level
- active enemy count
- enemy state labels when enabled
- collision boxes when enabled
- flashlight cone geometry when enabled
- search node IDs when enabled

---

## 7. Placeholder asset policy

Codex may use placeholder rectangles/silhouettes until production art exists.

However, placeholders must preserve production dimensions and metadata behavior:

- hero enemy placeholder frame should simulate 1024×1024 frame behavior
- player placeholder should have anchor/pivot at feet
- room layer placeholder should include bleed
- UI placeholder should use scalable panels, not fixed screenshots

---

## 8. Save/run data

For MVP, persistence can be minimal.

Required:

- last run seed visible in debug
- settings saved locally: volume, fullscreen preference, controls if implemented
- no campaign progression required

---

## 9. Manual smoke test commands

Every phase must include these checks:

```text
npm install
npm run typecheck
npm run build
npm run dev
```

Manual viewport checks:

```text
1280x720
1920x1080
2560x1440
3840x2160
3440x1440 ultrawide
phone landscape emulation
phone portrait emulation
```
