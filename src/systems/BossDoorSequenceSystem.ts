import Phaser from 'phaser';
import { gameEvents } from '../core/EventBus';
import type { RuntimeRoom } from '../data/levelTypes';
import type { Player } from '../entities/Player';
import type { FlashlightState } from './FlashlightSystem';
import type { PlayerInputState } from './InputSystem';
import type { DoorSystemState } from './DoorSystem';

type BossDoorPhase = 'inactive' | 'hunting' | 'telegraph' | 'attacking' | 'stunned' | 'escaped';
type BossAttackPattern = 'hallway_surge' | 'door_grab';

export interface BossDoorSequenceState {
  active: boolean;
  phase: BossDoorPhase;
  pressure01: number;
  telegraph01: number;
  defensiveReady: boolean;
  lastPattern?: BossAttackPattern;
}

const DOOR_Y = 742;
const DEFENSE_ZONE_WIDTH = 210;
const DEFENSE_ZONE_HEIGHT = 96;
const TELEGRAPH_SECONDS = 1.15;
const STUN_SECONDS = 1.45;
const BASE_HUNT_SECONDS = 3.2;
const BOSS_DAMAGE = 26;

export class BossDoorSequenceSystem {
  private readonly unsubscribeEvents: Array<() => void> = [];
  private readonly root: Phaser.GameObjects.Container;
  private readonly bossBody: Phaser.GameObjects.Ellipse;
  private readonly warningCone: Phaser.GameObjects.Rectangle;
  private readonly defenseZone: Phaser.GameObjects.Rectangle;
  private readonly defenseLabel: Phaser.GameObjects.Text;
  private readonly label: Phaser.GameObjects.Text;
  private phase: BossDoorPhase = 'inactive';
  private elapsedSeconds = 0;
  private pressure01 = 0;
  private lastPattern?: BossAttackPattern;
  private attackResolved = false;

  private readonly doorX: number;
  private readonly defenseX: number;

  constructor(
    private readonly scene: Phaser.Scene,
    room: RuntimeRoom,
    private readonly player: Player,
    keyAlreadyFound = false,
  ) {
    this.doorX = room.floorBounds.maxX - 72;
    this.defenseX = this.doorX - 245;

    this.defenseZone = scene.add
      .rectangle(this.defenseX, DOOR_Y + 22, DEFENSE_ZONE_WIDTH, DEFENSE_ZONE_HEIGHT, 0x536f76, 0.18)
      .setStrokeStyle(3, 0x9bd4dd, 0.52)
      .setDepth(1_185)
      .setVisible(false);
    this.defenseLabel = scene.add
      .text(this.defenseX, DOOR_Y - 42, 'PORCH LIGHT SPILL', {
        color: '#9bd4dd',
        fontSize: '14px',
        fontFamily: 'monospace',
        backgroundColor: 'rgba(7, 6, 8, 0.68)',
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5)
      .setDepth(1_186)
      .setVisible(false);
    this.warningCone = scene.add
      .rectangle(this.doorX - 120, DOOR_Y + 24, 360, 118, 0xb65245, 0.24)
      .setStrokeStyle(3, 0xe3d36f, 0.76)
      .setDepth(1_190)
      .setVisible(false);
    this.bossBody = scene.add.ellipse(0, 0, 190, 132, 0x3b2530, 0.92).setStrokeStyle(4, 0xd86d55, 0.86);
    const bossEyeLeft = scene.add.circle(-34, -18, 9, 0xf4e7a8, 0.9);
    const bossEyeRight = scene.add.circle(30, -20, 9, 0xf4e7a8, 0.9);
    const bossMaw = scene.add.rectangle(0, 26, 96, 18, 0x080508, 0.9);
    this.label = scene.add
      .text(0, -92, 'Door Hoard', {
        color: '#f4efe0',
        fontFamily: 'monospace',
        fontSize: '14px',
        backgroundColor: 'rgba(7, 6, 8, 0.72)',
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5)
      .setVisible(import.meta.env.DEV);
    this.root = scene.add
      .container(this.doorX + 230, DOOR_Y - 18, [this.bossBody, bossEyeLeft, bossEyeRight, bossMaw, this.label])
      .setDepth(1_210)
      .setAlpha(0)
      .setVisible(false);

    this.unsubscribeEvents.push(gameEvents.on('item.collected', (event) => {
      if (event.itemId === 'front_door_key') {
        this.activate();
      }
    }));

    if (keyAlreadyFound) {
      this.activate();
    }
  }

  update(
    input: PlayerInputState,
    flashlight: FlashlightState | undefined,
    door: DoorSystemState | undefined,
    deltaMs: number,
  ): BossDoorSequenceState {
    if (this.phase === 'inactive' || this.phase === 'escaped') {
      return this.currentState(false);
    }

    const deltaSeconds = deltaMs / 1000;
    this.elapsedSeconds += deltaSeconds;
    const nearDoor = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.doorX, DOOR_Y) < 640;
    const unlockPressure = door?.unlocking ? 0.2 : 0;
    this.pressure01 = Phaser.Math.Clamp(this.pressure01 + deltaSeconds * (nearDoor ? 0.045 : 0.018) + unlockPressure * deltaSeconds, 0, 1);

    if (this.phase === 'hunting') {
      const huntSeconds = BASE_HUNT_SECONDS - this.pressure01 * 1.25 - (door?.unlocking ? 0.75 : 0);
      if (this.elapsedSeconds >= Math.max(1.35, huntSeconds)) {
        this.startTelegraph();
      }
    } else if (this.phase === 'telegraph') {
      if (this.hasDefensiveFocus(input, flashlight)) {
        this.stunBoss();
      } else if (this.elapsedSeconds >= TELEGRAPH_SECONDS) {
        this.startAttack();
      }
    } else if (this.phase === 'attacking' && !this.attackResolved && this.elapsedSeconds >= 0.18) {
      this.resolveAttack(door);
    } else if (this.phase === 'attacking' && this.elapsedSeconds >= 0.72) {
      this.enterPhase('hunting');
    } else if (this.phase === 'stunned' && this.elapsedSeconds >= STUN_SECONDS) {
      this.enterPhase('hunting');
    }

    this.updateVisuals();
    return this.currentState(this.hasDefensiveFocus(input, flashlight));
  }

  markEscaped(): void {
    this.enterPhase('escaped');
    this.root.setVisible(false);
    this.warningCone.setVisible(false);
    this.defenseZone.setVisible(false);
    this.defenseLabel.setVisible(false);
  }

  destroy(): void {
    this.unsubscribeEvents.forEach((unsubscribe) => unsubscribe());
    this.unsubscribeEvents.length = 0;
    this.root.destroy(true);
    this.warningCone.destroy();
    this.defenseZone.destroy();
    this.defenseLabel.destroy();
  }

  private activate(): void {
    if (this.phase !== 'inactive') {
      return;
    }

    this.root.setVisible(true).setAlpha(0.78);
    this.defenseZone.setVisible(true);
    this.defenseLabel.setVisible(true);
    this.enterPhase('hunting');
    gameEvents.emit({ type: 'objective.changed', text: 'Key found. Survive the door hoard and unlock the front door.' });
  }

  private startTelegraph(): void {
    this.lastPattern = this.lastPattern === 'hallway_surge' ? 'door_grab' : 'hallway_surge';
    gameEvents.emit({ type: 'enemy.attackTelegraph', enemyId: `boss_${this.lastPattern}` });
    this.enterPhase('telegraph');
  }

  private startAttack(): void {
    this.attackResolved = false;
    this.enterPhase('attacking');
  }

  private resolveAttack(door?: DoorSystemState): void {
    this.attackResolved = true;
    const inDanger = this.player.x > this.doorX - (this.lastPattern === 'door_grab' ? 360 : 520);
    if (!inDanger) {
      return;
    }

    const damage = door?.unlocking ? BOSS_DAMAGE : Math.round(BOSS_DAMAGE * 0.72);
    gameEvents.emit({ type: 'player.damaged', source: `boss_${this.lastPattern ?? 'attack'}`, amount: damage });
  }

  private stunBoss(): void {
    this.pressure01 = Math.max(0, this.pressure01 - 0.22);
    this.enterPhase('stunned');
    gameEvents.emit({ type: 'objective.changed', text: 'The porch light holds it back. Unlock the door.' });
  }

  private hasDefensiveFocus(input: PlayerInputState, flashlight?: FlashlightState): boolean {
    const inZone =
      Math.abs(this.player.x - this.defenseX) <= DEFENSE_ZONE_WIDTH / 2 &&
      Math.abs(this.player.y - (DOOR_Y + 22)) <= DEFENSE_ZONE_HEIGHT / 2;
    return inZone && input.focus && flashlight?.layer === 'main' && flashlight.battery > 0;
  }

  private enterPhase(nextPhase: BossDoorPhase): void {
    this.phase = nextPhase;
    this.elapsedSeconds = 0;
    if (nextPhase !== 'attacking') {
      this.attackResolved = false;
    }
  }

  private updateVisuals(): void {
    const telegraph01 = this.phase === 'telegraph' ? Phaser.Math.Clamp(this.elapsedSeconds / TELEGRAPH_SECONDS, 0, 1) : 0;
    const pulse = Math.sin(this.scene.time.now / 80) * 0.08;
    this.root.setAlpha(this.phase === 'stunned' ? 0.46 : 0.72 + this.pressure01 * 0.24);
    this.root.x = this.doorX + 230 - this.pressure01 * 170 + (this.phase === 'attacking' ? -90 : 0);
    this.bossBody.setScale(1 + pulse + telegraph01 * 0.18, this.phase === 'stunned' ? 0.76 : 1 - pulse * 0.5);
    this.bossBody.setFillStyle(this.phase === 'stunned' ? 0x536f76 : this.phase === 'telegraph' ? 0x7b4a34 : 0x3b2530, 0.92);
    this.warningCone
      .setVisible(this.phase === 'telegraph' || this.phase === 'attacking')
      .setAlpha(this.phase === 'attacking' ? 0.42 : 0.18 + telegraph01 * 0.4);
    this.defenseZone.setAlpha(this.phase === 'telegraph' ? 0.34 : 0.18);
    this.defenseLabel.setAlpha(this.phase === 'telegraph' ? 1 : 0.72);
    this.label.setText(`Door Hoard\n${this.phase} ${Math.round(this.pressure01 * 100)}%`);
  }

  private currentState(defensiveReady: boolean): BossDoorSequenceState {
    return {
      active: this.phase !== 'inactive' && this.phase !== 'escaped',
      phase: this.phase,
      pressure01: Number(this.pressure01.toFixed(2)),
      telegraph01: this.phase === 'telegraph' ? Number(Math.min(1, this.elapsedSeconds / TELEGRAPH_SECONDS).toFixed(2)) : 0,
      defensiveReady,
      lastPattern: this.lastPattern,
    };
  }
}
