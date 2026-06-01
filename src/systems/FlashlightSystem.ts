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
  searchPenalty01: number;
  aimAngle: number;
  visualAimAngle: number;
  focus01: number;
  batteryInstability01: number;
  effectiveRange: number;
  visualRange: number;
  visualTargetDistance: number;
  visualHalfAngle: number;
  origin: Vec2;
  hitIds: string[];
  intensity: number;
  lockOn: boolean;
  lockedTargetId?: string;
  disabled: boolean;
}

interface FlashlightVisualState {
  origin: Vec2;
  visualAimAngle: number;
  visualRange: number;
  visualTargetDistance: number;
  visualHalfAngle: number;
  focus01: number;
  batteryInstability01: number;
  batteryOutput01: number;
  alphaScale: number;
  layerPulse01: number;
}

interface BatteryOutputState {
  dropout: boolean;
  dimScale: number;
  outputScale: number;
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
const SEARCH_RANGE_SCALE = 0.34;
const SEARCH_HALF_ANGLE_SCALE = 0.82;
const SEARCH_INTENSITY_SCALE = 0.48;
const LOW_BATTERY_FLICKER_THRESHOLD = 20;
const LOW_BATTERY_DIM_THRESHOLD = 10;
const LOCK_CURSOR_RADIUS = 260;
const LOCK_BEAM_HALF_ANGLE = Phaser.Math.DegToRad(32);
const LOCK_RELEASE_DISTANCE = 920;
const POINTER_FACING_HAND_BUFFER = 44;

export class FlashlightSystem {
  private readonly beam: Phaser.GameObjects.Graphics;
  private readonly debugBeam: Phaser.GameObjects.Graphics;
  private hitMarkers: Phaser.GameObjects.Arc[] = [];
  private readonly unsubscribeEvents: Array<() => void> = [];
  private layer: DepthLayer = 'main';
  private battery = BATTERY_MAX;
  private lastBatteryEvent = BATTERY_MAX;
  private lastFocusEvent = false;
  private lastFlickerEvent = false;
  private lastCriticalEvent = false;
  private lastFlickerBurstAt = 0;
  private previousFocus = false;
  private previousHitIds = new Set<string>();
  private aimAngle = 0;
  private visualAimAngle = 0;
  private focus01 = 0;
  private layerPulse = 0;
  private hurtShakeMs = 0;
  private lastAim = new Phaser.Math.Vector2(1, 0);
  private searchPenalty01 = 0;
  private lockedTargetId?: string;
  private nextDropoutCheckAt = 0;
  private dropoutUntil = 0;
  private readonly debugBeamVisible = new URLSearchParams(window.location.search).get('flashlightDebug') === '1';

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
    this.unsubscribeEvents.push(gameEvents.on('player.damaged', () => {
      this.hurtShakeMs = 260;
    }));
  }

  setTargets(targets: FlashlightTarget[]): void {
    const sameMarkers =
      targets.length === this.targets.length &&
      this.hitMarkers.length === targets.length &&
      this.hitMarkers.every((marker) => marker.scene) &&
      targets.every((target, index) => target.id === this.targets[index]?.id);
    this.targets = targets;
    if (sameMarkers) {
      this.hitMarkers.forEach((marker, index) => {
        const target = targets[index];
        marker.setPosition(target.x, target.y);
        marker.setRadius(target.radius + 8);
      });
      return;
    }

    this.hitMarkers.forEach((marker) => marker.destroy());
    this.hitMarkers = targets.map((target) =>
      this.scene.add.circle(target.x, target.y, target.radius + 8, 0xffffff, 0).setStrokeStyle(2, 0x3b3630, 0.55),
    );
  }

  update(input: PlayerInputState, deltaMs: number, isSearching = false, disabled = false): FlashlightState {
    this.applyDepthInput(input);
    const deltaSeconds = deltaMs / 1000;
    const focus = disabled ? false : input.focus;
    this.battery = Phaser.Math.Clamp(this.battery - deltaSeconds * (disabled ? 0 : focus ? 1.8 : 0.55), 0, BATTERY_MAX);
    const debugLowBattery = !disabled && input.debugFlicker;
    const flicker = !disabled && (debugLowBattery || this.battery <= LOW_BATTERY_FLICKER_THRESHOLD);
    const batteryOutput = this.resolveBatteryOutput(flicker, disabled);
    const aim = this.resolveAim(input);
    this.aimAngle = Math.atan2(aim.y, aim.x);
    this.updatePlayerFacing(input);
    this.updateFocus(focus, deltaSeconds);
    this.updateSearchPenalty(isSearching, deltaSeconds);
    const visualState = this.updateVisualState(input, flicker, batteryOutput, deltaMs);

    const searchRangeScale = Phaser.Math.Linear(1, SEARCH_RANGE_SCALE, this.searchPenalty01);
    const searchHalfAngleScale = Phaser.Math.Linear(1, SEARCH_HALF_ANGLE_SCALE, this.searchPenalty01);
    const range = disabled ? 0 : (focus ? FOCUS_RANGE : RANGE) * searchRangeScale * batteryOutput.outputScale;
    const halfAngle = disabled ? 0 : (focus ? FOCUS_HALF_ANGLE : CONE_HALF_ANGLE) * searchHalfAngleScale;
    const intensity = disabled
      ? 0
      : (focus ? 1 : 0.62) * Phaser.Math.Linear(1, SEARCH_INTENSITY_SCALE, this.searchPenalty01) * batteryOutput.outputScale;
    const hitIds = disabled || batteryOutput.dropout ? [] : this.detectTargets(range, halfAngle);
    if (disabled) {
      this.clearLightVisuals();
    } else {
      this.render(range, halfAngle, intensity, flicker, hitIds, visualState);
    }
    this.publishBatteryIfNeeded(flicker || batteryOutput.dropout, focus);
    this.publishFlashlightEvents(flicker || batteryOutput.dropout, focus, hitIds);

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
      searchPenalty01: Number(this.searchPenalty01.toFixed(2)),
      aimAngle: this.aimAngle,
      visualAimAngle: visualState.visualAimAngle,
      focus01: Number(this.focus01.toFixed(2)),
      batteryInstability01: Number(visualState.batteryInstability01.toFixed(2)),
      effectiveRange: Math.round(range),
      visualRange: Math.round(visualState.visualRange),
      visualTargetDistance: Math.round(visualState.visualTargetDistance),
      visualHalfAngle: Number(visualState.visualHalfAngle.toFixed(3)),
      origin: { x: Math.round(visualState.origin.x), y: Math.round(visualState.origin.y) },
      hitIds,
      intensity,
      lockOn: Boolean(this.lockedTargetId),
      lockedTargetId: this.lockedTargetId,
      disabled,
    };
  }

  canRestoreBattery(): boolean {
    return this.battery < BATTERY_MAX - 1;
  }

  restoreBattery(amount: number): number {
    this.battery = Phaser.Math.Clamp(this.battery + amount, 0, BATTERY_MAX);
    this.lastBatteryEvent = -1;
    this.publishBatteryIfNeeded(this.battery <= 12, this.lastFocusEvent);
    return Math.round(this.battery);
  }

  destroy(): void {
    this.beam.destroy();
    this.debugBeam.destroy();
    this.hitMarkers.forEach((marker) => marker.destroy());
    this.unsubscribeEvents.forEach((unsubscribe) => unsubscribe());
    this.unsubscribeEvents.length = 0;
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
      this.layerPulse = 1;
      gameEvents.emit({ type: 'flashlight.depthChanged', layer: this.layer });
      gameEvents.emit({ type: 'flashlight.depthSwitch', layer: this.layer });
    }
  }

  private resolveAim(input: PlayerInputState): Phaser.Math.Vector2 {
    const origin = this.player.getFlashlightTipWorld();
    const pointerWorld = this.getPointerWorld();
    const manualAim = new Phaser.Math.Vector2(pointerWorld.x - origin.x, pointerWorld.y - origin.y);
    if (manualAim.lengthSq() > 4) {
      this.lastAim = manualAim.normalize();
    }

    const lockedTarget = this.resolveLockedTarget(input, pointerWorld, origin);
    if (lockedTarget) {
      const lockedAim = new Phaser.Math.Vector2(lockedTarget.x - origin.x, lockedTarget.y - origin.y);
      if (lockedAim.lengthSq() > 4) {
        this.lastAim = lockedAim.normalize();
      }
      return this.lastAim.clone();
    }

    return this.lastAim.clone();
  }

  private updatePlayerFacing(input: PlayerInputState): void {
    const lockedTarget = this.targets.find((target) => target.id === this.lockedTargetId);
    if (lockedTarget) {
      this.player.setFacing(lockedTarget.x - this.player.x);
      return;
    }

    const pointerWorld = this.getPointerWorld();
    const currentTipX = this.player.getFlashlightTipWorld().x;
    const mirroredTipX = this.player.x - (currentTipX - this.player.x);
    const stableMinX = Math.min(currentTipX, mirroredTipX) - POINTER_FACING_HAND_BUFFER;
    const stableMaxX = Math.max(currentTipX, mirroredTipX) + POINTER_FACING_HAND_BUFFER;
    if (pointerWorld.x >= stableMinX && pointerWorld.x <= stableMaxX) {
      if (input.x !== 0) {
        this.player.setFacing(input.x);
      }
      return;
    }

    this.player.setFacing(pointerWorld.x - this.player.x);
  }

  private getPointerWorld(): Phaser.Math.Vector2 {
    const pointer = this.scene.input.activePointer;
    return pointer.positionToCamera(this.scene.cameras.main) as Phaser.Math.Vector2;
  }

  private resolveLockedTarget(input: PlayerInputState, pointerWorld: Phaser.Math.Vector2, origin: Phaser.Math.Vector2): FlashlightTarget | undefined {
    const existingTarget = this.targets.find((target) => target.id === this.lockedTargetId);

    if (input.lockOnPressed) {
      if (existingTarget) {
        this.lockedTargetId = undefined;
        return undefined;
      }

      const nextTarget = this.acquireLockTarget(pointerWorld, origin);
      this.lockedTargetId = nextTarget?.id;
      return nextTarget;
    }

    if (existingTarget && this.canMaintainLock(existingTarget, origin)) {
      return existingTarget;
    }

    this.lockedTargetId = undefined;
    return undefined;
  }

  private canMaintainLock(target: FlashlightTarget, origin: Phaser.Math.Vector2): boolean {
    if (target.layer !== this.layer) {
      return false;
    }

    return Phaser.Math.Distance.Between(origin.x, origin.y, target.x, target.y) <= LOCK_RELEASE_DISTANCE + target.radius;
  }

  private acquireLockTarget(pointerWorld: Phaser.Math.Vector2, origin: Phaser.Math.Vector2): FlashlightTarget | undefined {
    const manualAimAngle = this.lastAim.angle();
    return this.targets
      .filter((target) => target.layer === this.layer)
      .map((target) => {
        const cursorDistance = Phaser.Math.Distance.Between(pointerWorld.x, pointerWorld.y, target.x, target.y);
        const originDistance = Phaser.Math.Distance.Between(origin.x, origin.y, target.x, target.y);
        const targetAngle = Math.atan2(target.y - origin.y, target.x - origin.x);
        const angleDistance = Math.abs(Phaser.Math.Angle.Wrap(targetAngle - manualAimAngle));
        const cursorCandidate = cursorDistance <= LOCK_CURSOR_RADIUS + target.radius;
        const beamCandidate = originDistance <= LOCK_RELEASE_DISTANCE + target.radius && angleDistance <= LOCK_BEAM_HALF_ANGLE;
        return {
          target,
          cursorCandidate,
          beamCandidate,
          score: (cursorCandidate ? cursorDistance : 420 + angleDistance * 260) + originDistance * 0.08,
        };
      })
      .filter((candidate) => candidate.cursorCandidate || candidate.beamCandidate)
      .sort((a, b) => a.score - b.score)[0]?.target;
  }

  private detectTargets(range: number, halfAngle: number): string[] {
    return this.targets
      .filter((target) => target.layer === this.layer)
      .filter((target) => this.pointInCone(target, range, halfAngle))
      .map((target) => target.id);
  }

  private pointInCone(target: FlashlightTarget, range: number, halfAngle: number): boolean {
    const origin = this.player.getFlashlightTipWorld();
    const toTarget = new Phaser.Math.Vector2(target.x - origin.x, target.y - origin.y);
    const distance = toTarget.length();
    if (distance > range + target.radius || distance < 1) {
      return false;
    }

    const angleDelta = Phaser.Math.Angle.Wrap(toTarget.angle() - this.aimAngle);
    return Math.abs(angleDelta) <= halfAngle + Math.asin(Math.min(1, target.radius / Math.max(distance, 1)));
  }

  private updateFocus(focus: boolean, deltaSeconds: number): void {
    const target = focus ? 1 : 0;
    const speed = focus ? 9 : 5.5;
    this.focus01 = Phaser.Math.Linear(this.focus01, target, 1 - Math.exp(-speed * deltaSeconds));
  }

  private updateSearchPenalty(isSearching: boolean, deltaSeconds: number): void {
    const target = isSearching ? 1 : 0;
    const speed = isSearching ? 13 : 8;
    this.searchPenalty01 = Phaser.Math.Linear(this.searchPenalty01, target, 1 - Math.exp(-speed * deltaSeconds));
  }

  private resolveBatteryOutput(flicker: boolean, disabled: boolean): BatteryOutputState {
    if (disabled || this.battery <= 0) {
      this.dropoutUntil = 0;
      return { dropout: false, dimScale: disabled ? 1 : 0, outputScale: disabled ? 1 : 0 };
    }

    const now = this.scene.time.now;
    if (!flicker) {
      this.dropoutUntil = 0;
      this.nextDropoutCheckAt = 0;
      return { dropout: false, dimScale: 1, outputScale: 1 };
    }

    const flicker01 = Phaser.Math.Clamp((LOW_BATTERY_FLICKER_THRESHOLD - this.battery) / LOW_BATTERY_FLICKER_THRESHOLD, 0, 1);
    const dim01 = Phaser.Math.Clamp((LOW_BATTERY_DIM_THRESHOLD - this.battery) / (LOW_BATTERY_DIM_THRESHOLD - 1), 0, 1);
    const dimScale = this.battery <= LOW_BATTERY_DIM_THRESHOLD ? Phaser.Math.Linear(1, 0.26, dim01) : 1;

    if (now >= this.nextDropoutCheckAt) {
      const chance = Phaser.Math.Linear(0.12, 0.58, flicker01);
      if (Phaser.Math.FloatBetween(0, 1) < chance) {
        this.dropoutUntil = now + Phaser.Math.Linear(45, 210, flicker01) + Phaser.Math.Between(0, 70);
      }
      this.nextDropoutCheckAt = now + Phaser.Math.Linear(420, 115, flicker01) + Phaser.Math.Between(0, 120);
    }

    const dropout = now < this.dropoutUntil;
    return { dropout, dimScale, outputScale: dropout ? 0 : dimScale };
  }

  private updateVisualState(
    input: PlayerInputState,
    flicker: boolean,
    batteryOutput: BatteryOutputState,
    deltaMs: number,
  ): FlashlightVisualState {
    const deltaSeconds = deltaMs / 1000;
    const turnRate = input.focus ? 9.5 : input.sprint ? 7.25 : input.crouch ? 15 : 12.5;
    this.visualAimAngle = Phaser.Math.Angle.RotateTo(this.visualAimAngle, this.aimAngle, turnRate * deltaSeconds);
    this.layerPulse = Math.max(0, this.layerPulse - deltaSeconds * 7.5);
    this.hurtShakeMs = Math.max(0, this.hurtShakeMs - deltaMs);

    const batteryInstability01 = Phaser.Math.Clamp((65 - this.battery) / 65, 0, 1);
    const critical01 = Phaser.Math.Clamp((LOW_BATTERY_DIM_THRESHOLD - this.battery) / LOW_BATTERY_DIM_THRESHOLD, 0, 1);
    const time = this.scene.time.now * 0.001;
    const isMoving = input.x !== 0 || input.y !== 0;
    const movementShake = input.sprint ? 0.022 : input.crouch ? 0.004 : isMoving ? 0.012 : 0.007;
    const searchShake = this.searchPenalty01 * 0.034;
    const hurtShake = this.hurtShakeMs > 0 ? Math.sin(time * 92) * 0.055 * (this.hurtShakeMs / 260) : 0;
    const lowBatterySlip = batteryInstability01 * Math.sin(time * 17.7 + Math.sin(time * 3.1) * 2) * 0.018;
    const jitter = Math.sin(time * 21.5) * movementShake + Math.sin(time * 28.7) * searchShake + lowBatterySlip + hurtShake;
    const blackout = batteryOutput.dropout ? 1 : critical01 > 0 ? Math.max(0, Math.sin(time * 17.2) - 0.72) * critical01 : 0;
    const flickerDip = flicker ? 0.66 + Math.sin(time * 29.5) * 0.16 : 1;
    const alphaScale = batteryOutput.dropout
      ? 0
      : Phaser.Math.Clamp((flickerDip - blackout) * batteryOutput.dimScale, this.battery <= 0 ? 0 : 0.14, 1.15);
    const layerProfile = this.getLayerProfile();
    const searchRangeScale = Phaser.Math.Linear(1, SEARCH_RANGE_SCALE, this.searchPenalty01);
    const searchHalfAngleScale = Phaser.Math.Linear(1, SEARCH_HALF_ANGLE_SCALE, this.searchPenalty01);
    const visualRange =
      Phaser.Math.Linear(RANGE, FOCUS_RANGE, this.focus01) * layerProfile.rangeScale * searchRangeScale * batteryOutput.outputScale;
    const visualHalfAngle =
      Phaser.Math.Linear(CONE_HALF_ANGLE, FOCUS_HALF_ANGLE, this.focus01) * layerProfile.angleScale * searchHalfAngleScale;
    const visualAimAngle = this.visualAimAngle + jitter;
    const origin = this.player.getFlashlightTipWorld();
    const visualTargetDistance = this.resolveVisualTargetDistance(origin, visualRange);

    return {
      origin,
      visualAimAngle,
      visualRange,
      visualTargetDistance,
      visualHalfAngle,
      focus01: this.focus01,
      batteryInstability01,
      batteryOutput01: batteryOutput.outputScale,
      alphaScale,
      layerPulse01: this.layerPulse,
    };
  }

  private resolveVisualTargetDistance(origin: Phaser.Math.Vector2, visualRange: number): number {
    const lockedTarget = this.targets.find((target) => target.id === this.lockedTargetId);
    const distance = lockedTarget
      ? Phaser.Math.Distance.Between(origin.x, origin.y, lockedTarget.x, lockedTarget.y)
      : Phaser.Math.Distance.Between(origin.x, origin.y, this.getPointerWorld().x, this.getPointerWorld().y);
    return Phaser.Math.Clamp(distance, 96, visualRange);
  }

  private getLayerProfile(): { rangeScale: number; angleScale: number; haze: number } {
    if (this.layer === 'background') {
      return { rangeScale: 1.05, angleScale: 1.18, haze: 1.22 };
    }

    if (this.layer === 'foreground') {
      return { rangeScale: 0.88, angleScale: 1.05, haze: 0.9 };
    }

    return { rangeScale: 1, angleScale: 1, haze: 1 };
  }

  private render(
    range: number,
    halfAngle: number,
    intensity: number,
    flicker: boolean,
    hitIds: string[],
    visual: FlashlightVisualState,
  ): void {
    const color = LAYER_COLORS[this.layer];
    const batteryStrength = Phaser.Math.Linear(0.46, 1, Phaser.Math.Clamp(this.battery / 100, 0, 1));
    const baseAlpha = intensity * batteryStrength * visual.alphaScale;
    const profile = this.getLayerProfile();
    const pulseBoost = visual.layerPulse01 * 0.18;
    const outerHalfAngle = visual.visualHalfAngle * 1.32;
    const coreHalfAngle = Phaser.Math.Linear(visual.visualHalfAngle * 0.42, visual.visualHalfAngle * 0.28, visual.focus01);
    const outerRange = visual.visualRange * (1 + pulseBoost * 0.18);
    const coreRange = Phaser.Math.Linear(
      visual.visualRange * 0.78,
      visual.visualTargetDistance,
      visual.focus01,
    );
    const outerPoints = this.conePoints(visual.origin, outerRange, outerHalfAngle, visual.visualAimAngle);
    const mainPoints = this.conePoints(visual.origin, visual.visualRange, visual.visualHalfAngle, visual.visualAimAngle);
    const corePoints = this.conePoints(visual.origin, coreRange, coreHalfAngle, visual.visualAimAngle);
    const bloom = {
      x: visual.origin.x + Math.cos(visual.visualAimAngle) * Phaser.Math.Linear(visual.visualRange, visual.visualTargetDistance, visual.focus01),
      y: visual.origin.y + Math.sin(visual.visualAimAngle) * Phaser.Math.Linear(visual.visualRange, visual.visualTargetDistance, visual.focus01),
    };
    const edgeShimmer = Math.sin(this.scene.time.now * 0.018) * (5 + visual.batteryInstability01 * 10);

    this.beam.clear();
    this.debugBeam.clear();
    this.hitMarkers.forEach((marker) => marker.setVisible(this.debugBeamVisible));
    if (visual.batteryOutput01 <= 0) {
      return;
    }
    if (!this.debugBeamVisible) {
      return;
    }

    this.debugBeam.fillStyle(color, baseAlpha * 0.08 * profile.haze);
    this.debugBeam.fillTriangle(
      visual.origin.x,
      visual.origin.y,
      outerPoints.left.x,
      outerPoints.left.y,
      outerPoints.right.x,
      outerPoints.right.y,
    );
    this.debugBeam.fillStyle(color, baseAlpha * (0.18 + pulseBoost * 0.5));
    this.debugBeam.fillTriangle(
      visual.origin.x,
      visual.origin.y,
      mainPoints.left.x,
      mainPoints.left.y,
      mainPoints.right.x,
      mainPoints.right.y,
    );
    this.debugBeam.fillStyle(0xfff7cf, baseAlpha * Phaser.Math.Linear(0.08, 0.18, visual.focus01));
    this.debugBeam.fillTriangle(
      visual.origin.x,
      visual.origin.y,
      corePoints.left.x,
      corePoints.left.y,
      corePoints.right.x,
      corePoints.right.y,
    );
    this.debugBeam.fillStyle(color, baseAlpha * (0.07 + visual.batteryInstability01 * 0.04));
    this.debugBeam.fillEllipse(bloom.x, bloom.y, 92 + visual.focus01 * 38, 30 + visual.batteryInstability01 * 22);
    this.debugBeam.fillStyle(0xfff0bd, baseAlpha * (0.16 + visual.focus01 * 0.13));
    this.debugBeam.fillCircle(visual.origin.x, visual.origin.y, 12 + visual.focus01 * 5 + visual.layerPulse01 * 8);
    this.debugBeam.lineStyle(2, color, baseAlpha * (flicker ? 0.34 : 0.62));
    this.debugBeam.lineBetween(visual.origin.x, visual.origin.y, mainPoints.left.x, mainPoints.left.y + edgeShimmer);
    this.debugBeam.lineBetween(visual.origin.x, visual.origin.y, mainPoints.right.x, mainPoints.right.y - edgeShimmer);
    this.debugBeam.lineStyle(1, color, 0.34);
    this.debugBeam.strokeCircle(visual.origin.x, visual.origin.y, range);
    this.debugBeam.lineStyle(1, 0xffffff, 0.2);
    const gameplayPoints = this.conePoints(visual.origin, range, halfAngle, this.aimAngle);
    this.debugBeam.lineBetween(visual.origin.x, visual.origin.y, gameplayPoints.left.x, gameplayPoints.left.y);
    this.debugBeam.lineBetween(visual.origin.x, visual.origin.y, gameplayPoints.right.x, gameplayPoints.right.y);
    this.hitMarkers.forEach((marker, index) => {
      const target = this.targets[index];
      marker.setPosition(target.x, target.y);
      const isActiveLayer = target.layer === this.layer;
      const isHit = hitIds.includes(target.id);
      marker.setStrokeStyle(isHit ? 4 : 2, isHit ? color : 0x3b3630, isActiveLayer ? 0.9 : 0.25);
      marker.setFillStyle(isHit ? color : 0xffffff, isHit ? 0.18 : 0);
    });
  }

  private clearLightVisuals(): void {
    this.beam.clear();
    this.debugBeam.clear();
    this.hitMarkers.forEach((marker) => marker.setVisible(false));
  }

  private conePoints(origin: Vec2, range: number, halfAngle: number, angle = this.aimAngle): { left: Vec2; right: Vec2 } {
    const leftAngle = angle - halfAngle;
    const rightAngle = angle + halfAngle;
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

  private publishFlashlightEvents(flicker: boolean, focus: boolean, hitIds: string[]): void {
    if (focus !== this.previousFocus) {
      gameEvents.emit({ type: focus ? 'flashlight.focusStarted' : 'flashlight.focusEnded' });
      this.previousFocus = focus;
    }

    if (flicker && this.scene.time.now - this.lastFlickerBurstAt > 520) {
      this.lastFlickerBurstAt = this.scene.time.now;
      gameEvents.emit({ type: 'flashlight.flickerBurst', battery: Math.round(this.battery) });
    }

    const critical = this.battery <= LOW_BATTERY_DIM_THRESHOLD;
    if (critical && !this.lastCriticalEvent) {
      gameEvents.emit({ type: 'flashlight.batteryCritical' });
    }
    this.lastCriticalEvent = critical;

    const currentHits = new Set(hitIds);
    hitIds.forEach((enemyId) => {
      if (!this.previousHitIds.has(enemyId)) {
        gameEvents.emit({ type: 'flashlight.hitEnemyStarted', enemyId });
      }
    });
    this.previousHitIds = currentHits;
  }
}
