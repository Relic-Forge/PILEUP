import Phaser from 'phaser';
import { gameEvents } from '../core/EventBus';
import type { DepthLayer, EnemyState } from '../core/Types';

export interface EnemyLightExposure {
  layer: DepthLayer;
  intensity: number;
  durationMs: number;
}

export interface EnemyUpdateContext {
  playerX: number;
  playerY: number;
  deltaMs: number;
}

export interface EnemyDebugState {
  id: string;
  state: EnemyState;
  layer: DepthLayer;
  health: number;
  exposureMs: number;
}

export abstract class Enemy {
  readonly container: Phaser.GameObjects.Container;
  protected state: EnemyState = 'Dormant';
  protected health = 100;
  protected currentLayer: DepthLayer;
  protected exposureMs = 0;

  constructor(
    protected readonly scene: Phaser.Scene,
    readonly id: string,
    x: number,
    y: number,
    startingLayer: DepthLayer,
    children: Phaser.GameObjects.GameObject[],
  ) {
    this.currentLayer = startingLayer;
    this.container = scene.add.container(x, y, children);
    this.container.setSize(128, 108);
  }

  get x(): number {
    return this.container.x;
  }

  get y(): number {
    return this.container.y;
  }

  get layer(): DepthLayer {
    return this.currentLayer;
  }

  getState(): EnemyState {
    return this.state;
  }

  getExposureMs(): number {
    return this.exposureMs;
  }

  abstract update(context: EnemyUpdateContext): void;

  abstract applyLightExposure(exposure: EnemyLightExposure): void;

  getDebugState(): EnemyDebugState {
    return {
      id: this.id,
      state: this.state,
      layer: this.currentLayer,
      health: Math.round(this.health),
      exposureMs: Math.round(this.exposureMs),
    };
  }

  protected setState(nextState: EnemyState): void {
    if (nextState === this.state) {
      return;
    }

    this.state = nextState;
    gameEvents.emit({ type: 'enemy.stateChanged', enemyId: this.id, state: nextState });
  }

  destroy(): void {
    this.container.destroy(true);
  }
}
