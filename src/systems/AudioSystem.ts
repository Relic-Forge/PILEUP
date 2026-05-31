import { gameEvents } from '../core/EventBus';

type WebAudioManager = Phaser.Sound.WebAudioSoundManager & { context: AudioContext };

export class AudioSystem {
  private readonly unsubscribeEvents: Array<() => void> = [];
  private readonly context?: AudioContext;
  private lastDoorTickAt = 0;
  private lastEnemyHitToneAt = 0;

  constructor(private readonly scene: Phaser.Scene) {
    this.context = this.getAudioContext();

    this.scene.input.keyboard?.once('keydown', () => void this.context?.resume());
    this.scene.input.once('pointerdown', () => void this.context?.resume());

    this.unsubscribeEvents.push(gameEvents.on('item.collected', () => this.playTone(740, 0.08, 0.04)));
    this.unsubscribeEvents.push(gameEvents.on('search.completed', () => this.playTone(420, 0.1, 0.035)));
    this.unsubscribeEvents.push(gameEvents.on('enemy.attackTelegraph', () => this.playTone(92, 0.22, 0.08)));
    this.unsubscribeEvents.push(gameEvents.on('player.damaged', () => this.playTone(160, 0.18, 0.09)));
    this.unsubscribeEvents.push(gameEvents.on('door.unlockStarted', () => this.playTone(280, 0.12, 0.045)));
    this.unsubscribeEvents.push(gameEvents.on('door.unlockProgress', (event) => {
      if (event.progress01 <= 0 || event.progress01 >= 1 || this.scene.time.now - this.lastDoorTickAt < 360) {
        return;
      }

      this.lastDoorTickAt = this.scene.time.now;
      this.playTone(220 + event.progress01 * 240, 0.055, 0.03);
    }));
    this.unsubscribeEvents.push(gameEvents.on('door.unlocked', () => this.playTone(880, 0.22, 0.06)));
    this.unsubscribeEvents.push(gameEvents.on('flashlight.depthSwitch', (event) => {
      const frequency = event.layer === 'background' ? 380 : event.layer === 'foreground' ? 520 : 450;
      this.playTone(frequency, 0.045, 0.018);
    }));
    this.unsubscribeEvents.push(gameEvents.on('flashlight.focusStarted', () => this.playTone(690, 0.13, 0.022)));
    this.unsubscribeEvents.push(gameEvents.on('flashlight.focusEnded', () => this.playTone(360, 0.075, 0.018)));
    this.unsubscribeEvents.push(gameEvents.on('flashlight.flickerBurst', (event) => {
      this.playTone(170 + event.battery * 4, 0.035, 0.014);
    }));
    this.unsubscribeEvents.push(gameEvents.on('flashlight.batteryCritical', () => this.playTone(118, 0.28, 0.026)));
    this.unsubscribeEvents.push(gameEvents.on('flashlight.hitEnemyStarted', () => {
      if (this.scene.time.now - this.lastEnemyHitToneAt < 420) {
        return;
      }

      this.lastEnemyHitToneAt = this.scene.time.now;
      this.playTone(240, 0.11, 0.02);
    }));
  }

  destroy(): void {
    this.unsubscribeEvents.forEach((unsubscribe) => unsubscribe());
    this.unsubscribeEvents.length = 0;
  }

  private getAudioContext(): AudioContext | undefined {
    const manager = this.scene.sound;
    if (!('context' in manager)) {
      return undefined;
    }

    return (manager as WebAudioManager).context;
  }

  private playTone(frequency: number, durationSeconds: number, gainValue: number): void {
    if (!this.context || this.context.state === 'closed') {
      return;
    }

    const startAt = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.frequency.value = frequency;
    oscillator.type = frequency < 180 ? 'sawtooth' : 'triangle';
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(gainValue, startAt + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + durationSeconds);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + durationSeconds + 0.02);
  }
}
