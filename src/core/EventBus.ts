import type { GameEvent } from './Types';

type Handler<T extends GameEvent> = (event: T) => void;

export class EventBus {
  private handlers = new Map<GameEvent['type'], Set<Handler<GameEvent>>>();

  on<T extends GameEvent['type']>(
    type: T,
    handler: Handler<Extract<GameEvent, { type: T }>>,
  ): () => void {
    const listeners = this.handlers.get(type) ?? new Set<Handler<GameEvent>>();
    listeners.add(handler as Handler<GameEvent>);
    this.handlers.set(type, listeners);

    return () => {
      listeners.delete(handler as Handler<GameEvent>);
    };
  }

  emit(event: GameEvent): void {
    this.handlers.get(event.type)?.forEach((handler) => handler(event));
  }

  clear(): void {
    this.handlers.clear();
  }
}

export const gameEvents = new EventBus();
