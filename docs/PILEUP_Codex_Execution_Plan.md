# PILEUP Codex Execution Plan

This file is written as direct working instructions for Codex.

---

## Non-negotiable build behavior

- Work one phase at a time.
- Do not build future phases early.
- Do not invent new mechanics unless required to satisfy acceptance criteria.
- Keep everything data-driven where the specs define JSON/data.
- Use placeholder art until asset export is available.
- Keep Phaser-specific implementation isolated.
- Run typecheck/build after each meaningful change.
- Update `KNOWN_ISSUES.md` when something is intentionally deferred.

---

## Starting task

Implement **Phase 0: Project scaffold**.

### Expected output

```text
pileup/
  package.json
  index.html
  vite.config.ts
  tsconfig.json
  src/main.ts
  src/scenes/BootScene.ts
  src/scenes/PreloadScene.ts
  src/scenes/MainMenuScene.ts
  src/scenes/LevelScene.ts
  src/scenes/UIScene.ts
  src/scenes/GameOverScene.ts
  src/scenes/VictoryScene.ts
  src/dev/DebugOverlay.ts
  README.md
  KNOWN_ISSUES.md
```

### Phase 0 acceptance checklist

- [ ] `npm install` succeeds.
- [ ] `npm run dev` launches Vite.
- [ ] Browser displays a PILEUP title/menu.
- [ ] `npm run build` succeeds.
- [ ] TypeScript has no compile errors.
- [ ] Scenes exist and can transition from Boot → Preload → MainMenu.
- [ ] Debug overlay can be toggled and shows FPS/viewport.
- [ ] README explains how to run/build.

Do not continue to Phase 1 until all boxes are checked.

---

## Phase handoff protocol

At the end of each phase, create/update:

```text
PHASE_STATUS.md
```

Include:

- phase completed
- acceptance criteria status
- commands run
- known issues
- files changed
- next recommended phase

---

## Files Codex should read first

Read in this order:

1. `README.md`
2. `docs/PILEUP_Build_Spec_Phases_and_Acceptance.md`
3. `docs/PILEUP_Technical_Implementation_Spec_Phaser4.md`
4. `docs/PILEUP_Level_Length_and_Parallax_Extension_Spec.md`
5. `docs/PILEUP_Responsive_Display_and_Asset_Scaling_Spec.md`
6. `data/runtime_world_units.json`
7. `data/control_map.json`
8. `data/flashlight_enemy_matrix.json`
9. `data/build_milestones.json`

---

## Preferred implementation sequence inside each phase

1. Create data/types first.
2. Implement system skeletons.
3. Wire scene lifecycle.
4. Add placeholder visuals.
5. Add debug visibility.
6. Add acceptance check.
7. Run build/typecheck.
8. Update docs/status.

---

## Do not do this

- Do not create a one-off game scene with all logic hardcoded.
- Do not bake the UI into a background image.
- Do not make the level a single screen.
- Do not make movement only left/right.
- Do not let background/foreground enemies damage the player with no telegraph.
- Do not use production-sized art without runtime tiering.
- Do not add complex crafting in v1.
- Do not add procedural generation beyond the specified randomness rules.
- Do not add multiplayer.
- Do not add accounts, backend, or cloud save.
