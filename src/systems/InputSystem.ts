import Phaser from 'phaser';

export interface PlayerInputState {
  x: number;
  y: number;
  sprint: boolean;
  crouch: boolean;
}

export class InputSystem {
  private readonly cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly keys?: Record<'w' | 'a' | 's' | 'd' | 'shift' | 'c', Phaser.Input.Keyboard.Key>;
  private tapX = 0;
  private tapY = 0;
  private tapUntil = 0;
  private sprintTapUntil = 0;
  private crouchTapUntil = 0;

  constructor(scene: Phaser.Scene) {
    this.cursors = scene.input.keyboard?.createCursorKeys();
    this.keys = scene.input.keyboard
      ? {
          w: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
          a: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
          s: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
          d: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
          shift: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
          c: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C),
        }
      : undefined;

    scene.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      this.captureTap(event);
    });
  }

  read(): PlayerInputState {
    const now = performance.now();
    const left = Boolean(this.cursors?.left.isDown || this.keys?.a.isDown);
    const right = Boolean(this.cursors?.right.isDown || this.keys?.d.isDown);
    const up = Boolean(this.cursors?.up.isDown || this.keys?.w.isDown);
    const down = Boolean(this.cursors?.down.isDown || this.keys?.s.isDown);
    const heldX = (right ? 1 : 0) - (left ? 1 : 0);
    const heldY = (down ? 1 : 0) - (up ? 1 : 0);

    return {
      x: heldX !== 0 ? heldX : now < this.tapUntil ? this.tapX : 0,
      y: heldY !== 0 ? heldY : now < this.tapUntil ? this.tapY : 0,
      sprint: Boolean(this.cursors?.shift.isDown || this.keys?.shift.isDown || now < this.sprintTapUntil),
      crouch: Boolean(this.keys?.c.isDown || now < this.crouchTapUntil),
    };
  }

  private captureTap(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();
    const until = performance.now() + 110;

    if (key === 'arrowleft' || key === 'a') {
      this.tapX = -1;
      this.tapY = 0;
      this.tapUntil = until;
    } else if (key === 'arrowright' || key === 'd') {
      this.tapX = 1;
      this.tapY = 0;
      this.tapUntil = until;
    } else if (key === 'arrowup' || key === 'w') {
      this.tapX = 0;
      this.tapY = -1;
      this.tapUntil = until;
    } else if (key === 'arrowdown' || key === 's') {
      this.tapX = 0;
      this.tapY = 1;
      this.tapUntil = until;
    } else if (key === 'shift') {
      this.sprintTapUntil = until;
    } else if (key === 'c') {
      this.crouchTapUntil = until;
    }

    if (event.shiftKey) {
      this.sprintTapUntil = until;
    }
  }
}
