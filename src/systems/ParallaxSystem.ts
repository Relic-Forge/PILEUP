import Phaser from 'phaser';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from './ResponsiveScaleSystem';
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
    this.renderLayerBands(room);

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

    if (segment.roomId === 'bedroom') {
      this.renderBedroomPlaceholder(segment, floorBounds);
    } else {
      this.renderBackgroundSets(segment);
    }
    this.renderSearchNodes(segment);
    this.renderEnemyAnchors(segment);
    this.renderBlockers(segment);
  }

  private renderLayerBands(room: RuntimeRoom): void {
    for (const layer of LAYER_STYLES) {
      const y = layer.id === 'mainGameplay' ? room.floorBounds.minY : layer.y;
      const height =
        layer.id === 'mainGameplay' ? room.floorBounds.maxY - room.floorBounds.minY : layer.height;
      const width = room.width + DESIGN_HEIGHT * 8;
      const rect = this.scene.add
        .rectangle(room.width / 2, y + height / 2, width, height, layer.color, layer.alpha)
        .setDepth(layer.depth)
        .setScrollFactor(layer.scrollFactor, 1);
      this.root?.add(rect);
    }
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

  private renderBedroomPlaceholder(segment: RuntimeRoomSegment, floorBounds: RuntimeFloorBounds): void {
    const roomStartX = segment.x - this.bedroomOffset(segment);
    const roomWidth = DESIGN_WIDTH * 2.25;
    this.renderBedroomFarBackground(segment, roomStartX, roomWidth);
    this.renderBedroomBackgroundClutter(segment, roomStartX, roomWidth);
    this.renderBedroomMainPlane(segment, floorBounds);
    this.renderBedroomForeground(segment, roomStartX, roomWidth);
  }

  private bedroomOffset(segment: RuntimeRoomSegment): number {
    switch (segment.id) {
      case 'bed_center_mess':
        return DESIGN_WIDTH * 0.75;
      case 'bed_right_exit':
        return DESIGN_WIDTH * 1.6;
      default:
        return 0;
    }
  }

  private renderBedroomFarBackground(segment: RuntimeRoomSegment, roomStartX: number, roomWidth: number): void {
    const layerScroll = 0.18;
    const x = segment.x;
    const w = segment.width;
    const wall = this.scene.add
      .rectangle(x + w / 2, 248, w + 520, 496, 0x353641, 1)
      .setDepth(2)
      .setScrollFactor(layerScroll, 1);
    const ceiling = this.scene.add
      .rectangle(x + w / 2, 40, w + 560, 80, 0x191922, 0.9)
      .setDepth(3)
      .setScrollFactor(layerScroll, 1);
    const baseboard = this.scene.add
      .rectangle(x + w / 2, 518, w + 560, 18, 0x5a4f4e, 0.96)
      .setDepth(4)
      .setScrollFactor(layerScroll, 1);
    this.root?.add([wall, ceiling, baseboard]);

    const seamCount = Math.max(3, Math.round(w / 360));
    for (let index = 0; index <= seamCount; index += 1) {
      const seamX = x + (w / seamCount) * index;
      const seam = this.scene.add
        .rectangle(seamX, 278, 3, 438, index % 2 === 0 ? 0x555663 : 0x20222b, 0.42)
        .setDepth(5)
        .setScrollFactor(layerScroll, 1);
      this.root?.add(seam);
    }

    const windowCenter = roomStartX + roomWidth * 0.43;
    if (windowCenter > x - 240 && windowCenter < x + w + 240) {
      this.renderBedroomWindow(windowCenter, layerScroll);
    }

    const distantDoorX = roomStartX + roomWidth * 0.88;
    if (distantDoorX > x - 260 && distantDoorX < x + w + 260) {
      const doorShadow = this.scene.add
        .rectangle(distantDoorX, 314, 226, 390, 0x141823, 0.84)
        .setDepth(6)
        .setScrollFactor(layerScroll, 1);
      const doorLine = this.scene.add
        .rectangle(distantDoorX - 104, 314, 4, 390, 0x676879, 0.58)
        .setDepth(7)
        .setScrollFactor(layerScroll, 1);
      this.root?.add([doorShadow, doorLine]);
    }
  }

  private renderBedroomWindow(centerX: number, scrollFactor: number): void {
    const glass = this.scene.add
      .rectangle(centerX, 244, 410, 248, 0x294778, 0.98)
      .setStrokeStyle(10, 0x5a5360, 0.96)
      .setDepth(8)
      .setScrollFactor(scrollFactor, 1);
    const split = this.scene.add.rectangle(centerX, 244, 8, 238, 0x5a5360, 0.94).setDepth(9).setScrollFactor(scrollFactor, 1);
    const blindA = this.scene.add.rectangle(centerX, 160, 390, 8, 0x0d1321, 0.72).setDepth(10).setScrollFactor(scrollFactor, 1);
    const blindB = this.scene.add.rectangle(centerX, 204, 390, 6, 0x0d1321, 0.55).setDepth(10).setScrollFactor(scrollFactor, 1);
    const moon = this.scene.add.circle(centerX + 100, 174, 34, 0xf0f1ff, 0.92).setDepth(9).setScrollFactor(scrollFactor, 1);
    const tree = this.scene.add.rectangle(centerX - 120, 260, 10, 190, 0x090b0f, 0.72).setDepth(10).setScrollFactor(scrollFactor, 1);
    const roofA = this.scene.add.triangle(centerX - 70, 334, -80, 40, 0, -10, 90, 40, 0x0a0d15, 0.76).setDepth(9).setScrollFactor(scrollFactor, 1);
    const roofB = this.scene.add.triangle(centerX + 120, 348, -100, 48, 0, -16, 118, 48, 0x0a0d15, 0.7).setDepth(9).setScrollFactor(scrollFactor, 1);
    const warmWindows = [
      this.scene.add.rectangle(centerX - 94, 334, 18, 22, 0xc48a3d, 0.62),
      this.scene.add.rectangle(centerX + 94, 344, 16, 20, 0xc48a3d, 0.55),
      this.scene.add.rectangle(centerX + 146, 346, 13, 18, 0xc48a3d, 0.42),
    ].map((pane) => pane.setDepth(11).setScrollFactor(scrollFactor, 1));
    this.root?.add([glass, split, blindA, blindB, moon, tree, roofA, roofB, ...warmWindows]);
  }

  private renderBedroomBackgroundClutter(segment: RuntimeRoomSegment, roomStartX: number, roomWidth: number): void {
    const scrollFactor = 0.48;
    const x = segment.x;
    const w = segment.width;
    const props: Phaser.GameObjects.GameObject[] = [];
    const local = (ratio: number) => roomStartX + roomWidth * ratio;

    if (segment.id === 'bed_left_start') {
      props.push(
        this.scene.add.rectangle(x + 190, 346, 240, 34, 0x3b3028, 0.9),
        this.scene.add.rectangle(x + 190, 312, 218, 24, 0x211c1e, 0.9),
        this.scene.add.rectangle(x + 420, 318, 128, 162, 0x26252f, 0.74),
        this.scene.add.rectangle(x + 616, 334, 116, 138, 0x22242e, 0.7),
      );
      [120, 188, 264].forEach((posterX, index) => {
        props.push(this.scene.add.rectangle(x + posterX, 240 + index * 28, 82, 112, 0x5a5364, 0.74));
      });
    }

    if (segment.id === 'bed_center_mess') {
      props.push(
        this.scene.add.rectangle(local(0.33), 438, 760, 170, 0x463946, 0.96),
        this.scene.add.rectangle(local(0.33), 374, 688, 88, 0x5c5267, 0.92),
        this.scene.add.ellipse(local(0.21), 390, 140, 112, 0x211922, 0.95),
        this.scene.add.rectangle(local(0.64), 360, 350, 360, 0x5b4032, 0.94),
        this.scene.add.rectangle(local(0.64), 280, 390, 28, 0x7a5b45, 0.96),
        this.scene.add.rectangle(local(0.64), 372, 312, 34, 0x211a1a, 0.58),
        this.scene.add.rectangle(local(0.64), 462, 312, 34, 0x211a1a, 0.58),
      );
    }

    if (segment.id === 'bed_right_exit') {
      props.push(
        this.scene.add.rectangle(x + w * 0.18, 346, 250, 348, 0x101218, 0.74),
        this.scene.add.rectangle(x + w * 0.18, 180, 250, 20, 0x29252d, 0.72),
        this.scene.add.rectangle(x + w * 0.48, 388, 310, 190, 0x2c221f, 0.86),
        this.scene.add.rectangle(x + w * 0.78, 334, 230, 360, 0x17171d, 0.86),
        this.scene.add.rectangle(x + w * 0.78, 516, 280, 28, 0x2a272d, 0.8),
      );
    }

    props.forEach((prop, index) => {
      if ('setDepth' in prop && 'setScrollFactor' in prop) {
        (prop as unknown as Phaser.GameObjects.Components.Depth & Phaser.GameObjects.Components.ScrollFactor)
          .setDepth(12 + (index % 3))
          .setScrollFactor(scrollFactor, 1);
      }
    });
    this.root?.add(props);
  }

  private renderBedroomMainPlane(segment: RuntimeRoomSegment, floorBounds: RuntimeFloorBounds): void {
    const x = segment.x;
    const w = segment.width;
    const floorCenterY = floorBounds.minY + (floorBounds.maxY - floorBounds.minY) / 2;
    const floor = this.scene.add
      .rectangle(x + w / 2, floorCenterY, w + 80, floorBounds.maxY - floorBounds.minY, 0x4d4541, 0.86)
      .setDepth(22)
      .setScrollFactor(1, 1);
    const farFloorLine = this.scene.add.rectangle(x + w / 2, floorBounds.minY + 20, w + 80, 5, 0x7b6d67, 0.54).setDepth(23);
    const nearFloorLine = this.scene.add.rectangle(x + w / 2, floorBounds.maxY - 10, w + 80, 8, 0x211f24, 0.64).setDepth(23);
    this.root?.add([floor, farFloorLine, nearFloorLine]);

    const plankCount = Math.max(4, Math.round(w / 320));
    for (let index = 0; index <= plankCount; index += 1) {
      const plank = this.scene.add
        .rectangle(x + (w / plankCount) * index, floorCenterY + 20 + (index % 2) * 18, 3, floorBounds.maxY - floorBounds.minY + 80, 0x211f24, 0.46)
        .setAngle(index % 2 === 0 ? -3 : 3)
        .setDepth(24)
        .setScrollFactor(1, 1);
      this.root?.add(plank);
    }

    if (segment.id === 'bed_center_mess') {
      this.root?.add([
        this.scene.add.ellipse(x + w * 0.42, 760, 420, 116, 0x5b5577, 0.92).setDepth(25),
        this.scene.add.ellipse(x + w * 0.42, 760, 336, 78, 0x38384b, 0.68).setDepth(26),
        this.scene.add.rectangle(x + w * 0.72, 724, 220, 160, 0x3f5276, 0.94).setDepth(27),
        this.scene.add.rectangle(x + w * 0.72, 648, 240, 32, 0x5d6f98, 0.96).setDepth(28),
      ]);
    }
  }

  private renderBedroomForeground(segment: RuntimeRoomSegment, roomStartX: number, roomWidth: number): void {
    const scrollFactor = 1.2;
    const x = segment.x;
    const w = segment.width;
    const props: Phaser.GameObjects.GameObject[] = [];
    const local = (ratio: number) => roomStartX + roomWidth * ratio;

    if (segment.id === 'bed_left_start') {
      props.push(
        this.scene.add.rectangle(x + 190, 904, 330, 160, 0x342a32, 0.9),
        this.scene.add.ellipse(x + 220, 842, 286, 74, 0x4a3d4c, 0.9),
        this.scene.add.rectangle(x + 550, 930, 280, 150, 0x27242d, 0.84),
      );
    }

    if (segment.id === 'bed_center_mess') {
      props.push(
        this.scene.add.rectangle(local(0.48), 900, 410, 112, 0x2f2b35, 0.86),
        this.scene.add.ellipse(local(0.52), 850, 360, 86, 0x4d4455, 0.9),
        this.scene.add.rectangle(local(0.58), 932, 340, 156, 0x342d38, 0.88),
        this.scene.add.ellipse(local(0.37), 910, 180, 78, 0x5a4b63, 0.82),
      );
    }

    if (segment.id === 'bed_right_exit') {
      props.push(
        this.scene.add.rectangle(x + w * 0.34, 902, 320, 128, 0x312a32, 0.88),
        this.scene.add.rectangle(x + w * 0.66, 858, 116, 360, 0x3f333d, 0.84),
        this.scene.add.rectangle(x + w * 0.71, 776, 140, 28, 0x6a4d55, 0.86),
        this.scene.add.ellipse(x + w * 0.82, 932, 250, 116, 0x232229, 0.9),
      );
    }

    const dustCount = Math.max(3, Math.round(w / 380));
    for (let index = 0; index < dustCount; index += 1) {
      props.push(this.scene.add.circle(x + 90 + index * (w / dustCount), 610 + (index % 3) * 62, 3 + (index % 2), 0xb5a684, 0.18));
    }

    props.forEach((prop, index) => {
      if ('setDepth' in prop && 'setScrollFactor' in prop) {
        (prop as unknown as Phaser.GameObjects.Components.Depth & Phaser.GameObjects.Components.ScrollFactor)
          .setDepth(58 + (index % 4))
          .setScrollFactor(scrollFactor, 1);
      }
    });
    this.root?.add(props);
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
        .setDepth(2_050)
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
