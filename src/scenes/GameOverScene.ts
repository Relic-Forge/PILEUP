import Phaser from 'phaser';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  create(): void {
    const { width, height } = this.scale.gameSize;
    this.add
      .text(width / 2, height / 2 - 32, 'Game Over', {
        color: '#f4efe0',
        fontSize: '48px',
      })
      .setOrigin(0.5);
    const retryBack = this.add
      .rectangle(width / 2, height / 2 + 48, 390, 54, 0x1a1715, 0.88)
      .setStrokeStyle(2, 0x81796f, 0.9)
      .setInteractive({ useHandCursor: true });
    const retry = this.add
      .text(width / 2, height / 2 + 46, 'Press Enter or R to retry the room', {
        color: '#b9b0a3',
        fontSize: '22px',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    let restarted = false;
    const restart = () => {
      if (restarted) {
        return;
      }

      restarted = true;
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set('scene', 'level');
      if (window.location.href === nextUrl.toString()) {
        window.location.reload();
        return;
      }

      window.location.assign(nextUrl.toString());
    };
    const handleDocumentKey = (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key.toLowerCase() === 'r') {
        restart();
      }
    };
    const handleDocumentPointer = () => restart();
    document.addEventListener('keydown', handleDocumentKey);
    document.addEventListener('pointerdown', handleDocumentPointer);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      document.removeEventListener('keydown', handleDocumentKey);
      document.removeEventListener('pointerdown', handleDocumentPointer);
    });
    this.input.keyboard?.once('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key.toLowerCase() === 'r') {
        restart();
      }
    });
    this.input.once(Phaser.Input.Events.POINTER_DOWN, restart);
    retryBack.on('pointerdown', restart);
    retry.on('pointerup', restart);
  }
}
