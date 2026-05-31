import Phaser from 'phaser';
import { playerAnimationKey } from '../assets/playerAssetSet';

const ACTION_VISUAL_HOLD_MS: Record<'hurt', number> = {
  hurt: 960,
};
const FLASHLIGHT_TIP_FRAME = { x: 0.79, y: 0.44 };
const FALLBACK_FLASHLIGHT_TIP_LOCAL = { x: 58, y: -135 };
const REFERENCE_FRAME_SIZE = 1024;
const REFERENCE_SPRITE_SCALE = 0.38;

export interface PlayerMovementState {
  isMoving: boolean;
  isSprinting: boolean;
  isCrouching: boolean;
  stamina: number;
  noise: number;
}

export class Player {
  readonly container: Phaser.GameObjects.Container;
  private readonly body: Phaser.GameObjects.Ellipse;
  private readonly head: Phaser.GameObjects.Ellipse;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly strideMarker: Phaser.GameObjects.Rectangle;
  private readonly sprite?: Phaser.GameObjects.Sprite;
  private facing: -1 | 1 = 1;
  private walkPhase = 0;
  private activeAnimation = '';
  private visualActionHoldUntil = 0;
  private readonly spriteBaselineY = 50;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
  ) {
    this.shadow = scene.add.ellipse(0, 30, 62, 18, 0x070608, 0.45).setDepth(-1);
    this.body = scene.add.ellipse(0, 0, 46, 82, 0xe7e2d1, 1);
    this.head = scene.add.ellipse(0, -48, 38, 34, 0xf3edda, 1);
    this.strideMarker = scene.add.rectangle(0, 36, 30, 6, 0x9d9078, 0.9);
    const eye = scene.add.rectangle(12, -52, 5, 5, 0x312d33, 1);
    const animationKey = playerAnimationKey('idle');
    if (scene.anims.exists(animationKey)) {
      this.sprite = scene.add.sprite(0, 0, 'player_child_idle_sheet').setOrigin(0.5, 0.92);
      this.sprite.setScale(this.getRuntimeSpriteScale(this.sprite)).play(animationKey);
    }
    this.activeAnimation = this.sprite ? animationKey : '';

    this.container = scene.add.container(x, y, [this.shadow, this.body, this.head, this.strideMarker, eye]);
    if (this.sprite) {
      this.container.add(this.sprite);
      this.shadow.setY(50).setSize(76, 20);
      this.body.setVisible(false);
      this.head.setVisible(false);
      this.strideMarker.setVisible(false);
      eye.setVisible(false);
    }
    this.container.setSize(46, 92);
  }

  get x(): number {
    return this.container.x;
  }

  get y(): number {
    return this.container.y;
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  setFacing(directionX: number): void {
    if (directionX === 0) {
      return;
    }

    this.facing = directionX < 0 ? -1 : 1;
    this.container.setScale(this.facing, 1);
  }

  getFacing(): -1 | 1 {
    return this.facing;
  }

  getFlashlightTipWorld(): Phaser.Math.Vector2 {
    if (!this.sprite) {
      return new Phaser.Math.Vector2(
        this.x + FALLBACK_FLASHLIGHT_TIP_LOCAL.x * this.facing,
        this.y + FALLBACK_FLASHLIGHT_TIP_LOCAL.y,
      );
    }

    const localTipX = this.sprite.x + (FLASHLIGHT_TIP_FRAME.x - this.sprite.originX) * this.sprite.displayWidth;
    const localTipY = this.sprite.y + (FLASHLIGHT_TIP_FRAME.y - this.sprite.originY) * this.sprite.displayHeight;

    return new Phaser.Math.Vector2(this.x + localTipX * this.container.scaleX, this.y + localTipY * this.container.scaleY);
  }

  getReadabilityCenterWorld(): Phaser.Math.Vector2 {
    if (this.sprite) {
      const bounds = this.sprite.getBounds();
      return new Phaser.Math.Vector2(bounds.centerX, bounds.centerY);
    }

    return new Phaser.Math.Vector2(this.x, this.y - 18);
  }

  playPlaceholderAnimation(deltaSeconds: number, movement: PlayerMovementState): void {
    if (!this.isVisualActionHeld()) {
      this.updateSpriteAnimation(movement);
    }

    const speedMultiplier = movement.isSprinting ? 18 : movement.isCrouching ? 6 : 10;
    this.walkPhase += movement.isMoving ? deltaSeconds * speedMultiplier : deltaSeconds * 4;
    const bob = movement.isMoving ? Math.sin(this.walkPhase) * (movement.isCrouching ? 1.5 : 2.5) : Math.sin(this.walkPhase) * 0.8;

    if (this.sprite) {
      this.sprite.setY(this.spriteBaselineY + bob);
      this.sprite.setAlpha(movement.isCrouching ? 0.82 : 1);
      return;
    }

    this.body.setY(movement.isCrouching ? 12 + bob : bob);
    this.head.setY(movement.isCrouching ? -28 + bob : -48 + bob);
    this.strideMarker.setRotation(movement.isMoving ? Math.sin(this.walkPhase) * 0.22 : 0);
    this.container.setAlpha(movement.isCrouching ? 0.82 : 1);
  }

  playActionAnimation(action: 'search' | 'hurt' | 'unlock_door'): void {
    if (action === 'hurt') {
      this.visualActionHoldUntil = this.scene.time.now + ACTION_VISUAL_HOLD_MS.hurt;
    }

    if (this.isVisualActionHeld() && action !== 'hurt') {
      return;
    }

    this.playSpriteAnimation(action);
  }

  hasProductionSprite(): boolean {
    return Boolean(this.sprite);
  }

  destroy(): void {
    this.container.destroy(true);
  }

  private updateSpriteAnimation(movement: PlayerMovementState): void {
    if (!this.sprite) {
      return;
    }

    if (!movement.isMoving) {
      this.playSpriteAnimation('idle');
      return;
    }

    this.playSpriteAnimation(movement.isSprinting ? 'run' : 'walk');
  }

  private isVisualActionHeld(): boolean {
    return this.scene.time.now < this.visualActionHoldUntil;
  }

  private playSpriteAnimation(animationId: string): void {
    const animationKey = playerAnimationKey(animationId);

    if (!this.sprite || this.activeAnimation === animationKey || !this.scene.anims.exists(animationKey)) {
      return;
    }

    this.activeAnimation = animationKey;
    this.sprite.play(animationKey, true);
  }

  private getRuntimeSpriteScale(sprite: Phaser.GameObjects.Sprite): number {
    return REFERENCE_SPRITE_SCALE * (REFERENCE_FRAME_SIZE / sprite.frame.width);
  }
}
