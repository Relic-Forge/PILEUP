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
export type BackpackTabId = 'inventory' | 'lostItems' | 'notes';
export type ItemCategory =
  | 'required_objective'
  | 'consumable'
  | 'utility_weapon'
  | 'utility'
  | 'memory'
  | 'decoy'
  | 'junk';

export interface ItemDefinition {
  id: string;
  label: string;
  category: ItemCategory;
  iconAssetId: string;
  hotbar: boolean;
  usable: boolean;
  stackable: boolean;
  maxStack?: number;
  burden: number;
  effectId?: string;
  useContexts: Array<'gameplay' | 'searching' | 'combat' | 'door' | 'menuOnly'>;
  description: string;
  disabledUseText?: string;
}

export interface InventoryEntry {
  itemId: string;
  count: number;
  discoveredAtMs: number;
  assignedHotbarSlot?: number;
  isKeyItem: boolean;
}

export interface LostItemEntry {
  itemId: string;
  label: string;
  found: boolean;
  hint?: string;
  required: boolean;
}

export interface BackpackMenuState {
  open: boolean;
  activeTab: BackpackTabId;
  selectedItemId?: string;
  selectedIndex: number;
  inputMode: 'keyboardMouse' | 'controller' | 'touch';
}

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
  | { type: 'checklist.created'; items: Array<{ itemId: string; label: string }> }
  | { type: 'inventory.changed'; entries: InventoryEntry[]; hotbarSlots: InventoryEntry[]; burden: number; burdenState: string }
  | { type: 'inventory.selectedChanged'; itemId?: string; hotbarSlot?: number }
  | { type: 'inventory.useRequested'; itemId: string; source: 'hud' | 'backpack' | 'hotbar' }
  | { type: 'inventory.useProgress'; itemId: string; label: string; progress01: number; active: boolean }
  | { type: 'inventory.useResolved'; itemId: string; success: boolean; reason?: string }
  | { type: 'inventory.dropRequested'; itemId: string; count: number }
  | { type: 'backpack.opened' }
  | { type: 'backpack.closed' }
  | { type: 'backpack.tabChanged'; tab: BackpackTabId }
  | { type: 'lostItems.changed'; items: LostItemEntry[] }
  | { type: 'hud.toast'; tone: 'item' | 'warning' | 'objective' | 'damage'; text: string }
  | { type: 'flashlight.depthChanged'; layer: DepthLayer }
  | { type: 'flashlight.batteryChanged'; value: number; flicker: boolean; focus: boolean }
  | { type: 'flashlight.toggleRequested'; source: 'hud' | 'hotbar' }
  | { type: 'flashlight.powerChanged'; enabled: boolean }
  | { type: 'flashlight.focusStarted' }
  | { type: 'flashlight.focusEnded' }
  | { type: 'flashlight.depthSwitch'; layer: DepthLayer }
  | { type: 'flashlight.flickerBurst'; battery: number }
  | { type: 'flashlight.batteryCritical' }
  | { type: 'settings.darknessToggled'; disabled: boolean }
  | { type: 'settings.debugOverlayToggled'; visible: boolean }
  | { type: 'settings.worldDebugToggled'; visible: boolean }
  | { type: 'flashlight.hitEnemyStarted'; enemyId: string }
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
