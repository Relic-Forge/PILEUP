import { gameEvents } from '../core/EventBus';
import type { RuntimeRoom, RuntimeRoomSegment } from '../data/levelTypes';
import { Door } from '../entities/Door';
import type { Player } from '../entities/Player';
import type { PlayerInputState } from './InputSystem';
import type { InventorySystem } from './InventorySystem';

export interface DoorSystemState {
  doorId: string;
  nearby: boolean;
  unlocking: boolean;
  unlocked: boolean;
  progress01: number;
}

const DOOR_RADIUS = 220;
const UNLOCK_SECONDS = 2.8;

export class DoorSystem {
  private readonly door: Door;
  private readonly unsubscribeEvents: Array<() => void> = [];
  private unlocking = false;
  private escapeQueued = false;

  constructor(
    private readonly scene: Phaser.Scene,
    room: RuntimeRoom,
    private readonly player: Player,
    private readonly inventory: InventorySystem,
    private readonly onEscape: () => void,
  ) {
    const segment = this.findDoorSegment(room);
    this.door = new Door(scene, {
      id: `${segment.id}_front_door`,
      x: room.floorBounds.maxX - 72,
      y: 742,
      radius: DOOR_RADIUS,
      unlockSeconds: UNLOCK_SECONDS,
    });

    this.unsubscribeEvents.push(gameEvents.on('player.damaged', () => this.interruptUnlock()));
  }

  update(input: PlayerInputState, deltaMs: number): DoorSystemState {
    const nearby = this.door.distanceTo(this.player.x, this.player.y) <= this.door.config.radius;
    const hasKey = this.inventory.keyFound();
    this.door.setNearby(nearby, hasKey, this.unlocking);

    if (this.door.isUnlocked()) {
      this.queueEscape();
      return this.getState(nearby);
    }

    if (!nearby || !hasKey || !input.interact) {
      if (this.unlocking) {
        this.unlocking = false;
        gameEvents.emit({ type: 'door.unlockProgress', doorId: this.door.id, progress01: this.door.getProgress01() });
      }
      return this.getState(nearby);
    }

    if (!this.unlocking) {
      this.unlocking = true;
      gameEvents.emit({ type: 'door.unlockStarted', doorId: this.door.id });
    }

    const nextProgress = this.door.getProgress01() + deltaMs / 1000 / this.door.config.unlockSeconds;
    this.door.setProgress(nextProgress);
    gameEvents.emit({ type: 'door.unlockProgress', doorId: this.door.id, progress01: this.door.getProgress01() });

    if (this.door.getProgress01() >= 1) {
      this.unlocking = false;
      this.door.markUnlocked();
      gameEvents.emit({ type: 'door.unlocked', doorId: this.door.id });
      this.queueEscape();
    }

    return this.getState(nearby);
  }

  destroy(): void {
    this.unsubscribeEvents.forEach((unsubscribe) => unsubscribe());
    this.unsubscribeEvents.length = 0;
    this.door.destroy();
  }

  private findDoorSegment(room: RuntimeRoom): RuntimeRoomSegment {
    return (
      room.segments.find((segment) => segment.purpose.includes('exit') || segment.purpose.includes('finale')) ??
      room.segments[room.segments.length - 1]
    );
  }

  private interruptUnlock(): void {
    if (!this.unlocking) {
      return;
    }

    this.unlocking = false;
    this.door.interrupt();
    gameEvents.emit({ type: 'door.unlockProgress', doorId: this.door.id, progress01: 0 });
  }

  private queueEscape(): void {
    if (this.escapeQueued) {
      return;
    }

    this.escapeQueued = true;
    gameEvents.emit({ type: 'objective.changed', text: 'Escape.' });
    this.scene.time.delayedCall(420, () => this.onEscape());
  }

  private getState(nearby: boolean): DoorSystemState {
    return {
      doorId: this.door.id,
      nearby,
      unlocking: this.unlocking,
      unlocked: this.door.isUnlocked(),
      progress01: Number(this.door.getProgress01().toFixed(2)),
    };
  }
}
