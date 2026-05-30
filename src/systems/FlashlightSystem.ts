import Phaser from 'phaser';
import { gameEvents } from '../core/EventBus';
import type { DepthLayer, Vec2 } from '../core/Types';
import type { Player } from '../entities/Player';
import type { PlayerInputState } from './InputSystem';

export interface FlashlightTarget {
  id: string;
  layer: DepthLayer;
  x: number;
  y: number;
  radius: number;
  object: Phaser.GameObjects.GameObject;
}

export interface FlashlightState {
  layer: DepthLayer;
  focus: boolean;
  flicker: boolean;
  battery: number;
  aimAngle: number;
  hitIds: string[];
  intensity: number;
}

const LAYERS: DepthLayer[] = ['background', 'main', 'foreground'];
const LAYER_COLORS: Record<DepthLayer, number> = {
  background: 0x86a9d8,
  main: 0xf4e7a8,
  foreground: 0xf3b28d,
};
const RANGE = 560;
const FOCUS_RANGE = 660;
const CONE_HALF_ANGLE = Phaser.Math.DegToRad(28);
const FOCUS_HALF_ANGLE = Phaser.Math.DegToRad(13);
const BATTERY_MAX = 100;

export class FlashlightSystem {
  private readonly beam: Phaser.GameObjects.Graphics;
  private readonly debugBeam: Phaser.GameObjects.Graphics;
  private hitMarkers: Phaser.GameObjects.Arc[] = [];
  private layer: DepthLayer = 'main';
  private battery = BATTERY_MAX;
  private lastBatteryEvent = BATTERY_MAX;
  private lastFocusEvent = false;
  private lastFlickerEvent = false;
  private aimAngle = 0;
  private lastAim = new Phaser.Math.Vector2(1, 0);

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Player,
    private targets: FlashlightTarget[],
  ) {
    this.beam = scene.add.graphics().setDepth(1_450);
    this.debugBeam = scene.add.graphics().setDepth(2_350);
    this.hitMarkers = targets.map((target) =>
      scene.add.circle(target.x, target.y, target.radius + 8, 0xffffff, 0).setStrokeStyle(2, 0x3b3630, 0.55),
    );
    gameEvents.emit({ type: 'flashlight.depthChanged', layer: this.layer });
    gameEvents.emit({ type: 'flashlight.batteryChanged', value: this.battery, flicker: false, focus: false });
  }

  setTargets(targets: FlashlightTarget[]): void {
    this.targets = targets;
    this.hitMarkers.forEach((marker) => marker.destroy());
    this.hitMarkers = targets.map((target) =>
      this.scene.add.circle(target.x, target.y, target.radius + 8, 0xffffff, 0).setStrokeStyle(2, 0x3b3630, 0.55),
    );
  }

  update(input: PlayerInputState, deltaMs: number): FlashlightState {
    this.applyDepthInput(input);
    const deltaSeconds = deltaMs / 1000;
    const focus = input.focus;
    this.battery = Phaser.Math.Clamp(this.battery - deltaSeconds * (focus ? 1.8 : 0.55), 0, BATTERY_MAX);
    const debugLowBattery = input.debugFlicker;
    const flicker = debugLowBattery || this.battery <= 12;
    const aim = this.resolveAim(input);
    this.aimAngle = Math.atan2(aim.y, aim.x);

    const range = focus ? FOCUS_RANGE : RANGE;
    const halfAngle = focus ? FOCUS_HALF_ANGLE : CONE_HALF_ANGLE;
    const intensity = focus ? 1 : 0.62;
    const hitIds = this.detectTargets(range, halfAngle);
    this.render(range, halfAngle, intensity, flicker, hitIds);
    this.publishBatteryIfNeeded(flicker, focus);

    hitIds.forEach((targetId) => {
      gameEvents.emit({
        type: 'flashlight.hitEnemy',
        enemyId: targetId,
        layer: this.layer,
        intensity,
        durationMs: deltaMs,
      });
    });

    return {
      layer: this.layer,
      focus,
      flicker,
      battery: Math.round(this.battery),
      aimAngle: this.aimAngle,
      hitIds,
      intensity,
    };
  }

  destroy(): void {
    this.beam.destroy();
    this.debugBeam.destroy();
    this.hitMarkers.forEach((marker) => marker.destroy());
  }

  private applyDepthInput(input: PlayerInputState): void {
    const previous = this.layer;
    if (input.depthDirect) {
      this.layer = input.depthDirect;
    } else if (input.depthCycle !== 0) {
      const nextIndex = Phaser.Math.Wrap(LAYERS.indexOf(this.layer) + input.depthCycle, 0, LAYERS.length);
      this.layer = LAYERS[nextIndex];
    }

    if (this.layer !== previous) {
      gameEvents.emit({ type: 'flashlight.depthChanged', layer: this.layer });
    }
  }

  private resolveAim(input: PlayerInputState): Phaser.Math.Vector2 {
    const pointer = this.scene.input.activePointer;
    const pointerWorld = pointer.positionToCamera(this.scene.cameras.main) as Phaser.Math.Vector2;
    const fromPointer = new Phaser.Math.Vector2(pointerWorld.x - this.player.x, pointerWorld.y - this.player.y);
    if (fromPointer.lengthSq() > 36) {
      this.lastAim = fromPointer.normalize();
      return this.lastAim.clone();
    }

    if (input.x !== 0 || input.y !== 0) {
      this.lastAim = new Phaser.Math.Vector2(input.x || this.lastAim.x, input.y * 0.45).normalize();
    }
    return this.lastAim.clone();
  }

  private detectTargets(range: number, halfAngle: number): string[] {
    return this.targets
      .filter((target) => target.layer === this.layer)
      .filter((target) => this.pointInCone(target, range, halfAngle))
      .map((target) => target.id);
  }

  private pointInCone(target: FlashlightTarget, range: number, halfAngle: number): boolean {
    const toTarget = new Phaser.Math.Vector2(target.x - this.player.x, target.y - this.player.y);
    const distance = toTarget.length();
    if (distance > range + target.radius || distance < 1) {
      return false;
    }

    const angleDelta = Phaser.Math.Angle.Wrap(toTarget.angle() - this.aimAngle);
    return Math.abs(angleDelta) <= halfAngle + Math.asin(Math.min(1, target.radius / Math.max(distance, 1)));
  }

  private render(range: number, halfAngle: number, intensity: number, flicker: boolean, hitIds: string[]): void {
    const origin = { x: this.player.x + Math.cos(this.aimAngle) * 26, y: this.player.y - 34 + Math.sin(this.aimAngle) * 10 };
    const color = LAYER_COLORS[this.layer];
    const alpha = (flicker ? 0.16 + Math.random() * 0.16 : 0.34) * intensity;
    const points = this.conePoints(origin, range, halfAngle);

    this.beam.clear();
    this.beam.fillStyle(color, alpha);
    this.beam.fillTriangle(origin.x, origin.y, points.left.x, points.left.y, points.right.x, points.right.y);
    this.beam.lineStyle(2, color, flicker ? 0.45 : 0.72);
    this.beam.lineBetween(origin.x, origin.y, points.left.x, points.left.y);
    this.beam.lineBetween(origin.x, origin.y, points.right.x, points.right.y);

    this.debugBeam.clear();
    this.debugBeam.lineStyle(1, color, 0.34);
    this.debugBeam.strokeCircle(origin.x, origin.y, range);
    this.hitMarkers.forEach((marker, index) => {
      const target = this.targets[index];
      const isActiveLayer = target.layer === this.layer;
      const isHit = hitIds.includes(target.id);
      marker.setStrokeStyle(isHit ? 4 : 2, isHit ? color : 0x3b3630, isActiveLayer ? 0.9 : 0.25);
      marker.setFillStyle(isHit ? color : 0xffffff, isHit ? 0.18 : 0);
    });
  }

  private conePoints(origin: Vec2, range: number, halfAngle: number): { left: Vec2; right: Vec2 } {
    const leftAngle = this.aimAngle - halfAngle;
    const rightAngle = this.aimAngle + halfAngle;
    return {
      left: { x: origin.x + Math.cos(leftAngle) * range, y: origin.y + Math.sin(leftAngle) * range },
      right: { x: origin.x + Math.cos(rightAngle) * range, y: origin.y + Math.sin(rightAngle) * range },
    };
  }

  private publishBatteryIfNeeded(flicker: boolean, focus: boolean): void {
    const rounded = Math.round(this.battery);
    if (
      Math.abs(rounded - this.lastBatteryEvent) < 2 &&
      flicker === this.lastFlickerEvent &&
      focus === this.lastFocusEvent
    ) {
      return;
    }

    this.lastBatteryEvent = rounded;
    this.lastFlickerEvent = flicker;
    this.lastFocusEvent = focus;
    gameEvents.emit({ type: 'flashlight.batteryChanged', value: rounded, flicker, focus });
  }
}
