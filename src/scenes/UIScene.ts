import Phaser from 'phaser';
import type { GameState } from '../core/GameState';
import { gameEvents } from '../core/EventBus';
import type { DepthLayer, InventoryEntry, LostItemEntry } from '../core/Types';
import { FLASHLIGHT_HOTBAR_ITEM_ID, itemDefinitionForId } from '../systems/InventorySystem';
import { ResponsiveScaleSystem, type ResponsiveLayout } from '../systems/ResponsiveScaleSystem';
import { BackpackMenu } from '../ui/BackpackMenu';
import { HudToastStack } from '../ui/HudToastStack';
import { uiDepths } from '../ui/uiTheme';
import { captureUiPointer, releaseUiPointerCapture } from '../ui/uiPointerCapture';

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
  private itemUseLabel = '';
  private itemUseProgress = 0;
  private itemUseActive = false;
  private doorProgress = 0;
  private doorActive = false;
  private doorUnlocked = false;
  private burdenState = 'light';
  private burdenValue = 0;
  private hotbarSlots: InventoryEntry[] = [];
  private inventoryEntries: InventoryEntry[] = [];
  private selectedItemId?: string = FLASHLIGHT_HOTBAR_ITEM_ID;
  private checklistItems: Array<{ itemId: string; label: string; found: boolean }> = [];
  private lostItems: LostItemEntry[] = [];
  private phaseInfo?: UISceneData['phaseInfo'];
  private infoButton?: HTMLButtonElement;
  private infoPanel?: HTMLDivElement;
  private infoPanelOpen = false;
  private settingsButton?: HTMLButtonElement;
  private settingsPanel?: HTMLDivElement;
  private darknessToggle?: HTMLInputElement;
  private settingsPanelOpen = false;
  private debugReadoutVisible = false;
  private debugReadout?: Phaser.GameObjects.Text;
  private debugReadoutX = 0;
  private backpackMenu?: BackpackMenu;
  private toastStack?: HudToastStack;
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
    this.createSettingsOverlay();
    this.responsive = new ResponsiveScaleSystem(this);
    this.backpackMenu = new BackpackMenu(this);
    this.toastStack = new HudToastStack(this);
    this.lostItems = this.checklistItems.map((item) => ({
      itemId: item.itemId,
      label: item.label,
      found: false,
      hint: item.itemId === 'front_door_key' ? 'a cold little shape' : 'something from the house',
      required: item.itemId === 'front_door_key',
    }));
    this.backpackMenu.setLostItems(this.lostItems);
    this.backpackMenu.setInventory(this.inventoryEntries, this.burdenValue, this.burdenState, this.selectedItemId);
    this.backpackMenu.setObjective(this.state?.objective ?? 'Find the key.');
    this.responsive.onResize(() => this.renderHud());
    if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('backpackOpen') === '1') {
      this.backpackMenu.setOpen(true, this.responsive.getLayout());
    }
    this.input.keyboard?.on('keydown', this.handleUiKeyDown, this);
    this.input.on('pointerup', releaseUiPointerCapture);
    this.input.on('pointerupoutside', releaseUiPointerCapture);

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
      this.backpackMenu?.setObjective(event.text);
      gameEvents.emit({ type: 'hud.toast', tone: 'objective', text: event.text });
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
      this.hotbarSlots = event.slots as InventoryEntry[];
      this.renderHud();
    }));
    this.unsubscribeEvents.push(gameEvents.on('inventory.changed', (event) => {
      this.inventoryEntries = event.entries;
      this.hotbarSlots = event.hotbarSlots;
      this.burdenState = event.burdenState;
      this.burdenValue = event.burden;
      this.backpackMenu?.setInventory(event.entries, event.burden, event.burdenState, this.selectedItemId);
      this.renderHud();
    }));
    this.unsubscribeEvents.push(gameEvents.on('inventory.selectedChanged', (event) => {
      this.selectedItemId = event.itemId;
      this.renderHud();
    }));
    this.unsubscribeEvents.push(gameEvents.on('inventory.useResolved', (event) => {
      this.backpackMenu?.setUseResult(event.itemId, event.success, event.reason);
      this.itemUseActive = false;
      this.itemUseProgress = 0;
      this.renderHud();
    }));
    this.unsubscribeEvents.push(gameEvents.on('inventory.useProgress', (event) => {
      this.itemUseLabel = event.label;
      this.itemUseProgress = event.progress01;
      this.itemUseActive = event.active;
      this.renderHud();
    }));
    this.unsubscribeEvents.push(gameEvents.on('checklist.created', (event) => {
      this.checklistItems = event.items.map((item) => ({ ...item, found: false }));
      this.lostItems = this.checklistItems.map((item) => ({
        itemId: item.itemId,
        label: item.label,
        found: false,
        hint: item.itemId === 'front_door_key' ? 'a cold little shape' : 'something from the house',
        required: item.itemId === 'front_door_key',
      }));
      this.backpackMenu?.setLostItems(this.lostItems);
      this.renderHud();
    }));
    this.unsubscribeEvents.push(gameEvents.on('item.collected', (event) => {
      this.checklistItems = this.checklistItems.map((item) =>
        item.itemId === event.itemId ? { ...item, found: true } : item,
      );
      this.lostItems = this.lostItems.map((item) => (item.itemId === event.itemId ? { ...item, found: true } : item));
      this.backpackMenu?.setLostItems(this.lostItems);
      gameEvents.emit({ type: 'lostItems.changed', items: this.lostItems });
      this.renderHud();
    }));
    this.unsubscribeEvents.push(gameEvents.on('hud.toast', (event) => {
      this.toastStack?.push(event.tone, event.text);
      this.renderHud();
    }));

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribeEvents.forEach((unsubscribe) => unsubscribe());
      this.unsubscribeEvents = [];
      this.infoPanel?.remove();
      this.settingsButton?.remove();
      this.settingsPanel?.remove();
      this.infoPanel = undefined;
      this.settingsButton = undefined;
      this.settingsPanel = undefined;
      this.darknessToggle = undefined;
      this.debugReadout?.destroy();
      this.debugReadout = undefined;
      this.responsive?.destroy();
      this.backpackMenu?.destroy();
      this.toastStack?.destroy();
      this.input.keyboard?.off('keydown', this.handleUiKeyDown, this);
      this.input.off('pointerup', releaseUiPointerCapture);
      this.input.off('pointerupoutside', releaseUiPointerCapture);
      releaseUiPointerCapture();
    });
  }

  update(): void {
    this.updateDebugReadout();
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
      this.updateSettingsOverlay(false);
      return;
    }
    this.registry.set('pileupLayout', layout);
    this.updateInfoOverlay(layout.viewportClass, true);
    this.updateSettingsOverlay(true);

    const state = this.state;
    const safe = layout.safeArea;
    const scale = layout.uiScale;
    const barHeight = Math.round(74 * scale);
    const fontSize = Math.max(layout.isPhone ? 18 : 16, Math.round(18 * scale));
    const background = this.add
      .rectangle(0, 0, layout.viewportWidth, barHeight + safe.top * 0.25, 0x070608, 0.58)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(uiDepths.hud);

    const health = this.add.text(safe.left, safe.top, `HP ${state?.health ?? 100}/${state?.maxHealth ?? 100}`, {
      color: '#f4efe0',
      fontSize: `${fontSize}px`,
    }).setDepth(uiDepths.hud + 1);
    const stamina = this.add.text(
      safe.left + 136 * scale,
      safe.top,
      `STA ${state?.stamina ?? 100}/${state?.maxStamina ?? 100}`,
      {
        color: '#d2c276',
        fontSize: `${fontSize}px`,
      },
    ).setDepth(uiDepths.hud + 1);
    const mess = this.add.text(safe.left + 300 * scale, safe.top, `MESS ${state?.mess ?? 0}/${state?.maxMess ?? 100}`, {
      color: '#b7c28a',
      fontSize: `${fontSize}px`,
    }).setDepth(uiDepths.hud + 1);
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
    ).setDepth(uiDepths.hud + 1);
    const lensX = safe.left + 462 * scale;
    const lensY = safe.top + 34 * scale;
    const lensSlots = (['background', 'main', 'foreground'] as DepthLayer[]).map((layer, index) => {
      const active = this.flashlightLayer === layer;
      const color = layer === 'main' ? 0xf4e7a8 : layer === 'foreground' ? 0xf3b28d : 0x86a9d8;
      return this.add
        .circle(lensX + index * 22 * scale, lensY, active ? 7 * scale : 4.5 * scale, color, active ? 0.9 : 0.28)
        .setStrokeStyle(active ? 2 : 1, color, active ? 0.95 : 0.35)
        .setScale(active && this.flashlightFocus ? 1.18 : 1, active && this.flashlightFocus ? 0.72 : 1)
        .setScrollFactor(0)
        .setDepth(uiDepths.hud + 1);
    });
    const batteryWarn = this.flashlightBattery < 30 || this.flashlightFlicker;
    const batteryPulse = batteryWarn ? 0.62 + Math.sin(this.time.now * 0.012) * 0.22 : 0.32;
    const batteryDot = this.add
      .circle(lensX + 78 * scale, lensY, 4.5 * scale, this.flashlightBattery <= 12 ? 0xe66b61 : 0xe3d36f, batteryPulse)
      .setScrollFactor(0)
      .setDepth(uiDepths.hud + 1);
    this.debugReadoutX = flashlight.x + flashlight.width + 24 * scale;
    this.positionDebugReadout(layout, this.debugReadoutX);
    const objective = this.add
      .text(safe.left, safe.top + 30 * scale, state?.objective ?? 'Find the key.', {
        color: '#cfc8bd',
        fontSize: `${Math.max(14, Math.round(15 * scale))}px`,
        wordWrap: { width: Math.max(320, safe.width * 0.58) },
      })
      .setOrigin(0, 0)
      .setDepth(uiDepths.hud + 1);
    const searchWidth = Math.min(520 * scale, safe.width * 0.42);
    const searchBaseY = safe.bottom - 68 * scale;
    const searchBack = this.add
      .rectangle(safe.left, searchBaseY, searchWidth, 18 * scale, 0x1a1715, 0.78)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(uiDepths.hud + 1)
      .setVisible(this.searchActive);
    const searchFill = this.add
      .rectangle(safe.left, searchBaseY, searchWidth * this.searchProgress, 18 * scale, this.searchActive ? 0xe3d36f : 0x8ba778, 0.88)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(uiDepths.hud + 2)
      .setVisible(this.searchActive);
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
      .setScrollFactor(0)
      .setDepth(uiDepths.hud + 2)
      .setVisible(this.searchActive);
    const itemUseWidth = Math.min(360 * scale, safe.width * 0.32);
    const itemUseX = safe.left + (safe.width - itemUseWidth) / 2;
    const itemUseY = safe.bottom - 72 * scale;
    const itemUseBack = this.add
      .rectangle(itemUseX, itemUseY, itemUseWidth, 16 * scale, 0x08090d, 0.86)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(uiDepths.hud + 3)
      .setVisible(this.itemUseActive);
    const itemUseFill = this.add
      .rectangle(itemUseX, itemUseY, itemUseWidth * this.itemUseProgress, 16 * scale, 0xe3d36f, 0.95)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(uiDepths.hud + 4)
      .setVisible(this.itemUseActive);
    const itemUseText = this.add
      .text(itemUseX + itemUseWidth / 2, itemUseY - 26 * scale, this.itemUseLabel, {
        color: '#f4efe0',
        fontFamily: 'Georgia, serif',
        fontSize: `${Math.max(13, Math.round(14 * scale))}px`,
      })
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(uiDepths.hud + 4)
      .setVisible(this.itemUseActive);
    const hotbarObjects = this.renderHotbar(layout);
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
      .setScrollFactor(0)
      .setDepth(uiDepths.hud + 1)
      .setVisible(this.doorActive || this.doorUnlocked);
    this.toastStack?.render(layout);
    if (this.backpackMenu?.isOpen()) {
      this.backpackMenu.render(layout);
    }

    this.uiObjects = [
      background,
      health,
      stamina,
      mess,
      flashlight,
      ...lensSlots,
      batteryDot,
      objective,
      searchBack,
      searchFill,
      searchText,
      itemUseBack,
      itemUseFill,
      itemUseText,
      doorText,
      ...hotbarObjects,
    ];
    this.responsive?.ensurePortraitPrompt();
  }

  private renderHotbar(layout: ResponsiveLayout): Phaser.GameObjects.GameObject[] {
    const objects: Phaser.GameObjects.GameObject[] = [];
    const safe = layout.safeArea;
    const scale = layout.uiScale;
    const slotSize = 44 * scale;
    const gap = 8 * scale;
    const count = 5;
    const totalWidth = count * slotSize + (count - 1) * gap;
    const startX = safe.left + (safe.width - totalWidth) / 2;
    const y = safe.bottom - slotSize;
    const backpackButton = this.add
      .rectangle(startX + totalWidth + 18 * scale, y, 56 * scale, slotSize, 0x171b22, 0.9)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x8a7658, 0.56)
      .setScrollFactor(0)
      .setDepth(uiDepths.hud + 1)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', (pointer: Phaser.Input.Pointer, _x: number, _y: number, event: { stopPropagation?: () => void }) => {
        captureUiPointer(pointer, event);
        this.backpackMenu?.toggle(layout);
      });
    const backpackIcon = this.add
      .text(startX + totalWidth + 46 * scale, y + 11 * scale, 'bag', {
        color: '#e8e1d3',
        fontFamily: 'Georgia, serif',
        fontSize: `${Math.max(13, Math.round(14 * scale))}px`,
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(uiDepths.hud + 2);
    objects.push(backpackButton, backpackIcon);

    for (let index = 0; index < count; index += 1) {
      const slot = index === 0 ? undefined : this.hotbarSlots[index - 1];
      const x = startX + index * (slotSize + gap);
      const isFlashlightSlot = index === 0;
      const itemId = isFlashlightSlot ? FLASHLIGHT_HOTBAR_ITEM_ID : slot?.itemId;
      const selected = itemId === this.selectedItemId;
      const frame = this.add
        .rectangle(x, y, slotSize, slotSize, 0x171b22, 0.86)
        .setOrigin(0, 0)
        .setStrokeStyle(selected ? 2 : 1, selected ? 0xe3d36f : 0x8a7658, selected ? 0.9 : 0.45)
        .setScrollFactor(0)
        .setDepth(uiDepths.hud + 1)
        .setInteractive({ useHandCursor: Boolean(itemId) })
        .on('pointerdown', (pointer: Phaser.Input.Pointer, _x: number, _y: number, event: { stopPropagation?: () => void }) => {
          captureUiPointer(pointer, event);
          if (itemId) {
            this.selectedItemId = itemId;
            gameEvents.emit({ type: 'inventory.selectedChanged', itemId, hotbarSlot: index + 1 });
            this.renderHud();
          }
        });
      const label = this.add
        .text(x + slotSize / 2, y + 10 * scale, itemId ? this.shortItemLabel(itemId) : String(index + 1), {
          color: itemId ? '#e8e1d3' : '#58535b',
          fontFamily: 'Georgia, serif',
          fontSize: `${Math.max(11, Math.round(12 * scale))}px`,
          align: 'center',
          wordWrap: { width: slotSize - 6 * scale },
        })
        .setOrigin(0.5, 0)
        .setScrollFactor(0)
        .setDepth(uiDepths.hud + 2);
      objects.push(frame, label);
    }

    const load = this.add
      .text(safe.right, y - 20 * scale, `${this.burdenState.toUpperCase()} ${this.burdenValue}`, {
        color: this.burdenState === 'hoarding' ? '#d86a57' : '#d2c276',
        fontFamily: 'Georgia, serif',
        fontSize: `${Math.max(12, Math.round(13 * scale))}px`,
      })
      .setOrigin(1, 1)
      .setScrollFactor(0)
      .setDepth(uiDepths.hud + 1);
    objects.push(load);

    return objects;
  }

  private shortItemLabel(itemId: string): string {
    if (itemId === FLASHLIGHT_HOTBAR_ITEM_ID) {
      return 'light';
    }
    const definition = itemDefinitionForId(itemId);
    if (!definition) {
      return '?';
    }
    switch (definition.id) {
      case 'spare_batteries':
        return 'AA';
      case 'cleaning_spray':
        return 'spray';
      case 'duct_tape':
        return 'tape';
      case 'phone_charger':
        return 'cord';
      case 'toy_decoy':
        return 'toy';
      default:
        return definition.label.slice(0, 4).toLowerCase();
    }
  }

  private handleUiKeyDown(event: KeyboardEvent): void {
    const layout = this.responsive?.getLayout();
    if (!layout || layout.isPortrait) {
      return;
    }
    if (this.backpackMenu?.handleUiKey(event, layout)) {
      return;
    }

    const slotNumber = Number(event.key);
    if (Number.isInteger(slotNumber) && slotNumber >= 1 && slotNumber <= 5) {
      const itemId = slotNumber === 1 ? FLASHLIGHT_HOTBAR_ITEM_ID : this.hotbarSlots[slotNumber - 2]?.itemId;
      if (itemId) {
        this.selectedItemId = itemId;
        gameEvents.emit({ type: 'inventory.selectedChanged', itemId, hotbarSlot: slotNumber });
        this.renderHud();
      }
    }
  }

  private createSettingsOverlay(): void {
    this.settingsButton?.remove();
    this.settingsPanel?.remove();
    this.infoPanel?.remove();
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = '⚙';
    button.setAttribute('aria-label', 'Open settings');
    button.style.cssText = [
      'position:fixed',
      'left:16px',
      'top:16px',
      'z-index:20',
      'width:46px',
      'height:46px',
      'border-radius:50%',
      'border:2px solid rgba(138,118,88,.72)',
      'background:rgba(23,18,15,.88)',
      'color:#f4efe0',
      'font:700 26px Georgia,serif',
      'line-height:40px',
      'cursor:pointer',
    ].join(';');

    const panel = document.createElement('div');
    this.settingsPanelOpen = false;
    panel.style.cssText = [
      'position:fixed',
      'left:16px',
      'top:70px',
      'z-index:19',
      'min-width:300px',
      'max-width:min(430px,calc(100vw - 32px))',
      'padding:12px 14px',
      'background:rgba(7,6,8,.9)',
      'border:1px solid rgba(63,53,46,.72)',
      'color:#d9d0c4',
      'font:15px Georgia,serif',
      'line-height:1.35',
      'display:none',
    ].join(';');

    const title = document.createElement('div');
    title.textContent = 'Settings';
    title.style.cssText = 'font-weight:700;color:#f4efe0;margin-bottom:10px';

    const infoToggle = this.createSettingsToggle('Level info', false, (checked) => {
      this.infoPanelOpen = checked;
      if (this.infoPanel) {
        this.infoPanel.style.display = checked ? 'block' : 'none';
      }
    });
    const darknessToggle = this.createSettingsToggle('Remove darkness', this.initialDarknessDisabled(), (checked) => {
      gameEvents.emit({ type: 'settings.darknessToggled', disabled: checked });
    });
    const debugToggle = this.createSettingsToggle('Debug overlay', false, (checked) => {
      this.debugReadoutVisible = checked;
      this.updateDebugReadout();
    });
    const worldToggle = this.createSettingsToggle('World labels', false, (checked) => {
      gameEvents.emit({ type: 'settings.worldDebugToggled', visible: checked });
    });

    const infoPanel = document.createElement('div');
    infoPanel.style.cssText = [
      'display:none',
      'margin-top:10px',
      'padding:10px 12px',
      'background:rgba(21,18,16,.72)',
      'border:1px solid rgba(63,53,46,.72)',
      'color:#aaa196',
      'font:14px Georgia,serif',
      'line-height:1.35',
      'white-space:pre-wrap',
    ].join(';');

    panel.append(title, infoToggle.label, darknessToggle.label, debugToggle.label, worldToggle.label, infoPanel);

    const stopDomPropagation = (event: Event) => event.stopPropagation();
    button.addEventListener('pointerdown', stopDomPropagation);
    panel.addEventListener('pointerdown', stopDomPropagation);
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      this.settingsPanelOpen = !this.settingsPanelOpen;
      panel.style.display = this.settingsPanelOpen ? 'block' : 'none';
      if (this.infoPanel) {
        this.infoPanel.style.display = this.settingsPanelOpen && this.infoPanelOpen ? 'block' : 'none';
      }
      button.setAttribute('aria-label', this.settingsPanelOpen ? 'Close settings' : 'Open settings');
    });

    document.body.append(button, panel);
    this.settingsButton = button;
    this.settingsPanel = panel;
    this.infoPanel = infoPanel;
    this.darknessToggle = darknessToggle.input;
  }

  private createSettingsToggle(
    text: string,
    checked: boolean,
    onChange: (checked: boolean) => void,
  ): { label: HTMLLabelElement; input: HTMLInputElement } {
    const label = document.createElement('label');
    label.style.cssText = 'display:flex;align-items:center;gap:10px;margin-top:8px;cursor:pointer;user-select:none';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = checked;
    input.style.cssText = 'width:18px;height:18px;accent-color:#e3d36f;flex:0 0 auto';
    const labelText = document.createElement('span');
    labelText.textContent = text;
    label.append(input, labelText);
    input.addEventListener('change', () => onChange(input.checked));
    return { label, input };
  }

  private initialDarknessDisabled(): boolean {
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get('noDarkness') === '1' || searchParams.get('darkness') === '0' || searchParams.get('parallaxPreview') === '1';
  }

  private updateSettingsOverlay(visible: boolean): void {
    if (!this.settingsButton || !this.settingsPanel) {
      return;
    }
    this.settingsButton.style.display = visible ? 'block' : 'none';
    this.settingsPanel.style.display = visible && this.settingsPanelOpen ? 'block' : 'none';
  }

  private updateInfoOverlay(viewportClass: string, visible: boolean): void {
    if (!this.infoPanel) {
      return;
    }
    this.infoPanel.style.display = visible && this.settingsPanelOpen && this.infoPanelOpen ? 'block' : 'none';
    this.infoPanel.textContent = `${this.phaseInfo?.phase ?? 'Phase 10 flashlight feedback'}\nroom: ${
      this.phaseInfo?.roomId ?? 'level_01_family_house'
    } (${this.phaseInfo?.segmentCount ?? 0} segments, ${this.phaseInfo?.worldWidth ?? 0} world px)\nviewport class: ${viewportClass}\nseed: ${
      this.phaseInfo?.seed ?? 'unknown'
    }\nWASD/arrows move. Space searches/unlocks. Mouse aims light. Left mouse focuses. Right mouse or L toggles lock-on. 1/2/3 switch depth. R resets to main.`;
  }

  private updateDebugReadout(): void {
    const layout = this.responsive?.getLayout();
    if (!layout || layout.isPortrait || !this.debugReadoutVisible) {
      this.debugReadout?.setVisible(false);
      return;
    }

    const gameSize = this.scale.gameSize;
    const displaySize = this.scale.displaySize;
    const fontSize = Math.max(layout.isPhone ? 18 : 16, Math.round(18 * layout.uiScale));
    const screenText = `FPS ${Math.round(this.game.loop.actualFps)}  SCREEN ${gameSize.width}x${gameSize.height} / ${Math.round(
      displaySize.width,
    )}x${Math.round(displaySize.height)}`;

    if (!this.debugReadout) {
      this.debugReadout = this.add
        .text(0, 0, screenText, {
          color: '#d2c276',
          fontFamily: 'Georgia, serif',
          fontSize: `${fontSize}px`,
        })
        .setScrollFactor(0)
        .setDepth(uiDepths.hud + 2);
    }

    this.debugReadout.setVisible(true).setFontSize(fontSize).setText(screenText);
    this.positionDebugReadout(layout, this.debugReadoutX || layout.safeArea.left + 690 * layout.uiScale);
  }

  private positionDebugReadout(layout: ResponsiveLayout, minX: number): void {
    if (!this.debugReadout) {
      return;
    }

    const maxWidth = Math.max(180, layout.safeArea.right - minX);
    this.debugReadout
      .setPosition(minX, layout.safeArea.top)
      .setWordWrapWidth(maxWidth)
      .setFontFamily('Georgia, serif')
      .setDepth(uiDepths.hud + 2);
  }
}
