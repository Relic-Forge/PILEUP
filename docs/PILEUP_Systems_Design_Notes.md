# PILEUP - Systems Design Notes

## System overview

PILEUP should be implemented as a data-driven 2.5D survival game. Rooms, piles, enemies, light responses, item pools, and encounters should be configurable through JSON-like data. That lets future houses change art and enemy variants without rewriting the core mechanics.

## Main systems

### Player controller
- 2.5D movement on a bounded floor plane.
- Stamina-based sprint.
- Crouch or slow walk for noise reduction.
- Interact/search.
- Use hotbar item.
- Aim flashlight: forward, up/back layer, down/front layer.
- Knockback, grab escape, damage states.

### Flashlight system
Inputs:
- Player position.
- Aim direction/depth target.
- Battery level.
- Beam width/range.
- Current room light state.

Outputs:
- Illuminated zones.
- Revealed object states.
- Enemy light response triggers.
- Item glints.
- Shadow movement suppression or activation.

### Searchable pile system
Each pile has:
- Pile ID.
- Room.
- Layer.
- Size.
- Noise profile.
- Search time.
- Loot table.
- Ambush chance.
- Required flashlight inspection state.
- Possible enemy disguise state.

### Encounter director
Controls pressure over time:
- Mess level.
- Active threats per room.
- Ambush cooldown.
- Noise response.
- Key-found escalation.
- Boss-stage activation.

### Hoard meter
Calculated from:
- Number of carried items.
- Junk weight.
- Key item count.
- Backpack modifier.

Effects:
- Movement speed reduction.
- Noise increase.
- Search speed reduction at high load.
- Enemy attraction modifier.

### Item system
Item categories:
- Required objective.
- Utility.
- Weapon/tool.
- Consumable.
- Decoy.
- Junk.
- Memory/lore.

### Enemy system
Enemies use composable behavior modules:
- LayerMovementModule.
- LightResponseModule.
- SoundResponseModule.
- SearchAmbushModule.
- AttackModule.
- TelegraphModule.
- RetreatOrStunModule.

### Door boss sequence
The door escape sequence is a state machine:
1. Pre-key inactive.
2. Key found: escalation.
3. Door reached: clutter surge.
4. Unlock stage 1.
5. Unlock stage 2.
6. Door hold stage.
7. Escape success or interruption.

## Recommended MVP data objects

- `RoomDefinition`
- `ParallaxLayerDefinition`
- `SearchablePileDefinition`
- `ItemDefinition`
- `EnemyArchetypeDefinition`
- `EncounterSeedDefinition`
- `AnimationDefinition`
- `LightProfileDefinition`
- `UpgradeDefinition`

## Balancing targets

- Average run: 8-12 minutes.
- First successful run: 3-6 attempts.
- Search time: 1.5-4 seconds.
- Flashlight battery full duration: 90-150 seconds of continuous use.
- Sprint stamina: 5-8 seconds full sprint.
- Door escape event: 60-120 seconds.
- Player health: 3-5 meaningful hits depending on difficulty.

## Replayability levers

- Different key location.
- Different five-item set.
- Different high-risk piles.
- Different enemy layer behavior emphasis.
- Room light failures.
- Alternate blocked paths.
- Optional clue spawns.
- Different boss-stage attack pattern.
