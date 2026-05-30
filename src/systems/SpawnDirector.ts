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

export class SpawnDirector {
  getEnemySpawns(room: RuntimeRoom): EnemySpawnConfig[] {
    const spawns: EnemySpawnConfig[] = [];
    room.segments.forEach((segment) => {
      segment.enemySpawns.forEach((spawnId, index) => {
        spawns.push({
          id: `${segment.id}_${spawnId}`,
          enemyType: this.enemyTypeFor(spawnId),
          x: segment.x + segment.width * (0.28 + index * 0.18),
          y: 748 + (segment.roomOrder % 3) * 22,
          startingLayer: this.startingLayerFor(spawnId),
          pressure: segment.roomOrder,
        });
      });
    });

    return spawns;
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
