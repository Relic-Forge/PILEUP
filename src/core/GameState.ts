export interface GameState {
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
  mess: number;
  maxMess: number;
  objective: string;
}

export const createInitialGameState = (): GameState => ({
  health: 100,
  maxHealth: 100,
  stamina: 100,
  maxStamina: 100,
  mess: 0,
  maxMess: 100,
  objective: 'Find the key.',
});
