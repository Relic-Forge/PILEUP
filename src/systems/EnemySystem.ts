import Phaser from 'phaser';
import type { DepthLayer } from '../core/Types';
import { gameEvents } from '../core/EventBus';
import type { RuntimeRoom } from '../data/levelTypes';
import type { Enemy, EnemyDebugState } from '../entities/Enemy';
import type { Player } from '../entities/Player';
import { LaundryMonster } from '../enemies/LaundryMonster';
import type { FlashlightTarget } from './FlashlightSystem';
import { SpawnDirector } from './SpawnDirector';

export interface EnemySystemState {
  enemies: EnemyDebugState[];
  lastTelegraphId?: string;
  lastDamageSource?: string;
}

export class EnemySystem {
  private readonly enemies: Enemy[];
  private readonly unsubscribeEvents: Array<() => void> = [];
  private lastTelegraphId?: string;
  private lastDamageSource?: string;

  constructor(
    private readonly scene: Phaser.Scene,
    room: RuntimeRoom,
    private readonly player: Player,
    private readonly onPlayerDamage: (amount: number, source: string) => void,
  ) {
    const spawnDirector = new SpawnDirector();
    this.enemies = spawnDirector.getEnemySpawns(room).map((spawn) => new LaundryMonster(scene, spawn));

    this.unsubscribeEvents.push(gameEvents.on('flashlight.hitEnemy', (event) => {
      this.enemies
        .filter((enemy) => enemy.id === event.enemyId)
        .forEach((enemy) =>
          enemy.applyLightExposure({
            layer: event.layer,
            intensity: event.intensity,
            durationMs: event.durationMs,
          }),
        );
    }));
    this.unsubscribeEvents.push(gameEvents.on('enemy.attackTelegraph', (event) => {
      this.lastTelegraphId = event.enemyId;
    }));
    this.unsubscribeEvents.push(gameEvents.on('player.damaged', (event) => {
      this.lastDamageSource = event.source;
      this.onPlayerDamage(event.amount, event.source);
    }));
  }

  update(deltaMs: number): EnemySystemState {
    this.enemies.forEach((enemy) => {
      enemy.update({
        playerX: this.player.x,
        playerY: this.player.y,
        deltaMs,
      });
    });

    return this.getState();
  }

  getFlashlightTargets(): FlashlightTarget[] {
    return this.enemies.map((enemy) => ({
      id: enemy.id,
      layer: enemy.layer as DepthLayer,
      x: enemy.x,
      y: enemy.y,
      radius: 86,
      object: enemy.container,
    }));
  }

  getState(): EnemySystemState {
    return {
      enemies: this.enemies.map((enemy) => enemy.getDebugState()),
      lastTelegraphId: this.lastTelegraphId,
      lastDamageSource: this.lastDamageSource,
    };
  }

  destroy(): void {
    this.unsubscribeEvents.forEach((unsubscribe) => unsubscribe());
    this.unsubscribeEvents.length = 0;
    this.enemies.forEach((enemy) => enemy.destroy());
  }
}
