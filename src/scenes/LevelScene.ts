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

export class LevelScene extends Phaser.Scene {
  private debugOverlay?: DebugOverlay;
  private responsive?: ResponsiveScaleSystem;
  private cameraSystem?: CameraSystem;
  private parallaxSystem?: ParallaxSystem;
  private inputSystem?: InputSystem;
  private playerController?: PlayerController;
  private player?: Player;
  private room?: RuntimeRoom;
  private depthPlane = new DepthPlaneSystem();
  private phaseLabels: Phaser.GameObjects.GameObject[] = [];
  private depthReferenceObjects: Phaser.GameObjects.GameObject[] = [];

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
    this.player = new Player(this, DESIGN_WIDTH * 0.38, 750);
    this.playerController = new PlayerController(this.player, {
      floorBounds: this.room.floorBounds,
      blockers: this.room.segments.flatMap((segment) => segment.blockers),
    });

    this.cameras.main.setBackgroundColor('#111016');
    this.responsive.onResize(() => this.renderRoom());

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
  }

  update(_: number, delta: number): void {
    const input = this.inputSystem?.read();
    let movementState;
    if (input) {
      movementState = this.playerController?.update(input, delta);
    }
    this.publishDebugState(movementState);
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
    this.renderPhaseLabels(room, layout.viewportClass);
    this.depthPlane.applyDepth(player.container, player.y, room.floorBounds);
    this.cameraSystem.follow(player.container);
    this.responsive?.ensurePortraitPrompt();
  }

  private renderPhaseLabels(room: RuntimeRoom, viewportClass: string): void {
    this.phaseLabels.forEach((label) => label.destroy());
    this.phaseLabels = [];

    const title = this.add
      .text(64, 96, 'Phase 3 player floor-plane controller', {
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
          'WASD/arrows move. Shift sprints. C crouches. F4 toggles layer/collision labels.',
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
      { label: 'rear hamper blocker', x: 940, y: 700, width: 120, height: 86, color: 0x4b4354 },
      { label: 'front toy pile', x: 1_210, y: 835, width: 154, height: 74, color: 0x69525e },
      { label: 'laundry placeholder', x: 1_520, y: 765, width: 112, height: 116, color: 0x3c3145 },
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
      this.depthReferenceObjects.push(base, label);
    });
  }

  private publishDebugState(movementState?: ReturnType<PlayerController['update']>): void {
    if (!import.meta.env.DEV || !this.player || !movementState) {
      return;
    }

    window.__PILEUP_DEBUG__ = {
      phase: 'Phase 3',
      player: {
        x: Math.round(this.player.x),
        y: Math.round(this.player.y),
        stamina: movementState.stamina,
        isMoving: movementState.isMoving,
        isSprinting: movementState.isSprinting,
        isCrouching: movementState.isCrouching,
        noise: movementState.noise,
      },
    };
    document.body.dataset.pileupPhase = 'Phase 3';
    document.body.dataset.pileupPlayerX = String(Math.round(this.player.x));
    document.body.dataset.pileupPlayerY = String(Math.round(this.player.y));
    document.body.dataset.pileupStamina = String(movementState.stamina);
    document.body.dataset.pileupMoving = String(movementState.isMoving);
    document.body.dataset.pileupSprinting = String(movementState.isSprinting);
    document.body.dataset.pileupCrouching = String(movementState.isCrouching);
    document.body.dataset.pileupNoise = movementState.noise.toFixed(2);
  }
}
