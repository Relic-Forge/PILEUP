import Phaser from 'phaser';
import { gameEvents } from '../core/EventBus';
import type { RuntimeBlocker, RuntimeFloorBounds } from '../data/levelTypes';
import type { Player, PlayerMovementState } from '../entities/Player';
import type { PlayerInputState } from './InputSystem';
import { DepthPlaneSystem } from './DepthPlaneSystem';

interface PlayerControllerConfig {
  floorBounds: RuntimeFloorBounds;
  blockers: RuntimeBlocker[];
}

const PLAYER_RADIUS_X = 22;
const PLAYER_RADIUS_Y = 26;
const WALK_SPEED = 250;
const SPRINT_SPEED = 390;
const CROUCH_SPEED = 135;
const STAMINA_MAX = 100;
const STAMINA_DRAIN_PER_SECOND = 24;
const STAMINA_RECOVER_PER_SECOND = 18;

export class PlayerController {
  private stamina = STAMINA_MAX;
  private lastPublishedStamina = STAMINA_MAX;
  private readonly depthPlane = new DepthPlaneSystem();

  constructor(
    private readonly player: Player,
    private readonly config: PlayerControllerConfig,
  ) {}

  update(input: PlayerInputState, deltaMs: number): PlayerMovementState {
    const deltaSeconds = deltaMs / 1000;
    const normalized = new Phaser.Math.Vector2(input.x, input.y);
    if (normalized.lengthSq() > 1) {
      normalized.normalize();
    }

    const wantsSprint = input.sprint && !input.crouch && normalized.lengthSq() > 0.01;
    const canSprint = wantsSprint && this.stamina > 1;
    const speed = input.crouch ? CROUCH_SPEED : canSprint ? SPRINT_SPEED : WALK_SPEED;
    const nextX = this.player.x + normalized.x * speed * deltaSeconds;
    const nextY = this.player.y + normalized.y * speed * deltaSeconds;

    this.moveWithCollision(nextX, nextY);
    this.player.setFacing(input.x);

    if (canSprint) {
      this.stamina = Math.max(0, this.stamina - STAMINA_DRAIN_PER_SECOND * deltaSeconds);
    } else {
      this.stamina = Math.min(STAMINA_MAX, this.stamina + STAMINA_RECOVER_PER_SECOND * deltaSeconds);
    }

    this.publishStaminaIfChanged();
    this.depthPlane.applyDepth(this.player.container, this.player.y, this.config.floorBounds);

    const movementState: PlayerMovementState = {
      isMoving: normalized.lengthSq() > 0.01,
      isSprinting: canSprint,
      isCrouching: input.crouch,
      stamina: Math.round(this.stamina),
      noise: input.crouch ? 0.25 : canSprint ? 1 : normalized.lengthSq() > 0.01 ? 0.62 : 0,
    };
    this.player.playPlaceholderAnimation(deltaSeconds, movementState);
    return movementState;
  }

  private moveWithCollision(nextX: number, nextY: number): void {
    const floor = this.config.floorBounds;
    const clampedX = Phaser.Math.Clamp(nextX, floor.minX, floor.maxX);
    const clampedY = Phaser.Math.Clamp(nextY, floor.minY, floor.maxY);

    const currentX = this.player.x;
    const currentY = this.player.y;
    const xOnly = this.collidesWithBlocker(clampedX, currentY) ? currentX : clampedX;
    const yOnly = this.collidesWithBlocker(xOnly, clampedY) ? currentY : clampedY;

    this.player.setPosition(xOnly, yOnly);
  }

  private collidesWithBlocker(x: number, y: number): boolean {
    return this.config.blockers.some((blocker) => {
      const nearestX = Phaser.Math.Clamp(x, blocker.x - blocker.width / 2, blocker.x + blocker.width / 2);
      const nearestY = Phaser.Math.Clamp(y, blocker.y - blocker.height / 2, blocker.y + blocker.height / 2);
      const dx = (x - nearestX) / PLAYER_RADIUS_X;
      const dy = (y - nearestY) / PLAYER_RADIUS_Y;
      return dx * dx + dy * dy < 1;
    });
  }

  private publishStaminaIfChanged(): void {
    const rounded = Math.round(this.stamina);
    if (Math.abs(rounded - this.lastPublishedStamina) < 1) {
      return;
    }

    this.lastPublishedStamina = rounded;
    gameEvents.emit({ type: 'player.staminaChanged', value: rounded, max: STAMINA_MAX });
  }
}
