import Phaser from 'phaser';
import { DESIGN_HEIGHT } from './ResponsiveScaleSystem';
import type { RuntimeFloorBounds, RuntimeRoom, RuntimeRoomSegment } from '../data/levelTypes';

type LayerId = 'farBackground' | 'backgroundClutter' | 'mainGameplay' | 'foregroundClutter' | 'fxLighting';

interface LayerStyle {
  id: LayerId;
  label: string;
  y: number;
  height: number;
  color: number;
  alpha: number;
  depth: number;
  scrollFactor: number;
}

const LAYER_STYLES: LayerStyle[] = [
  {
    id: 'farBackground',
    label: 'far bg',
    y: 0,
    height: 430,
    color: 0x14131a,
    alpha: 1,
    depth: 0,
    scrollFactor: 0.2,
  },
  {
    id: 'backgroundClutter',
    label: 'bg clutter',
    y: 300,
    height: 250,
    color: 0x1d1925,
    alpha: 0.92,
    depth: 10,
    scrollFactor: 0.45,
  },
  {
    id: 'mainGameplay',
    label: 'main plane',
    y: 530,
    height: 390,
    color: 0x2f2b29,
    alpha: 1,
    depth: 20,
    scrollFactor: 1,
  },
  {
    id: 'foregroundClutter',
    label: 'fg clutter',
    y: 850,
    height: 130,
    color: 0x100e12,
    alpha: 0.56,
    depth: 50,
    scrollFactor: 1.18,
  },
  {
    id: 'fxLighting',
    label: 'fx/light',
    y: 0,
    height: DESIGN_HEIGHT,
    color: 0x000000,
    alpha: 0,
    depth: 80,
    scrollFactor: 1,
  },
];

export class ParallaxSystem {
  private root?: Phaser.GameObjects.Container;
  private debugObjects: Array<Phaser.GameObjects.GameObject & { setVisible: (visible: boolean) => unknown }> = [];
  private debugVisible = false;

  constructor(private readonly scene: Phaser.Scene) {}

  renderRoom(room: RuntimeRoom): Phaser.GameObjects.Container {
    this.destroy();
    this.root = this.scene.add.container(0, 0).setDepth(0);

    for (const segment of room.segments) {
      this.renderSegment(segment, room.floorBounds);
    }

    this.renderRoomTransitions(room);
    this.renderRoomBounds(room);
    this.setDebugVisible(this.debugVisible);
    return this.root;
  }

  destroy(): void {
    this.root?.destroy(true);
    this.root = undefined;
    this.debugObjects = [];
  }

  toggleDebug(): void {
    this.setDebugVisible(!this.debugVisible);
  }

  setDebugVisible(visible: boolean): void {
    this.debugVisible = visible;
    this.debugObjects.forEach((object) => object.setVisible(visible));
  }

  private renderSegment(segment: RuntimeRoomSegment, floorBounds: RuntimeFloorBounds): void {
    for (const layer of LAYER_STYLES) {
      const y = layer.id === 'mainGameplay' ? floorBounds.minY : layer.y;
      const height = layer.id === 'mainGameplay' ? floorBounds.maxY - floorBounds.minY : layer.height;
      const rect = this.scene.add
        .rectangle(segment.x + segment.width / 2, y + height / 2, segment.width, height, layer.color, layer.alpha)
        .setDepth(layer.depth)
        .setScrollFactor(layer.scrollFactor, 1);
      this.root?.add(rect);

      const label = this.scene.add
        .text(segment.x + 34, y + 20, `${segment.id} / ${layer.label} / sf ${layer.scrollFactor}`, {
          color: '#b8d79a',
          fontFamily: 'monospace',
          fontSize: '18px',
          backgroundColor: 'rgba(0, 0, 0, 0.42)',
          padding: { x: 6, y: 4 },
        })
        .setDepth(2_000)
        .setScrollFactor(layer.scrollFactor, 1)
        .setVisible(this.debugVisible);
      this.root?.add(label);
      this.debugObjects.push(label);
    }

    this.renderBackgroundSets(segment);
    this.renderSearchNodes(segment);
    this.renderEnemyAnchors(segment);
    this.renderBlockers(segment);
  }

  private renderBackgroundSets(segment: RuntimeRoomSegment): void {
    segment.backgroundSets.forEach((name, index) => {
      const x = segment.x + segment.width * (0.22 + index * 0.2);
      const prop = this.scene.add
        .rectangle(x, 420, 180, 120, 0x342f3e, 0.9)
        .setDepth(14)
        .setScrollFactor(0.45, 1);
      const label = this.scene.add
        .text(x, 420, name, {
          color: '#8f86a0',
          fontSize: '13px',
          align: 'center',
          wordWrap: { width: 160 },
        })
        .setOrigin(0.5)
        .setDepth(15)
        .setScrollFactor(0.45, 1);
      this.root?.add([prop, label]);
    });

    segment.foregroundSets.forEach((name, index) => {
      const x = segment.x + segment.width * (0.28 + index * 0.24);
      const prop = this.scene.add
        .rectangle(x, 930, 240, 140, 0x151219, 0.78)
        .setDepth(55)
        .setScrollFactor(1.18, 1);
      const label = this.scene.add
        .text(x, 910, name, {
          color: '#686071',
          fontSize: '13px',
          align: 'center',
          wordWrap: { width: 180 },
        })
        .setOrigin(0.5)
        .setDepth(56)
        .setScrollFactor(1.18, 1);
      this.root?.add([prop, label]);
    });
  }

  private renderSearchNodes(segment: RuntimeRoomSegment): void {
    segment.searchNodes.forEach((name, index) => {
      const x = segment.x + segment.width * (0.28 + index * 0.18);
      const pile = this.scene.add
        .ellipse(x, 770, 140, 70, 0x5d5367, 0.95)
        .setDepth(24)
        .setScrollFactor(1, 1);
      const label = this.scene.add
        .text(x, 766, name, {
          color: '#ddd3c7',
          fontSize: '14px',
          align: 'center',
          wordWrap: { width: 132 },
        })
        .setOrigin(0.5)
        .setDepth(25)
        .setScrollFactor(1, 1);
      this.root?.add([pile, label]);
    });
  }

  private renderEnemyAnchors(segment: RuntimeRoomSegment): void {
    segment.enemySpawns.forEach((name, index) => {
      const x = segment.x + segment.width * (0.62 + index * 0.14);
      const eyes = this.scene.add
        .rectangle(x, 485, 76, 34, 0x24192c, 0.92)
        .setDepth(16)
        .setScrollFactor(0.45, 1);
      const leftEye = this.scene.add.circle(x - 12, 484, 5, 0xb3e15d, 1).setDepth(17).setScrollFactor(0.45, 1);
      const rightEye = this.scene.add.circle(x + 12, 484, 5, 0xb3e15d, 1).setDepth(17).setScrollFactor(0.45, 1);
      const label = this.scene.add
        .text(x, 512, name, {
          color: '#9dbf73',
          fontSize: '12px',
          align: 'center',
          wordWrap: { width: 128 },
        })
        .setOrigin(0.5)
        .setDepth(18)
        .setScrollFactor(0.45, 1);
      this.root?.add([eyes, leftEye, rightEye, label]);
    });
  }

  private renderBlockers(segment: RuntimeRoomSegment): void {
    segment.blockers.forEach((blocker) => {
      const debugBlocker = this.scene.add
        .rectangle(blocker.x, blocker.y, blocker.width, blocker.height, 0xff5770, 0.18)
        .setStrokeStyle(3, 0xff7890, 0.72)
        .setDepth(2_100)
        .setScrollFactor(1, 1)
        .setVisible(this.debugVisible);
      const label = this.scene.add
        .text(blocker.x, blocker.y - blocker.height / 2 - 22, blocker.id, {
          color: '#ffb5c1',
          fontFamily: 'monospace',
          fontSize: '13px',
          backgroundColor: 'rgba(0, 0, 0, 0.45)',
          padding: { x: 5, y: 3 },
        })
        .setOrigin(0.5)
        .setDepth(2_101)
        .setScrollFactor(1, 1)
        .setVisible(this.debugVisible);
      this.root?.add([debugBlocker, label]);
      this.debugObjects.push(debugBlocker, label);
    });
  }

  private renderRoomTransitions(room: RuntimeRoom): void {
    room.roomTransitions.forEach((transition, index) => {
      const centerX = transition.x + transition.width / 2;
      const band = this.scene.add
        .rectangle(centerX, 548, transition.width, 22, index % 2 === 0 ? 0x3f5470 : 0x55415f, 0.34)
        .setDepth(21)
        .setScrollFactor(1, 1);
      const label = this.scene.add
        .text(transition.x + 42, 570, `${transition.order}. ${transition.label}`, {
          color: '#d7cfbf',
          fontSize: '24px',
          backgroundColor: 'rgba(7, 6, 8, 0.45)',
          padding: { x: 10, y: 5 },
        })
        .setDepth(26)
        .setScrollFactor(1, 1);
      const exitLine = this.scene.add
        .rectangle(transition.x + transition.width - 8, 705, 8, 288, 0xd2c276, 0.18)
        .setDepth(23)
        .setScrollFactor(1, 1);
      this.root?.add([band, label, exitLine]);
    });
  }

  private renderRoomBounds(room: RuntimeRoom): void {
    const floor = room.floorBounds;
    const floorFill = this.scene.add
      .rectangle(
        floor.minX + (floor.maxX - floor.minX) / 2,
        floor.minY + (floor.maxY - floor.minY) / 2,
        floor.maxX - floor.minX,
        floor.maxY - floor.minY,
        0x8ba778,
        0.08,
      )
      .setDepth(2_000)
      .setScrollFactor(1, 1)
      .setVisible(this.debugVisible);
    const top = this.scene.add
      .rectangle(floor.minX + (floor.maxX - floor.minX) / 2, floor.minY, floor.maxX - floor.minX, 4, 0x8ba778, 0.75)
      .setDepth(2_001)
      .setScrollFactor(1, 1)
      .setVisible(this.debugVisible);
    const bottom = this.scene.add
      .rectangle(floor.minX + (floor.maxX - floor.minX) / 2, floor.maxY, floor.maxX - floor.minX, 4, 0x8ba778, 0.75)
      .setDepth(2_001)
      .setScrollFactor(1, 1)
      .setVisible(this.debugVisible);
    const left = this.scene.add
      .rectangle(floor.minX, floor.minY + (floor.maxY - floor.minY) / 2, 6, floor.maxY - floor.minY, 0x8ba778, 0.75)
      .setDepth(2_001)
      .setScrollFactor(1, 1)
      .setVisible(this.debugVisible);
    const right = this.scene.add
      .rectangle(floor.maxX, floor.minY + (floor.maxY - floor.minY) / 2, 6, floor.maxY - floor.minY, 0x8ba778, 0.75)
      .setDepth(2_001)
      .setScrollFactor(1, 1)
      .setVisible(this.debugVisible);

    this.root?.add([floorFill, top, bottom, left, right]);
    this.debugObjects.push(floorFill, top, bottom, left, right);
  }
}
