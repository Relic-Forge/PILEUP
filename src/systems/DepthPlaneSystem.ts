import Phaser from 'phaser';
import type { RuntimeFloorBounds } from '../data/levelTypes';

const MAIN_PLANE_DEPTH_BASE = 120;
const MAIN_PLANE_DEPTH_RANGE = 220;

export class DepthPlaneSystem {
  depthForY(y: number, floorBounds: RuntimeFloorBounds): number {
    const range = Math.max(1, floorBounds.maxY - floorBounds.minY);
    const normalized = Phaser.Math.Clamp((y - floorBounds.minY) / range, 0, 1);
    return MAIN_PLANE_DEPTH_BASE + normalized * MAIN_PLANE_DEPTH_RANGE;
  }

  applyDepth(object: Phaser.GameObjects.Components.Depth, y: number, floorBounds: RuntimeFloorBounds, offset = 0): void {
    object.setDepth(this.depthForY(y, floorBounds) + offset);
  }
}
