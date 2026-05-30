import Phaser from 'phaser';
import { createInitialGameState } from '../core/GameState';
import { gameEvents } from '../core/EventBus';
import { getFirstRoom } from '../data/loaders';
import type { RuntimeRoom, SourceLevelData } from '../data/levelTypes';
import { DebugOverlay } from '../dev/DebugOverlay';
import { debugCommands } from '../dev/DebugCommands';
import { Player } from '../entities/Player';
import { CameraSystem } from '../systems/CameraSystem';
import { DESIGN_HEIGHT, DESIGN_WIDTH, ResponsiveScaleSystem } from '../systems/ResponsiveScaleSystem';
import { ParallaxSystem } from '../systems/ParallaxSystem';
import { InputSystem } from '../systems/InputSystem';
import { PlayerController } from '../systems/PlayerController';
import { DepthPlaneSystem } from '../systems/DepthPlaneSystem';
import { FlashlightSystem, type FlashlightState, type FlashlightTarget } from '../systems/FlashlightSystem';
import { InventorySystem } from '../systems/InventorySystem';
import { SearchSystem, type SearchState } from '../systems/SearchSystem';

export class LevelScene extends Phaser.Scene {
  private debugOverlay?: DebugOverlay;
  private responsive?: ResponsiveScaleSystem;
  private cameraSystem?: CameraSystem;
  private parallaxSystem?: ParallaxSystem;
  private inputSystem?: InputSystem;
  private playerController?: PlayerController;
  private flashlightSystem?: FlashlightSystem;
  private inventorySystem?: InventorySystem;
  private searchSystem?: SearchSystem;
  private player?: Player;
  private room?: RuntimeRoom;
  private depthPlane = new DepthPlaneSystem();
  private phaseLabels: Phaser.GameObjects.GameObject[] = [];
  private depthReferenceObjects: Phaser.GameObjects.GameObject[] = [];
  private flashlightTargets: FlashlightTarget[] = [];

  constructor() {
    super('LevelScene');
  }

  create(): void {
    const state = createInitialGameState();
    const levelData = this.cache.json.get('level01FamilyHouse') as SourceLevelData | undefined;
    this.room = getFirstRoom(levelData ?? { schema: 'missing', level_id: 'missing', title: 'Missing', rooms: [] });
    this.responsive = new ResponsiveScaleSystem(this);
    this.cameraSystem = new CameraSystem(this);
    this.parallaxSystem = new ParallaxSystem(this);
    this.inputSystem = new InputSystem(this);
    this.inventorySystem = new InventorySystem();
    this.player = new Player(this, DESIGN_WIDTH * 0.38, 750);
    this.playerController = new PlayerController(this.player, {
      floorBounds: this.room.floorBounds,
      blockers: this.room.segments.flatMap((segment) => segment.blockers),
    });

    this.cameras.main.setBackgroundColor('#111016');
    this.responsive.onResize(() => this.renderRoom());
    this.flashlightSystem = new FlashlightSystem(this, this.player, this.flashlightTargets);

    this.scene.launch('UIScene', { state });
    gameEvents.emit({ type: 'objective.changed', text: state.objective });

    this.input.keyboard?.once('keydown-ESC', () => {
      this.scene.stop('UIScene');
      this.scene.start('MainMenuScene');
    });

    this.debugOverlay = new DebugOverlay(this);
    this.input.keyboard?.on(`keydown-${debugCommands.overlayToggleKey}`, () => {
      this.debugOverlay?.toggle();
    });
    this.input.keyboard?.on(`keydown-${debugCommands.worldDebugToggleKey}`, () => {
      this.parallaxSystem?.toggleDebug();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.responsive?.destroy();
      this.flashlightSystem?.destroy();
      this.searchSystem?.destroy();
    });
  }

  update(_: number, delta: number): void {
    const input = this.inputSystem?.read();
    let movementState;
    if (input) {
      movementState = this.playerController?.update(input, delta);
      const flashlightState = this.flashlightSystem?.update(input, delta);
      const searchState = this.searchSystem?.update(input, delta);
      this.publishDebugState(movementState, flashlightState, searchState);
    } else {
      this.publishDebugState(movementState);
    }
    this.debugOverlay?.update();
  }

  private renderRoom(): void {
    const layout = this.responsive?.getLayout();
    const room = this.room;
    const player = this.player;
    if (!layout || !room || !this.cameraSystem || !this.parallaxSystem || !player) {
      return;
    }

    this.cameraSystem.configureFoundation(layout, room.width, DESIGN_HEIGHT);
    this.parallaxSystem.renderRoom(room);
    this.renderDepthReferenceObjects(room);
    this.searchSystem?.destroy();
    this.searchSystem = this.inventorySystem ? new SearchSystem(this, room, player, this.inventorySystem) : undefined;
    this.refreshFlashlightTargets();
    this.flashlightSystem?.setTargets(this.flashlightTargets);
    this.renderPhaseLabels(room, layout.viewportClass);
    this.depthPlane.applyDepth(player.container, player.y, room.floorBounds);
    this.cameraSystem.follow(player.container);
    this.responsive?.ensurePortraitPrompt();
  }

  private renderPhaseLabels(room: RuntimeRoom, viewportClass: string): void {
    this.phaseLabels.forEach((label) => label.destroy());
    this.phaseLabels = [];

    const title = this.add
      .text(64, 96, 'Phase 5 search loot inventory', {
        color: '#f4efe0',
        fontSize: '32px',
      })
      .setDepth(2_200)
      .setScrollFactor(0);
    const details = this.add
      .text(
        64,
        140,
        [
          `room: ${room.id} (${room.segments.length} segments, ${Math.round(room.width)} world px)`,
          `viewport class: ${viewportClass}`,
          'WASD/arrows move. E searches. Mouse aims light. 1/2/3 switch depth. Space focuses. F flickers.',
        ],
        {
          color: '#aaa196',
          fontSize: '18px',
          lineSpacing: 5,
        },
      )
      .setDepth(2_200)
      .setScrollFactor(0);

    this.phaseLabels = [title, details];
  }

  private renderDepthReferenceObjects(room: RuntimeRoom): void {
    this.depthReferenceObjects.forEach((object) => object.destroy());
    this.depthReferenceObjects = [];

    const furniture = [
      { label: 'background target', layer: 'background' as const, x: 940, y: 700, width: 120, height: 86, color: 0x3f5470 },
      { label: 'foreground target', layer: 'foreground' as const, x: 1_210, y: 835, width: 154, height: 74, color: 0x72515b },
      { label: 'main target', layer: 'main' as const, x: 1_135, y: 765, width: 112, height: 116, color: 0x514365 },
    ];

    furniture.forEach((item) => {
      const base = this.add.rectangle(item.x, item.y, item.width, item.height, item.color, 0.94);
      const label = this.add
        .text(item.x, item.y, item.label, {
          color: '#ded5c4',
          fontSize: '13px',
          align: 'center',
          wordWrap: { width: item.width - 10 },
        })
        .setOrigin(0.5);
      this.depthPlane.applyDepth(base, item.y, room.floorBounds, -4);
      this.depthPlane.applyDepth(label, item.y, room.floorBounds, -3);
      base.setData('flashlightTarget', {
        id: item.label.replaceAll(' ', '-'),
        layer: item.layer,
        x: item.x,
        y: item.y,
        radius: Math.max(item.width, item.height) * 0.46,
      });
      this.depthReferenceObjects.push(base, label);
    });
  }

  private refreshFlashlightTargets(): void {
    this.flashlightTargets.length = 0;
    this.depthReferenceObjects.forEach((object) => {
      const target = object.getData?.('flashlightTarget') as Omit<FlashlightTarget, 'object'> | undefined;
      if (target) {
        this.flashlightTargets.push({ ...target, object });
      }
    });
  }

  private publishDebugState(
    movementState?: ReturnType<PlayerController['update']>,
    flashlightState?: FlashlightState,
    searchState?: SearchState,
  ): void {
    if (!import.meta.env.DEV || !this.player || !movementState) {
      return;
    }

    window.__PILEUP_DEBUG__ = {
      phase: 'Phase 5',
      player: {
        x: Math.round(this.player.x),
        y: Math.round(this.player.y),
        stamina: movementState.stamina,
        isMoving: movementState.isMoving,
        isSprinting: movementState.isSprinting,
        isCrouching: movementState.isCrouching,
        noise: movementState.noise,
      },
      flashlight: flashlightState
        ? {
            layer: flashlightState.layer,
            focus: flashlightState.focus,
            flicker: flashlightState.flicker,
            battery: flashlightState.battery,
            hitIds: flashlightState.hitIds,
          }
        : undefined,
      search: searchState
        ? {
            nearestId: searchState.nearestId,
            activeId: searchState.activeId,
            progress01: Number(searchState.progress01.toFixed(2)),
            noise: Number(searchState.noise.toFixed(1)),
            lastResult: searchState.lastResult,
          }
        : undefined,
    };
    document.body.dataset.pileupPhase = 'Phase 5';
    document.body.dataset.pileupPlayerX = String(Math.round(this.player.x));
    document.body.dataset.pileupPlayerY = String(Math.round(this.player.y));
    document.body.dataset.pileupStamina = String(movementState.stamina);
    document.body.dataset.pileupMoving = String(movementState.isMoving);
    document.body.dataset.pileupSprinting = String(movementState.isSprinting);
    document.body.dataset.pileupCrouching = String(movementState.isCrouching);
    document.body.dataset.pileupNoise = movementState.noise.toFixed(2);
    if (flashlightState) {
      document.body.dataset.pileupFlashlightLayer = flashlightState.layer;
      document.body.dataset.pileupFlashlightFocus = String(flashlightState.focus);
      document.body.dataset.pileupFlashlightFlicker = String(flashlightState.flicker);
      document.body.dataset.pileupFlashlightBattery = String(flashlightState.battery);
      document.body.dataset.pileupFlashlightHits = flashlightState.hitIds.join(',');
    }
    if (searchState) {
      document.body.dataset.pileupSearchNearest = searchState.nearestId ?? '';
      document.body.dataset.pileupSearchActive = searchState.activeId ?? '';
      document.body.dataset.pileupSearchProgress = searchState.progress01.toFixed(2);
      document.body.dataset.pileupSearchNoise = searchState.noise.toFixed(1);
      document.body.dataset.pileupSearchResult = searchState.lastResult ?? '';
    }
  }
}
