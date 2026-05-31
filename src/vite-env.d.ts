/// <reference types="vite/client" />

interface Window {
  __PILEUP_GAME__?: Phaser.Game;
  __PILEUP_DEBUG__?: {
    phase: string;
    seed?: string;
    activeRoomId?: string;
    keyNode?: string;
    player: {
      x: number;
      y: number;
      stamina: number;
      isMoving: boolean;
      isSprinting: boolean;
      isCrouching: boolean;
      noise: number;
      hasProductionSprite: boolean;
      facing: -1 | 1;
    };
    flashlight?: {
      layer: string;
      focus: boolean;
      flicker: boolean;
      battery: number;
      searchPenalty01: number;
      aimAngle: number;
      visualAimAngle: number;
      focus01: number;
      batteryInstability01: number;
      effectiveRange: number;
      visualRange: number;
      origin: { x: number; y: number };
      hitIds: string[];
      lockOn: boolean;
      lockedTargetId?: string;
    };
    search?: {
      nearestId?: string;
      activeId?: string;
      progress01: number;
      noise: number;
      lastResult?: string;
    };
    enemies?: Array<{
      id: string;
      state: string;
      layer: string;
      health: number;
      exposureMs: number;
    }>;
    door?: {
      doorId: string;
      nearby: boolean;
      unlocking: boolean;
      unlocked: boolean;
      progress01: number;
    };
    bossDoor?: {
      active: boolean;
      phase: string;
      pressure01: number;
      telegraph01: number;
      defensiveReady: boolean;
      lastPattern?: string;
    };
  };
}
