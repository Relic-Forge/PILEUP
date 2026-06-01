import Phaser from 'phaser';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  create(): void {
    const { width, height } = this.scale.gameSize;
    this.add
      .text(width / 2, height / 2 - 86, 'GAME OVER', {
        color: '#f4efe0',
        fontFamily: 'Georgia, serif',
        fontSize: '76px',
        fontStyle: '700',
      })
      .setOrigin(0.5);

    const escapeOption = this.add
      .text(width / 2 - 118, height / 2 + 48, 'ESCAPE', {
        color: '#b9b0a3',
        fontFamily: 'Georgia, serif',
        fontSize: '34px',
        fontStyle: '700',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    const retry = this.add
      .text(width / 2 + 118, height / 2 + 48, 'ENTER', {
        color: '#b9b0a3',
        fontFamily: 'Georgia, serif',
        fontSize: '34px',
        fontStyle: '700',
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
    const mainMenu = () => {
      if (restarted) {
        return;
      }

      restarted = true;
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.delete('scene');
      window.location.assign(nextUrl.toString());
    };
    const handleDocumentKey = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        restart();
      } else if (event.key === 'Escape') {
        mainMenu();
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
      if (event.key === 'Enter') {
        restart();
      } else if (event.key === 'Escape') {
        mainMenu();
      }
    });
    this.input.once(Phaser.Input.Events.POINTER_DOWN, restart);
    escapeOption.on('pointerup', mainMenu);
    retry.on('pointerup', restart);
  }
}
