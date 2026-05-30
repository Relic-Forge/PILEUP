import Phaser from 'phaser';
import { REFERENCE_ASPECT } from '../systems/ResponsiveScaleSystem';

export class DebugOverlay {
  private readonly text: Phaser.GameObjects.Text;
  private visible = false;

  constructor(private readonly scene: Phaser.Scene) {
    this.text = scene.add
      .text(16, 16, '', {
        color: '#c9f7d0',
        fontFamily: 'monospace',
        fontSize: '14px',
        lineSpacing: 4,
        backgroundColor: 'rgba(4, 8, 6, 0.72)',
        padding: { x: 10, y: 8 },
      })
      .setDepth(10_000)
      .setScrollFactor(0)
      .setVisible(false);
  }

  toggle(): void {
    this.setVisible(!this.visible);
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.text.setVisible(visible);
  }

  update(): void {
    if (!this.visible) {
      return;
    }

    const gameSize = this.scene.scale.gameSize;
    const displaySize = this.scene.scale.displaySize;
    const aspect = gameSize.width / gameSize.height;
    this.text.setText([
      'PILEUP DEBUG',
      `scene: ${this.scene.scene.key}`,
      `fps: ${Math.round(this.scene.game.loop.actualFps)}`,
      `viewport: ${gameSize.width}x${gameSize.height}`,
      `display: ${Math.round(displaySize.width)}x${Math.round(displaySize.height)}`,
      `aspect: ${aspect.toFixed(2)}${aspect >= 2.1 ? ' ultrawide' : ''}`,
      `reference: ${REFERENCE_ASPECT.toFixed(2)}`,
      'toggle: F3',
    ]);
  }
}
