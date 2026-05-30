export interface SourceLevelData {
  schema: string;
  level_id: string;
  title: string;
  rooms: SourceRoomData[];
}

export interface SourceRoomData {
  id: string;
  order: number;
  role: string;
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
  width: number;
  floorBounds: RuntimeFloorBounds;
  segments: RuntimeRoomSegment[];
}
