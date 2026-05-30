import type { DepthLayer } from '../core/Types';
import type { RuntimeRoom } from '../data/levelTypes';

export interface EnemySpawnConfig {
  id: string;
  enemyType: 'laundry_monster';
  x: number;
  y: number;
  startingLayer: DepthLayer;
}

export class SpawnDirector {
  getEnemySpawns(room: RuntimeRoom): EnemySpawnConfig[] {
    const spawns: EnemySpawnConfig[] = [];
    room.segments.forEach((segment) => {
      if (!segment.enemySpawns.includes('laundry_pile_monster_hint')) {
        return;
      }

      spawns.push({
        id: `${segment.id}_laundry_monster`,
        enemyType: 'laundry_monster',
        x: segment.x + segment.width * 0.28,
        y: 778,
        startingLayer: 'background',
      });
    });

    return spawns.slice(0, 1);
  }
}
