import Phaser from 'phaser';
import {
  BEDROOM_CARPET_FLOOR_TEXTURE_KEY,
  BEDROOM_STATIC_PROP_ASSETS,
  BEDROOM_WALL_BASE_TEXTURE_KEY,
  WINDOW_OUTSIDE_WORLD_TEXTURE_KEY,
} from '../assets/roomAssets';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from './ResponsiveScaleSystem';
import type { StaticLightZone } from './DarknessSystem';
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

interface BedroomStaticPropPlacement {
  id: string;
  x: number;
  y: number;
  width: number;
  depth: number;
  scrollFactor: number;
  alpha?: number;
}

const INTERIOR_SCROLL_FACTOR = 1;
const FOREGROUND_SCROLL_FACTOR = 1.34;
const OUTDOOR_FAR_SCROLL_FACTOR = 0.58;
const OUTDOOR_PARALLAX_SPEED_MULTIPLIER = 1.25;
const OUTSIDE_LAYER_SOURCE_WIDTH = 1672;
const OUTSIDE_LAYER_SOURCE_HEIGHT = 941;
const BEDROOM_WALL_BLEED_WIDTH = 5120;
const BEDROOM_WALL_BLEED_HEIGHT = 768;
const BEDROOM_WALL_VISIBLE_CROP_X = 400;
const BEDROOM_CARPET_BLEED_WIDTH = 5120;
const BEDROOM_CARPET_VISIBLE_CROP_X = 400;
const BEDROOM_CARPET_DISPLAY_HEIGHT = 430;
const BEDROOM_CARPET_WALL_OVERLAP = 48;
const BEDROOM_BACKGROUND_PROP_DEPTH = 34;
const BEDROOM_BACKGROUND_MARKER_DEPTH = 36;
const WINDOW_PICTURE_DEPTH = 1_396;
const FOREGROUND_OCCLUDER_DEPTH = 1_470;

const LAYER_STYLES: LayerStyle[] = [
  {
    id: 'farBackground',
    label: 'far bg',
    y: 0,
    height: 430,
    color: 0x14131a,
    alpha: 1,
    depth: 0,
    scrollFactor: INTERIOR_SCROLL_FACTOR,
  },
  {
    id: 'backgroundClutter',
    label: 'bg clutter',
    y: 300,
    height: 250,
    color: 0x1d1925,
    alpha: 0.92,
    depth: 10,
    scrollFactor: INTERIOR_SCROLL_FACTOR,
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
    scrollFactor: FOREGROUND_SCROLL_FACTOR,
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
  private foregroundOccluders: Phaser.GameObjects.GameObject[] = [];
  private debugObjects: Array<Phaser.GameObjects.GameObject & { setVisible: (visible: boolean) => unknown }> = [];
  private outsideWindowPanes: Array<{ tile: Phaser.GameObjects.TileSprite; baseTileX: number; drift: number }> = [];
  private windowLightZones: StaticLightZone[] = [];
  private windowLightOverlays: Phaser.GameObjects.GameObject[] = [];
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
    this.foregroundOccluders.forEach((object) => object.destroy());
    this.root = undefined;
    this.foregroundOccluders = [];
    this.windowLightOverlays.forEach((object) => object.destroy());
    this.debugObjects = [];
    this.outsideWindowPanes = [];
    this.windowLightZones = [];
    this.windowLightOverlays = [];
  }

  private trackForegroundOccluders(objects: Phaser.GameObjects.GameObject[]): void {
    this.foregroundOccluders.push(...objects);
  }

  update(cameraScrollX: number): void {
    this.outsideWindowPanes.forEach((pane) => {
      pane.tile.tilePositionX = pane.baseTileX + cameraScrollX * pane.drift;
    });
  }

  getWindowLightZones(): StaticLightZone[] {
    return this.windowLightZones.map((zone) => ({ ...zone }));
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
      const y = layer.id === 'mainGameplay' ? this.visualFloorMinY(floorBounds) : layer.y;
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
      const y = layer.id === 'mainGameplay' ? this.visualFloorMinY(room.floorBounds) : layer.y;
      const height =
        layer.id === 'mainGameplay' ? room.floorBounds.maxY - this.visualFloorMinY(room.floorBounds) : layer.height;
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
        .setScrollFactor(INTERIOR_SCROLL_FACTOR, 1);
      const label = this.scene.add
        .text(x, 420, name, {
          color: '#8f86a0',
          fontSize: '13px',
          align: 'center',
          wordWrap: { width: 160 },
        })
        .setOrigin(0.5)
        .setDepth(15)
        .setScrollFactor(INTERIOR_SCROLL_FACTOR, 1);
      this.root?.add([prop, label]);
    });

    this.renderSegmentWindows(segment);

    segment.foregroundSets.forEach((name, index) => {
      const x = segment.x + segment.width * (0.28 + index * 0.24);
      const prop = this.scene.add
        .rectangle(x, 930, 240, 140, 0x151219, 0.78)
        .setDepth(FOREGROUND_OCCLUDER_DEPTH + index * 2)
        .setScrollFactor(FOREGROUND_SCROLL_FACTOR, 1);
      const label = this.scene.add
        .text(x, 910, name, {
          color: '#686071',
          fontSize: '13px',
          align: 'center',
          wordWrap: { width: 180 },
        })
        .setOrigin(0.5)
        .setDepth(FOREGROUND_OCCLUDER_DEPTH + index * 2 + 1)
        .setScrollFactor(FOREGROUND_SCROLL_FACTOR, 1);
      this.trackForegroundOccluders([prop, label]);
    });

    const foregroundPileCount = Math.max(2, Math.round(segment.width / 420));
    for (let index = 0; index < foregroundPileCount; index += 1) {
      const pileX = segment.x + segment.width * (0.14 + (index / Math.max(1, foregroundPileCount - 1)) * 0.72);
      const pileY = 928 + (index % 3) * 22;
      const base = this.scene.add
        .ellipse(pileX, pileY, 250, 96, index % 2 === 0 ? 0x1b1720 : 0x2b2430, 0.86)
        .setDepth(FOREGROUND_OCCLUDER_DEPTH + 10 + index * 3)
        .setScrollFactor(FOREGROUND_SCROLL_FACTOR, 1);
      const box = this.scene.add
        .rectangle(pileX - 52, pileY - 46, 104, 54, 0x4c3c48, 0.78)
        .setAngle(index % 2 === 0 ? -7 : 5)
        .setDepth(FOREGROUND_OCCLUDER_DEPTH + 11 + index * 3)
        .setScrollFactor(FOREGROUND_SCROLL_FACTOR, 1);
      const softPile = this.scene.add
        .ellipse(pileX + 72, pileY - 28, 122, 54, 0x5b4e62, 0.68)
        .setAngle(index % 2 === 0 ? 4 : -5)
        .setDepth(FOREGROUND_OCCLUDER_DEPTH + 12 + index * 3)
        .setScrollFactor(FOREGROUND_SCROLL_FACTOR, 1);
      this.trackForegroundOccluders([base, box, softPile]);
    }
  }

  private renderBedroomPlaceholder(segment: RuntimeRoomSegment, floorBounds: RuntimeFloorBounds): void {
    const roomStartX = segment.x - this.bedroomOffset(segment);
    const roomWidth = DESIGN_WIDTH * 2.25;
    this.renderBedroomFarBackground(segment, roomStartX, roomWidth);
    this.renderBedroomBackgroundClutter(segment, roomStartX, roomWidth);
    this.renderBedroomMainPlane(segment, floorBounds, roomStartX, roomWidth);
    this.renderBedroomStaticProps(segment, roomStartX, roomWidth);
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
    const layerScroll = INTERIOR_SCROLL_FACTOR;
    const x = segment.x;
    const w = segment.width;
    if (this.isFirstBedroomSegment(segment, roomStartX)) {
      this.renderBedroomWallBase(roomStartX, roomWidth, layerScroll);
    }

    const windowCenter = roomStartX + roomWidth * 0.43;
    if (windowCenter > x - 240 && windowCenter < x + w + 240) {
      this.renderWindow(windowCenter, 244, 410, 248, 'bedroom', layerScroll);
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

  private isFirstBedroomSegment(segment: RuntimeRoomSegment, roomStartX: number): boolean {
    return Math.abs(segment.x - roomStartX) < 1;
  }

  private renderBedroomWallBase(roomStartX: number, roomWidth: number, scrollFactor: number): void {
    const wallLeftX = roomStartX - BEDROOM_WALL_VISIBLE_CROP_X;
    const wallCenterX = wallLeftX + BEDROOM_WALL_BLEED_WIDTH / 2;
    const wall = this.scene.add
      .image(wallCenterX, BEDROOM_WALL_BLEED_HEIGHT / 2, BEDROOM_WALL_BASE_TEXTURE_KEY)
      .setDisplaySize(BEDROOM_WALL_BLEED_WIDTH, BEDROOM_WALL_BLEED_HEIGHT)
      .setDepth(2)
      .setScrollFactor(scrollFactor, 1);

    const topShade = this.scene.add
      .rectangle(roomStartX + roomWidth / 2, 22, roomWidth + 120, 44, 0x0c0d14, 0.24)
      .setDepth(9)
      .setScrollFactor(scrollFactor, 1);

    this.root?.add([wall, topShade]);
  }

  private renderSegmentWindows(segment: RuntimeRoomSegment): void {
    const windowCountByRoom: Record<string, number> = {
      hallway: 1,
      bathroom: 1,
      kitchen: 1,
      living_room: 2,
      entryway: 1,
    };
    const count = windowCountByRoom[segment.roomId] ?? 0;
    if (count === 0) {
      return;
    }

    const baseWidth = segment.roomId === 'living_room' ? 330 : 260;
    const baseHeight = segment.roomId === 'bathroom' ? 178 : 210;
    for (let index = 0; index < count; index += 1) {
      const ratio = count === 1 ? 0.5 : 0.34 + index * 0.32;
      const centerX = segment.x + segment.width * ratio;
      const centerY = segment.roomId === 'bathroom' ? 256 : 248 + (index % 2) * 18;
      this.renderWindow(centerX, centerY, baseWidth, baseHeight, segment.roomId, INTERIOR_SCROLL_FACTOR);
    }
  }

  private renderWindow(
    centerX: number,
    centerY: number,
    width: number,
    height: number,
    variant: string,
    scrollFactor: number,
  ): void {
    const paneInset = 12;
    const paneWidth = width - paneInset * 2;
    const paneHeight = height - paneInset * 2;
    const outsideVariantOffset: Record<string, number> = {
      bedroom: 0.08,
      hallway: 0.28,
      bathroom: 0.43,
      kitchen: 0.58,
      living_room: 0.72,
      entryway: 0.86,
    };
    const cropOffset = outsideVariantOffset[variant] ?? 0.5;
    const tileScale = Math.max(paneWidth / (OUTSIDE_LAYER_SOURCE_WIDTH * 0.52), paneHeight / (OUTSIDE_LAYER_SOURCE_HEIGHT * 0.58));
    const outside = this.scene.add
      .tileSprite(centerX, centerY, paneWidth, paneHeight, WINDOW_OUTSIDE_WORLD_TEXTURE_KEY)
      .setDepth(WINDOW_PICTURE_DEPTH)
      .setScrollFactor(scrollFactor, 1);
    outside.tileScaleX = tileScale;
    outside.tileScaleY = tileScale;
    outside.tilePositionX = OUTSIDE_LAYER_SOURCE_WIDTH * cropOffset;
    outside.tilePositionY = variant === 'bathroom' ? OUTSIDE_LAYER_SOURCE_HEIGHT * 0.2 : OUTSIDE_LAYER_SOURCE_HEIGHT * 0.12;
    this.outsideWindowPanes.push({
      tile: outside,
      baseTileX: outside.tilePositionX,
      drift: (1 - OUTDOOR_FAR_SCROLL_FACTOR) * tileScale * 0.9 * OUTDOOR_PARALLAX_SPEED_MULTIPLIER,
    });
    const pictureBacking = this.scene.add
      .rectangle(centerX, centerY, width + 12, height + 12, 0xd7eaf3, 0.14)
      .setDepth(WINDOW_PICTURE_DEPTH - 1)
      .setScrollFactor(scrollFactor, 1);
    const glassTint = this.scene.add
      .rectangle(centerX, centerY, paneWidth, paneHeight, variant === 'bathroom' ? 0xd9edf5 : 0xc8e8f6, 0.24)
      .setDepth(WINDOW_PICTURE_DEPTH + 1)
      .setScrollFactor(scrollFactor, 1);
    const frame = this.scene.add
      .rectangle(centerX, centerY, width, height, 0x000000, 0)
      .setStrokeStyle(10, 0xa9bac5, 0.98)
      .setDepth(WINDOW_PICTURE_DEPTH + 2)
      .setScrollFactor(scrollFactor, 1);
    const vertical = this.scene.add
      .rectangle(centerX, centerY, 8, height - 8, 0xb7c8d0, 0.94)
      .setDepth(WINDOW_PICTURE_DEPTH + 3)
      .setScrollFactor(scrollFactor, 1);
    const horizontal = this.scene.add
      .rectangle(centerX, centerY, width - 8, 7, 0xb7c8d0, 0.86)
      .setDepth(WINDOW_PICTURE_DEPTH + 3)
      .setScrollFactor(scrollFactor, 1);
    const blindA = this.scene.add
      .rectangle(centerX, centerY - height * 0.34, width - 22, 8, 0x24364a, 0.52)
      .setDepth(WINDOW_PICTURE_DEPTH + 4)
      .setScrollFactor(scrollFactor, 1);
    const blindB = this.scene.add
      .rectangle(centerX, centerY - height * 0.16, width - 26, 6, 0x24364a, 0.42)
      .setDepth(WINDOW_PICTURE_DEPTH + 4)
      .setScrollFactor(scrollFactor, 1);
    this.registerWindowLightReveal(centerX, centerY, width, height, variant);
    this.windowLightOverlays.push(
      pictureBacking,
      outside,
      glassTint,
      frame,
      vertical,
      horizontal,
      blindA,
      blindB,
    );
  }

  private registerWindowLightReveal(
    centerX: number,
    centerY: number,
    width: number,
    height: number,
    variant: string,
  ): void {
    const isBathroom = variant === 'bathroom';
    const floorY = isBathroom ? 760 : 792;
    const patchCenterX = centerX + width * (isBathroom ? 0.1 : 0.2);
    const patchWidth = width * (isBathroom ? 1.12 : 1.36);
    const patchHeight = isBathroom ? 116 : 138;
    const lean = width * 0.28;
    const revealStrength = isBathroom ? 0.26 : 0.32;
    this.windowLightZones.push({
      x: centerX,
      y: centerY,
      radius: Math.max(width, height) * 0.5,
      width: width + 18,
      height: height + 18,
      strength: 0.96,
      layer: 'all',
    });

    const revealZones = [
      {
        x: patchCenterX + width * 0.18,
        y: floorY + patchHeight * 0.08,
        radius: patchWidth * 0.38,
        radiusX: patchWidth * 0.48,
        radiusY: patchHeight * 0.36,
        strength: revealStrength,
      },
      {
        x: patchCenterX + lean * 0.95,
        y: floorY + patchHeight * 0.22,
        radius: patchWidth * 0.32,
        radiusX: patchWidth * 0.38,
        radiusY: patchHeight * 0.28,
        strength: revealStrength * 0.72,
      },
    ];

    revealZones.forEach((zone) => {
      this.windowLightZones.push({
        ...zone,
        layer: 'main',
      });
    });
  }

  private renderBedroomBackgroundClutter(segment: RuntimeRoomSegment, roomStartX: number, roomWidth: number): void {
    const scrollFactor = INTERIOR_SCROLL_FACTOR;
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
          .setDepth(BEDROOM_BACKGROUND_PROP_DEPTH + (index % 3))
          .setScrollFactor(scrollFactor, 1);
      }
    });
    this.root?.add(props);
  }

  private renderBedroomMainPlane(
    segment: RuntimeRoomSegment,
    floorBounds: RuntimeFloorBounds,
    roomStartX: number,
    roomWidth: number,
  ): void {
    const x = segment.x;
    const w = segment.width;
    const visualMinY = this.visualFloorMinY(floorBounds);

    if (this.isFirstBedroomSegment(segment, roomStartX)) {
      const carpetLeftX = roomStartX - BEDROOM_CARPET_VISIBLE_CROP_X;
      const carpetCenterX = carpetLeftX + BEDROOM_CARPET_BLEED_WIDTH / 2;
      const carpetCenterY = visualMinY - BEDROOM_CARPET_WALL_OVERLAP + BEDROOM_CARPET_DISPLAY_HEIGHT / 2;
      const carpet = this.scene.add
        .image(carpetCenterX, carpetCenterY, BEDROOM_CARPET_FLOOR_TEXTURE_KEY)
        .setDisplaySize(BEDROOM_CARPET_BLEED_WIDTH, BEDROOM_CARPET_DISPLAY_HEIGHT)
        .setDepth(22)
        .setScrollFactor(1, 1);
      this.root?.add(carpet);
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

  private renderBedroomStaticProps(segment: RuntimeRoomSegment, roomStartX: number, roomWidth: number): void {
    const propById = new Map(BEDROOM_STATIC_PROP_ASSETS.map((asset) => [asset.id, asset]));
    const local = (ratio: number) => roomStartX + roomWidth * ratio;
    const placementsBySegment: Record<string, BedroomStaticPropPlacement[]> = {
      bed_left_start: [
        {
          id: 'overflowing_laundry_basket',
          x: segment.x + 192,
          y: 932,
          width: 292,
          depth: FOREGROUND_OCCLUDER_DEPTH,
          scrollFactor: FOREGROUND_SCROLL_FACTOR,
        },
        {
          id: 'toy_bin_spill',
          x: segment.x + 566,
          y: 944,
          width: 314,
          depth: FOREGROUND_OCCLUDER_DEPTH + 1,
          scrollFactor: FOREGROUND_SCROLL_FACTOR,
        },
        {
          id: 'toy_truck_blocks',
          x: segment.x + 790,
          y: 820,
          width: 206,
          depth: 30,
          scrollFactor: INTERIOR_SCROLL_FACTOR,
          alpha: 0.9,
        },
      ],
      bed_center_mess: [
        {
          id: 'child_bed_corner',
          x: local(0.61),
          y: 560,
          width: 404,
          depth: BEDROOM_BACKGROUND_PROP_DEPTH,
          scrollFactor: INTERIOR_SCROLL_FACTOR,
        },
        {
          id: 'dirty_clothes_mound',
          x: local(0.42),
          y: 948,
          width: 362,
          depth: FOREGROUND_OCCLUDER_DEPTH,
          scrollFactor: FOREGROUND_SCROLL_FACTOR,
        },
        {
          id: 'battered_plush',
          x: local(0.32),
          y: 940,
          width: 178,
          depth: FOREGROUND_OCCLUDER_DEPTH + 2,
          scrollFactor: FOREGROUND_SCROLL_FACTOR,
        },
        {
          id: 'small_chair_clothes',
          x: local(0.5),
          y: 812,
          width: 174,
          depth: 31,
          scrollFactor: INTERIOR_SCROLL_FACTOR,
        },
        {
          id: 'backpack_shoes_pile',
          x: local(0.73),
          y: 846,
          width: 248,
          depth: 32,
          scrollFactor: INTERIOR_SCROLL_FACTOR,
        },
      ],
      bed_right_exit: [
        {
          id: 'nightstand_lamp',
          x: segment.x + segment.width * 0.42,
          y: 594,
          width: 240,
          depth: BEDROOM_BACKGROUND_PROP_DEPTH,
          scrollFactor: INTERIOR_SCROLL_FACTOR,
        },
        {
          id: 'low_dresser_crates',
          x: segment.x + segment.width * 0.73,
          y: 604,
          width: 312,
          depth: BEDROOM_BACKGROUND_PROP_DEPTH,
          scrollFactor: INTERIOR_SCROLL_FACTOR,
        },
        {
          id: 'scattered_books_comics',
          x: segment.x + segment.width * 0.28,
          y: 812,
          width: 244,
          depth: 31,
          scrollFactor: INTERIOR_SCROLL_FACTOR,
        },
        {
          id: 'tipped_cardboard_box',
          x: segment.x + segment.width * 0.82,
          y: 948,
          width: 330,
          depth: FOREGROUND_OCCLUDER_DEPTH,
          scrollFactor: FOREGROUND_SCROLL_FACTOR,
        },
      ],
    };

    placementsBySegment[segment.id]?.forEach((placement) => {
      const asset = propById.get(placement.id);
      if (!asset || !this.scene.textures.exists(asset.textureKey)) {
        return;
      }

      const sourceImage = this.scene.textures.get(asset.textureKey).getSourceImage();
      const height = placement.width * (sourceImage.height / sourceImage.width);
      const image = this.scene.add
        .image(placement.x, placement.y, asset.textureKey)
        .setOrigin(0.5, 1)
        .setDisplaySize(placement.width, height)
        .setDepth(placement.depth)
        .setScrollFactor(placement.scrollFactor, 1)
        .setAlpha(placement.alpha ?? 1);
      if (placement.depth >= FOREGROUND_OCCLUDER_DEPTH) {
        this.trackForegroundOccluders([image]);
      } else {
        this.root?.add(image);
      }
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

  private visualFloorMinY(floorBounds: RuntimeFloorBounds): number {
    return floorBounds.visualMinY ?? floorBounds.minY;
  }

  private renderEnemyAnchors(segment: RuntimeRoomSegment): void {
    segment.enemySpawns.forEach((name, index) => {
      const x = segment.x + segment.width * (0.62 + index * 0.14);
      const baseDepth = segment.roomId === 'bedroom' ? BEDROOM_BACKGROUND_MARKER_DEPTH : 16;
      const eyes = this.scene.add
        .rectangle(x, 485, 76, 34, 0x24192c, 0.92)
        .setDepth(baseDepth)
        .setScrollFactor(INTERIOR_SCROLL_FACTOR, 1);
      const leftEye = this.scene.add
        .circle(x - 12, 484, 5, 0xb3e15d, 1)
        .setDepth(baseDepth + 1)
        .setScrollFactor(INTERIOR_SCROLL_FACTOR, 1);
      const rightEye = this.scene.add
        .circle(x + 12, 484, 5, 0xb3e15d, 1)
        .setDepth(baseDepth + 1)
        .setScrollFactor(INTERIOR_SCROLL_FACTOR, 1);
      const label = this.scene.add
        .text(x, 512, name, {
          color: '#9dbf73',
          fontSize: '12px',
          align: 'center',
          wordWrap: { width: 128 },
        })
        .setOrigin(0.5)
        .setDepth(baseDepth + 2)
        .setScrollFactor(INTERIOR_SCROLL_FACTOR, 1);
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
