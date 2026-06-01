import { gameEvents } from '../core/EventBus';
import type { InventoryEntry, ItemCategory, ItemDefinition, LostItemEntry, SearchResultType } from '../core/Types';
import itemPoolData from '../../data/item_pool.json';

const ITEM_COPY: Record<
  string,
  Pick<ItemDefinition, 'label' | 'description' | 'usable' | 'stackable' | 'maxStack' | 'useContexts' | 'disabledUseText'>
> = {
  front_door_key: {
    label: 'Front Door Key',
    description: 'Cold brass with a strip of tape on the ring. It belongs at the front door.',
    usable: false,
    stackable: false,
    useContexts: ['door'],
    disabledUseText: 'Needed at the front door.',
  },
  spare_batteries: {
    label: 'Spare Batteries',
    description: 'Two scratched AA batteries wrapped in old tape. Good for one nervous refill.',
    usable: true,
    stackable: true,
    maxStack: 4,
    useContexts: ['gameplay', 'menuOnly'],
    disabledUseText: 'Battery already full.',
  },
  cleaning_spray: {
    label: 'Cleaning Spray',
    description: 'A harsh plastic bottle. Useful only when something is close enough to risk it.',
    usable: true,
    stackable: true,
    maxStack: 2,
    useContexts: ['combat'],
    disabledUseText: 'Nothing close enough.',
  },
  duct_tape: {
    label: 'Duct Tape',
    description: 'A flattened roll with lint stuck to the edge. It will matter once repairs are live.',
    usable: true,
    stackable: true,
    maxStack: 2,
    useContexts: ['gameplay'],
    disabledUseText: 'Nothing to tape here.',
  },
  family_photo: {
    label: 'Family Photo',
    description: 'Bent at the corners. It is not a tool, but it is hard to put down.',
    usable: false,
    stackable: false,
    useContexts: ['menuOnly'],
    disabledUseText: 'Hold onto it.',
  },
  phone_charger: {
    label: 'Phone Charger',
    description: 'A tangled cord with one exposed kink. It needs the right moment.',
    usable: true,
    stackable: false,
    useContexts: ['gameplay'],
    disabledUseText: 'No signal to follow.',
  },
  toy_decoy: {
    label: 'Toy Decoy',
    description: 'A small noisy toy. Throwing and distraction are not wired yet.',
    usable: true,
    stackable: true,
    maxStack: 3,
    useContexts: ['gameplay'],
    disabledUseText: 'Too loud to use safely.',
  },
  junk_stack: {
    label: 'Junk Stack',
    description: 'Wrong things grabbed in a panic. Heavy enough to make every step worse.',
    usable: false,
    stackable: true,
    maxStack: 8,
    useContexts: [],
    disabledUseText: 'Cannot use this.',
  },
};

interface ItemPoolJson {
  required_objective_item: string;
  items: Array<{ id: string; category: ItemCategory; hotbar: boolean; burden: number; effect?: string }>;
}

const titleCase = (value: string): string =>
  value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const buildItemDefinitions = (): Record<string, ItemDefinition> => {
  const pool = itemPoolData as ItemPoolJson;
  return Object.fromEntries(
    pool.items.map((item) => {
      const copy = ITEM_COPY[item.id] ?? {
        label: titleCase(item.id),
        description: 'Something from the house that probably matters later.',
        usable: false,
        stackable: false,
        useContexts: [],
        disabledUseText: 'Cannot use this.',
      };
      return [
        item.id,
        {
          id: item.id,
          label: copy.label,
          category: item.category,
          iconAssetId: `ui.item_icon.${item.id}`,
          hotbar: item.hotbar,
          usable: copy.usable,
          stackable: copy.stackable,
          maxStack: copy.maxStack,
          burden: item.burden,
          effectId: item.effect,
          useContexts: copy.useContexts,
          description: copy.description,
          disabledUseText: copy.disabledUseText,
        },
      ];
    }),
  );
};

export const ITEM_DEFINITIONS = buildItemDefinitions();
export type InventoryItem = ItemDefinition;
export const FLASHLIGHT_HOTBAR_ITEM_ID = 'flashlight';

export const itemDefinitionForId = (itemId: string): ItemDefinition | undefined => ITEM_DEFINITIONS[itemId];
export const labelForItemId = (itemId: string): string => ITEM_DEFINITIONS[itemId]?.label ?? titleCase(itemId);

export class InventorySystem {
  private readonly entries: InventoryEntry[] = [];
  private hasKey = false;
  private selectedItemId?: string = FLASHLIGHT_HOTBAR_ITEM_ID;

  addSearchResult(resultType: SearchResultType, itemId?: string): string {
    if (!itemId) {
      return this.labelForResult(resultType);
    }

    const item = ITEM_DEFINITIONS[itemId];
    if (!item) {
      return this.labelForResult(resultType);
    }

    this.addItem(item);
    this.hasKey ||= item.id === 'front_door_key';
    gameEvents.emit({ type: 'item.collected', itemId: item.id });
    gameEvents.emit({ type: 'hud.toast', tone: 'item', text: `Found ${item.label}` });
    this.publishInventoryChanged();

    if (item.id === 'front_door_key') {
      gameEvents.emit({ type: 'objective.changed', text: 'Key found. Survive the hoard and reach the front door.' });
    }

    return item.label;
  }

  addDebugItem(itemId: string): void {
    const item = ITEM_DEFINITIONS[itemId];
    if (!item) {
      return;
    }
    this.addItem(item);
    this.hasKey ||= item.id === 'front_door_key';
    this.publishInventoryChanged();
  }

  hotbarItems(): InventoryEntry[] {
    return this.entries
      .filter((entry) => ITEM_DEFINITIONS[entry.itemId]?.hotbar)
      .slice(0, 4)
      .map((entry, index) => ({ ...entry, assignedHotbarSlot: index + 2 }));
  }

  inventoryEntries(): InventoryEntry[] {
    return this.entries.map((entry) => ({ ...entry }));
  }

  lostItems(): LostItemEntry[] {
    return this.entries.map((entry) => {
      const definition = ITEM_DEFINITIONS[entry.itemId];
      return {
        itemId: entry.itemId,
        label: definition?.label ?? labelForItemId(entry.itemId),
        found: true,
        required: definition?.category === 'required_objective',
      };
    });
  }

  selectItem(itemId?: string, hotbarSlot?: number): void {
    this.selectedItemId = itemId;
    gameEvents.emit({ type: 'inventory.selectedChanged', itemId, hotbarSlot });
  }

  burden(): number {
    return this.entries.reduce((total, entry) => total + (ITEM_DEFINITIONS[entry.itemId]?.burden ?? 0) * entry.count, 0);
  }

  burdenState(): string {
    const burden = this.burden();
    if (burden >= 5) {
      return 'hoarding';
    }
    if (burden >= 3) {
      return 'loaded';
    }
    return 'light';
  }

  keyFound(): boolean {
    return this.hasKey;
  }

  resolveUse(itemId: string, success: boolean, reason?: string): void {
    if (success) {
      this.consumeOne(itemId);
    }
    gameEvents.emit({ type: 'inventory.useResolved', itemId, success, reason });
    gameEvents.emit({
      type: 'hud.toast',
      tone: success ? 'item' : 'warning',
      text: success ? reason ?? `${labelForItemId(itemId)} used` : reason ?? 'Not here.',
    });
    this.publishInventoryChanged();
  }

  private addItem(item: InventoryItem): void {
    const existing = this.entries.find((entry) => entry.itemId === item.id);
    if (existing && item.stackable) {
      existing.count = Math.min(existing.count + 1, item.maxStack ?? 99);
      return;
    }

    const entry: InventoryEntry = {
      itemId: item.id,
      count: 1,
      discoveredAtMs: performance.now(),
      isKeyItem: item.category === 'required_objective',
    };
    this.entries.push(entry);
  }

  private consumeOne(itemId: string): void {
    const entry = this.entries.find((item) => item.itemId === itemId);
    const definition = ITEM_DEFINITIONS[itemId];
    if (!entry || entry.isKeyItem || !definition?.stackable) {
      return;
    }

    entry.count -= 1;
    if (entry.count <= 0) {
      const index = this.entries.indexOf(entry);
      this.entries.splice(index, 1);
      if (this.selectedItemId === itemId) {
        this.selectedItemId = FLASHLIGHT_HOTBAR_ITEM_ID;
      }
    }
  }

  private publishInventoryChanged(): void {
    const hotbarSlots = this.hotbarItems();
    gameEvents.emit({ type: 'hotbar.changed', slots: hotbarSlots });
    gameEvents.emit({ type: 'player.burdenChanged', state: this.burdenState(), value: this.burden() });
    gameEvents.emit({
      type: 'inventory.changed',
      entries: this.inventoryEntries(),
      hotbarSlots,
      burden: this.burden(),
      burdenState: this.burdenState(),
    });
    if (this.selectedItemId) {
      const hotbarSlot = hotbarSlots.find((entry) => entry.itemId === this.selectedItemId)?.assignedHotbarSlot;
      gameEvents.emit({ type: 'inventory.selectedChanged', itemId: this.selectedItemId, hotbarSlot });
    }
  }

  private labelForResult(resultType: SearchResultType): string {
    switch (resultType) {
      case 'ambush':
        return 'Ambush warning';
      case 'empty':
        return 'Nothing useful';
      case 'noiseTrap':
        return 'Noise trap';
      default:
        return resultType;
    }
  }
}
