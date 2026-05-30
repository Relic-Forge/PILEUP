import type { SearchResultType } from '../core/Types';

export interface SourceLevelData {
  schema: string;
  level_id: string;
  title: string;
  rooms: SourceRoomData[];
  randomization_rules?: SourceRandomizationRules;
}

export interface SourceRandomizationRules {
  objective_items_per_run: number;
  key_spawn_rooms_allowed: string[];
  key_cannot_spawn_in: string[];
  max_active_standard_enemies_per_room: number;
  ambush_piles_per_run_range: [number, number];
  fixed_boss_location: string;
}

export interface SourceRoomData {
  id: string;
  order: number;
  role: string;
  search_nodes: string[];
  enemy_pool: string[];
  width_screens: number;
  target_traversal_seconds_walk: number;
  target_search_time_seconds: number;
  segment_count: number;
  segments: SourceSegmentData[];
}

export interface SourceSegmentData {
  id: string;
  width_screens: number;
  purpose: string;
  search_nodes: string[];
  foreground_sets: string[];
  background_sets: string[];
  enemy_spawns: string[];
  parallax_bleed_required: boolean;
}

export interface RuntimeRoomSegment {
  id: string;
  roomId: string;
  roomOrder: number;
  purpose: string;
  x: number;
  width: number;
  widthScreens: number;
  searchNodes: string[];
  foregroundSets: string[];
  backgroundSets: string[];
  enemySpawns: string[];
  blockers: RuntimeBlocker[];
}

export interface RuntimeRoomTransition {
  roomId: string;
  label: string;
  x: number;
  width: number;
  order: number;
}

export interface RuntimeSearchPlacement {
  nodeId: string;
  resultType: SearchResultType;
  itemId?: string;
}

export interface RuntimeBlocker {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RuntimeFloorBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface RuntimeRoom {
  id: string;
  role: string;
  title: string;
  seed: string;
  width: number;
  floorBounds: RuntimeFloorBounds;
  segments: RuntimeRoomSegment[];
  roomTransitions: RuntimeRoomTransition[];
  searchPlacements: RuntimeSearchPlacement[];
}
