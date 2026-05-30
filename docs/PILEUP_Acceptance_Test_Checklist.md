# PILEUP Acceptance Test Checklist

Use this file during implementation and playtesting.

---

## Core build checks

- [ ] Fresh checkout installs successfully.
- [ ] `npm run typecheck` passes.
- [ ] `npm run build` passes.
- [ ] `npm run dev` launches playable build.
- [ ] No console errors during normal play.
- [ ] Debug overlay can be enabled/disabled.

---

## Display and scaling checks

- [ ] 1280×720: UI readable, player visible, no major clipping.
- [ ] 1920×1080: baseline composition matches design.
- [ ] 2560×1440: art remains sharp.
- [ ] 3840×2160: art remains sharp; no low-res UI icons.
- [ ] 3440×1440 ultrawide: extra room context visible, no blank edges.
- [ ] Phone landscape: playable layout, touch controls reachable.
- [ ] Phone portrait: rotate prompt appears.
- [ ] UI respects safe areas.
- [ ] No non-uniform stretching.

---

## Movement checks

- [ ] Player moves left/right.
- [ ] Player moves up/down within floor plane.
- [ ] Player cannot walk through furniture blockers.
- [ ] Player depth-sorts with enemies and props.
- [ ] Sprint drains stamina.
- [ ] Crouch/quiet movement reduces noise.
- [ ] Movement feels responsive at target FPS.

---

## Parallax checks

- [ ] Foreground overlaps the main play lane.
- [ ] Background recedes at slower scroll factor.
- [ ] Camera movement does not expose blank art.
- [ ] Segment boundaries are not visually jarring.
- [ ] Room length can be increased by adding segments.
- [ ] Room length can be shortened by removing optional segments.

---

## Flashlight checks

- [ ] Flashlight can turn on/off.
- [ ] Flashlight can aim.
- [ ] Flashlight can target foreground/main/background.
- [ ] UI shows selected flashlight depth.
- [ ] Flashlight hits only valid targets in selected depth.
- [ ] Focus beam narrows/strengthens effect.
- [ ] Battery/flicker feedback is visible.

---

## Search/loot checks

- [ ] Player can search a clutter pile by holding interact.
- [ ] Search progress is visible.
- [ ] Search can be cancelled.
- [ ] Search makes noise.
- [ ] Search can produce item, junk, empty, ambush, or key.
- [ ] Key updates objective.
- [ ] Inventory/hotbar updates after item pickup.
- [ ] Burden state updates when carrying too much.

---

## Enemy checks

- [ ] Laundry Monster has visible states.
- [ ] Enemy attacks have telegraphs.
- [ ] Foreground/background stalkers provide readable cues.
- [ ] Background/foreground enemies do not deal unfair instant damage.
- [ ] Flashlight affects enemies differently by type.
- [ ] Player can recover from minor mistakes.
- [ ] Enemy pressure increases as Mess Level/time rises.

---

## Randomness fairness checks

- [ ] Run seed is visible in debug.
- [ ] Same seed gives same placements.
- [ ] Different seed changes item/enemy placement.
- [ ] Key never spawns in front-door/boss segment.
- [ ] Key never spawns in first search pile.
- [ ] Required items are distributed across rooms.
- [ ] Ambushes are telegraphed or avoid unfair positions.
- [ ] Player receives at least one resource chance after key pickup.

---

## Boss/escape checks

- [ ] Boss sequence triggers after key acquisition at front door.
- [ ] Door unlock requires hold interaction.
- [ ] Unlock progress is visible.
- [ ] Enemy can interrupt but not unfairly one-shot.
- [ ] Victory triggers after successful escape.
- [ ] Failure triggers cleanly when player dies.

---

## Replay/fun checks

- [ ] A one-room run can finish in under 3 minutes.
- [ ] Full Level 01 target run time is roughly 8–15 minutes.
- [ ] Searching feels risky but worthwhile.
- [ ] The flashlight feels central, not cosmetic.
- [ ] The house feels alive through foreground/background activity.
- [ ] The player often scrapes by rather than dominates.
