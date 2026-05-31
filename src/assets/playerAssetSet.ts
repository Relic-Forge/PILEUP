export type PlayerRuntimeTier = 'mobile' | 'standard' | 'high_4k';

export interface PlayerAssetAnimation {
  id: string;
  frames: number;
  fps: number;
  loop: boolean;
  sheets: Record<PlayerRuntimeTier, string>;
  frameLayout: Record<PlayerRuntimeTier, { frameSize: [number, number]; columns: number; rows: number }>;
}

export interface PlayerAssetSet {
  schema: 'pileup_character_asset_set_v1';
  assetId: 'character.player_child';
  artVersion: string;
  lifecycleState: string;
  anchor: { x: number; y: number };
  animations: PlayerAssetAnimation[];
}

export const PLAYER_ASSET_SET_KEY = 'playerChildAssetSet';
export const PLAYER_ASSET_SET_URL = '/assets/characters/player_child/v0_2/player_child_v0_2.asset.json';
export const PLAYER_ANIMATION_PREFIX = 'player_child';

export function selectPlayerRuntimeTier(width: number, devicePixelRatio: number, override?: string | null): PlayerRuntimeTier {
  if (override === 'mobile' || override === 'standard' || override === 'high_4k') {
    return override;
  }

  if (width >= 2_560 || devicePixelRatio >= 2) {
    return 'high_4k';
  }

  if (width <= 1_360) {
    return 'mobile';
  }

  return 'standard';
}

export function publicAssetPath(path: string): string {
  return path.replace(/^public\//, '/');
}

export function playerAnimationKey(animationId: string): string {
  return `${PLAYER_ANIMATION_PREFIX}_${animationId}`;
}

export function playerTextureKey(animationId: string): string {
  return `${PLAYER_ANIMATION_PREFIX}_${animationId}_sheet`;
}
