export type DepthLayer = 'foreground' | 'main' | 'background';
export type RoomLayerId =
  | 'farBackground'
  | 'backgroundClutter'
  | 'mainGameplay'
  | 'foregroundClutter'
  | 'fxLighting';
export type SearchResultType =
  | 'objectiveItem'
  | 'survivalItem'
  | 'weaponOrTool'
  | 'junkWeight'
  | 'ambush'
  | 'noiseTrap'
  | 'loreClue'
  | 'empty';
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
  segmentType:
    | 'entryBreather'
    | 'searchPressure'
    | 'ambush'
    | 'transition'
    | 'bossApproach'
    | 'escapeDoor';
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

export type GameEvent =
  | { type: 'player.healthChanged'; value: number; max: number }
  | { type: 'player.staminaChanged'; value: number; max: number }
  | { type: 'player.burdenChanged'; state: string; value: number }
  | { type: 'mess.changed'; value: number; max: number }
  | { type: 'objective.changed'; text: string }
  | { type: 'hotbar.changed'; slots: unknown[] }
  | { type: 'flashlight.depthChanged'; layer: DepthLayer }
  | { type: 'flashlight.batteryChanged'; value: number; flicker: boolean; focus: boolean }
  | {
      type: 'flashlight.hitEnemy';
      enemyId: string;
      layer: DepthLayer;
      intensity: number;
      durationMs: number;
    }
  | { type: 'search.started'; nodeId: string }
  | {
      type: 'search.progressChanged';
      nodeId?: string;
      label: string;
      progress01: number;
      noise: number;
      isSearching: boolean;
    }
  | { type: 'search.cancelled'; nodeId: string }
  | { type: 'search.completed'; nodeId: string; resultType: SearchResultType }
  | { type: 'item.collected'; itemId: string }
  | { type: 'enemy.stateChanged'; enemyId: string; state: EnemyState }
  | { type: 'enemy.attackTelegraph'; enemyId: string }
  | { type: 'player.damaged'; source: string; amount: number }
  | { type: 'door.unlockStarted'; doorId: string }
  | { type: 'door.unlockProgress'; doorId: string; progress01: number }
  | { type: 'door.unlocked'; doorId: string }
  | { type: 'run.seeded'; seed: string };
