import Phaser from 'phaser';
import type { DepthLayer } from '../core/Types';

export interface PlayerInputState {
  x: number;
  y: number;
  sprint: boolean;
  crouch: boolean;
  interact: boolean;
  aim: Phaser.Math.Vector2;
  focus: boolean;
  lockOnPressed: boolean;
  depthCycle: -1 | 0 | 1;
  depthDirect?: DepthLayer;
  debugFlicker: boolean;
}

export class InputSystem {
  private readonly cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly keys?: Record<
    'w' | 'a' | 's' | 'd' | 'shift' | 'c' | 'space' | 'q' | 'e' | 'one' | 'two' | 'three' | 'f' | 'l' | 'r',
    Phaser.Input.Keyboard.Key
  >;
  private tapX = 0;
  private tapY = 0;
  private tapUntil = 0;
  private sprintTapUntil = 0;
  private crouchTapUntil = 0;
  private focusTapUntil = 0;
  private interactTapUntil = 0;
  private depthCycle: -1 | 0 | 1 = 0;
  private depthDirect?: DepthLayer;
  private debugFlickerUntil = 0;
  private lockOnPressed = false;

  constructor(private readonly scene: Phaser.Scene) {
    scene.input.mouse?.disableContextMenu();
    this.cursors = scene.input.keyboard?.createCursorKeys();
    this.keys = scene.input.keyboard
      ? {
          w: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
          a: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
          s: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
          d: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
          shift: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
          c: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C),
          space: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
          q: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
          e: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
          one: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE),
          two: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO),
          three: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE),
          f: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F),
          l: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L),
          r: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R),
        }
      : undefined;

    scene.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      this.captureTap(event);
    });
    scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const eventButton = 'button' in pointer.event ? pointer.event.button : undefined;
      if (pointer.rightButtonDown() || pointer.middleButtonDown() || eventButton === 2) {
        this.lockOnPressed = true;
      }
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

    const state = {
      x: heldX !== 0 ? heldX : now < this.tapUntil ? this.tapX : 0,
      y: heldY !== 0 ? heldY : now < this.tapUntil ? this.tapY : 0,
      sprint: Boolean(this.cursors?.shift.isDown || this.keys?.shift.isDown || now < this.sprintTapUntil),
      crouch: Boolean(this.keys?.c.isDown || now < this.crouchTapUntil),
      interact: Boolean(this.keys?.e.isDown || now < this.interactTapUntil),
      aim: new Phaser.Math.Vector2(),
      focus: Boolean(this.keys?.space.isDown || this.scene.input.activePointer.leftButtonDown() || now < this.focusTapUntil),
      lockOnPressed: this.lockOnPressed,
      depthCycle: this.depthCycle,
      depthDirect: this.depthDirect,
      debugFlicker: now < this.debugFlickerUntil,
    };
    this.depthCycle = 0;
    this.depthDirect = undefined;
    this.lockOnPressed = false;
    return state;
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
    } else if (key === ' ') {
      this.focusTapUntil = until;
    } else if (key === 'e') {
      this.interactTapUntil = until;
    } else if (key === 'q') {
      this.depthCycle = -1;
    } else if (key === '1') {
      this.depthDirect = 'background';
    } else if (key === '2') {
      this.depthDirect = 'main';
    } else if (key === '3') {
      this.depthDirect = 'foreground';
    } else if (key === 'r') {
      this.depthDirect = 'main';
    } else if (key === 'f') {
      this.debugFlickerUntil = performance.now() + 2200;
    } else if (key === 'l') {
      this.lockOnPressed = true;
    }

    if (event.shiftKey) {
      this.sprintTapUntil = until;
    }
  }

}
