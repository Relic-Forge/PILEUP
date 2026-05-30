import Phaser from 'phaser';
import { gameEvents } from '../core/EventBus';
import type { DepthLayer, EnemyState } from '../core/Types';
import { Enemy, type EnemyLightExposure, type EnemyUpdateContext } from '../entities/Enemy';
import { EnemyStateMachine } from '../systems/EnemyStateMachine';

export interface LaundryMonsterConfig {
  id: string;
  x: number;
  y: number;
  startingLayer: DepthLayer;
  displayName?: string;
  bodyColor?: number;
  damage?: number;
  mainSpeed?: number;
}

const REVEAL_DISTANCE = 620;
const ENTER_DISTANCE = 460;
const TELEGRAPH_DISTANCE = 155;
const DAMAGE_DISTANCE = 118;
const SLOW_LIGHT_MS = 260;
const OVEREXPOSE_MS = 2500;
const FOCUSED_STUN_MS = 520;
const STALK_SPEED = 34;
const MAIN_SPEED = 58;
const LUNGE_SPEED = 350;
const DAMAGE = 18;

const STATE_TINTS: Partial<Record<EnemyState, number>> = {
  Dormant: 0x34303a,
  Hinted: 0x58475d,
  StalkingBackground: 0x655173,
  EnteringMainPlane: 0x8a6b70,
  Revealed: 0x9f7b6f,
  Telegraph: 0xf0c46d,
  Attacking: 0xd86d55,
  Recovering: 0x756a64,
  Stunned: 0x8fc7df,
};

export class LaundryMonster extends Enemy {
  private readonly body: Phaser.GameObjects.Ellipse;
  private readonly mound: Phaser.GameObjects.Rectangle;
  private readonly eyeLeft: Phaser.GameObjects.Arc;
  private readonly eyeRight: Phaser.GameObjects.Arc;
  private readonly claw: Phaser.GameObjects.Rectangle;
  private readonly label: Phaser.GameObjects.Text;
  private readonly stateMachine = new EnemyStateMachine('Dormant');
  private lastDamageAtMs = -10_000;
  private recentLightHit = false;

  private readonly displayName: string;
  private readonly damage: number;
  private readonly mainSpeed: number;

  constructor(scene: Phaser.Scene, config: LaundryMonsterConfig) {
    const shadow = scene.add.ellipse(0, 46, 142, 28, 0x070608, 0.46);
    const baseColor = config.bodyColor ?? 0x34303a;
    const mound = scene.add.rectangle(0, 18, 136, 76, baseColor, 0.94).setStrokeStyle(2, 0x756a75, 0.75);
    const body = scene.add.ellipse(-6, 0, 116, 96, baseColor, 0.94).setStrokeStyle(3, 0x8a7c84, 0.78);
    const eyeLeft = scene.add.circle(-24, -22, 6, 0xf4e7a8, 0.85);
    const eyeRight = scene.add.circle(15, -23, 6, 0xf4e7a8, 0.85);
    const claw = scene.add.rectangle(50, 14, 46, 12, 0xcbbfa8, 0.9).setRotation(-0.25);
    const label = scene.add
      .text(0, -82, 'Dormant', {
        color: '#f4efe0',
        fontFamily: 'monospace',
        fontSize: '14px',
        backgroundColor: 'rgba(7, 6, 8, 0.72)',
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5)
      .setVisible(import.meta.env.DEV);

    super(scene, config.id, config.x, config.y, config.startingLayer, [shadow, mound, body, eyeLeft, eyeRight, claw, label]);
    this.mound = mound;
    this.body = body;
    this.eyeLeft = eyeLeft;
    this.eyeRight = eyeRight;
    this.claw = claw;
    this.label = label;
    this.displayName = config.displayName ?? 'Laundry Monster';
    this.damage = config.damage ?? DAMAGE;
    this.mainSpeed = config.mainSpeed ?? MAIN_SPEED;
    this.container.setAlpha(config.startingLayer === 'background' ? 0.34 : 0.72);
    this.applyVisualState();
  }

  update(context: EnemyUpdateContext): void {
    this.stateMachine.update(context.deltaMs);
    if (!this.recentLightHit) {
      this.exposureMs = Math.max(0, this.exposureMs - context.deltaMs * 1.8);
    }
    this.recentLightHit = false;

    const distance = Phaser.Math.Distance.Between(this.x, this.y, context.playerX, context.playerY);
    if (this.stateMachine.state === 'Dormant' && distance < REVEAL_DISTANCE) {
      this.transition('Hinted');
    } else if (this.stateMachine.state === 'Hinted' && (distance < ENTER_DISTANCE || this.stateMachine.elapsedMs > 1800)) {
      this.transition('StalkingBackground');
    } else if (this.stateMachine.state === 'StalkingBackground' && (distance < ENTER_DISTANCE || this.stateMachine.elapsedMs > 2400)) {
      this.transition('EnteringMainPlane');
    } else if (this.stateMachine.state === 'EnteringMainPlane' && this.stateMachine.elapsedMs > 820) {
      this.currentLayer = 'main';
      this.transition('Revealed');
    } else if (this.stateMachine.state === 'Revealed' && distance < TELEGRAPH_DISTANCE) {
      this.transition('Telegraph');
    } else if (this.stateMachine.state === 'Telegraph' && this.stateMachine.elapsedMs > 780) {
      this.transition('Attacking');
    } else if (this.stateMachine.state === 'Attacking' && this.stateMachine.elapsedMs > 340) {
      this.tryDamagePlayer(distance);
      this.transition('Recovering');
    } else if (this.stateMachine.state === 'Recovering' && this.stateMachine.elapsedMs > 900) {
      this.transition('Revealed');
    } else if (this.stateMachine.state === 'Stunned' && this.stateMachine.elapsedMs > 1500) {
      this.exposureMs = 0;
      this.transition('Recovering');
    }

    this.move(context, distance);
    this.animate(context.deltaMs);
  }

  applyLightExposure(exposure: EnemyLightExposure): void {
    if (exposure.layer !== this.currentLayer || this.stateMachine.state === 'Dormant') {
      return;
    }

    this.recentLightHit = true;
    this.exposureMs += exposure.durationMs * exposure.intensity;

    if (exposure.intensity >= 1 && this.exposureMs >= FOCUSED_STUN_MS && this.stateMachine.state !== 'Attacking') {
      this.transition('Stunned');
      return;
    }

    if (this.exposureMs >= OVEREXPOSE_MS && this.stateMachine.state !== 'Attacking') {
      this.transition('Telegraph');
      return;
    }

    if (this.exposureMs >= SLOW_LIGHT_MS && ['Hinted', 'StalkingBackground', 'EnteringMainPlane', 'Revealed'].includes(this.stateMachine.state)) {
      this.body.setScale(1.08, 0.9);
    }
  }

  private move(context: EnemyUpdateContext, distance: number): void {
    if (this.stateMachine.state === 'Attacking' && distance > 1) {
      this.stepToward(context.playerX, context.playerY, LUNGE_SPEED, context.deltaMs);
      return;
    }

    const activeStates: EnemyState[] = ['StalkingBackground', 'EnteringMainPlane', 'Revealed'];
    if (!activeStates.includes(this.stateMachine.state) || this.exposureMs >= SLOW_LIGHT_MS) {
      return;
    }

    const speed = this.stateMachine.state === 'Revealed' ? this.mainSpeed : STALK_SPEED;
    this.stepToward(context.playerX, context.playerY, speed, context.deltaMs);
  }

  private stepToward(targetX: number, targetY: number, speed: number, deltaMs: number): void {
    const direction = new Phaser.Math.Vector2(targetX - this.x, targetY - this.y);
    if (direction.lengthSq() < 1) {
      return;
    }

    direction.normalize().scale(speed * (deltaMs / 1000));
    this.container.setPosition(this.x + direction.x, this.y + direction.y * 0.55);
  }

  private tryDamagePlayer(distance: number): void {
    const now = this.scene.time.now;
    if (distance > DAMAGE_DISTANCE || now - this.lastDamageAtMs < 950) {
      return;
    }

    this.lastDamageAtMs = now;
    gameEvents.emit({ type: 'player.damaged', source: this.id, amount: this.damage });
  }

  private transition(nextState: EnemyState): void {
    if (!this.stateMachine.transition(nextState)) {
      return;
    }

    this.setState(nextState);
    if (nextState === 'Telegraph') {
      gameEvents.emit({ type: 'enemy.attackTelegraph', enemyId: this.id });
    }
    this.applyVisualState();
  }

  private animate(deltaMs: number): void {
    const pulse = Math.sin(this.scene.time.now / 120) * 0.04;
    const attackPull = this.stateMachine.state === 'Telegraph' ? Math.sin(this.scene.time.now / 80) * 0.18 : 0;
    this.body.setScale(1 + pulse, this.stateMachine.state === 'Stunned' ? 0.82 : 1 - pulse);
    this.claw.setRotation(this.stateMachine.state === 'Attacking' ? 0.45 : -0.25 - attackPull);
    this.eyeLeft.setAlpha(this.stateMachine.state === 'Dormant' ? 0 : 0.55 + Math.sin(this.scene.time.now / 90) * 0.35);
    this.eyeRight.setAlpha(this.eyeLeft.alpha);
    this.label.setText(`${this.displayName}\n${this.stateMachine.state} ${Math.round(this.exposureMs)}ms`);
    if (this.stateMachine.state === 'Attacking') {
      this.container.x += Math.cos(this.scene.time.now / 35) * deltaMs * 0.02;
    }
  }

  private applyVisualState(): void {
    const color = STATE_TINTS[this.stateMachine.state] ?? 0x9f7b6f;
    this.body.setFillStyle(color, this.stateMachine.state === 'Dormant' ? 0.18 : 0.94);
    this.mound.setFillStyle(color, this.stateMachine.state === 'Dormant' ? 0.28 : 0.76);
    this.container.setAlpha(this.currentLayer === 'background' ? 0.46 : 1);
    this.container.setDepth(this.currentLayer === 'background' ? 1_050 : 1_220);
  }
}
