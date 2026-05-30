/// <reference types="vite/client" />

interface Window {
  __PILEUP_GAME__?: Phaser.Game;
  __PILEUP_DEBUG__?: {
    phase: string;
    player: {
      x: number;
      y: number;
      stamina: number;
      isMoving: boolean;
      isSprinting: boolean;
      isCrouching: boolean;
      noise: number;
    };
    flashlight?: {
      layer: string;
      focus: boolean;
      flicker: boolean;
      battery: number;
      hitIds: string[];
    };
    search?: {
      nearestId?: string;
      activeId?: string;
      progress01: number;
      noise: number;
      lastResult?: string;
    };
  };
}
