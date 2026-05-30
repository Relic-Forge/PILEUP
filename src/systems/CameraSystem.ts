import Phaser from 'phaser';
import type { ResponsiveLayout } from './ResponsiveScaleSystem';

export interface CameraBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class CameraSystem {
  private bounds: CameraBounds = { x: 0, y: 0, width: 1920, height: 1080 };

  constructor(private readonly scene: Phaser.Scene) {}

  configureFoundation(layout: ResponsiveLayout, worldWidth: number, worldHeight: number): CameraBounds {
    const camera = this.scene.cameras.main;
    const viewportWidth = layout.viewportWidth;
    const viewportHeight = layout.viewportHeight;

    camera.setViewport(0, 0, viewportWidth, viewportHeight);
    camera.setZoom(viewportHeight / layout.worldViewHeight);

    const scaledWorldWidth = Math.max(worldWidth, layout.worldViewWidth);
    const scaledWorldHeight = Math.max(worldHeight, layout.worldViewHeight);
    this.bounds = {
      x: 0,
      y: 0,
      width: scaledWorldWidth,
      height: scaledWorldHeight,
    };

    camera.setBounds(this.bounds.x, this.bounds.y, this.bounds.width, this.bounds.height);
    camera.centerOn(layout.worldViewWidth / 2, layout.worldViewHeight / 2);
    return this.bounds;
  }

  centerOnDesignPoint(x: number, y: number): void {
    this.scene.cameras.main.centerOn(x, y);
  }

  follow(target: Phaser.GameObjects.GameObject): void {
    this.scene.cameras.main.startFollow(target, false, 0.1, 0.08);
  }

  getBounds(): CameraBounds {
    return this.bounds;
  }
}
