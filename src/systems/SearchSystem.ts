import type { SearchResultType } from '../core/Types';
import { gameEvents } from '../core/EventBus';
import type { RuntimeRoom } from '../data/levelTypes';
import type { Player } from '../entities/Player';
import { SearchPile, type SearchPileConfig } from '../entities/SearchPile';
import type { FlashlightTarget } from './FlashlightSystem';
import type { PlayerInputState } from './InputSystem';
import type { InventorySystem } from './InventorySystem';

export interface SearchState {
  nearestId?: string;
  activeId?: string;
  progress01: number;
  noise: number;
  lastResult?: string;
}

const SEARCH_RADIUS = 128;

const RESULT_TABLE: Record<string, { resultType: SearchResultType; itemId?: string }> = {
  backpack: { resultType: 'survivalItem', itemId: 'spare_batteries' },
  dresser_drawer: { resultType: 'empty' },
  laundry_pile: { resultType: 'objectiveItem', itemId: 'front_door_key' },
  toy_bin: { resultType: 'junkWeight', itemId: 'junk_stack' },
  under_bed: { resultType: 'ambush' },
};

export class SearchSystem {
  private readonly piles: SearchPile[];
  private readonly unsubscribeEvents: Array<() => void> = [];
  private activePile?: SearchPile;
  private progressSeconds = 0;
  private accumulatedNoise = 0;
  private lastResult?: string;

  constructor(
    private readonly scene: Phaser.Scene,
    room: RuntimeRoom,
    private readonly player: Player,
    private readonly inventory: InventorySystem,
  ) {
    this.piles = this.createPileConfigs(room).map((config) => new SearchPile(scene, config));
    this.unsubscribeEvents.push(gameEvents.on('player.damaged', () => this.cancelSearch()));
  }

  update(input: PlayerInputState, deltaMs: number): SearchState {
    const nearest = this.nearestSearchablePile();
    this.piles.forEach((pile) => pile.setNearby(pile === nearest && !this.activePile));

    if (!input.interact) {
      if (this.activePile) {
        this.cancelSearch();
      }
      return this.currentState(nearest);
    }

    if (!this.activePile && nearest) {
      this.startSearch(nearest);
    }

    if (!this.activePile) {
      return this.currentState(nearest);
    }

    if (this.activePile.distanceTo(this.player.x, this.player.y) > SEARCH_RADIUS + 32) {
      this.cancelSearch();
      return this.currentState(nearest);
    }

    const deltaSeconds = deltaMs / 1000;
    this.progressSeconds += deltaSeconds;
    this.accumulatedNoise += this.activePile.config.noisePerSecond * deltaSeconds;
    const progress01 = this.progressSeconds / this.activePile.config.searchSeconds;
    this.activePile.setProgress(progress01);
    gameEvents.emit({
      type: 'search.progressChanged',
      nodeId: this.activePile.id,
      label: this.activePile.config.label,
      progress01: Math.min(1, progress01),
      noise: this.accumulatedNoise,
      isSearching: true,
    });

    if (progress01 >= 1) {
      this.completeSearch(this.activePile);
    }

    return this.currentState(nearest);
  }

  destroy(): void {
    this.unsubscribeEvents.forEach((unsubscribe) => unsubscribe());
    this.unsubscribeEvents.length = 0;
    this.piles.forEach((pile) => pile.destroy());
  }

  getFlashlightTargets(): FlashlightTarget[] {
    return this.piles
      .filter((pile) => !pile.isSearched())
      .map((pile) => ({
        id: pile.id,
        layer: 'main',
        x: pile.x,
        y: pile.y,
        radius: pile.config.radius,
        object: pile.container,
      }));
  }

  setFocusedTargetIds(targetIds: readonly string[]): void {
    const focused = new Set(targetIds);
    this.piles.forEach((pile) => pile.setFocusedByLight(focused.has(pile.id)));
  }

  private createPileConfigs(room: RuntimeRoom): SearchPileConfig[] {
    const placements = new Map(room.searchPlacements.map((placement) => [placement.nodeId, placement]));
    return room.segments.flatMap((segment) =>
      segment.searchNodes.map((nodeId, index) => {
        const result = placements.get(nodeId) ?? RESULT_TABLE[nodeId] ?? { resultType: 'empty' as const };
        return {
          id: `${segment.id}_${nodeId}`,
          label: nodeId.replaceAll('_', ' '),
          x: segment.x + segment.width * (0.28 + index * 0.18),
          y: 770,
          radius: 76,
          resultType: result.resultType,
          itemId: result.itemId,
          searchSeconds: nodeId === 'under_bed' ? 2.7 : 1.8 + index * 0.25,
          noisePerSecond: result.resultType === 'ambush' ? 18 : result.resultType === 'junkWeight' ? 10 : 7,
        };
      }),
    );
  }

  private nearestSearchablePile(): SearchPile | undefined {
    return this.piles
      .filter((pile) => !pile.isSearched())
      .map((pile) => ({ pile, distance: pile.distanceTo(this.player.x, this.player.y) }))
      .filter(({ distance }) => distance <= SEARCH_RADIUS)
      .sort((a, b) => a.distance - b.distance)[0]?.pile;
  }

  private startSearch(pile: SearchPile): void {
    this.activePile = pile;
    this.progressSeconds = 0;
    this.accumulatedNoise = 0;
    this.lastResult = undefined;
    gameEvents.emit({ type: 'search.started', nodeId: pile.id });
  }

  private cancelSearch(): void {
    const pile = this.activePile;
    if (!pile) {
      return;
    }

    pile.setProgress(0);
    gameEvents.emit({ type: 'search.cancelled', nodeId: pile.id });
    gameEvents.emit({
      type: 'search.progressChanged',
      nodeId: pile.id,
      label: pile.config.label,
      progress01: 0,
      noise: this.accumulatedNoise,
      isSearching: false,
    });
    this.activePile = undefined;
    this.progressSeconds = 0;
  }

  private completeSearch(pile: SearchPile): void {
    const resultLabel = this.inventory.addSearchResult(pile.resultType, pile.itemId);
    pile.markSearched();
    this.lastResult = `${pile.config.label}: ${resultLabel}`;
    gameEvents.emit({ type: 'search.completed', nodeId: pile.id, resultType: pile.resultType });
    gameEvents.emit({
      type: 'search.progressChanged',
      nodeId: pile.id,
      label: this.lastResult,
      progress01: 1,
      noise: this.accumulatedNoise,
      isSearching: false,
    });
    this.activePile = undefined;
    this.progressSeconds = 0;
  }

  private currentState(nearest?: SearchPile): SearchState {
    return {
      nearestId: nearest?.id,
      activeId: this.activePile?.id,
      progress01: this.activePile ? this.progressSeconds / this.activePile.config.searchSeconds : 0,
      noise: this.accumulatedNoise,
      lastResult: this.lastResult,
    };
  }
}
