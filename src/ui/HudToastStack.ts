import Phaser from 'phaser';
import { uiDepths, uiTheme } from './uiTheme';

interface Toast {
  id: number;
  tone: 'item' | 'warning' | 'objective' | 'damage';
  text: string;
  createdAt: number;
}

export class HudToastStack {
  private readonly toasts: Toast[] = [];
  private objects: Phaser.GameObjects.GameObject[] = [];
  private nextId = 1;

  constructor(private readonly scene: Phaser.Scene) {}

  push(tone: Toast['tone'], text: string): void {
    this.toasts.unshift({ id: this.nextId, tone, text, createdAt: this.scene.time.now });
    this.toasts.splice(3);
  }

  render(layout: { safeArea: { right: number; top: number; width: number }; uiScale: number; isPhone: boolean }): Phaser.GameObjects.GameObject[] {
    this.objects.forEach((object) => object.destroy());
    this.objects = [];

    const scale = layout.uiScale;
    const now = this.scene.time.now;
    this.toasts
      .filter((toast) => now - toast.createdAt < 3200)
      .forEach((toast, index) => {
        const age = now - toast.createdAt;
        const alpha = age > 2500 ? Phaser.Math.Clamp(1 - (age - 2500) / 700, 0, 1) : 1;
        const width = Math.min(360 * scale, layout.safeArea.width * 0.42);
        const height = 38 * scale;
        const x = layout.safeArea.right - width;
        const y = layout.safeArea.top + (layout.isPhone ? 54 : 68) * scale + index * (height + 8 * scale);
        const fill = toast.tone === 'warning' || toast.tone === 'damage' ? 0x2a1718 : 0x171b22;
        const stroke = toast.tone === 'warning' || toast.tone === 'damage' ? 0xd86a57 : 0x8a7658;
        const scrap = this.scene.add
          .rectangle(x, y, width, height, fill, 0.88 * alpha)
          .setOrigin(0, 0)
          .setStrokeStyle(1, stroke, 0.72 * alpha)
          .setScrollFactor(0)
          .setDepth(uiDepths.toast);
        const label = this.scene.add
          .text(x + 12 * scale, y + 8 * scale, toast.text, {
            color: toast.tone === 'warning' || toast.tone === 'damage' ? uiTheme.sickWarning : uiTheme.inkOffWhite,
            fontFamily: 'Georgia, serif',
            fontSize: `${Math.max(13, Math.round(14 * scale))}px`,
            wordWrap: { width: width - 24 * scale },
          })
          .setAlpha(alpha)
          .setScrollFactor(0)
          .setDepth(uiDepths.toast + 1);
        this.objects.push(scrap, label);
      });

    return this.objects;
  }

  destroy(): void {
    this.objects.forEach((object) => object.destroy());
    this.objects = [];
    this.toasts.length = 0;
  }
}
