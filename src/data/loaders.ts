import { DESIGN_WIDTH } from '../systems/ResponsiveScaleSystem';
import type {
  RuntimeRoom,
  RuntimeRoomSegment,
  RuntimeSearchPlacement,
  RuntimeRoomTransition,
  SourceLevelData,
  SourceRoomData,
} from './levelTypes';

export const dataAssetPath = (fileName: string): string => `${import.meta.env.BASE_URL}assets/data/${fileName}`;

const hashSeed = (seed: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const createSeededRandom = (seed: string): (() => number) => {
  let state = hashSeed(seed) || 1;
  return () => {
    state = Math.imul(1664525, state) + 1013904223;
    return (state >>> 0) / 4294967296;
  };
};

const pickOne = <T>(items: T[], random: () => number): T => items[Math.floor(random() * items.length) % items.length];

const roomLabel = (roomId: string): string =>
  roomId
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const defaultPlacementForNode = (nodeId: string): RuntimeSearchPlacement => {
  if (['under_bed', 'hamper', 'trash_bag', 'front_door_clutter'].includes(nodeId)) {
    return { nodeId, resultType: 'ambush' };
  }
  if (['toy_bin', 'shoe_pile', 'towel_pile', 'dish_stack', 'toy_chest'].includes(nodeId)) {
    return { nodeId, resultType: 'junkWeight', itemId: 'junk_stack' };
  }
  if (['backpack', 'medicine_cabinet', 'mail_table', 'counter_pile', 'coffee_table'].includes(nodeId)) {
    return { nodeId, resultType: 'survivalItem', itemId: pickOne(['spare_batteries', 'cleaning_spray', 'toy_decoy'], createSeededRandom(nodeId)) };
  }
  return { nodeId, resultType: 'empty' };
};

export const createSearchPlacements = (level: SourceLevelData, seed: string): RuntimeSearchPlacement[] => {
  const random = createSeededRandom(seed);
  const rooms = [...level.rooms].sort((a, b) => a.order - b.order);
  const allNodes = rooms.flatMap((room) => room.search_nodes.map((nodeId) => ({ roomId: room.id, nodeId })));
  const blocked = new Set(level.randomization_rules?.key_cannot_spawn_in ?? []);
  const allowedRooms = new Set(level.randomization_rules?.key_spawn_rooms_allowed ?? rooms.map((room) => room.id));
  const eligibleKeyNodes = allNodes.filter(({ roomId, nodeId }) => allowedRooms.has(roomId) && !blocked.has(nodeId));
  const keyNode = pickOne(eligibleKeyNodes.length > 0 ? eligibleKeyNodes : allNodes, random);

  const placements = new Map<string, RuntimeSearchPlacement>();
  allNodes.forEach(({ nodeId }) => placements.set(nodeId, defaultPlacementForNode(nodeId)));
  placements.set(keyNode.nodeId, { nodeId: keyNode.nodeId, resultType: 'objectiveItem', itemId: 'front_door_key' });

  const objectiveCount = level.randomization_rules?.objective_items_per_run ?? 5;
  const objectivePool = allNodes
    .map(({ nodeId }) => nodeId)
    .filter((nodeId) => nodeId !== keyNode.nodeId && !blocked.has(nodeId))
    .sort(() => random() - 0.5)
    .slice(0, Math.max(0, objectiveCount - 1));
  objectivePool.forEach((nodeId, index) => {
    const itemId = ['spare_batteries', 'cleaning_spray', 'toy_decoy', 'junk_stack'][index % 4];
    placements.set(nodeId, {
      nodeId,
      resultType: itemId === 'junk_stack' ? 'junkWeight' : 'survivalItem',
      itemId,
    });
  });

  return [...placements.values()];
};

export const adaptRoomFromSource = (room: SourceRoomData, startX = 0): RuntimeRoom => {
  let cursorX = startX;
  const segments: RuntimeRoomSegment[] = room.segments.map((segment) => {
    const width = Math.round(segment.width_screens * DESIGN_WIDTH);
    const runtimeSegment: RuntimeRoomSegment = {
      id: segment.id,
      roomId: room.id,
      roomOrder: room.order,
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
          y: 870,
          width: Math.min(180, width * 0.16),
          height: 52,
        },
      ],
    };
    cursorX += width;
    return runtimeSegment;
  });

  return {
    id: room.id,
    role: room.role,
    title: roomLabel(room.id),
    seed: 'single-room',
    width: cursorX,
    floorBounds: {
      minX: startX + 120,
      maxX: Math.max(120, cursorX - 120),
      minY: 560,
      maxY: 850,
    },
    segments,
    roomTransitions: [{ roomId: room.id, label: roomLabel(room.id), x: startX, width: cursorX - startX, order: room.order }],
    searchPlacements: room.search_nodes.map(defaultPlacementForNode),
  };
};

export const getFirstRoom = (level: SourceLevelData): RuntimeRoom => {
  const firstRoom = [...level.rooms].sort((a, b) => a.order - b.order)[0];
  if (!firstRoom) {
    throw new Error('Level data does not contain any rooms.');
  }

  return adaptRoomFromSource(firstRoom);
};

export const adaptLevelFromSource = (level: SourceLevelData, seed: string): RuntimeRoom => {
  const rooms = [...level.rooms].sort((a, b) => a.order - b.order);
  if (rooms.length === 0) {
    throw new Error('Level data does not contain any rooms.');
  }

  let cursorX = 0;
  const segments: RuntimeRoomSegment[] = [];
  const roomTransitions: RuntimeRoomTransition[] = [];

  rooms.forEach((room) => {
    const adapted = adaptRoomFromSource(room, cursorX);
    const roomWidth = adapted.width - cursorX;
    segments.push(...adapted.segments);
    roomTransitions.push({
      roomId: room.id,
      label: roomLabel(room.id),
      x: cursorX,
      width: roomWidth,
      order: room.order,
    });
    cursorX = adapted.width;
  });

  return {
    id: level.level_id,
    role: 'full_house_sequence',
    title: level.title,
    seed,
    width: cursorX,
    floorBounds: {
      minX: 120,
      maxX: Math.max(120, cursorX - 120),
      minY: 560,
      maxY: 850,
    },
    segments,
    roomTransitions,
    searchPlacements: createSearchPlacements(level, seed),
  };
};
