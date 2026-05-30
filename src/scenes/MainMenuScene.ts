import Phaser from 'phaser';
import { DebugOverlay } from '../dev/DebugOverlay';
import { debugCommands } from '../dev/DebugCommands';
import { ResponsiveScaleSystem } from '../systems/ResponsiveScaleSystem';

export class MainMenuScene extends Phaser.Scene {
  private debugOverlay?: DebugOverlay;
  private responsive?: ResponsiveScaleSystem;
  private menuObjects: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('MainMenuScene');
  }

  create(): void {
    this.responsive = new ResponsiveScaleSystem(this);
    this.cameras.main.setBackgroundColor('#0b090d');
    this.responsive.onResize(() => this.renderMenu());

    this.input.keyboard?.once('keydown-ENTER', () => this.startLevel());
    if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('scene') === 'level') {
      this.time.delayedCall(0, () => this.startLevel());
    }

    this.debugOverlay = new DebugOverlay(this);
    this.input.keyboard?.on(`keydown-${debugCommands.overlayToggleKey}`, () => {
      this.debugOverlay?.toggle();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.responsive?.destroy();
    });
  }

  update(): void {
    this.debugOverlay?.update();
  }

  private startLevel(): void {
    this.scene.start('LevelScene');
  }

  private renderMenu(): void {
    this.menuObjects.forEach((object) => object.destroy());
    this.menuObjects = [];

    const layout = this.responsive?.getLayout();
    if (!layout || !this.cameras.main) {
      return;
    }

    const { viewportWidth: width, viewportHeight: height, safeArea, uiScale } = layout;
    this.cameras.main.setViewport(0, 0, width, height);

    const title = this.add
      .text(width / 2, height * 0.28, 'PILEUP', {
        color: '#f4efe0',
        fontFamily: 'Georgia, serif',
        fontSize: `${Math.round(88 * uiScale)}px`,
      })
      .setOrigin(0.5);

    const subtitle = this.add
      .text(width / 2, height * 0.42, "I'll deal with it tomorrow.", {
        color: '#b9b0a3',
        fontSize: `${Math.round(24 * uiScale)}px`,
      })
      .setOrigin(0.5);

    const startText = this.add
      .text(width / 2, height * 0.62, 'Start Phase 4 Flashlight Check', {
        color: '#11100f',
        backgroundColor: '#e3d36f',
        fontSize: `${Math.round(22 * uiScale)}px`,
        padding: { x: Math.round(22 * uiScale), y: Math.round(14 * uiScale) },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const hint = this.add
      .text(
        width / 2,
        Math.min(height * 0.74, safeArea.bottom),
        'Press Enter or click start. Press F3 for debug overlay.',
        {
          color: '#81796f',
          fontSize: `${Math.round(16 * uiScale)}px`,
        },
      )
      .setOrigin(0.5);

    startText.on('pointerup', () => this.startLevel());
    this.menuObjects = [title, subtitle, startText, hint];
    this.responsive?.ensurePortraitPrompt();
  }
}
