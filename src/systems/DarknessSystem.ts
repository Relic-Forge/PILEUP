import Phaser from 'phaser';
import type { DepthLayer, Vec2 } from '../core/Types';
import type { FlashlightState } from './FlashlightSystem';

export interface LightBlocker {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  layer?: DepthLayer | 'all';
  castsShadow?: boolean;
}

interface DarknessSystemConfig {
  worldWidth: number;
  worldHeight: number;
  debug?: boolean;
}

interface LayerLightProfile {
  color: number;
  darknessAlpha: number;
  revealMultiplier: number;
  broadRangeMultiplier: number;
  broadWidthMultiplier: number;
  focusStrengthMultiplier: number;
  creepMs: number;
  hazeAlpha: number;
  vignetteAlpha: number;
}

interface RevealStamp {
  x: number;
  y: number;
  radius: number;
  strength: number;
  ageMs: number;
  durationMs: number;
  layer: DepthLayer;
}

interface LightRayHit {
  angle: number;
  distance: number;
  x: number;
  y: number;
  blocked: boolean;
  blockerId?: string;
}

interface ScreenProjection {
  scrollX: number;
  scrollY: number;
  width: number;
  height: number;
  zoom: number;
}

const LAYER_LIGHT_PROFILES: Record<DepthLayer, LayerLightProfile> = {
  background: {
    color: 0x86a9d8,
    darknessAlpha: 0.86,
    revealMultiplier: 0.78,
    broadRangeMultiplier: 1.08,
    broadWidthMultiplier: 1.22,
    focusStrengthMultiplier: 0.82,
    creepMs: 360,
    hazeAlpha: 0.22,
    vignetteAlpha: 0.42,
  },
  main: {
    color: 0xf4e7a8,
    darknessAlpha: 0.82,
    revealMultiplier: 1,
    broadRangeMultiplier: 1,
    broadWidthMultiplier: 1,
    focusStrengthMultiplier: 1,
    creepMs: 650,
    hazeAlpha: 0.18,
    vignetteAlpha: 0.36,
  },
  foreground: {
    color: 0xf3b28d,
    darknessAlpha: 0.88,
    revealMultiplier: 0.88,
    broadRangeMultiplier: 0.88,
    broadWidthMultiplier: 0.86,
    focusStrengthMultiplier: 0.92,
    creepMs: 480,
    hazeAlpha: 0.25,
    vignetteAlpha: 0.46,
  },
};

const RAY_COUNT = 9;
const RAY_STEP_PX = 24;
const PLAYER_SPILL_RADIUS = 118;
const DARKNESS_DEPTH = 1_390;
const VIGNETTE_DEPTH = 1_392;
const LIGHT_FX_DEPTH = 1_450;

export class DarknessSystem {
  private readonly darkness: Phaser.GameObjects.RenderTexture;
  private readonly lightMask: Phaser.GameObjects.Graphics;
  private readonly beamFx: Phaser.GameObjects.Graphics;
  private readonly vignette: Phaser.GameObjects.Graphics;
  private readonly debugGraphics: Phaser.GameObjects.Graphics;
  private readonly revealStamps: RevealStamp[] = [];
  private worldWidth: number;
  private worldHeight: number;
  private blockers: LightBlocker[] = [];
  private readonly debug: boolean;
  private projection: ScreenProjection = { scrollX: 0, scrollY: 0, width: 1, height: 1, zoom: 1 };

  constructor(
    private readonly scene: Phaser.Scene,
    config: DarknessSystemConfig,
  ) {
    this.worldWidth = config.worldWidth;
    this.worldHeight = config.worldHeight;
    this.debug = Boolean(config.debug);
    this.darkness = scene.add
      .renderTexture(0, 0, this.scene.scale.width, this.scene.scale.height)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DARKNESS_DEPTH);
    this.lightMask = scene.make.graphics({}, false);
    this.beamFx = scene.add.graphics().setDepth(LIGHT_FX_DEPTH);
    this.vignette = scene.add.graphics().setDepth(VIGNETTE_DEPTH).setScrollFactor(0);
    this.debugGraphics = scene.add.graphics().setDepth(2_350);
    this.scene.scale.on(Phaser.Scale.Events.RESIZE, this.syncScreenSurfaces, this);
  }

  setWorldBounds(width: number, height: number): void {
    this.worldWidth = width;
    this.worldHeight = height;
    this.syncScreenSurfaces();
  }

  setBlockers(blockers: LightBlocker[]): void {
    this.blockers = blockers.map((blocker) => ({
      ...blocker,
      layer: blocker.layer ?? 'all',
      castsShadow: blocker.castsShadow ?? true,
    }));
  }

  update(light: FlashlightState | undefined, deltaMs: number, playerCenter?: Vec2): void {
    this.ageRevealStamps(deltaMs);
    this.stampLight(light);
    this.renderDarkness(light, playerCenter);
    this.renderBeamFx(light);
    this.renderVignette(light);
    this.renderDebug(light);

    if (import.meta.env.DEV) {
      document.body.dataset.pileupLightingStamps = String(this.revealStamps.length);
      document.body.dataset.pileupLightingDebug = String(this.debug);
      document.body.dataset.pileupDarknessTextureSize = `${this.darkness.width}x${this.darkness.height}`;
      document.body.dataset.pileupDarknessDisplaySize = `${Math.round(this.darkness.displayWidth)}x${Math.round(this.darkness.displayHeight)}`;
      document.body.dataset.pileupDarknessScreenProjection = `${Math.round(this.projection.scrollX)},${Math.round(
        this.projection.scrollY,
      )},${Math.round(this.projection.width)}x${Math.round(this.projection.height)}@${this.projection.zoom.toFixed(3)}`;
    }
  }

  destroy(): void {
    this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.syncScreenSurfaces, this);
    this.darkness.destroy();
    this.lightMask.destroy();
    this.beamFx.destroy();
    this.vignette.destroy();
    this.debugGraphics.destroy();
    this.revealStamps.length = 0;
  }

  private ageRevealStamps(deltaMs: number): void {
    for (let index = this.revealStamps.length - 1; index >= 0; index -= 1) {
      const stamp = this.revealStamps[index];
      stamp.ageMs += deltaMs;
      if (stamp.ageMs >= stamp.durationMs) {
        this.revealStamps.splice(index, 1);
      }
    }
  }

  private stampLight(light: FlashlightState | undefined): void {
    if (!light || light.battery <= 0) {
      return;
    }

    const profile = LAYER_LIGHT_PROFILES[light.layer];
    const battery01 = Phaser.Math.Clamp(light.battery / 100, 0, 1);
    const instabilityShrink = 1 - light.batteryInstability01 * 0.22;
    const directionX = Math.cos(light.visualAimAngle);
    const directionY = Math.sin(light.visualAimAngle);
    const range = light.visualRange * profile.broadRangeMultiplier;
    const broadWidth = 150 * profile.broadWidthMultiplier;

    this.revealStamps.push({
      x: light.origin.x,
      y: light.origin.y,
      radius: Phaser.Math.Linear(72, 122, battery01) * instabilityShrink,
      strength: 0.18 * profile.revealMultiplier * light.intensity,
      ageMs: 0,
      durationMs: profile.creepMs,
      layer: light.layer,
    });

    for (let index = 0; index < 5; index += 1) {
      const t = index / 4;
      const distance = Phaser.Math.Linear(90, range * 0.82, t);
      const widthCurve = 1 - Math.abs(t - 0.45);
      const radius = Phaser.Math.Linear(82, broadWidth, widthCurve);
      const falloff = Phaser.Math.Linear(1, 0.42, t);
      this.revealStamps.push({
        x: light.origin.x + directionX * distance,
        y: light.origin.y + directionY * distance,
        radius,
        strength: 0.16 * profile.revealMultiplier * light.intensity * falloff,
        ageMs: 0,
        durationMs: profile.creepMs,
        layer: light.layer,
      });
    }

    if (light.focus01 > 0.05) {
      this.revealStamps.push({
        x: light.origin.x + directionX * range * 0.58,
        y: light.origin.y + directionY * range * 0.58,
        radius: Phaser.Math.Linear(88, 148, light.focus01),
        strength: Phaser.Math.Linear(0.18, 0.38, light.focus01) * profile.focusStrengthMultiplier * light.intensity,
        ageMs: 0,
        durationMs: profile.creepMs + 150,
        layer: light.layer,
      });
    }

    if (this.revealStamps.length > 96) {
      this.revealStamps.splice(0, this.revealStamps.length - 96);
    }
  }

  private renderDarkness(light: FlashlightState | undefined, playerCenter?: Vec2): void {
    this.syncScreenSurfaces();
    const activeLayer = light?.layer ?? 'main';
    const profile = LAYER_LIGHT_PROFILES[activeLayer];
    const instability = light?.batteryInstability01 ?? 0;
    const darknessAlpha = Phaser.Math.Clamp(profile.darknessAlpha + instability * 0.08, 0.72, 0.94);
    this.darkness.clear();
    this.darkness.fill(0x050507, darknessAlpha, 0, 0, this.darkness.width, this.darkness.height);
    this.lightMask.clear();

    this.revealStamps.filter((stamp) => stamp.layer === activeLayer).forEach((stamp) => {
      const life01 = Phaser.Math.Clamp(stamp.ageMs / stamp.durationMs, 0, 1);
      const fade = 1 - Phaser.Math.SmoothStep(life01, 0, 1);
      this.drawSoftEraseCircleWorld(stamp.x, stamp.y, stamp.radius, stamp.strength * fade);
    });

    if (playerCenter && activeLayer === 'main') {
      this.drawIrregularPlayerSpill(playerCenter);
    }

    if (light && light.battery > 0 && activeLayer === 'main') {
      this.drawSoftEraseCircleWorld(light.origin.x, light.origin.y, 86, 0.72);
    }

    this.darkness.erase(this.lightMask);
    this.darkness.render();
  }

  private syncScreenSurfaces(): void {
    const camera = this.scene.cameras.main;
    const zoom = Math.max(0.001, camera.zoom);
    const width = Math.max(1, Math.ceil(camera.width));
    const height = Math.max(1, Math.ceil(camera.height));
    this.projection = {
      scrollX: camera.scrollX,
      scrollY: camera.scrollY,
      width,
      height,
      zoom,
    };
    if (this.darkness.width !== width || this.darkness.height !== height) {
      this.darkness.resize(width, height);
    }

    const inverseZoom = 1 / zoom;
    this.darkness.setPosition(0, 0).setScale(inverseZoom);
    this.vignette.setPosition(0, 0).setScale(inverseZoom);
  }

  private drawSoftEraseCircleWorld(x: number, y: number, radius: number, strength: number): void {
    const screenX = (x - this.projection.scrollX) * this.projection.zoom;
    const screenY = (y - this.projection.scrollY) * this.projection.zoom;
    this.drawSoftEraseCircle(screenX, screenY, radius * this.projection.zoom, strength);
  }

  private drawIrregularPlayerSpill(playerCenter: Vec2): void {
    const time = this.scene.time.now * 0.001;
    const blobs = [
      { angle: -2.75, distance: 34, radius: 0.95, strength: 0.18, speed: 0.7 },
      { angle: -1.55, distance: 24, radius: 0.72, strength: 0.11, speed: 1.1 },
      { angle: -0.2, distance: 42, radius: 0.58, strength: 0.08, speed: 0.9 },
      { angle: 1.8, distance: 31, radius: 0.66, strength: 0.09, speed: 1.4 },
    ];

    blobs.forEach((blob, index) => {
      const wobble = Math.sin(time * blob.speed + index * 1.7) * 0.18;
      const angle = blob.angle + wobble;
      const distance = blob.distance + Math.cos(time * (blob.speed + 0.35) + index) * 8;
      this.drawSoftEraseCircleWorld(
        playerCenter.x + Math.cos(angle) * distance,
        playerCenter.y + Math.sin(angle) * distance,
        PLAYER_SPILL_RADIUS * blob.radius,
        blob.strength,
      );
    });
  }

  private drawSoftEraseCircle(x: number, y: number, radius: number, strength: number): void {
    const clampedStrength = Phaser.Math.Clamp(strength, 0, 1);
    const steps = 14;
    for (let index = 0; index < steps; index += 1) {
      const t = index / (steps - 1);
      const ringRadius = Phaser.Math.Linear(radius, radius * 0.22, t);
      const alpha = clampedStrength * Phaser.Math.Linear(0.025, 0.2, Phaser.Math.SmoothStep(t, 0, 1));
      this.lightMask.fillStyle(0xffffff, alpha);
      this.lightMask.fillCircle(x, y, ringRadius);
    }
  }

  private renderBeamFx(light: FlashlightState | undefined): void {
    this.beamFx.clear();
    if (!light || light.battery <= 0) {
      return;
    }

    const profile = LAYER_LIGHT_PROFILES[light.layer];
    const battery01 = Phaser.Math.Clamp(light.battery / 100, 0, 1);
    const flickerScale = light.flicker ? 0.62 + Math.sin(this.scene.time.now * 0.037) * 0.2 : 1;
    const alphaBase = light.intensity * flickerScale * Phaser.Math.Linear(0.42, 1, battery01);
    const range = light.visualRange * profile.broadRangeMultiplier;
    const outerHalfAngle = light.visualHalfAngle * Phaser.Math.Linear(1.55, 1.08, light.focus01);
    const innerHalfAngle = light.visualHalfAngle * Phaser.Math.Linear(0.62, 0.34, light.focus01);
    const bloom = {
      x: light.origin.x + Math.cos(light.visualAimAngle) * range,
      y: light.origin.y + Math.sin(light.visualAimAngle) * range,
    };
    const shimmer = Math.sin(this.scene.time.now * 0.018) * (6 + light.batteryInstability01 * 12);
    const outerLeft = {
      x: light.origin.x + Math.cos(light.visualAimAngle - outerHalfAngle) * range * 0.9,
      y: light.origin.y + Math.sin(light.visualAimAngle - outerHalfAngle) * range * 0.9,
    };
    const outerRight = {
      x: light.origin.x + Math.cos(light.visualAimAngle + outerHalfAngle) * range * 0.9,
      y: light.origin.y + Math.sin(light.visualAimAngle + outerHalfAngle) * range * 0.9,
    };
    const innerLeft = {
      x: light.origin.x + Math.cos(light.visualAimAngle - innerHalfAngle) * range * 0.82,
      y: light.origin.y + Math.sin(light.visualAimAngle - innerHalfAngle) * range * 0.82,
    };
    const innerRight = {
      x: light.origin.x + Math.cos(light.visualAimAngle + innerHalfAngle) * range * 0.82,
      y: light.origin.y + Math.sin(light.visualAimAngle + innerHalfAngle) * range * 0.82,
    };
    this.beamFx.lineStyle(2, profile.color, alphaBase * 0.14);
    this.beamFx.lineBetween(light.origin.x, light.origin.y, outerLeft.x, outerLeft.y + shimmer);
    this.beamFx.lineBetween(light.origin.x, light.origin.y, outerRight.x, outerRight.y - shimmer);
    this.beamFx.lineStyle(1, 0xfff4c6, alphaBase * Phaser.Math.Linear(0.04, 0.12, light.focus01));
    this.beamFx.lineBetween(light.origin.x, light.origin.y, innerLeft.x, innerLeft.y + shimmer * 0.4);
    this.beamFx.lineBetween(light.origin.x, light.origin.y, innerRight.x, innerRight.y - shimmer * 0.4);
    this.beamFx.fillStyle(profile.color, alphaBase * (0.035 + light.focus01 * 0.045));
    this.beamFx.fillEllipse(bloom.x, bloom.y, 58 + light.focus01 * 34, 18 + light.batteryInstability01 * 14);
    this.beamFx.fillStyle(0xfff0bd, alphaBase * (0.1 + light.focus01 * 0.08));
    this.beamFx.fillCircle(light.origin.x, light.origin.y, 8 + light.focus01 * 4);
  }

  private renderVignette(light: FlashlightState | undefined): void {
    const profile = LAYER_LIGHT_PROFILES[light?.layer ?? 'main'];
    const view = this.projection;
    const topHeight = 72;
    const bottomHeight = 96;
    const sideWidth = 78;
    const alpha = profile.vignetteAlpha + (light?.batteryInstability01 ?? 0) * 0.12;
    this.vignette.clear();
    this.vignette.fillStyle(0x000000, alpha * 0.62);
    this.vignette.fillRect(0, 0, view.width, topHeight);
    this.vignette.fillRect(0, view.height - bottomHeight, view.width, bottomHeight);
    this.vignette.fillStyle(0x000000, alpha * 0.42);
    this.vignette.fillRect(0, 0, sideWidth, view.height);
    this.vignette.fillRect(view.width - sideWidth, 0, sideWidth, view.height);
  }

  private renderDebug(light: FlashlightState | undefined): void {
    this.debugGraphics.clear();
    if (!this.debug || !light) {
      return;
    }

    const rays = this.sampleLightRays(light);
    this.debugGraphics.lineStyle(1, 0x9be7ff, 0.42);
    rays.forEach((ray) => {
      this.debugGraphics.lineBetween(light.origin.x, light.origin.y, ray.x, ray.y);
      this.debugGraphics.fillStyle(ray.blocked ? 0xff6b61 : 0x9be7ff, 0.8);
      this.debugGraphics.fillCircle(ray.x, ray.y, 3);
    });

    this.debugGraphics.lineStyle(1, 0xff6b61, 0.35);
    this.blockers.forEach((blocker) => {
      if (this.blockerAppliesToLayer(blocker, light.layer)) {
        this.debugGraphics.strokeRect(blocker.x, blocker.y, blocker.width, blocker.height);
      }
    });
  }

  private sampleLightRays(light: FlashlightState): LightRayHit[] {
    const hits: LightRayHit[] = [];
    for (let index = 0; index < RAY_COUNT; index += 1) {
      const t = index / (RAY_COUNT - 1);
      const angle = light.aimAngle + Phaser.Math.Linear(-light.visualHalfAngle, light.visualHalfAngle, t);
      hits.push(this.sampleRay(light.origin, angle, light.effectiveRange, light.layer));
    }
    return hits;
  }

  private sampleRay(origin: Vec2, angle: number, maxDistance: number, layer: DepthLayer): LightRayHit {
    const directionX = Math.cos(angle);
    const directionY = Math.sin(angle);
    for (let distance = RAY_STEP_PX; distance <= maxDistance; distance += RAY_STEP_PX) {
      const x = origin.x + directionX * distance;
      const y = origin.y + directionY * distance;
      const blocker = this.blockers.find(
        (candidate) =>
          this.blockerAppliesToLayer(candidate, layer) &&
          x >= candidate.x &&
          x <= candidate.x + candidate.width &&
          y >= candidate.y &&
          y <= candidate.y + candidate.height,
      );
      if (blocker) {
        return { angle, distance, x, y, blocked: true, blockerId: blocker.id };
      }
    }

    return {
      angle,
      distance: maxDistance,
      x: origin.x + directionX * maxDistance,
      y: origin.y + directionY * maxDistance,
      blocked: false,
    };
  }

  private blockerAppliesToLayer(blocker: LightBlocker, layer: DepthLayer): boolean {
    return blocker.castsShadow !== false && (blocker.layer === 'all' || blocker.layer === layer);
  }

}
