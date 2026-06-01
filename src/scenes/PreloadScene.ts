import Phaser from 'phaser';
import { WINDOW_OUTSIDE_WORLD_TEXTURE_KEY, WINDOW_OUTSIDE_WORLD_URL } from '../assets/roomAssets';
import { dataAssetPath } from '../data/loaders';
import {
  PLAYER_ASSET_SET_KEY,
  PLAYER_ASSET_SET_URL,
  playerAnimationKey,
  playerTextureKey,
  publicAssetPath,
  selectPlayerRuntimeTier,
  type PlayerAssetSet,
  type PlayerRuntimeTier,
} from '../assets/playerAssetSet';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload(): void {
    this.load.json('buildMilestones', dataAssetPath('build_milestones.json'));
    this.load.json('controlMap', dataAssetPath('control_map.json'));
    this.load.json('level01FamilyHouse', dataAssetPath('level_01_family_house.json'));
    this.load.json('runtimeWorldUnits', dataAssetPath('runtime_world_units.json'));
    this.load.json(PLAYER_ASSET_SET_KEY, PLAYER_ASSET_SET_URL);
    this.load.image(WINDOW_OUTSIDE_WORLD_TEXTURE_KEY, WINDOW_OUTSIDE_WORLD_URL);
  }

  create(): void {
    this.createPlaceholderTextures();
    this.loadPlayerCharacterAssets(() => {
      this.scene.start('MainMenuScene');
    });
  }

  private createPlaceholderTextures(): void {
    this.add
      .graphics()
      .fillStyle(0xd8d6c7)
      .fillRoundedRect(0, 0, 56, 88, 10)
      .generateTexture('player-placeholder', 56, 88)
      .destroy();

    this.add
      .graphics()
      .fillStyle(0x51495a)
      .fillRoundedRect(0, 0, 120, 70, 12)
      .fillStyle(0xb3e15d)
      .fillCircle(84, 24, 6)
      .fillCircle(100, 24, 6)
      .generateTexture('laundry-placeholder', 120, 70)
      .destroy();
  }

  private loadPlayerCharacterAssets(onComplete: () => void): void {
    const assetSet = this.cache.json.get(PLAYER_ASSET_SET_KEY) as PlayerAssetSet | undefined;

    if (!assetSet?.animations?.length) {
      onComplete();
      return;
    }

    const searchParams = new URLSearchParams(window.location.search);
    const tier = selectPlayerRuntimeTier(this.scale.width, window.devicePixelRatio, searchParams.get('playerTier'));
    for (const animation of assetSet.animations) {
      const layout = animation.frameLayout[tier];
      const sheet = animation.sheets[tier];

      if (!layout || !sheet) {
        continue;
      }

      this.load.spritesheet(playerTextureKey(animation.id), publicAssetPath(sheet), {
        frameWidth: layout.frameSize[0],
        frameHeight: layout.frameSize[1],
      });
    }

    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      this.registerPlayerAnimations(assetSet, tier);
      if (import.meta.env.DEV) {
        document.body.dataset.pileupPlayerAssetTier = tier;
        document.body.dataset.pileupPlayerAssetVersion = assetSet.artVersion;
      }
      onComplete();
    });
    this.load.start();
  }

  private registerPlayerAnimations(assetSet: PlayerAssetSet, tier: PlayerRuntimeTier): void {
    for (const animation of assetSet.animations) {
      const textureKey = playerTextureKey(animation.id);

      if (!this.textures.exists(textureKey) || this.anims.exists(playerAnimationKey(animation.id))) {
        continue;
      }

      this.anims.create({
        key: playerAnimationKey(animation.id),
        frames: this.anims.generateFrameNumbers(textureKey, { start: 0, end: animation.frames - 1 }),
        frameRate: animation.fps,
        repeat: animation.loop ? -1 : 0,
      });
    }

    if (import.meta.env.DEV) {
      document.body.dataset.pileupPlayerAnimationCount = String(
        assetSet.animations.filter((animation) => this.anims.exists(playerAnimationKey(animation.id))).length,
      );
      document.body.dataset.pileupPlayerAssetTier = tier;
    }
  }
}
