# PILEUP Backpack Menu + HUD Overhaul Spec

**Status:** implementation handoff addendum  
**Scope:** backpack inventory menu, usable items, lost-items integration, HUD simplification, animation polish, and UI asset quality rules.  
**Target build:** Phaser 4 + TypeScript + Vite prototype.

---

## 1. Why this change exists

The current HUD is functional, but it is too exposed for the mood PILEUP needs. The player should feel trapped in a dark house, not like they are looking at a debug checklist. The inventory, lost-items list, item details, and item-use controls should live inside a backpack-style menu that opens when needed and disappears when closed.

The normal gameplay HUD should be minimal: health/stamina, flashlight state, search feedback, current item, objective hints, and urgent warnings only. The lost-items page must not sit permanently on screen.

---

## 2. Current code review

### Existing strengths

The current code already has the right foundation:

- `src/scenes/UIScene.ts` is already a dedicated overlay scene and subscribes to gameplay events.
- `src/systems/InventorySystem.ts` already owns collected items, hotbar filtering, key state, burden value, and hotbar events.
- `src/core/EventBus.ts` already provides a clean project-wide event seam.
- `src/core/Types.ts` already defines `GameEvent`, `DepthLayer`, search result types, and gameplay data contracts.
- `src/scenes/LevelScene.ts` launches `UIScene` with state, checklist items, room phase info, and search placement data.
- `src/systems/InputSystem.ts` already centralizes input reads, which is where menu toggles and selection actions should be added.

### Main problem

`UIScene.renderChecklistPaper()` currently renders the lost-items paper directly onto the gameplay HUD. That makes the game feel less immersive because the player constantly sees a bright paper UI layer while exploring the dark house.

The hotbar is also currently rendered as text:

```text
HOTBAR Batteries | Cleaning Spray / LOAD LIGHT 2
```

That is acceptable for prototype status, but it should become a visual item strip and backpack trigger.

### Architecture correction

Do not add the backpack as a DOM overlay. Keep production UI in Phaser so it can animate, scale, layer, and feel like part of the game. The existing debug/info DOM overlay can remain debug-only, but inventory/lost-items must be Phaser-rendered.

---

## 3. Final UX target

### Normal gameplay HUD

The in-game HUD should feel like the player is barely holding themselves together:

- Health/stamina remain readable but compact.
- Flashlight battery/depth indicator stays visible because it is combat-critical.
- Search progress appears only while searching.
- Door unlock progress appears only near the door/unlock sequence.
- Current selected usable item appears as a small hand-drawn pocket icon.
- Burden state appears as a subtle backpack-weight indicator, not a big text label.
- Lost-items list is hidden by default.
- Objective text should collapse after a few seconds into a small icon/chip unless changed.

### Backpack menu

Opening the backpack should feel like the child crouches down in the dark and digs through their bag.

The menu must include:

1. Inventory grid/list of picked-up items.
2. Item detail panel.
3. Use button for usable items.
4. Disabled-state explanation when an item is not usable right now.
5. Drop button for non-key non-required items after the drop mechanic exists.
6. Lost-items page as an internal tab/page.
7. Burden meter.
8. Current objective hint.
9. Close/back action.

### Lost-items integration

The lost-items page should be treated as a crumpled notebook page inside the backpack, not as a permanent HUD panel.

Rules:

- The lost-items list opens from the backpack tab `LOST`.
- Found items show crossed-out, hand-drawn marks.
- Unknown items can show vague handwritten hints when the item has not been identified yet.
- The front-door key should be emphasized only after discovered.
- The main HUD can show a tiny momentary toast when an item is found, then fade it out.
- During the boss-door sequence, show only the current critical objective, not the whole lost-items page.

---

## 4. Interaction model

### Keyboard / mouse

```text
Tab or I             Toggle backpack menu
Esc                  Close backpack if open; otherwise pause/menu behavior
1-5                  Select hotbar slot during gameplay
Mouse wheel          Cycle selected item when backpack is closed
Left click           Use selected item during gameplay, or activate focused UI control in backpack
Space / Enter        Confirm focused backpack action
Q/E                  Move between backpack tabs when backpack is open
WASD / arrows        Navigate backpack slots when backpack is open
Backspace / X        Drop selected non-key item after drop exists
```

### Controller

```text
View/Select          Toggle backpack menu
B / Circle           Close/back
LB/RB                Move between backpack tabs
D-pad / left stick   Navigate slots
A / Cross            Confirm / use
X / Square           Drop after drop exists
```

### Phone landscape

```text
Backpack icon        Toggle backpack
Tap item             Select item
Double-tap usable    Use item only if safe; otherwise require Use button
Swipe left/right     Change backpack tabs
Large close button   Top-right safe area
```

Phone touch targets must be at least 56 CSS px where practical. No hover-only information.

---

## 5. Runtime state model

Add or evolve types toward this structure. Keep the rules engine-portable.

```ts
export type BackpackTabId = 'inventory' | 'lostItems' | 'notes';

export interface ItemDefinition {
  id: string;
  label: string;
  category: 'required_objective' | 'consumable' | 'utility_weapon' | 'utility' | 'memory' | 'decoy' | 'junk';
  iconAssetId: string;
  hotbar: boolean;
  usable: boolean;
  stackable: boolean;
  maxStack?: number;
  burden: number;
  effectId?: string;
  useContexts: Array<'gameplay' | 'searching' | 'combat' | 'door' | 'menuOnly'>;
  description: string;
  disabledUseText?: string;
}

export interface InventoryEntry {
  itemId: string;
  count: number;
  discoveredAtMs: number;
  assignedHotbarSlot?: number;
  isKeyItem: boolean;
}

export interface LostItemEntry {
  itemId: string;
  label: string;
  found: boolean;
  hint?: string;
  required: boolean;
}

export interface BackpackMenuState {
  open: boolean;
  activeTab: BackpackTabId;
  selectedItemId?: string;
  selectedIndex: number;
  inputMode: 'keyboardMouse' | 'controller' | 'touch';
}
```

The item definitions should be data-driven from JSON. `InventorySystem.ts` should not keep the full item database hardcoded long-term.

---

## 6. Event contract

Extend `GameEvent` with explicit inventory/menu events.

```ts
| { type: 'inventory.changed'; entries: InventoryEntry[]; hotbarSlots: InventoryEntry[]; burden: number; burdenState: string }
| { type: 'inventory.selectedChanged'; itemId?: string; hotbarSlot?: number }
| { type: 'inventory.useRequested'; itemId: string; source: 'hud' | 'backpack' | 'hotbar' }
| { type: 'inventory.useResolved'; itemId: string; success: boolean; reason?: string }
| { type: 'inventory.dropRequested'; itemId: string; count: number }
| { type: 'backpack.opened' }
| { type: 'backpack.closed' }
| { type: 'backpack.tabChanged'; tab: BackpackTabId }
| { type: 'lostItems.changed'; items: LostItemEntry[] }
| { type: 'hud.toast'; tone: 'item' | 'warning' | 'objective' | 'damage'; text: string }
```

Temporary compatibility is allowed:

- Keep `hotbar.changed` until the HUD is migrated.
- Keep `checklist.created` until `lostItems.changed` is live.
- Do not remove existing events until the new UI passes acceptance.

---

## 7. Scene/component structure

Do not turn `UIScene.ts` into a giant menu file. Split UI components.

Recommended structure:

```text
src/ui/
  HUD.ts
  BackpackMenu.ts
  InventoryGrid.ts
  ItemDetailPanel.ts
  LostItemsNotebook.ts
  BackpackTabs.ts
  HudToastStack.ts
  uiDepths.ts
  uiTheme.ts
  uiTypes.ts
```

`UIScene.ts` should become orchestration:

- subscribe/unsubscribe to events
- hold current UI state
- forward state into components
- manage open/close transitions
- own top-level depth ordering

Component ownership:

```text
HUD.ts
  Compact gameplay HUD only.

BackpackMenu.ts
  Root overlay group, dimmer, animation timeline, tabs, close behavior.

InventoryGrid.ts
  Item cells, counts, selected state, locked/key-item styling.

ItemDetailPanel.ts
  Item name, sketch/icon, description, burden, Use button, Drop placeholder.

LostItemsNotebook.ts
  Hidden-by-default lost-items page, crossed-out found items, handwritten treatment.

HudToastStack.ts
  Item found, warning, objective changed, cannot-use feedback.
```

---

## 8. Animation direction

The menu should be animated, but not loud. It should feel handmade, cold, and tense.

### Open animation

Duration target: 220-320 ms.

Sequence:

1. Gameplay HUD breathes/fades down to 45-65% opacity.
2. Cold shadow wash fades in over the scene.
3. Backpack panel slides up from lower safe area with slight overshoot.
4. Straps/flaps or torn-paper tabs settle with imperfect hand-drawn wobble.
5. Selected item slot flickers into focus.
6. Audio cue: cloth rustle + small zipper/tape pull + distant room tone dip.

### Close animation

Duration target: 150-220 ms.

Sequence:

1. Item detail collapses first.
2. Backpack shell drops/folds away.
3. Cold shadow wash fades out.
4. Gameplay HUD returns to full readable opacity.

### Selection animation

- Selected slot gets a jittery chalk/ink outline, not a neon border.
- Selection should pulse slowly, 0.75-1.2 seconds per breath.
- Hover/focus movement should feel like a hand-drawn cursor shifting, not a perfect digital rectangle.
- Item icons may nudge 1-2 px as if the backpack is being handled.

### Lost-items page animation

- Page slides or flips from inside the backpack.
- Found item strike-through draws across the item over 120-180 ms.
- Do not animate every list line constantly. One subtle paper sway is enough.

### Motion safety

Add a reduced-motion option in UI theme/config:

```json
{
  "reducedMotion": {
    "panelOpenMs": 0,
    "panelCloseMs": 0,
    "selectionPulse": false,
    "pageFlip": false
  }
}
```

---

## 9. Visual direction

The UI should be dark, cold, and hand-drawn. It should not become a clean RPG menu.

### Palette

Use the data profile in `data/ui_backpack_menu_profile.json` as the token source.

Base mood:

```text
near-black violet/navy background
cold blue-gray shadow panels
dirty off-white hand-drawn text
muted paper tan for lost-items page only
sick yellow/amber for flashlight/battery attention
small red-orange only for danger/cannot-use
```

### Shape language

- Crooked panels, irregular ink borders, taped corners, worn fabric seams.
- 9-slice scalable panels for runtime.
- No glossy sci-fi UI.
- No clean white modal boxes.
- No generic mobile-game cartoon inventory.
- No baked text in images.

### Typography

Runtime text should remain actual text, not baked into art. Use font stacks now; later replace with licensed/approved fonts if needed.

Suggested split:

```text
System/readability text: serif or condensed readable sans
Handwritten labels: used sparingly for lost-items title and check marks
Numbers/status: plain readable text, never decorative at the cost of clarity
```

---

## 10. Asset generation requirements

All backpack/HUD assets must follow the main guardrails in `docs/PILEUP_Asset_Generation_Quality_Guardrails.md`.

### New UI asset IDs

Add these assets to the asset registry when source art exists:

```text
ui.backpack_menu_system
ui.backpack_shell
ui.backpack_panel_9slice
ui.inventory_slot_frame
ui.inventory_selected_outline
ui.lost_items_notebook
ui.lost_items_checkmarks
ui.hud_compact_survival
ui.toast_scrap
vfx.ui_cold_shadow_wash
```

Item icons:

```text
ui.item_icon.front_door_key
ui.item_icon.spare_batteries
ui.item_icon.cleaning_spray
ui.item_icon.duct_tape
ui.item_icon.family_photo
ui.item_icon.phone_charger
ui.item_icon.toy_decoy
ui.item_icon.junk_stack
```

### Source targets

```text
Backpack/menu source master: 4096 x 2304 or vector/PSD-equivalent layered source
9-slice panel source: 2048 x 2048 minimum with slice guides
Inventory slot source: 1024 x 1024
Item icon source: 1024 x 1024 preferred
Lost-items notebook source: 2048 x 2048 or larger
Checkmark/strike-through sheet: 1024 x 1024 source, transparent alpha
Cold shadow wash: shader preferred; PNG mask allowed at 1920/2560/3840 tiers
```

### Runtime tiers

```text
Item icons: 128, 256, 512
Panel pieces: 512, 1024, 2048 as needed by 9-slice
Backpack shell: 1024, 2048, 4096 if full-screen detail requires it
Notebook/page: 1024, 2048
Overlay masks: 1920, 2560, 3840 if PNG-based
```

### Required technical rules

- True RGBA transparency for icons and panel pieces.
- No text baked into art.
- No watermarks, signatures, UI labels, fake glyphs, or random symbols.
- No single-resolution-only UI assets.
- All scalable panels must support 9-slice or be programmatically drawn.
- Icons must read at 32 px, 64 px, and 128 px preview sizes.
- Item silhouettes must be recognizable without relying on labels.
- Runtime code should reference asset IDs or manifest keys, not temporary filenames.
- Candidate art stays outside runtime folders until approved.

### Prompt template for backpack/menu art

```text
Create [asset output] for PILEUP using assetId [assetId].
Use the PILEUP art direction: hand-drawn 2D/2.5D domestic survival horror, dark cold night palette, familiar household objects turning threatening, readable silhouettes, imperfect ink linework, distressed paper/fabric texture.
Target UI use: [backpack panel / inventory slot / lost-items notebook / item icon / cold shadow wash].
Preserve gameplay readability at phone landscape and 4K desktop.
Technical output: true transparent RGBA where required, no baked text, no watermark, no labels, no clean vector gloss, no sci-fi styling.
Runtime requirement: supports 9-slice or tiered export, readable at [target sizes].
```

Bad prompt:

```text
Make a cool horror inventory menu.
```

Good prompt:

```text
Create a hand-drawn backpack inventory panel for PILEUP, assetId ui.backpack_panel_9slice. The panel should feel like cold night fabric and worn school-bag material, with crooked inked edges, taped/ripped corners, subtle grime, and enough empty center space for runtime text and icons. Dark blue-black and gray-violet palette with dirty off-white edge highlights. No text, no labels, no symbols, no baked item icons. True transparent RGBA. Design must support 9-slice scaling and remain readable on phone landscape and 4K desktop.
```

---

## 11. Item-use behavior

### Use button rules

A usable item shows a `Use` button only when:

- `usable: true`
- `count > 0`
- current context matches one of the item `useContexts`
- item is not blocked by current gameplay state

Disabled examples:

```text
Spare Batteries: disabled if flashlight battery is already full.
Cleaning Spray: disabled if no valid enemy or threat is in range unless free-use testing flag is enabled.
Door Wedge: disabled unless near a valid door or closet point.
Family Photo: menu-only, calming/objective-related effect if implemented.
Front Door Key: never consumed; detail panel says it is needed at the front door.
Junk Stack: not usable; can be dropped later.
```

### Use resolution

`InventorySystem` should request item use and let the appropriate gameplay system resolve it.

Examples:

```text
spare_batteries -> FlashlightSystem restores battery
cleaning_spray -> EnemySystem applies short stun if in range/cone
phone_charger -> Objective/Search system reveals a clue ping if phone found
family_photo -> Panic/Mess system reduces pressure if that mechanic exists
front_door_key -> DoorSystem checks keyFound(), not consume item
```

The backpack should show feedback when use fails:

```text
Not here.
Battery already full.
Nothing close enough.
Too loud to use safely.
Can’t drop this.
```

Do not silently do nothing.

---

## 12. HUD simplification rules

The normal HUD should not contain:

- full lost-items list
- full inventory labels
- debug viewport text
- phase/build labels outside debug mode
- long burden text
- static door progress when not near the door

The normal HUD may contain:

```text
Top left: compact health/stamina
Top center or upper safe area: temporary objective chip
Top/right or lower/right: compact flashlight depth + battery
Bottom/right: current selected item + 1-5 hotbar strip
Bottom/center: search/door progress only while active
Brief toast stack: item found, cannot use, objective changed
```

Debug information must remain behind `F3`, query flags, or dev-only overlays.

---

## 13. Scaling and layout

### Desktop 16:9

- Backpack opens centered, max width around 1180-1320 design px.
- Inventory grid left/center.
- Item details right.
- Tabs top or left spine.
- Lost-items notebook uses the same shell, not a separate modal.

### Ultrawide

- Do not push menu to the far edges.
- Clamp backpack content to a central readable safe zone.
- Keep dimmer full-width, but keep controls centered.

### Phone landscape

- Backpack becomes full-screen safe-area panel.
- Use two-pane layout only if there is enough width.
- Otherwise stack: item grid above detail panel.
- Use larger touch controls.
- Hide decorative flourishes that reduce readability.

### 4K

- Use tiered exports or procedural shapes so the UI does not look blurry.
- Do not scale a 1080p-only PNG across a 4K viewport.

---

## 14. Implementation phases

### UI-B0 — Data contract and scaffolding

Tasks:

- Add `data/ui_backpack_menu_profile.json` to define palette, layout, animation, and asset requirements.
- Add UI state/types in `src/ui/uiTypes.ts` or `src/core/Types.ts` if shared.
- Add new event types to `GameEvent`.
- Add backpack input fields to `PlayerInputState` or create a separate UI input reader.

Acceptance:

- `npm run typecheck` passes.
- No existing gameplay behavior changes.
- Dev can open console and see item/lost-item event payloads during search.

### UI-B1 — Inventory model upgrade

Tasks:

- Move item definitions toward JSON-backed data.
- Track `InventoryEntry` with count, stack, selected slot, and key item state.
- Emit `inventory.changed` after item collection/use/drop.
- Preserve `hotbar.changed` temporarily.

Acceptance:

- Existing search pickups still work.
- Hotbar still updates.
- Burden state still updates.
- Key still triggers the escape objective.

### UI-B2 — Minimal gameplay HUD

Tasks:

- Move current HUD logic into `src/ui/HUD.ts`.
- Replace text hotbar with simple drawn slots.
- Remove always-visible lost-items paper from main HUD.
- Add toast stack for item found/objective changed/cannot-use.
- Keep search and door progress context-only.

Acceptance:

- Normal gameplay screen feels cleaner and darker.
- Lost-items list is not visible unless backpack is opened.
- Health/stamina/flashlight/search feedback remain readable.

### UI-B3 — Backpack overlay shell

Tasks:

- Create `BackpackMenu.ts` with open/close state.
- Add dimmer/cold shadow wash.
- Add inventory tab, selected item panel, close control.
- Support keyboard, mouse, controller-style navigation, and touch.
- Add open/close animation timeline.

Acceptance:

- Tab/I opens and closes backpack.
- Esc closes backpack before leaving to main menu/pause behavior.
- Selection can move without mouse.
- Menu stays inside safe area at target viewport sizes.

### UI-B4 — Usable item flow

Tasks:

- Add Use button to item detail panel.
- Implement `inventory.useRequested` and `inventory.useResolved`.
- Wire at least `spare_batteries` to flashlight battery restore.
- Show disabled reasons.
- Keep Front Door Key as a non-consumed key item.

Acceptance:

- Player can collect spare batteries, open backpack, select item, use item, and see battery/stack update.
- Disabled item use gives clear feedback.
- No item can be consumed twice accidentally from repeated click/key spam.

### UI-B5 — Lost-items notebook tab

Tasks:

- Move lost-items/checklist display into `LostItemsNotebook.ts`.
- Create `lostItems.changed` event.
- Add found/unfound states and crossed-out animation.
- Add optional hints for undiscovered items.

Acceptance:

- Lost-items page opens from backpack tab.
- Found items update live after search pickups.
- Lost-items page remains hidden during normal gameplay.
- The page looks like a hand-drawn in-world note, not a bright debug checklist.

### UI-B6 — Animation and polish pass

Tasks:

- Add open/close animation.
- Add selection pulse/wobble.
- Add page flip or paper slide.
- Add item-found toast animation.
- Add reduced-motion mode.
- Add UI audio hooks even if placeholder audio is used first.

Acceptance:

- Menu feels animated without delaying control.
- Animation never blocks emergency close.
- Reduced motion disables non-essential movement.
- Phone landscape remains usable.

### UI-B7 — Production asset pass

Tasks:

- Generate candidate backpack/menu assets using the rules above.
- Record generation batches in `data/assets/asset_generation_manifest.json`.
- Add approved UI asset IDs to `data/assets/asset_registry.json` only after review.
- Export runtime tiers.
- Replace placeholder/procedural shapes gradually.

Acceptance:

- New assets pass alpha, readability, scaling, and style checks.
- No approved UI design is silently replaced by a later generation.
- Runtime UI assets are referenced through stable keys.

---

## 15. Dev/test helpers

Add query/debug helpers after the system exists:

```text
?uiDebug=backpack      Start level with backpack debug data available
?backpackOpen=1        Auto-open backpack after UIScene starts
?giveItems=all         Give all current item_pool items for UI testing
?lostItemsDebug=1      Show all lost-item states in debug controls
?reducedMotion=1       Force reduced-motion UI behavior
```

These helpers must be dev/debug only and should not become player-facing cheats in the final build.

---

## 16. Acceptance checklist

The overhaul is done when:

- Backpack opens/closes from keyboard, mouse, controller-style input, and phone landscape touch.
- Inventory shows all picked-up items with icon, count, burden, and key-item state.
- Usable items can be selected and used through the backpack.
- Disabled item use gives a clear reason.
- Hotbar remains available during gameplay without exposing the full inventory.
- Lost-items page is inside backpack and not permanently visible on the main HUD.
- Search, door, flashlight, health, stamina, and objective feedback remain readable during play.
- UI feels dark, cold, horror-adjacent, and hand-drawn.
- Menu uses scalable layout and safe areas for 1280x720, 1920x1080, 2560x1440, 4K, ultrawide, tablet landscape, and phone landscape.
- Placeholder UI can be replaced by production assets without rewriting gameplay logic.
- `npm run build` and `npm run typecheck` pass.

---

## 17. Non-goals for this pass

Do not add these yet:

- Full crafting system.
- Shop/vendor UI.
- Resident Evil-style spatial inventory puzzle.
- Skill trees.
- Permanent quest journal beyond the lost-items page.
- Fully animated character rummaging sequence that interrupts gameplay for seconds.

The goal is a polished, thematic, scalable survival backpack interface, not a new meta-system.
