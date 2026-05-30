import Phaser from 'phaser';
import type { GameState } from '../core/GameState';
import { gameEvents } from '../core/EventBus';
import type { DepthLayer } from '../core/Types';
import type { InventoryItem } from '../systems/InventorySystem';
import { ResponsiveScaleSystem } from '../systems/ResponsiveScaleSystem';

interface UISceneData {
  state?: GameState;
}

export class UIScene extends Phaser.Scene {
  private responsive?: ResponsiveScaleSystem;
  private state?: GameState;
  private flashlightLayer: DepthLayer = 'main';
  private flashlightBattery = 100;
  private flashlightFocus = false;
  private flashlightFlicker = false;
  private searchLabel = 'No search target';
  private searchProgress = 0;
  private searchNoise = 0;
  private searchActive = false;
  private doorProgress = 0;
  private doorActive = false;
  private doorUnlocked = false;
  private burdenState = 'light';
  private burdenValue = 0;
  private hotbarSlots: InventoryItem[] = [];
  private uiObjects: Phaser.GameObjects.GameObject[] = [];
  private unsubscribeEvents: Array<() => void> = [];

  constructor() {
    super('UIScene');
  }

  create(data: UISceneData): void {
    this.state = data.state;
    this.responsive = new ResponsiveScaleSystem(this);
    this.responsive.onResize(() => this.renderHud());

    this.unsubscribeEvents.push(gameEvents.on('objective.changed', (event) => {
      this.state = {
        ...(this.state ?? {
          health: 100,
          maxHealth: 100,
          stamina: 100,
          maxStamina: 100,
          mess: 0,
          maxMess: 100,
        }),
        objective: event.text,
      };
      this.renderHud();
    }));
    this.unsubscribeEvents.push(gameEvents.on('player.staminaChanged', (event) => {
      this.state = {
        ...(this.state ?? {
          health: 100,
          maxHealth: 100,
          mess: 0,
          maxMess: 100,
          objective: 'Find the key.',
        }),
        stamina: event.value,
        maxStamina: event.max,
      };
      this.renderHud();
    }));
    this.unsubscribeEvents.push(gameEvents.on('player.healthChanged', (event) => {
      this.state = {
        ...(this.state ?? {
          stamina: 100,
          maxStamina: 100,
          mess: 0,
          maxMess: 100,
          objective: 'Find the key.',
        }),
        health: event.value,
        maxHealth: event.max,
      };
      this.renderHud();
    }));
    this.unsubscribeEvents.push(gameEvents.on('flashlight.depthChanged', (event) => {
      this.flashlightLayer = event.layer;
      this.renderHud();
    }));
    this.unsubscribeEvents.push(gameEvents.on('flashlight.batteryChanged', (event) => {
      this.flashlightBattery = event.value;
      this.flashlightFocus = event.focus;
      this.flashlightFlicker = event.flicker;
      this.renderHud();
    }));
    this.unsubscribeEvents.push(gameEvents.on('search.progressChanged', (event) => {
      this.searchLabel = event.label;
      this.searchProgress = event.progress01;
      this.searchNoise = event.noise;
      this.searchActive = event.isSearching;
      this.renderHud();
    }));
    this.unsubscribeEvents.push(gameEvents.on('door.unlockStarted', () => {
      this.doorActive = true;
      this.doorUnlocked = false;
      this.renderHud();
    }));
    this.unsubscribeEvents.push(gameEvents.on('door.unlockProgress', (event) => {
      this.doorProgress = event.progress01;
      this.doorActive = event.progress01 > 0 && event.progress01 < 1;
      this.renderHud();
    }));
    this.unsubscribeEvents.push(gameEvents.on('door.unlocked', () => {
      this.doorProgress = 1;
      this.doorActive = false;
      this.doorUnlocked = true;
      this.renderHud();
    }));
    this.unsubscribeEvents.push(gameEvents.on('player.burdenChanged', (event) => {
      this.burdenState = event.state;
      this.burdenValue = event.value;
      this.renderHud();
    }));
    this.unsubscribeEvents.push(gameEvents.on('hotbar.changed', (event) => {
      this.hotbarSlots = event.slots as InventoryItem[];
      this.renderHud();
    }));

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribeEvents.forEach((unsubscribe) => unsubscribe());
      this.unsubscribeEvents = [];
      this.responsive?.destroy();
    });
  }

  private renderHud(): void {
    this.uiObjects.forEach((object) => object.destroy());
    this.uiObjects = [];

    const layout = this.responsive?.getLayout();
    if (!layout) {
      return;
    }

    if (layout.isPortrait) {
      this.responsive?.ensurePortraitPrompt();
      return;
    }

    const state = this.state;
    const safe = layout.safeArea;
    const scale = layout.uiScale;
    const barHeight = Math.round(96 * scale);
    const fontSize = Math.max(layout.isPhone ? 18 : 16, Math.round(18 * scale));
    const background = this.add
      .rectangle(0, 0, layout.viewportWidth, barHeight + safe.top * 0.35, 0x070608, 0.78)
      .setOrigin(0, 0)
      .setScrollFactor(0);

    const health = this.add.text(safe.left, safe.top, `HP ${state?.health ?? 100}/${state?.maxHealth ?? 100}`, {
      color: '#f4efe0',
      fontSize: `${fontSize}px`,
    });
    const stamina = this.add.text(
      safe.left + 136 * scale,
      safe.top,
      `STA ${state?.stamina ?? 100}/${state?.maxStamina ?? 100}`,
      {
        color: '#d2c276',
        fontSize: `${fontSize}px`,
      },
    );
    const mess = this.add.text(safe.left + 300 * scale, safe.top, `MESS ${state?.mess ?? 0}/${state?.maxMess ?? 100}`, {
      color: '#b7c28a',
      fontSize: `${fontSize}px`,
    });
    const flashlight = this.add.text(
      safe.left + 456 * scale,
      safe.top,
      `LIGHT ${this.flashlightLayer.toUpperCase()} ${this.flashlightBattery}%${this.flashlightFocus ? ' FOCUS' : ''}${
        this.flashlightFlicker ? ' FLICKER' : ''
      }`,
      {
        color: this.flashlightLayer === 'main' ? '#f4e7a8' : this.flashlightLayer === 'foreground' ? '#f3b28d' : '#86a9d8',
        fontSize: `${fontSize}px`,
      },
    );
    const objective = this.add
      .text(safe.left, safe.top + 30 * scale, `OBJECTIVE ${state?.objective ?? 'Find the key.'}`, {
        color: '#cfc8bd',
        fontSize: `${Math.max(14, Math.round(15 * scale))}px`,
        wordWrap: { width: Math.max(320, safe.width * 0.58) },
      })
      .setOrigin(0, 0);
    const layoutText = this.add
      .text(safe.left, safe.bottom - 26 * scale, `${layout.viewportClass} / safe area anchored`, {
        color: '#716a61',
        fontSize: `${Math.max(13, Math.round(13 * scale))}px`,
      })
      .setOrigin(0, 1);
    const searchWidth = Math.min(520 * scale, safe.width * 0.42);
    const searchBaseY = safe.bottom - 68 * scale;
    const searchBack = this.add
      .rectangle(safe.left, searchBaseY, searchWidth, 18 * scale, 0x1a1715, 0.78)
      .setOrigin(0, 0.5)
      .setScrollFactor(0);
    const searchFill = this.add
      .rectangle(safe.left, searchBaseY, searchWidth * this.searchProgress, 18 * scale, this.searchActive ? 0xe3d36f : 0x8ba778, 0.88)
      .setOrigin(0, 0.5)
      .setScrollFactor(0);
    const searchText = this.add
      .text(
        safe.left,
        searchBaseY - 30 * scale,
        `SEARCH ${this.searchLabel} / NOISE ${Math.round(this.searchNoise)}`,
        {
          color: this.searchActive ? '#f4efe0' : '#9e9589',
          fontSize: `${Math.max(13, Math.round(14 * scale))}px`,
        },
      )
      .setScrollFactor(0);
    const hotbarText = this.add
      .text(
        safe.right,
        safe.bottom - 54 * scale,
        `HOTBAR ${this.hotbarSlots.map((slot) => slot.label).join(' | ') || 'empty'} / LOAD ${this.burdenState.toUpperCase()} ${this.burdenValue}`,
        {
          color: '#d2c276',
          fontSize: `${Math.max(13, Math.round(14 * scale))}px`,
          align: 'right',
        },
      )
      .setOrigin(1, 1)
      .setScrollFactor(0);
    const doorText = this.add
      .text(
        safe.right,
        safe.bottom - 86 * scale,
        `DOOR ${this.doorUnlocked ? 'UNLOCKED' : `${Math.round(this.doorProgress * 100)}%`}${this.doorActive ? ' HOLD' : ''}`,
        {
          color: this.doorUnlocked ? '#8ba778' : this.doorActive ? '#e3d36f' : '#81796f',
          fontSize: `${Math.max(13, Math.round(14 * scale))}px`,
          align: 'right',
        },
      )
      .setOrigin(1, 1)
      .setScrollFactor(0);

    this.uiObjects = [
      background,
      health,
      stamina,
      mess,
      flashlight,
      objective,
      layoutText,
      searchBack,
      searchFill,
      searchText,
      doorText,
      hotbarText,
    ];
    this.responsive?.ensurePortraitPrompt();
  }
}
