# PILEUP - Art Bible and Asset Quality Spec

## Visual identity

PILEUP is a 2.5D hand-painted domestic horror game. The art should feel rich, specific, and layered. The home should look lived-in before it looks scary. The horror comes from everyday objects becoming suspicious.

## Core look

- Side-scrolling rooms with a floor plane the player can move across in X and limited Y depth.
- Heavy parallax: foreground, main plane, background clutter, far wall, FX/light.
- Strong flashlight cones and deep shadows.
- Warm domestic details contrasted with cold night blues and sickly green/grey shadows.
- Enemies should be readable silhouettes made from the room's own clutter.
- No generic haunted-house assets unless they are grounded in the home's real objects.

## Production quality definition

A production-quality PILEUP asset must pass all checks below:

- Correct export format for use: RGBA PNG for sprites/foreground elements; layered source file retained separately.
- No fake checkerboard backgrounds.
- No halo edges or baked background colors around sprites.
- Consistent frame dimensions across animation.
- Consistent pivot/anchor point across frames.
- Animation silhouette reads at gameplay scale.
- Source art exists at 2x or 4x runtime resolution.
- Name follows lowercase_snake_case.
- Asset appears in asset_manifest.json.
- Animation appears in animation_specs.json.
- Pivots, hitboxes, hurtboxes, and layer tags are documented.
- Tested against light and dark backgrounds.

## Sprite export standards

### Standard enemy
- Runtime frame: 512 x 512 minimum.
- Preferred source frame: 2048 x 2048 for new production art.
- 8-frame sheet: 2048 x 1024 runtime or 4096 x 2048 source.
- Format: RGBA PNG.
- Metadata: JSON with frame size, fps, loop, anchor, hitboxes.

### Boss enemy
- Runtime frame: 1024 x 1024 minimum.
- Preferred source frame: 4096 x 4096 where practical.
- Split into multiple sheets if texture size becomes too large.

### Player
- Runtime frame: 512 x 512 minimum.
- Preferred source frame: 2048 x 2048 for new production art.
- Must support flashlight aiming forward, high/deep background, and low/foreground.

### Items
- Source: 1024 x 1024 for inventory icons and important pickup props.
- Runtime: 128, 256, or 512 depending UI/world tier.
- Use strong silhouettes. Icons must be readable at 720p.

## Room layer standard

Each room is built as a stack:

1. far_bg - static wall, windows, pictures, drawings.
2. bg_clutter - shelves, closet, counters, background piles.
3. main_floor - walkable area, collision, searchable piles.
4. fg_clutter - occluding props and foreground pile threats.
5. fx_light - flashlight, dust, shadow masks, eye glow.

## Parallax rules

- Foreground layer moves fastest relative to camera.
- Main floor is gameplay truth.
- Background clutter scrolls slower and may contain stalker enemies.
- Far background moves the least.
- Foreground threats must telegraph clearly before attacks.
- Occlusion should create tension, not hide unfair damage.

## Color and lighting

Use a home-at-night palette:
- Cold blue/grey shadows.
- Warm amber domestic light pockets.
- Orange/yellow enemy eyes.
- Purple/green grime accents.
- Slight desaturation, but readable UI and silhouettes.

## Enemy art rules

Enemies should look like they grew from local clutter:
- Laundry enemies: fabric, socks, sheets, towels, lint.
- Kitchen enemies: dishes, utensils, towels, trash bags.
- Bedroom enemies: toys, blankets, clothes, backpack items.
- Hallway enemies: shoes, coats, bags, mail piles.

Each enemy needs:
- Dormant readable pile state.
- Subtle warning pose.
- Clear attack silhouette.
- Light response pose.
- Hit/stun pose.
- Layer transition pose.

## Current prototype art status

The included images define direction and tone. They should not be treated as final production exports yet.

Known issues:
- Prototype resolution is non-standard: 1774 x 887 sprite sheets and 1672 x 941 mockups.
- RGB mode, not true RGBA alpha.
- Sprite sheets use visual sheet layout but require frame extraction and anchor cleanup.
- UI text in concept art is directional only, not final UI.

Production target replacements should be generated or painted at the standards listed above.


## v2 responsive and large-screen quality update

PILEUP should not be built around a single fixed background size. The production art pipeline must support phones, laptops, desktop monitors, 4K displays, and ultrawide monitors.

Key requirements:

- Source room art should be authored above runtime size. Hero room segments should target 5120 x 2880 source per 1.0-screen segment where feasible.
- Runtime room layers should export in tiers: mobile 1920 x 1080, standard 2560 x 1440, high 3840 x 2160.
- Foreground/background layers require bleed/overscan so parallax does not expose empty edges.
- Sprites should use tiered exports. Hero enemy/player source frames should be 2048 x 2048 where practical, with runtime tiers at 512, 768/1024, and high tier 1024+.
- UI must be anchor-based and token-scaled. No HUD elements should be baked into background art.
- Text should use scalable fonts, preferably SDF/vector-style rendering. HUD panels should use 9-slice scaling.
- All production assets must be reviewed at 720p, 1080p, 1440p, 4K, ultrawide, and phone landscape.

Detailed requirements are in `PILEUP_Responsive_Display_and_Asset_Scaling_Spec.md`.

## Asset generation readiness

Before generating or promoting new production art, use:

- `docs/PILEUP_Asset_Generation_Quality_Guardrails.md`
- `docs/PILEUP_Asset_Generation_Runbook.md`
- `data/assets/asset_registry.json`
- `data/assets/asset_generation_manifest.json`

Current prototype images are references only. The first art milestone should approve contact sheets and identity sheets before full animation sheets or room runtime layers are produced.
