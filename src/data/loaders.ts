import { DESIGN_WIDTH } from '../systems/ResponsiveScaleSystem';
import type { RuntimeRoom, RuntimeRoomSegment, SourceLevelData, SourceRoomData } from './levelTypes';

export const dataAssetPath = (fileName: string): string => `/assets/data/${fileName}`;

export const adaptRoomFromSource = (room: SourceRoomData): RuntimeRoom => {
  let cursorX = 0;
  const segments: RuntimeRoomSegment[] = room.segments.map((segment) => {
    const width = Math.round(segment.width_screens * DESIGN_WIDTH);
    const runtimeSegment: RuntimeRoomSegment = {
      id: segment.id,
      roomId: room.id,
      purpose: segment.purpose,
      x: cursorX,
      width,
      widthScreens: segment.width_screens,
      searchNodes: segment.search_nodes,
      foregroundSets: segment.foreground_sets,
      backgroundSets: segment.background_sets,
      enemySpawns: segment.enemy_spawns,
      blockers: [
        {
          id: `${segment.id}_blocker_left`,
          x: cursorX + width * 0.18,
          y: 790,
          width: Math.min(180, width * 0.16),
          height: 110,
        },
      ],
    };
    cursorX += width;
    return runtimeSegment;
  });

  return {
    id: room.id,
    role: room.role,
    width: cursorX,
    floorBounds: {
      minX: 120,
      maxX: Math.max(120, cursorX - 120),
      minY: 650,
      maxY: 875,
    },
    segments,
  };
};

export const getFirstRoom = (level: SourceLevelData): RuntimeRoom => {
  const firstRoom = [...level.rooms].sort((a, b) => a.order - b.order)[0];
  if (!firstRoom) {
    throw new Error('Level data does not contain any rooms.');
  }

  return adaptRoomFromSource(firstRoom);
};
