import { gameEvents } from '../core/EventBus';
import type { SearchResultType } from '../core/Types';

export interface InventoryItem {
  id: string;
  label: string;
  burden: number;
  hotbar: boolean;
}

const ITEM_DEFINITIONS: Record<string, InventoryItem> = {
  front_door_key: { id: 'front_door_key', label: 'Front Door Key', burden: 0, hotbar: false },
  spare_batteries: { id: 'spare_batteries', label: 'Spare Batteries', burden: 1, hotbar: true },
  cleaning_spray: { id: 'cleaning_spray', label: 'Cleaning Spray', burden: 1, hotbar: true },
  toy_decoy: { id: 'toy_decoy', label: 'Toy Decoy', burden: 1, hotbar: true },
  junk_stack: { id: 'junk_stack', label: 'Junk Stack', burden: 2, hotbar: false },
};

export class InventorySystem {
  private readonly items: InventoryItem[] = [];
  private hasKey = false;

  addSearchResult(resultType: SearchResultType, itemId?: string): string {
    if (!itemId) {
      return this.labelForResult(resultType);
    }

    const item = ITEM_DEFINITIONS[itemId];
    if (!item) {
      return this.labelForResult(resultType);
    }

    this.items.push(item);
    this.hasKey ||= item.id === 'front_door_key';
    gameEvents.emit({ type: 'item.collected', itemId: item.id });
    gameEvents.emit({ type: 'hotbar.changed', slots: this.hotbarItems() });
    gameEvents.emit({ type: 'player.burdenChanged', state: this.burdenState(), value: this.burden() });

    if (item.id === 'front_door_key') {
      gameEvents.emit({ type: 'objective.changed', text: 'Key found. Survive the hoard and reach the front door.' });
    }

    return item.label;
  }

  hotbarItems(): InventoryItem[] {
    return this.items.filter((item) => item.hotbar).slice(0, 5);
  }

  burden(): number {
    return this.items.reduce((total, item) => total + item.burden, 0);
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
