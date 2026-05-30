import Phaser from 'phaser';

export class VictoryScene extends Phaser.Scene {
  constructor() {
    super('VictoryScene');
  }

  create(): void {
    const { width, height } = this.scale.gameSize;
    this.add
      .text(width / 2, height / 2, 'Escaped', {
        color: '#f4efe0',
        fontSize: '48px',
      })
      .setOrigin(0.5);
  }
}
