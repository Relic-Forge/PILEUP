import Phaser from 'phaser';
import type { GameState } from '../core/GameState';
import { gameEvents } from '../core/EventBus';
import type { DepthLayer } from '../core/Types';
import type { InventoryItem } from '../systems/InventorySystem';
import { ResponsiveScaleSystem } from '../systems/ResponsiveScaleSystem';

interface UISceneData {
  state?: GameState;
  checklistItems?: Array<{ itemId: string; label: string }>;
  phaseInfo?: {
    phase: string;
    roomId: string;
    segmentCount: number;
    worldWidth: number;
    seed: string;
  };
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
  private checklistItems: Array<{ itemId: string; label: string; found: boolean }> = [];
  private phaseInfo?: UISceneData['phaseInfo'];
  private infoButton?: HTMLButtonElement;
  private infoPanel?: HTMLDivElement;
  private infoPanelOpen = false;
  private uiObjects: Phaser.GameObjects.GameObject[] = [];
  private unsubscribeEvents: Array<() => void> = [];

  constructor() {
    super('UIScene');
  }

  create(data: UISceneData): void {
    this.scene.bringToTop();
    this.state = data.state;
    this.checklistItems = data.checklistItems?.map((item) => ({ ...item, found: false })) ?? [];
    this.phaseInfo = data.phaseInfo;
    this.createInfoOverlay();
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
    this.unsubscribeEvents.push(gameEvents.on('checklist.created', (event) => {
      this.checklistItems = event.items.map((item) => ({ ...item, found: false }));
      this.renderHud();
    }));
    this.unsubscribeEvents.push(gameEvents.on('item.collected', (event) => {
      this.checklistItems = this.checklistItems.map((item) =>
        item.itemId === event.itemId ? { ...item, found: true } : item,
      );
      this.renderHud();
    }));

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribeEvents.forEach((unsubscribe) => unsubscribe());
      this.unsubscribeEvents = [];
      this.infoButton?.remove();
      this.infoPanel?.remove();
      this.infoButton = undefined;
      this.infoPanel = undefined;
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
      this.updateInfoOverlay(layout.viewportClass, false);
      return;
    }
    this.updateInfoOverlay(layout.viewportClass, true);

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
    const lensX = safe.left + 462 * scale;
    const lensY = safe.top + 34 * scale;
    const lensSlots = (['background', 'main', 'foreground'] as DepthLayer[]).map((layer, index) => {
      const active = this.flashlightLayer === layer;
      const color = layer === 'main' ? 0xf4e7a8 : layer === 'foreground' ? 0xf3b28d : 0x86a9d8;
      return this.add
        .circle(lensX + index * 22 * scale, lensY, active ? 7 * scale : 4.5 * scale, color, active ? 0.9 : 0.28)
        .setStrokeStyle(active ? 2 : 1, color, active ? 0.95 : 0.35)
        .setScale(active && this.flashlightFocus ? 1.18 : 1, active && this.flashlightFocus ? 0.72 : 1)
        .setScrollFactor(0);
    });
    const batteryWarn = this.flashlightBattery < 30 || this.flashlightFlicker;
    const batteryPulse = batteryWarn ? 0.62 + Math.sin(this.time.now * 0.012) * 0.22 : 0.32;
    const batteryDot = this.add
      .circle(lensX + 78 * scale, lensY, 4.5 * scale, this.flashlightBattery <= 12 ? 0xe66b61 : 0xe3d36f, batteryPulse)
      .setScrollFactor(0);
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
    const checklist = this.renderChecklistPaper(safe, scale);

    this.uiObjects = [
      background,
      health,
      stamina,
      mess,
      flashlight,
      ...lensSlots,
      batteryDot,
      objective,
      layoutText,
      searchBack,
      searchFill,
      searchText,
      ...checklist,
      doorText,
      hotbarText,
    ];
    this.responsive?.ensurePortraitPrompt();
  }

  private renderChecklistPaper(
    safe: { left: number; right: number; top: number; bottom: number; width: number; height: number },
    scale: number,
  ): Phaser.GameObjects.GameObject[] {
    const paperWidth = Math.min(260 * scale, safe.width * 0.28);
    const paperHeight = Math.min(210 * scale, safe.height * 0.34);
    const x = safe.right - paperWidth;
    const y = safe.top + 78 * scale;
    const objects: Phaser.GameObjects.GameObject[] = [];
    const paper = this.add
      .rectangle(x, y, paperWidth, paperHeight, 0xf2e5c7, 0.96)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0x8b6f4c, 0.52)
      .setScrollFactor(0);
    objects.push(paper);

    for (let line = 1; line < 8; line += 1) {
      objects.push(
        this.add
          .line(x + 12 * scale, y + (34 + line * 20) * scale, 0, 0, paperWidth - 24 * scale, 0, 0x8bb0bd, 0.32)
          .setOrigin(0, 0)
          .setScrollFactor(0),
      );
    }
    objects.push(
      this.add
        .line(x + 34 * scale, y + 12 * scale, 0, 0, 0, paperHeight - 24 * scale, 0xc9817e, 0.35)
        .setOrigin(0, 0)
        .setScrollFactor(0),
    );
    objects.push(
      this.add
        .text(x + 48 * scale, y + 14 * scale, 'lost last week', {
          color: '#352a22',
          fontFamily: 'Bradley Hand, Comic Sans MS, cursive',
          fontSize: `${Math.max(16, Math.round(19 * scale))}px`,
        })
        .setScrollFactor(0),
    );

    const rowFont = Math.max(14, Math.round(16 * scale));
    const rows = this.checklistItems.length > 0 ? this.checklistItems : [{ itemId: 'loading', label: 'checking rooms', found: false }];
    rows.slice(0, 5).forEach((item, index) => {
      const rowY = y + (52 + index * 25) * scale;
      objects.push(
        this.add
          .text(x + 18 * scale, rowY, item.found ? 'x' : '-', {
            color: item.found ? '#667a4f' : '#3d3027',
            fontFamily: 'Bradley Hand, Comic Sans MS, cursive',
            fontSize: `${rowFont}px`,
          })
          .setScrollFactor(0),
      );
      objects.push(
        this.add
          .text(x + 48 * scale, rowY, item.label.toLowerCase(), {
            color: item.found ? '#767064' : '#3d3027',
            fontFamily: 'Bradley Hand, Comic Sans MS, cursive',
            fontSize: `${rowFont}px`,
            wordWrap: { width: paperWidth - 64 * scale },
          })
          .setScrollFactor(0),
      );
      if (item.found) {
        objects.push(
          this.add
            .line(x + 44 * scale, rowY + 10 * scale, 0, 0, paperWidth - 70 * scale, 0, 0x725342, 0.72)
            .setOrigin(0, 0)
            .setScrollFactor(0),
        );
      }
    });

    return objects;
  }

  private createInfoOverlay(): void {
    this.infoButton?.remove();
    this.infoPanel?.remove();
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'i';
    button.setAttribute('aria-label', 'Show level info');
    button.style.cssText = [
      'position:fixed',
      'left:132px',
      'top:100px',
      'z-index:20',
      'width:30px',
      'height:30px',
      'border-radius:50%',
      'border:2px solid rgba(227,211,111,.72)',
      'background:rgba(23,18,15,.88)',
      'color:#f4efe0',
      'font:700 18px Georgia,serif',
      'cursor:pointer',
    ].join(';');
    const panel = document.createElement('div');
    this.infoPanelOpen = false;
    panel.style.cssText = [
      'position:fixed',
      'left:176px',
      'top:18px',
      'z-index:19',
      'max-width:min(900px,calc(100vw - 210px))',
      'padding:12px 16px',
      'background:rgba(7,6,8,.88)',
      'border:1px solid rgba(63,53,46,.72)',
      'color:#aaa196',
      'font:16px Georgia,serif',
      'line-height:1.35',
      'white-space:pre-wrap',
      'pointer-events:none',
    ].join(';');
    button.addEventListener('click', () => {
      this.infoPanelOpen = !this.infoPanelOpen;
      panel.style.display = this.infoPanelOpen ? 'block' : 'none';
      button.setAttribute('aria-label', this.infoPanelOpen ? 'Hide level info' : 'Show level info');
    });
    document.body.append(button, panel);
    this.infoButton = button;
    this.infoPanel = panel;
  }

  private updateInfoOverlay(viewportClass: string, visible: boolean): void {
    if (!this.infoButton || !this.infoPanel) {
      return;
    }
    this.infoButton.style.display = visible ? 'block' : 'none';
    this.infoPanel.style.display = visible && this.infoPanelOpen ? 'block' : 'none';
    this.infoPanel.textContent = `${this.phaseInfo?.phase ?? 'Phase 10 flashlight feedback'}\nroom: ${
      this.phaseInfo?.roomId ?? 'level_01_family_house'
    } (${this.phaseInfo?.segmentCount ?? 0} segments, ${this.phaseInfo?.worldWidth ?? 0} world px)\nviewport class: ${viewportClass}\nseed: ${
      this.phaseInfo?.seed ?? 'unknown'
    }\nWASD/arrows move. Space searches/unlocks. Mouse aims light. Left mouse focuses. Right mouse or L toggles lock-on. 1/2/3 switch depth. R resets to main. F3 debug.`;
  }
}
