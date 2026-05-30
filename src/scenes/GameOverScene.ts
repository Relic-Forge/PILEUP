import Phaser from 'phaser';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  create(): void {
    const { width, height } = this.scale.gameSize;
    this.add
      .text(width / 2, height / 2, 'Game Over', {
        color: '#f4efe0',
        fontSize: '48px',
      })
      .setOrigin(0.5);
  }
}
