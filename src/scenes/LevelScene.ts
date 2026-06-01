import Phaser from 'phaser';
import { createInitialGameState, type GameState } from '../core/GameState';
import { gameEvents } from '../core/EventBus';
import { adaptLevelFromSource } from '../data/loaders';
import type { RuntimeRoom, SourceLevelData } from '../data/levelTypes';
import { Player } from '../entities/Player';
import { CameraSystem } from '../systems/CameraSystem';
import { DESIGN_HEIGHT, DESIGN_WIDTH, ResponsiveScaleSystem } from '../systems/ResponsiveScaleSystem';
import { ParallaxSystem } from '../systems/ParallaxSystem';
import { InputSystem } from '../systems/InputSystem';
import { PlayerController } from '../systems/PlayerController';
import { DepthPlaneSystem } from '../systems/DepthPlaneSystem';
import { DarknessSystem } from '../systems/DarknessSystem';
import { FlashlightSystem, type FlashlightState, type FlashlightTarget } from '../systems/FlashlightSystem';
import { InventorySystem, ITEM_DEFINITIONS, labelForItemId } from '../systems/InventorySystem';
import { SearchSystem, type SearchState } from '../systems/SearchSystem';
import { EnemySystem, type EnemySystemState } from '../systems/EnemySystem';
import { DoorSystem, type DoorSystemState } from '../systems/DoorSystem';
import { AudioSystem } from '../systems/AudioSystem';
import { BossDoorSequenceSystem, type BossDoorSequenceState } from '../systems/BossDoorSequenceSystem';

const PLAYER_DARKNESS_EXEMPT_DEPTH = 1_440;
const FOREGROUND_REFERENCE_DEPTH = PLAYER_DARKNESS_EXEMPT_DEPTH + 30;
const BATTERY_CHANGE_MS = 1000;

export class LevelScene extends Phaser.Scene {
  private state?: GameState;
  private responsive?: ResponsiveScaleSystem;
  private cameraSystem?: CameraSystem;
  private parallaxSystem?: ParallaxSystem;
  private inputSystem?: InputSystem;
  private playerController?: PlayerController;
  private darknessSystem?: DarknessSystem;
  private flashlightSystem?: FlashlightSystem;
  private inventorySystem?: InventorySystem;
  private searchSystem?: SearchSystem;
  private enemySystem?: EnemySystem;
  private doorSystem?: DoorSystem;
  private bossDoorSequence?: BossDoorSequenceSystem;
  private audioSystem?: AudioSystem;
  private player?: Player;
  private room?: RuntimeRoom;
  private depthPlane = new DepthPlaneSystem();
  private phaseLabels: Phaser.GameObjects.GameObject[] = [];
  private depthReferenceObjects: Phaser.GameObjects.GameObject[] = [];
  private flashlightTargets: FlashlightTarget[] = [];
  private activeRoomId = '';
  private unsubscribeEvents: Array<() => void> = [];
  private selectedItemId?: string;
  private batteryUseProgressMs = 0;
  private batteryUseCompletedWhileHeld = false;
  private darknessDisabled = false;
  private flashlightManuallyOff = false;

  constructor() {
    super('LevelScene');
  }

  create(): void {
    this.state = createInitialGameState();
    const levelData = this.cache.json.get('level01FamilyHouse') as SourceLevelData | undefined;
    const seed = new URLSearchParams(window.location.search).get('seed') ?? `pileup-${Date.now().toString(36)}`;
    this.darknessDisabled = this.isDarknessDisabledByQuery();
    this.room = adaptLevelFromSource(levelData ?? { schema: 'missing', level_id: 'missing', title: 'Missing', rooms: [] }, seed);
    this.responsive = new ResponsiveScaleSystem(this);
    this.cameraSystem = new CameraSystem(this);
    this.parallaxSystem = new ParallaxSystem(this);
    this.inputSystem = new InputSystem(this);
    this.inventorySystem = new InventorySystem();
    this.audioSystem = new AudioSystem(this);
    this.player = new Player(this, this.room.floorBounds.minX + 220, 750);
    this.playerController = new PlayerController(this.player, {
      floorBounds: this.room.floorBounds,
      blockers: this.room.segments.flatMap((segment) => segment.blockers),
    });

    this.cameras.main.setBackgroundColor('#111016');
    if (!this.isParallaxPreview()) {
      this.darknessSystem = new DarknessSystem(this, {
        worldWidth: this.room.width,
        worldHeight: DESIGN_HEIGHT,
        debug: new URLSearchParams(window.location.search).get('lightingDebug') === '1',
      });
      this.darknessSystem.setEnabled(!this.darknessDisabled);
    }
    this.flashlightSystem = new FlashlightSystem(this, this.player, this.flashlightTargets);
    this.responsive.onResize(() => this.renderRoom());

    this.scene.launch('UIScene', {
      state: this.state,
      checklistItems: this.buildChecklistItems(),
      phaseInfo: {
        phase: 'Phase 10 flashlight feedback',
        roomId: this.room.id,
        segmentCount: this.room.segments.length,
        worldWidth: Math.round(this.room.width),
        seed: this.room.seed,
      },
    });
    this.scene.bringToTop('UIScene');
    gameEvents.emit({ type: 'run.seeded', seed });
    this.publishRunSeedDebug();
    gameEvents.emit({ type: 'objective.changed', text: this.state.objective });
    gameEvents.emit({ type: 'player.healthChanged', value: this.state.health, max: this.state.maxHealth });

    this.unsubscribeEvents.push(gameEvents.on('inventory.selectedChanged', (event) => {
      this.selectedItemId = event.itemId;
      this.batteryUseCompletedWhileHeld = false;
      this.resetBatteryUseProgress();
    }));
    this.unsubscribeEvents.push(gameEvents.on('flashlight.toggleRequested', () => {
      this.flashlightManuallyOff = !this.flashlightManuallyOff;
      gameEvents.emit({ type: 'flashlight.powerChanged', enabled: !this.flashlightManuallyOff });
      gameEvents.emit({
        type: 'hud.toast',
        tone: this.flashlightManuallyOff ? 'warning' : 'item',
        text: this.flashlightManuallyOff ? 'Flashlight off.' : 'Flashlight on.',
      });
    }));
    this.unsubscribeEvents.push(gameEvents.on('inventory.useRequested', (event) => this.resolveInventoryUse(event.itemId)));
    this.unsubscribeEvents.push(gameEvents.on('settings.darknessToggled', (event) => {
      this.darknessDisabled = event.disabled;
      this.darknessSystem?.setEnabled(!event.disabled);
    }));
    this.unsubscribeEvents.push(gameEvents.on('settings.worldDebugToggled', (event) => {
      this.parallaxSystem?.setDebugVisible(event.visible);
    }));
    this.time.delayedCall(0, () => this.applyInventoryDebugQuery());
    gameEvents.emit({ type: 'flashlight.powerChanged', enabled: !this.flashlightManuallyOff });

    this.input.keyboard?.on('keydown-ESC', (event: KeyboardEvent) => {
      if (event.defaultPrevented || document.body.dataset.pileupBackpackOpen === '1') {
        return;
      }
      this.scene.stop('UIScene');
      this.scene.start('MainMenuScene');
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.responsive?.destroy();
      this.darknessSystem?.destroy();
      this.flashlightSystem?.destroy();
      this.searchSystem?.destroy();
      this.enemySystem?.destroy();
      this.doorSystem?.destroy();
      this.bossDoorSequence?.destroy();
      this.audioSystem?.destroy();
      this.unsubscribeEvents.forEach((unsubscribe) => unsubscribe());
      this.unsubscribeEvents = [];
      this.resetBatteryUseProgress();
    });
  }

  update(_: number, delta: number): void {
    const input = this.inputSystem?.read();
    const backpackOpen = document.body.dataset.pileupBackpackOpen === '1';
    let movementState;
    if (input && !backpackOpen) {
      const batterySelected = this.isSelectedBatteryItem();
      this.updateBatteryUse(input, delta, batterySelected);
      const flashlightDisabled = batterySelected || this.flashlightManuallyOff;
      const gameplayInput = flashlightDisabled ? { ...input, interact: batterySelected ? false : input.interact, focus: false } : input;
      movementState = this.playerController?.update(gameplayInput, delta);
      const enemyState = this.enemySystem?.update(delta);
      const searchState = this.searchSystem?.update(gameplayInput, delta);
      this.refreshFlashlightTargets();
      this.flashlightSystem?.setTargets(this.flashlightTargets);
      const flashlightState = this.flashlightSystem?.update(gameplayInput, delta, Boolean(searchState?.activeId), flashlightDisabled);
      this.searchSystem?.setFocusedTargetIds(flashlightState?.focus ? flashlightState.hitIds : []);
      this.keepPlayerAboveDarkness();
      this.parallaxSystem?.update(this.cameras.main.scrollX);
      this.darknessSystem?.update(flashlightState, delta, this.player?.getReadabilityCenterWorld());
      const doorState = this.doorSystem?.update(gameplayInput, delta);
      const bossState = this.bossDoorSequence?.update(gameplayInput, flashlightState, doorState, delta);
      this.updatePlayerActionAnimation(searchState, doorState);
      this.publishDebugState(movementState, flashlightState, searchState, enemyState, doorState, bossState);
      this.updateActiveRoomObjective();
    } else {
      this.resetBatteryUseProgress();
      this.publishDebugState(movementState);
    }
  }

  private renderRoom(): void {
    const layout = this.responsive?.getLayout();
    const room = this.room;
    const player = this.player;
    if (!layout || !room || !this.cameraSystem || !this.parallaxSystem || !player) {
      return;
    }

    this.cameraSystem.configureFoundation(layout, room.width, DESIGN_HEIGHT);
    this.darknessSystem?.setWorldBounds(room.width, DESIGN_HEIGHT);
    this.darknessSystem?.setBlockers(
      room.segments.flatMap((segment) =>
        segment.blockers.map((blocker) => ({
          ...blocker,
          layer: 'all' as const,
          castsShadow: true,
        })),
      ),
    );
    this.parallaxSystem.renderRoom(room);
    this.darknessSystem?.setStaticLightZones(this.parallaxSystem.getWindowLightZones());
    this.renderDepthReferenceObjects(room);
    this.searchSystem?.destroy();
    this.enemySystem?.destroy();
    this.doorSystem?.destroy();
    this.bossDoorSequence?.destroy();
    this.searchSystem = this.inventorySystem ? new SearchSystem(this, room, player, this.inventorySystem) : undefined;
    this.enemySystem = this.isParallaxPreview()
      ? undefined
      : new EnemySystem(this, room, player, (amount, source) => this.applyPlayerDamage(amount, source));
    this.doorSystem =
      this.inventorySystem ? new DoorSystem(this, room, player, this.inventorySystem, () => this.completeEscape()) : undefined;
    this.bossDoorSequence = new BossDoorSequenceSystem(this, room, player, this.inventorySystem?.keyFound() ?? false);
    this.refreshFlashlightTargets();
    this.flashlightSystem?.setTargets(this.flashlightTargets);
    this.renderPhaseLabels(room, layout.viewportClass);
    this.depthPlane.applyDepth(player.container, player.y, room.floorBounds);
    this.keepPlayerAboveDarkness();
    this.cameraSystem.follow(player.container);
    this.parallaxSystem.update(this.cameras.main.scrollX);
    this.responsive?.ensurePortraitPrompt();
  }

  private applyInventoryDebugQuery(): void {
    if (!import.meta.env.DEV || !this.inventorySystem) {
      return;
    }

    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('giveItems') === 'all') {
      Object.keys(ITEM_DEFINITIONS).forEach((itemId) => this.inventorySystem?.addDebugItem(itemId));
    }
  }

  private isParallaxPreview(): boolean {
    return new URLSearchParams(window.location.search).get('parallaxPreview') === '1';
  }

  private isDarknessDisabledByQuery(): boolean {
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get('noDarkness') === '1' || searchParams.get('darkness') === '0' || this.isParallaxPreview();
  }

  private keepPlayerAboveDarkness(): void {
    this.player?.container.setDepth(PLAYER_DARKNESS_EXEMPT_DEPTH);
  }

  private renderPhaseLabels(room: RuntimeRoom, viewportClass: string): void {
    this.phaseLabels.forEach((label) => label.destroy());
    this.phaseLabels = [];
    void room;
    void viewportClass;
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
      if (item.layer === 'foreground') {
        base.setDepth(FOREGROUND_REFERENCE_DEPTH);
        label.setDepth(FOREGROUND_REFERENCE_DEPTH + 1);
      } else {
        this.depthPlane.applyDepth(base, item.y, room.floorBounds, -4);
        this.depthPlane.applyDepth(label, item.y, room.floorBounds, -3);
      }
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
    this.enemySystem?.getFlashlightTargets().forEach((target) => this.flashlightTargets.push(target));
    this.searchSystem?.getFlashlightTargets().forEach((target) => this.flashlightTargets.push(target));
  }

  private applyPlayerDamage(amount: number, source: string): void {
    if (!this.state) {
      return;
    }

    this.state.health = Math.max(0, this.state.health - amount);
    this.player?.playActionAnimation('hurt');
    gameEvents.emit({ type: 'player.healthChanged', value: this.state.health, max: this.state.maxHealth });
    if (this.state.health === 0) {
      this.scene.stop('UIScene');
      this.scene.start('GameOverScene');
      return;
    }

    if (import.meta.env.DEV) {
      document.body.dataset.pileupLastDamageSource = source;
    }
  }

  private completeEscape(): void {
    this.bossDoorSequence?.markEscaped();
    gameEvents.emit({ type: 'objective.changed', text: 'Escaping.' });
    this.cameras.main.fadeOut(320, 244, 239, 224);
    this.time.delayedCall(340, () => {
      this.scene.stop('UIScene');
      this.scene.start('VictoryScene');
    });
  }

  private resolveInventoryUse(itemId: string): void {
    if (!this.inventorySystem) {
      return;
    }

    const itemDefinition = ITEM_DEFINITIONS[itemId];
    if (itemId === 'spare_batteries' || itemDefinition?.effectId === 'restore_flashlight_battery') {
      if (!this.flashlightSystem?.canRestoreBattery()) {
        this.inventorySystem.resolveUse(itemId, false, 'Battery already full.');
        return;
      }
      const battery = this.flashlightSystem.restoreBattery(45);
      this.inventorySystem.resolveUse(itemId, true, `AA BATTERY CONSUMED - FLASHLIGHT ${battery}%`);
      return;
    }

    if (itemId === 'front_door_key') {
      this.inventorySystem.resolveUse(itemId, false, 'Needed at the front door.');
      return;
    }

    this.inventorySystem.resolveUse(itemId, false, 'Not here.');
  }

  private isSelectedBatteryItem(): boolean {
    const itemId = this.selectedItemId;
    const itemDefinition = itemId ? ITEM_DEFINITIONS[itemId] : undefined;
    if (!itemId || itemDefinition?.effectId !== 'restore_flashlight_battery') {
      return false;
    }

    const entry = this.inventorySystem?.inventoryEntries().find((inventoryEntry) => inventoryEntry.itemId === itemId);
    return Boolean(entry && entry.count > 0);
  }

  private updateBatteryUse(input: ReturnType<InputSystem['read']>, deltaMs: number, batterySelected: boolean): void {
    const itemId = this.selectedItemId;
    if (!input.interact) {
      this.batteryUseCompletedWhileHeld = false;
    }

    if (!batterySelected || !itemId || !input.interact || this.batteryUseCompletedWhileHeld) {
      this.resetBatteryUseProgress(itemId);
      return;
    }

    this.batteryUseProgressMs = Math.min(BATTERY_CHANGE_MS, this.batteryUseProgressMs + deltaMs);
    const progress01 = this.batteryUseProgressMs / BATTERY_CHANGE_MS;
    gameEvents.emit({
      type: 'inventory.useProgress',
      itemId,
      label: 'Changing AA batteries',
      progress01,
      active: true,
    });

    if (this.batteryUseProgressMs < BATTERY_CHANGE_MS) {
      return;
    }

    const entry = this.inventorySystem?.inventoryEntries().find((inventoryEntry) => inventoryEntry.itemId === itemId);
    if (!entry || entry.count <= 0) {
      this.resetBatteryUseProgress(itemId);
      return;
    }

    gameEvents.emit({ type: 'inventory.useRequested', itemId, source: 'hotbar' });
    this.batteryUseCompletedWhileHeld = true;
    this.resetBatteryUseProgress(itemId);
  }

  private resetBatteryUseProgress(itemId = this.selectedItemId): void {
    if (this.batteryUseProgressMs <= 0) {
      return;
    }

    this.batteryUseProgressMs = 0;
    if (itemId) {
      gameEvents.emit({
        type: 'inventory.useProgress',
        itemId,
        label: 'Changing AA batteries',
        progress01: 0,
        active: false,
      });
    }
  }

  private updatePlayerActionAnimation(searchState?: SearchState, doorState?: DoorSystemState): void {
    if (doorState?.unlocking) {
      this.player?.playActionAnimation('unlock_door');
      return;
    }

    if (searchState?.activeId) {
      this.player?.playActionAnimation('search');
    }
  }

  private publishRunSeedDebug(): void {
    if (!import.meta.env.DEV || !this.room) {
      return;
    }

    const keyPlacement = this.room.searchPlacements.find((placement) => placement.itemId === 'front_door_key');
    document.body.dataset.pileupKeyNode = keyPlacement?.nodeId ?? '';
  }

  private buildChecklistItems(): Array<{ itemId: string; label: string }> {
    if (!this.room) {
      return [];
    }

    const seen = new Set<string>();
    return this.room.searchPlacements
      .filter((placement) => Boolean(placement.itemId))
      .filter((placement) => {
        if (!placement.itemId || seen.has(placement.itemId)) {
          return false;
        }
        seen.add(placement.itemId);
        return true;
      })
      .slice(0, 5)
      .map((placement) => ({
        itemId: placement.itemId ?? '',
        label: labelForItemId(placement.itemId ?? ''),
      }));
  }

  private publishDebugState(
    movementState?: ReturnType<PlayerController['update']>,
    flashlightState?: FlashlightState,
    searchState?: SearchState,
    enemyState?: EnemySystemState,
    doorState?: DoorSystemState,
    bossState?: BossDoorSequenceState,
  ): void {
    if (!import.meta.env.DEV || !this.player || !movementState) {
      return;
    }

    window.__PILEUP_DEBUG__ = {
      phase: 'Phase 10',
      seed: this.room?.seed,
      activeRoomId: this.activeRoomId,
      keyNode: this.room?.searchPlacements.find((placement) => placement.itemId === 'front_door_key')?.nodeId,
      player: {
        x: Math.round(this.player.x),
        y: Math.round(this.player.y),
        stamina: movementState.stamina,
        isMoving: movementState.isMoving,
        isSprinting: movementState.isSprinting,
        isCrouching: movementState.isCrouching,
        noise: movementState.noise,
        hasProductionSprite: this.player.hasProductionSprite(),
        facing: this.player.getFacing(),
      },
      flashlight: flashlightState
        ? {
            layer: flashlightState.layer,
            focus: flashlightState.focus,
            flicker: flashlightState.flicker,
            battery: flashlightState.battery,
            searchPenalty01: flashlightState.searchPenalty01,
            aimAngle: Number(flashlightState.aimAngle.toFixed(3)),
            visualAimAngle: Number(flashlightState.visualAimAngle.toFixed(3)),
            focus01: flashlightState.focus01,
            batteryInstability01: flashlightState.batteryInstability01,
            effectiveRange: flashlightState.effectiveRange,
            visualRange: flashlightState.visualRange,
            disabled: flashlightState.disabled,
            visualTargetDistance: flashlightState.visualTargetDistance,
            origin: flashlightState.origin,
            hitIds: flashlightState.hitIds,
            lockOn: flashlightState.lockOn,
            lockedTargetId: flashlightState.lockedTargetId,
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
      enemies: enemyState?.enemies,
      door: doorState,
      bossDoor: bossState,
    };
    document.body.dataset.pileupPhase = 'Phase 10';
    document.body.dataset.pileupSeed = this.room?.seed ?? '';
    document.body.dataset.pileupActiveRoom = this.activeRoomId;
    document.body.dataset.pileupPlayerX = String(Math.round(this.player.x));
    document.body.dataset.pileupPlayerY = String(Math.round(this.player.y));
    document.body.dataset.pileupStamina = String(movementState.stamina);
    document.body.dataset.pileupMoving = String(movementState.isMoving);
    document.body.dataset.pileupSprinting = String(movementState.isSprinting);
    document.body.dataset.pileupCrouching = String(movementState.isCrouching);
    document.body.dataset.pileupNoise = movementState.noise.toFixed(2);
    document.body.dataset.pileupPlayerSprite = String(this.player.hasProductionSprite());
    document.body.dataset.pileupPlayerFacing = String(this.player.getFacing());
    if (flashlightState) {
      document.body.dataset.pileupFlashlightLayer = flashlightState.layer;
      document.body.dataset.pileupFlashlightFocus = String(flashlightState.focus);
      document.body.dataset.pileupFlashlightFlicker = String(flashlightState.flicker);
      document.body.dataset.pileupFlashlightBattery = String(flashlightState.battery);
      document.body.dataset.pileupFlashlightDisabled = String(flashlightState.disabled);
      document.body.dataset.pileupFlashlightHits = flashlightState.hitIds.join(',');
      document.body.dataset.pileupFlashlightSearchPenalty = String(flashlightState.searchPenalty01);
      document.body.dataset.pileupFlashlightEffectiveRange = String(flashlightState.effectiveRange);
      document.body.dataset.pileupFlashlightFocus01 = String(flashlightState.focus01);
      document.body.dataset.pileupFlashlightVisualRange = String(flashlightState.visualRange);
      document.body.dataset.pileupFlashlightVisualTargetDistance = String(flashlightState.visualTargetDistance);
      document.body.dataset.pileupFlashlightInstability = String(flashlightState.batteryInstability01);
      document.body.dataset.pileupFlashlightOriginX = String(flashlightState.origin.x);
      document.body.dataset.pileupFlashlightOriginY = String(flashlightState.origin.y);
      document.body.dataset.pileupFlashlightLockOn = String(flashlightState.lockOn);
      document.body.dataset.pileupFlashlightLockedTarget = flashlightState.lockedTargetId ?? '';
    }
    if (searchState) {
      document.body.dataset.pileupSearchNearest = searchState.nearestId ?? '';
      document.body.dataset.pileupSearchActive = searchState.activeId ?? '';
      document.body.dataset.pileupSearchProgress = searchState.progress01.toFixed(2);
      document.body.dataset.pileupSearchNoise = searchState.noise.toFixed(1);
      document.body.dataset.pileupSearchResult = searchState.lastResult ?? '';
    }
    if (enemyState?.enemies[0]) {
      document.body.dataset.pileupEnemyId = enemyState.enemies[0].id;
      document.body.dataset.pileupEnemyState = enemyState.enemies[0].state;
      document.body.dataset.pileupEnemyLayer = enemyState.enemies[0].layer;
      document.body.dataset.pileupEnemyExposure = String(enemyState.enemies[0].exposureMs);
    }
    if (doorState) {
      document.body.dataset.pileupDoorNearby = String(doorState.nearby);
      document.body.dataset.pileupDoorUnlocking = String(doorState.unlocking);
      document.body.dataset.pileupDoorUnlocked = String(doorState.unlocked);
      document.body.dataset.pileupDoorProgress = String(doorState.progress01);
    }
    if (bossState) {
      document.body.dataset.pileupBossActive = String(bossState.active);
      document.body.dataset.pileupBossPhase = bossState.phase;
      document.body.dataset.pileupBossPressure = String(bossState.pressure01);
      document.body.dataset.pileupBossTelegraph = String(bossState.telegraph01);
      document.body.dataset.pileupBossDefense = String(bossState.defensiveReady);
      document.body.dataset.pileupBossPattern = bossState.lastPattern ?? '';
    }
  }

  private updateActiveRoomObjective(): void {
    const room = this.room;
    const player = this.player;
    const state = this.state;
    if (!room || !player || !state) {
      return;
    }

    const activeRoom = room.roomTransitions.find(
      (transition) => player.x >= transition.x && player.x <= transition.x + transition.width,
    );
    if (!activeRoom || activeRoom.roomId === this.activeRoomId) {
      return;
    }

    this.activeRoomId = activeRoom.roomId;
    if (!this.inventorySystem?.keyFound()) {
      gameEvents.emit({ type: 'objective.changed', text: `Search the ${activeRoom.label}.` });
    }
  }
}
