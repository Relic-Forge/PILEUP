import type { EnemyState } from '../core/Types';

interface StateTimer {
  state: EnemyState;
  elapsedMs: number;
}

export class EnemyStateMachine {
  private timer: StateTimer;

  constructor(initialState: EnemyState) {
    this.timer = { state: initialState, elapsedMs: 0 };
  }

  get state(): EnemyState {
    return this.timer.state;
  }

  get elapsedMs(): number {
    return this.timer.elapsedMs;
  }

  update(deltaMs: number): void {
    this.timer.elapsedMs += deltaMs;
  }

  transition(nextState: EnemyState): boolean {
    if (nextState === this.timer.state) {
      return false;
    }

    this.timer = { state: nextState, elapsedMs: 0 };
    return true;
  }
}
