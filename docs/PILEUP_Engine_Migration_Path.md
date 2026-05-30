# PILEUP Engine Migration Path

The v1 build uses Phaser 4 because it is fast for web prototyping. The architecture must preserve a path to a more advanced engine later.

---

## Migration strategy

Treat Phaser as the first renderer/runtime, not the identity of the game.

Portable assets/data:

- room segment definitions
- layer definitions
- item pool
- enemy archetypes
- animation specs
- flashlight/enemy matrix
- randomization fairness rules
- UI tokens
- control maps
- performance targets

Phaser-specific systems:

- scene lifecycle
- GameObjects
- Phaser loader
- Phaser camera
- Phaser input binding
- Phaser audio objects
- Phaser tweens/particles

---

## Adapter pattern

When practical, define systems around interfaces:

```ts
interface RenderAdapter {
  createSprite(assetKey: string, x: number, y: number): unknown;
  setDepth(object: unknown, depth: number): void;
  setVisible(object: unknown, visible: boolean): void;
}

interface AudioAdapter {
  play(key: string, options?: Record<string, unknown>): void;
  setBusVolume(bus: string, volume: number): void;
}

interface InputAdapter {
  getMoveVector(): { x: number; y: number };
  getAimVector(): { x: number; y: number };
  isInteractHeld(): boolean;
}
```

Do not over-engineer Phase 0/1. Use adapters where they prevent obvious coupling.

---

## Future Godot mapping

| PILEUP concept | Phaser v1 | Godot future equivalent |
|---|---|---|
| Scene lifecycle | Phaser.Scene | Node/Scene tree |
| Room segment | JSON + containers | PackedScene/Node2D/Resource |
| Parallax layer | Containers + scroll factors | Parallax2D / CanvasLayer patterns |
| Player | Sprite/GameObject + controller | CharacterBody2D / custom Node2D |
| Enemy state | TS state machine | GDScript/C# state machine |
| UI | UIScene + tokenized layout | Control nodes / themes |
| Data | JSON | JSON/Resource files |

---

## Migration readiness checklist

The project remains migration-ready if:

- Level data is not hardcoded into Phaser scenes.
- Enemy behavior values live in config/data.
- Item definitions live in data.
- UI sizing uses tokens.
- Input is abstracted enough to support keyboard/controller/touch.
- Art exports are not Phaser-specific.
- Acceptance criteria are behavior-based, not engine-specific.
