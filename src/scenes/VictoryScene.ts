import Phaser from 'phaser';

export class VictoryScene extends Phaser.Scene {
  constructor() {
    super('VictoryScene');
  }

  create(): void {
    const { width, height } = this.scale.gameSize;
    this.add
      .text(width / 2, height / 2 - 32, 'Escaped', {
        color: '#f4efe0',
        fontSize: '48px',
      })
      .setOrigin(0.5);
    const retryBack = this.add
      .rectangle(width / 2, height / 2 + 48, 390, 54, 0x1a1715, 0.88)
      .setStrokeStyle(2, 0x81796f, 0.9)
      .setInteractive({ useHandCursor: true });
    const retry = this.add
      .text(width / 2, height / 2 + 46, 'Press Enter to run it again', {
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
      if (event.key === 'Enter') {
        restart();
      }
    };
    const handleDocumentPointer = () => restart();
    document.addEventListener('keydown', handleDocumentKey);
    document.addEventListener('pointerdown', handleDocumentPointer);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      document.removeEventListener('keydown', handleDocumentKey);
      document.removeEventListener('pointerdown', handleDocumentPointer);
      retryButton.remove();
    });
    const retryButton = this.createRetryButton('Press Enter to run it again', restart);
    this.input.keyboard?.once('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        restart();
      }
    });
    this.input.once(Phaser.Input.Events.POINTER_DOWN, restart);
    retryBack.on('pointerdown', restart);
    retry.on('pointerup', restart);
  }

  private createRetryButton(label: string, onRetry: () => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.style.cssText = [
      'position:fixed',
      'left:50%',
      'top:58%',
      'transform:translate(-50%, -50%)',
      'z-index:20',
      'min-width:390px',
      'height:54px',
      'border:2px solid rgba(129,121,111,0.9)',
      'background:rgba(26,23,21,0.88)',
      'color:#b9b0a3',
      'font:22px monospace',
      'cursor:pointer',
    ].join(';');
    button.addEventListener('click', onRetry);
    document.body.append(button);
    return button;
  }
}
