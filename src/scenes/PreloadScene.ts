import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload(): void {
    this.load.json('buildMilestones', '/assets/data/build_milestones.json');
    this.load.json('controlMap', '/assets/data/control_map.json');
    this.load.json('level01FamilyHouse', '/assets/data/level_01_family_house.json');
    this.load.json('runtimeWorldUnits', '/assets/data/runtime_world_units.json');
  }

  create(): void {
    this.createPlaceholderTextures();
    this.scene.start('MainMenuScene');
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
}
