import Phaser from 'phaser';
import { gameEvents } from '../core/EventBus';
import type { BackpackTabId, InventoryEntry, ItemDefinition, LostItemEntry } from '../core/Types';
import { itemDefinitionForId, labelForItemId } from '../systems/InventorySystem';
import type { ResponsiveLayout } from '../systems/ResponsiveScaleSystem';
import { uiDepths, uiTheme } from './uiTheme';
import { captureUiPointer } from './uiPointerCapture';

interface BackpackMenuSnapshot {
  entries: InventoryEntry[];
  lostItems: LostItemEntry[];
  burden: number;
  burdenState: string;
  objective: string;
  selectedItemId?: string;
  lastUseReason?: string;
}

export class BackpackMenu {
  private open = false;
  private activeTab: BackpackTabId = 'inventory';
  private selectedIndex = 0;
  private snapshot: BackpackMenuSnapshot = {
    entries: [],
    lostItems: [],
    burden: 0,
    burdenState: 'light',
    objective: 'Find the key.',
  };
  private objects: Phaser.GameObjects.GameObject[] = [];

  constructor(private readonly scene: Phaser.Scene) {}

  destroy(): void {
    this.clear();
    document.body.dataset.pileupBackpackOpen = '0';
  }

  setInventory(entries: InventoryEntry[], burden: number, burdenState: string, selectedItemId?: string): void {
    this.snapshot.entries = entries;
    this.snapshot.burden = burden;
    this.snapshot.burdenState = burdenState;
    if (selectedItemId) {
      const index = entries.findIndex((entry) => entry.itemId === selectedItemId);
      this.selectedIndex = Math.max(0, index);
      this.snapshot.selectedItemId = index >= 0 ? selectedItemId : entries[this.selectedIndex]?.itemId;
    } else if (!this.snapshot.selectedItemId && entries[0]) {
      this.snapshot.selectedItemId = entries[0].itemId;
    }
  }

  setLostItems(items: LostItemEntry[]): void {
    this.snapshot.lostItems = items;
  }

  setObjective(objective: string): void {
    this.snapshot.objective = objective;
  }

  setUseResult(itemId: string, success: boolean, reason?: string): void {
    this.snapshot.lastUseReason = success ? reason ?? `${labelForItemId(itemId)} used.` : reason ?? 'Not here.';
  }

  toggle(layout: ResponsiveLayout): void {
    this.setOpen(!this.open, layout);
  }

  setOpen(open: boolean, layout: ResponsiveLayout): void {
    if (this.open === open) {
      return;
    }
    this.open = open;
    document.body.dataset.pileupBackpackOpen = open ? '1' : '0';
    gameEvents.emit({ type: open ? 'backpack.opened' : 'backpack.closed' });
    if (!open) {
      this.clear();
      return;
    }
    this.render(layout);
  }

  isOpen(): boolean {
    return this.open;
  }

  render(layout: ResponsiveLayout): Phaser.GameObjects.GameObject[] {
    this.clear();
    if (!this.open || layout.isPortrait) {
      return [];
    }

    const safe = layout.safeArea;
    const scale = layout.uiScale;
    const width = layout.isPhone ? safe.width : Math.min(1320 * scale, safe.width * (layout.isUltrawide ? 0.72 : 0.9));
    const height = layout.isPhone ? safe.height : Math.min(safe.height * 0.86, 760 * scale);
    const x = safe.left + (safe.width - width) / 2;
    const y = safe.top + (safe.height - height) / 2;
    const dimmer = this.scene.add
      .rectangle(0, 0, layout.viewportWidth, layout.viewportHeight, uiTheme.voidBlack, 0.66)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(uiDepths.backpackDimmer);
    const shell = this.scene.add
      .rectangle(x, y, width, height, uiTheme.deepViolet, 0.96)
      .setOrigin(0, 0)
      .setStrokeStyle(3, 0x8a7658, 0.64)
      .setScrollFactor(0)
      .setDepth(uiDepths.backpack);
    const title = this.scene.add
      .text(x + 28 * scale, y + 20 * scale, 'backpack', {
        color: uiTheme.inkOffWhite,
        fontFamily: 'Georgia, serif',
        fontSize: `${Math.max(22, Math.round(28 * scale))}px`,
      })
      .setScrollFactor(0)
      .setDepth(uiDepths.backpack + 1);
    const close = this.scene.add
      .text(x + width - 28 * scale, y + 20 * scale, 'close', {
        color: uiTheme.mutedText,
        fontFamily: 'Georgia, serif',
        fontSize: `${Math.max(15, Math.round(16 * scale))}px`,
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(uiDepths.backpack + 1)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', (pointer: Phaser.Input.Pointer, _x: number, _y: number, event: { stopPropagation?: () => void }) => {
        captureUiPointer(pointer, event);
        this.setOpen(false, layout);
      });
    this.objects.push(dimmer, shell, title, close);
    this.renderTabs(x + 28 * scale, y + 66 * scale, scale, layout);

    if (this.activeTab === 'lostItems') {
      this.renderLostItems(x, y, width, height, scale);
    } else if (this.activeTab === 'notes') {
      this.renderNotes(x, y, width, height, scale);
    } else {
      this.renderInventory(x, y, width, height, scale, layout.isPhone);
    }

    const status = this.scene.add
      .text(x + 28 * scale, y + height - 42 * scale, `load: ${this.snapshot.burdenState} ${this.snapshot.burden}`, {
        color: this.snapshot.burdenState === 'hoarding' ? uiTheme.sickWarning : uiTheme.flashlightAmber,
        fontFamily: 'Georgia, serif',
        fontSize: `${Math.max(14, Math.round(15 * scale))}px`,
      })
      .setScrollFactor(0)
      .setDepth(uiDepths.backpack + 1);
    const objective = this.scene.add
      .text(x + width * 0.42, y + height - 44 * scale, this.snapshot.objective, {
        color: uiTheme.mutedText,
        fontFamily: 'Georgia, serif',
        fontSize: `${Math.max(13, Math.round(14 * scale))}px`,
        wordWrap: { width: width * 0.5 },
      })
      .setScrollFactor(0)
      .setDepth(uiDepths.backpack + 1);
    this.objects.push(status, objective);
    return this.objects;
  }

  handleUiKey(event: KeyboardEvent, layout: ResponsiveLayout): boolean {
    const key = event.key.toLowerCase();
    if (key === 'tab' || key === 'i') {
      event.preventDefault();
      this.toggle(layout);
      return true;
    }
    if (!this.open) {
      return false;
    }
    event.preventDefault();
    if (key === 'escape') {
      this.setOpen(false, layout);
      return true;
    }
    if (key === 'q' || key === 'e') {
      this.changeTab(key === 'q' ? -1 : 1, layout);
      return true;
    }
    if (key === 'arrowleft' || key === 'a') {
      this.moveSelection(-1, layout);
      return true;
    }
    if (key === 'arrowright' || key === 'd') {
      this.moveSelection(1, layout);
      return true;
    }
    if (key === 'arrowup' || key === 'w') {
      this.moveSelection(-5, layout);
      return true;
    }
    if (key === 'arrowdown' || key === 's') {
      this.moveSelection(5, layout);
      return true;
    }
    if (key === 'enter' || key === ' ') {
      this.requestUse();
      return true;
    }
    return false;
  }

  private renderTabs(x: number, y: number, scale: number, layout: ResponsiveLayout): void {
    (['inventory', 'lostItems', 'notes'] as BackpackTabId[]).forEach((tab, index) => {
      const label = tab === 'lostItems' ? 'lost' : tab;
      const width = 112 * scale;
      const active = this.activeTab === tab;
      const tabBack = this.scene.add
        .rectangle(x + index * (width + 8 * scale), y, width, 34 * scale, active ? uiTheme.panelBlueGray : 0x11151d, active ? 0.94 : 0.76)
        .setOrigin(0, 0)
        .setStrokeStyle(1, active ? 0xe3d36f : 0x58535b, active ? 0.8 : 0.46)
        .setScrollFactor(0)
        .setDepth(uiDepths.backpack + 1)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', (pointer: Phaser.Input.Pointer, _x: number, _y: number, event: { stopPropagation?: () => void }) => {
          captureUiPointer(pointer, event);
          this.activeTab = tab;
          gameEvents.emit({ type: 'backpack.tabChanged', tab });
          this.render(layout);
        });
      const tabText = this.scene.add
        .text(x + index * (width + 8 * scale) + width / 2, y + 8 * scale, label, {
          color: active ? uiTheme.inkOffWhite : uiTheme.mutedText,
          fontFamily: 'Georgia, serif',
          fontSize: `${Math.max(13, Math.round(14 * scale))}px`,
        })
        .setOrigin(0.5, 0)
        .setScrollFactor(0)
        .setDepth(uiDepths.backpack + 2);
      this.objects.push(tabBack, tabText);
    });
  }

  private renderInventory(x: number, y: number, width: number, height: number, scale: number, isPhone: boolean): void {
    const entries = this.snapshot.entries;
    const gridX = x + 30 * scale;
    const gridY = y + 126 * scale;
    const cell = isPhone ? 82 * scale : 96 * scale;
    const gap = 12 * scale;
    const columns = isPhone ? 4 : 5;
    if (entries.length === 0) {
      this.objects.push(
        this.scene.add
          .text(gridX, gridY, 'The backpack is empty.', {
            color: uiTheme.mutedText,
            fontFamily: 'Georgia, serif',
            fontSize: `${Math.max(16, Math.round(18 * scale))}px`,
          })
          .setScrollFactor(0)
          .setDepth(uiDepths.backpack + 1),
      );
    }
    entries.forEach((entry, index) => {
      const definition = itemDefinitionForId(entry.itemId);
      const col = index % columns;
      const row = Math.floor(index / columns);
      const slotX = gridX + col * (cell + gap);
      const slotY = gridY + row * (cell + gap);
      const selected = index === this.selectedIndex || this.snapshot.selectedItemId === entry.itemId;
      const slot = this.scene.add
        .rectangle(slotX, slotY, cell, cell, 0x171b22, 0.92)
        .setOrigin(0, 0)
        .setStrokeStyle(selected ? 3 : 1, selected ? 0xe3d36f : 0x8a7658, selected ? 0.9 : 0.46)
        .setScrollFactor(0)
        .setDepth(uiDepths.backpack + 1)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', (pointer: Phaser.Input.Pointer, _x: number, _y: number, event: { stopPropagation?: () => void }) => {
          captureUiPointer(pointer, event);
          this.selectedIndex = index;
          this.snapshot.selectedItemId = entry.itemId;
          gameEvents.emit({ type: 'inventory.selectedChanged', itemId: entry.itemId, hotbarSlot: entry.assignedHotbarSlot });
          this.render(this.scene.registry.get('pileupLayout') as ResponsiveLayout);
        });
      const icon = this.scene.add
        .text(slotX + cell / 2, slotY + 16 * scale, this.iconFor(definition), {
          color: entry.isKeyItem ? uiTheme.flashlightAmber : uiTheme.inkOffWhite,
          fontFamily: 'Georgia, serif',
          fontSize: `${Math.max(20, Math.round(28 * scale))}px`,
        })
        .setOrigin(0.5, 0)
        .setScrollFactor(0)
        .setDepth(uiDepths.backpack + 2);
      const count = this.scene.add
        .text(slotX + cell - 9 * scale, slotY + cell - 24 * scale, entry.count > 1 ? String(entry.count) : entry.isKeyItem ? 'key' : '', {
          color: entry.isKeyItem ? uiTheme.flashlightAmber : uiTheme.mutedText,
          fontFamily: 'Georgia, serif',
          fontSize: `${Math.max(12, Math.round(13 * scale))}px`,
        })
        .setOrigin(1, 0)
        .setScrollFactor(0)
        .setDepth(uiDepths.backpack + 2);
      this.objects.push(slot, icon, count);
    });
    this.renderDetailPanel(x + width * (isPhone ? 0.58 : 0.55), y + 126 * scale, width * (isPhone ? 0.37 : 0.4), height - 210 * scale, scale);
  }

  private renderDetailPanel(x: number, y: number, width: number, height: number, scale: number): void {
    const entry = this.snapshot.entries[this.selectedIndex] ?? this.snapshot.entries.find((item) => item.itemId === this.snapshot.selectedItemId);
    const definition = entry ? itemDefinitionForId(entry.itemId) : undefined;
    const panel = this.scene.add
      .rectangle(x, y, width, height, uiTheme.coldNavy, 0.86)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x58535b, 0.7)
      .setScrollFactor(0)
      .setDepth(uiDepths.backpack + 1);
    this.objects.push(panel);
    if (!entry || !definition) {
      this.objects.push(
        this.scene.add
          .text(x + 18 * scale, y + 18 * scale, 'Select something from the pack.', {
            color: uiTheme.mutedText,
            fontFamily: 'Georgia, serif',
            fontSize: `${Math.max(15, Math.round(16 * scale))}px`,
          })
          .setScrollFactor(0)
          .setDepth(uiDepths.backpack + 2),
      );
      return;
    }
    const title = this.scene.add
      .text(x + 18 * scale, y + 18 * scale, definition.label, {
        color: definition.category === 'required_objective' ? uiTheme.flashlightAmber : uiTheme.inkOffWhite,
        fontFamily: 'Georgia, serif',
        fontSize: `${Math.max(20, Math.round(24 * scale))}px`,
        wordWrap: { width: width - 36 * scale },
      })
      .setScrollFactor(0)
      .setDepth(uiDepths.backpack + 2);
    const body = this.scene.add
      .text(x + 18 * scale, y + 72 * scale, definition.description, {
        color: uiTheme.mutedText,
        fontFamily: 'Georgia, serif',
        fontSize: `${Math.max(14, Math.round(16 * scale))}px`,
        lineSpacing: 4,
        wordWrap: { width: width - 36 * scale },
      })
      .setScrollFactor(0)
      .setDepth(uiDepths.backpack + 2);
    const meta = this.scene.add
      .text(x + 18 * scale, y + height - 114 * scale, `count ${entry.count} / burden ${definition.burden}`, {
        color: uiTheme.flashlightAmber,
        fontFamily: 'Georgia, serif',
        fontSize: `${Math.max(13, Math.round(14 * scale))}px`,
      })
      .setScrollFactor(0)
      .setDepth(uiDepths.backpack + 2);
    const canUse = definition.usable && entry.count > 0;
    const useButton = this.scene.add
      .rectangle(x + 18 * scale, y + height - 72 * scale, 124 * scale, 42 * scale, canUse ? 0x2a2f26 : 0x222029, canUse ? 0.96 : 0.72)
      .setOrigin(0, 0)
      .setStrokeStyle(1, canUse ? 0xe3d36f : 0x58535b, canUse ? 0.75 : 0.45)
      .setScrollFactor(0)
      .setDepth(uiDepths.backpack + 2)
      .setInteractive({ useHandCursor: canUse })
      .on('pointerdown', (pointer: Phaser.Input.Pointer, _x: number, _y: number, event: { stopPropagation?: () => void }) => {
        captureUiPointer(pointer, event);
        this.requestUse();
      });
    const useLabel = this.scene.add
      .text(x + 80 * scale, y + height - 61 * scale, 'Use', {
        color: canUse ? uiTheme.inkOffWhite : uiTheme.disabledGray,
        fontFamily: 'Georgia, serif',
        fontSize: `${Math.max(15, Math.round(16 * scale))}px`,
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(uiDepths.backpack + 3);
    const reason = this.scene.add
      .text(x + 158 * scale, y + height - 68 * scale, this.snapshot.lastUseReason ?? definition.disabledUseText ?? '', {
        color: uiTheme.mutedText,
        fontFamily: 'Georgia, serif',
        fontSize: `${Math.max(12, Math.round(13 * scale))}px`,
        wordWrap: { width: Math.max(140, width - 176 * scale) },
      })
      .setScrollFactor(0)
      .setDepth(uiDepths.backpack + 2);
    this.objects.push(title, body, meta, useButton, useLabel, reason);
  }

  private renderLostItems(x: number, y: number, width: number, height: number, scale: number): void {
    const paperX = x + 44 * scale;
    const paperY = y + 126 * scale;
    const paperW = width - 88 * scale;
    const paperH = height - 196 * scale;
    const paper = this.scene.add
      .rectangle(paperX, paperY, paperW, paperH, uiTheme.dirtyPaper, 0.96)
      .setOrigin(0, 0)
      .setStrokeStyle(2, uiTheme.paperShadow, 0.7)
      .setScrollFactor(0)
      .setDepth(uiDepths.backpack + 1);
    const title = this.scene.add
      .text(paperX + 30 * scale, paperY + 20 * scale, 'lost last week', {
        color: '#352a22',
        fontFamily: 'Bradley Hand, Comic Sans MS, cursive',
        fontSize: `${Math.max(22, Math.round(30 * scale))}px`,
      })
      .setScrollFactor(0)
      .setDepth(uiDepths.backpack + 2);
    this.objects.push(paper, title);
    const rows = this.snapshot.lostItems.length ? this.snapshot.lostItems : [{ itemId: 'empty', label: 'checking rooms', found: false, required: false }];
    rows.slice(0, 8).forEach((item, index) => {
      const rowY = paperY + (76 + index * 48) * scale;
      const marker = this.scene.add
        .text(paperX + 30 * scale, rowY, item.found ? 'x' : '-', {
          color: item.found ? uiTheme.foundGreenGray : '#3d3027',
          fontFamily: 'Bradley Hand, Comic Sans MS, cursive',
          fontSize: `${Math.max(18, Math.round(22 * scale))}px`,
        })
        .setScrollFactor(0)
        .setDepth(uiDepths.backpack + 2);
      const label = this.scene.add
        .text(paperX + 72 * scale, rowY, item.found ? item.label.toLowerCase() : item.hint ?? 'something missing', {
          color: item.found ? '#767064' : '#3d3027',
          fontFamily: 'Bradley Hand, Comic Sans MS, cursive',
          fontSize: `${Math.max(16, Math.round(20 * scale))}px`,
          wordWrap: { width: paperW - 118 * scale },
        })
        .setScrollFactor(0)
        .setDepth(uiDepths.backpack + 2);
      this.objects.push(marker, label);
      if (item.found) {
        this.objects.push(
          this.scene.add
            .line(paperX + 68 * scale, rowY + 15 * scale, 0, 0, paperW - 116 * scale, 0, 0x725342, 0.78)
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setDepth(uiDepths.backpack + 3),
        );
      }
    });
  }

  private renderNotes(x: number, y: number, width: number, _height: number, scale: number): void {
    const text = this.scene.add
      .text(x + 44 * scale, y + 134 * scale, 'No extra pages yet.\n\nThe backpack is keeping the lost-items page and supplies in one place for this build.', {
        color: uiTheme.mutedText,
        fontFamily: 'Georgia, serif',
        fontSize: `${Math.max(17, Math.round(20 * scale))}px`,
        lineSpacing: 10,
        wordWrap: { width: width - 88 * scale },
      })
      .setScrollFactor(0)
      .setDepth(uiDepths.backpack + 1);
    this.objects.push(text);
  }

  private changeTab(delta: -1 | 1, layout: ResponsiveLayout): void {
    const tabs: BackpackTabId[] = ['inventory', 'lostItems', 'notes'];
    const index = Phaser.Math.Wrap(tabs.indexOf(this.activeTab) + delta, 0, tabs.length);
    this.activeTab = tabs[index];
    gameEvents.emit({ type: 'backpack.tabChanged', tab: this.activeTab });
    this.render(layout);
  }

  private moveSelection(delta: number, layout: ResponsiveLayout): void {
    if (this.activeTab !== 'inventory' || this.snapshot.entries.length === 0) {
      return;
    }
    this.selectedIndex = Phaser.Math.Wrap(this.selectedIndex + delta, 0, this.snapshot.entries.length);
    const itemId = this.snapshot.entries[this.selectedIndex]?.itemId;
    this.snapshot.selectedItemId = itemId;
    gameEvents.emit({ type: 'inventory.selectedChanged', itemId });
    this.render(layout);
  }

  private requestUse(): void {
    const entry = this.snapshot.entries[this.selectedIndex] ?? this.snapshot.entries.find((item) => item.itemId === this.snapshot.selectedItemId);
    if (!entry) {
      return;
    }
    const definition = itemDefinitionForId(entry.itemId);
    if (!definition?.usable) {
      this.snapshot.lastUseReason = definition?.disabledUseText ?? 'Cannot use this.';
      gameEvents.emit({ type: 'hud.toast', tone: 'warning', text: this.snapshot.lastUseReason });
      return;
    }
    gameEvents.emit({ type: 'inventory.useRequested', itemId: entry.itemId, source: 'backpack' });
  }

  private iconFor(definition?: ItemDefinition): string {
    if (!definition) {
      return '?';
    }
    switch (definition.id) {
      case 'front_door_key':
        return 'key';
      case 'spare_batteries':
        return 'AA';
      case 'cleaning_spray':
        return 'spray';
      case 'duct_tape':
        return 'tape';
      case 'family_photo':
        return 'photo';
      case 'phone_charger':
        return 'cord';
      case 'toy_decoy':
        return 'toy';
      default:
        return 'junk';
    }
  }

  private clear(): void {
    this.objects.forEach((object) => object.destroy());
    this.objects = [];
  }
}
