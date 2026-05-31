import Phaser from 'phaser';
import type { SearchResultType } from '../core/Types';

export interface SearchPileConfig {
  id: string;
  label: string;
  x: number;
  y: number;
  radius: number;
  resultType: SearchResultType;
  itemId?: string;
  searchSeconds: number;
  noisePerSecond: number;
}

export class SearchPile {
  readonly container: Phaser.GameObjects.Container;
  private readonly ring: Phaser.GameObjects.Arc;
  private readonly progressRing: Phaser.GameObjects.Arc;
  private readonly prompt: Phaser.GameObjects.Text;
  private searched = false;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly config: SearchPileConfig,
  ) {
    this.ring = scene.add.circle(0, 0, config.radius, 0x000000, 0).setStrokeStyle(3, 0xe3d36f, 0.28);
    this.progressRing = scene.add
      .circle(0, 0, config.radius + 8, 0x000000, 0)
      .setStrokeStyle(5, 0xe3d36f, 0)
      .setAngle(-90);
    this.prompt = scene.add
      .text(0, -config.radius - 30, '', {
        color: '#f4efe0',
        fontSize: '14px',
        align: 'center',
        backgroundColor: 'rgba(7, 6, 8, 0.76)',
        padding: { x: 7, y: 4 },
      })
      .setOrigin(0.5)
      .setVisible(false);

    this.container = scene.add.container(config.x, config.y, [this.ring, this.progressRing, this.prompt]).setDepth(1_800);
  }

  get id(): string {
    return this.config.id;
  }

  get x(): number {
    return this.config.x;
  }

  get y(): number {
    return this.config.y;
  }

  get resultType(): SearchResultType {
    return this.config.resultType;
  }

  get itemId(): string | undefined {
    return this.config.itemId;
  }

  isSearched(): boolean {
    return this.searched;
  }

  distanceTo(x: number, y: number): number {
    return Phaser.Math.Distance.Between(this.config.x, this.config.y, x, y);
  }

  setNearby(isNearby: boolean): void {
    if (this.searched) {
      return;
    }

    this.ring.setStrokeStyle(3, 0xe3d36f, isNearby ? 0.9 : 0.28);
    this.prompt.setText(isNearby ? `Hold Space to search ${this.config.label}` : '').setVisible(isNearby);
  }

  setProgress(progress01: number): void {
    const clamped = Phaser.Math.Clamp(progress01, 0, 1);
    this.progressRing.setStrokeStyle(5, 0xe3d36f, clamped > 0 ? 0.92 : 0);
    this.progressRing.setEndAngle(360 * clamped);
    if (clamped > 0) {
      this.prompt.setText(`${this.config.label} ${Math.round(clamped * 100)}%`).setVisible(true);
    }
  }

  markSearched(): void {
    this.searched = true;
    this.ring.setStrokeStyle(3, 0x8ba778, 0.48);
    this.progressRing.setStrokeStyle(5, 0x8ba778, 0);
    this.prompt.setText('Searched').setVisible(false);
  }

  destroy(): void {
    this.container.destroy(true);
  }
}
