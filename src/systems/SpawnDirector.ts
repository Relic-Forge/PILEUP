import Phaser from 'phaser';
import type { DepthLayer } from '../core/Types';
import type { RuntimeRoom } from '../data/levelTypes';

export interface EnemySpawnConfig {
  id: string;
  enemyType: 'laundry_monster' | 'sock_goblin' | 'hanger_stalker' | 'dish_crawler' | 'drawer_mimic' | 'door_hoard';
  x: number;
  y: number;
  startingLayer: DepthLayer;
  pressure: number;
}

const hashSeed = (seed: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const seededRandom = (seed: string): number => {
  const state = Math.imul(1664525, hashSeed(seed) || 1) + 1013904223;
  return (state >>> 0) / 4294967296;
};

export class SpawnDirector {
  getEnemySpawns(room: RuntimeRoom): EnemySpawnConfig[] {
    const spawns: EnemySpawnConfig[] = [];
    room.segments.forEach((segment) => {
      const occupiedX: number[] = [];
      segment.enemySpawns.forEach((spawnId, index) => {
        const x = this.enemyXFor(room.seed, segment, spawnId, index, occupiedX);
        occupiedX.push(x);
        spawns.push({
          id: `${segment.id}_${spawnId}`,
          enemyType: this.enemyTypeFor(spawnId),
          x,
          y: 748 + (segment.roomOrder % 3) * 22,
          startingLayer: this.startingLayerFor(spawnId),
          pressure: segment.roomOrder,
        });
      });
    });

    return spawns;
  }

  private enemyXFor(
    seed: string,
    segment: RuntimeRoom['segments'][number],
    spawnId: string,
    index: number,
    occupiedX: readonly number[],
  ): number {
    const searchSlots = segment.searchNodes.map((_, searchIndex) => segment.x + segment.width * (0.28 + searchIndex * 0.18));
    const minimumGap = Math.min(240, Math.max(150, segment.width * 0.16));
    const laneSeed = `${seed}:${segment.id}:${spawnId}:${index}`;
    const jitter = (seededRandom(`${laneSeed}:jitter`) - 0.5) * Math.min(180, segment.width * 0.12);
    const fractions = [0.14, 0.42, 0.62, 0.82]
      .map((fraction, candidateIndex) => ({
        fraction,
        score: seededRandom(`${laneSeed}:candidate:${candidateIndex}`),
      }))
      .sort((a, b) => a.score - b.score)
      .map(({ fraction }) => fraction);

    const minX = segment.x + 96;
    const maxX = segment.x + segment.width - 96;
    const candidate = fractions
      .map((fraction) => Phaser.Math.Clamp(segment.x + segment.width * fraction + jitter, minX, maxX))
      .find((x) => [...searchSlots, ...occupiedX].every((occupied) => Math.abs(occupied - x) >= minimumGap));

    if (candidate !== undefined) {
      return candidate;
    }

    return Array.from({ length: 12 }, (_, candidateIndex) =>
      Phaser.Math.Clamp(segment.x + segment.width * (0.1 + candidateIndex * 0.073), minX, maxX),
    ).sort((left, right) => this.nearestDistance(right, [...searchSlots, ...occupiedX]) - this.nearestDistance(left, [...searchSlots, ...occupiedX]))[0];
  }

  private nearestDistance(x: number, occupiedX: readonly number[]): number {
    return occupiedX.reduce((nearest, occupied) => Math.min(nearest, Math.abs(occupied - x)), Number.POSITIVE_INFINITY);
  }

  private enemyTypeFor(spawnId: string): EnemySpawnConfig['enemyType'] {
    if (spawnId.includes('sock')) {
      return 'sock_goblin';
    }
    if (spawnId.includes('coat') || spawnId.includes('hanging')) {
      return 'hanger_stalker';
    }
    if (spawnId.includes('dish')) {
      return 'dish_crawler';
    }
    if (spawnId.includes('drawer')) {
      return 'drawer_mimic';
    }
    if (spawnId.includes('hoard')) {
      return 'door_hoard';
    }
    return 'laundry_monster';
  }

  private startingLayerFor(spawnId: string): DepthLayer {
    if (spawnId.includes('coat') || spawnId.includes('hanging')) {
      return 'foreground';
    }
    if (spawnId.includes('dish') || spawnId.includes('drawer')) {
      return 'main';
    }
    return 'background';
  }
}
