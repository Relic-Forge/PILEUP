import Phaser from 'phaser';

export interface DoorConfig {
  id: string;
  x: number;
  y: number;
  radius: number;
  unlockSeconds: number;
}

export class Door {
  readonly container: Phaser.GameObjects.Container;
  private readonly panel: Phaser.GameObjects.Rectangle;
  private readonly knob: Phaser.GameObjects.Arc;
  private readonly zone: Phaser.GameObjects.Arc;
  private readonly progressBack: Phaser.GameObjects.Rectangle;
  private readonly progressFill: Phaser.GameObjects.Rectangle;
  private readonly prompt: Phaser.GameObjects.Text;
  private unlocked = false;
  private progress01 = 0;

  constructor(
    scene: Phaser.Scene,
    readonly config: DoorConfig,
  ) {
    this.zone = scene.add.circle(0, 0, config.radius, 0x000000, 0).setStrokeStyle(3, 0x86a9d8, 0.22);
    this.panel = scene.add.rectangle(0, -54, 92, 154, 0x2c2930, 0.96).setStrokeStyle(3, 0x81796f, 0.8);
    this.knob = scene.add.circle(28, -44, 7, 0xe3d36f, 0.86);
    this.progressBack = scene.add.rectangle(0, 48, 118, 12, 0x070608, 0.72).setVisible(false);
    this.progressFill = scene.add.rectangle(-59, 48, 0, 12, 0xe3d36f, 0.95).setOrigin(0, 0.5).setVisible(false);
    this.prompt = scene.add
      .text(0, -160, '', {
        color: '#f4efe0',
        fontSize: '14px',
        align: 'center',
        backgroundColor: 'rgba(7, 6, 8, 0.76)',
        padding: { x: 7, y: 4 },
      })
      .setOrigin(0.5)
      .setVisible(false);

    this.container = scene.add
      .container(config.x, config.y, [this.zone, this.panel, this.knob, this.progressBack, this.progressFill, this.prompt])
      .setDepth(1_320);
  }

  get id(): string {
    return this.config.id;
  }

  get x(): number {
    return this.config.x;
  }

  get y(): number {
    return this.config.y;
  }

  isUnlocked(): boolean {
    return this.unlocked;
  }

  getProgress01(): number {
    return this.progress01;
  }

  distanceTo(x: number, y: number): number {
    return Phaser.Math.Distance.Between(this.config.x, this.config.y, x, y);
  }

  setNearby(isNearby: boolean, hasKey: boolean, isUnlocking: boolean): void {
    if (this.unlocked) {
      this.prompt.setText('Door unlocked').setVisible(isNearby);
      this.zone.setStrokeStyle(3, 0x8ba778, 0.7);
      return;
    }

    const alpha = isNearby ? 0.9 : 0.22;
    this.zone.setStrokeStyle(3, hasKey ? 0xe3d36f : 0x86a9d8, alpha);
    if (!isNearby) {
      this.prompt.setVisible(false);
      return;
    }

    const prompt = hasKey ? (isUnlocking ? 'Unlocking front door' : 'Hold E to unlock front door') : 'Front door needs a key';
    this.prompt.setText(prompt).setVisible(true);
  }

  setProgress(progress01: number): void {
    this.progress01 = Phaser.Math.Clamp(progress01, 0, 1);
    const active = this.progress01 > 0 && !this.unlocked;
    this.progressBack.setVisible(active);
    this.progressFill.setVisible(active).setSize(118 * this.progress01, 12);
  }

  markUnlocked(): void {
    this.unlocked = true;
    this.progress01 = 1;
    this.panel.setFillStyle(0x4b5a45, 0.96);
    this.panel.setStrokeStyle(3, 0x8ba778, 0.95);
    this.zone.setStrokeStyle(3, 0x8ba778, 0.8);
    this.progressBack.setVisible(false);
    this.progressFill.setVisible(false);
    this.prompt.setText('Escaping').setVisible(true);
  }

  interrupt(): void {
    if (this.unlocked) {
      return;
    }

    this.setProgress(0);
    this.prompt.setText('Interrupted').setVisible(true);
  }

  destroy(): void {
    this.container.destroy(true);
  }
}
