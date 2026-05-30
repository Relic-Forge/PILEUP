# PILEUP - Responsive Display, Asset Resolution, and UI Scaling Spec

## Purpose

PILEUP must feel premium on a large desktop monitor, readable on a laptop, immersive on ultrawide, and playable on phones. The game should never depend on a single fixed 1920x1080 painting stretched to fit every screen.

The rule is simple: **gameplay uses a fixed logical world; presentation adapts to the display.** Art scales through authored resolution tiers, segmented room layers, overscan, and responsive UI anchoring.

## Target devices

PILEUP v1 should support these practical targets:

| Target | Resolution / Shape | Experience goal |
|---|---:|---|
| Minimum laptop/window | 1280x720 | Fully playable, simplified HUD spacing |
| Standard desktop | 1920x1080 | Primary design baseline |
| High-end desktop | 2560x1440 | Crisp art, no visible softness |
| 4K desktop / TV | 3840x2160 | Premium, cinematic, no upscaled mush |
| Ultrawide | 3440x1440 / 5120x1440 | More side-world reveal, not stretched UI |
| Phone landscape | 2532x1170 class and smaller | Compact HUD, touch-safe controls, readable silhouettes |
| Tablet landscape | 2360x1640 class | Larger HUD spacing, same core camera rules |

Portrait phone support is optional for v1. If supported later, it should be a dedicated portrait layout, not a squeezed side-scroller.

## Design resolution and world scale

Use a 1920x1080 logical design resolution as the baseline for UI layout and camera composition.

```text
Design resolution: 1920x1080
Reference aspect: 16:9
World units: resolution-independent
One screen width: 100 gameplay units
Main floor depth: 18-28 gameplay units depending room
```

Player movement, enemy range, search distance, light cone reach, and room length must use gameplay units, not pixels.

## Camera rules

The camera should adapt to screen shape without changing core gameplay fairness.

### Protected gameplay safe area

Every resolution must preserve a central gameplay safe area where combat, telegraphs, search prompts, and item pickup prompts remain visible.

```text
Critical safe area: center 80% width x center 78% height
HUD safe margins: 5% desktop, 7-10% phone/tablet
No critical attack telegraph may begin fully outside the safe area.
```

### Wider screens

Ultrawide and large monitors should feel more immersive by showing more of the room horizontally and more foreground/background detail. Do not stretch the art.

```text
16:9: baseline composition
16:10: slight vertical reveal, HUD remains anchored
21:9: additional side reveal + more parallax edges
32:9: optional cinematic mode with capped gameplay reveal and decorative edge parallax
```

On ultrawide, show additional room content, but keep enemy activation ranges and boss arenas tied to world units so the game does not become easier just because the player can see farther.

### Smaller screens and phones

On phones, the game should stay readable. Prefer landscape orientation for v1.

```text
Phone landscape: preserve player/enemy scale; reduce HUD density; collapse labels where possible.
Minimum readable enemy height: 10-12% of screen height for standard threats during combat.
Minimum player height: 12-15% of screen height.
```

Do not zoom so far out on phones that the player and enemies become tiny. If needed, show less peripheral room art while preserving the central safe area.

## Room art strategy for all displays

Do not create one giant flattened background. Each room is built from streamable segments and layered art.

```text
Room = Segment + Segment + Segment
Segment = far_bg + bg_clutter + main_floor + fg_clutter + fx/light
```

Each segment should be authored with enough bleed/overscan to support parallax, camera smoothing, and ultrawide side reveal.

## Art resolution tiers

Each source asset should be authored larger than runtime. Runtime builds can export resolution tiers.

### Room segment source targets

For each 1.0-screen room segment:

| Tier | Export target | Use case |
|---|---:|---|
| Mobile / low | 1920x1080 per layer segment | phones, low memory, 720/1080 window |
| Standard | 2560x1440 per layer segment | 1080p/1440p desktop |
| High | 3840x2160 per layer segment | 4K desktop / TV |
| Ultra source | 5120x2880 source master | painting/editing source and premium downsample |

Preferred source master for hero room segments:

```text
5120x2880 minimum source per 1.0-screen segment
3840x2160 acceptable minimum for non-hero/connector segments
```

If a segment is wider than 1.0 screen, split it into tiles or subpanels rather than exporting a single massive texture.

### Overscan / bleed rules

Every segment layer needs extra art beyond the visible crop.

```text
Far BG bleed: 10% horizontal, 8% vertical
BG clutter bleed: 15% horizontal, 10% vertical
Main floor bleed: 10% horizontal, 8% vertical
FG clutter bleed: 20-30% horizontal, 12% vertical
FX/light bleed: 15% horizontal, 10% vertical
```

Foreground needs the most bleed because it moves fastest in parallax and often frames the screen edges.

## Sprite size targets

The current prototype sheets are useful concept references, but production sprites need stronger source and export discipline.

### Player

```text
Source frame target: 1536x1536 or 2048x2048
Runtime high tier: 1024x1024 per frame
Runtime standard tier: 768x768 per frame
Runtime mobile tier: 512x512 per frame
Format: RGBA PNG or packed texture atlas with alpha
```

The player must stay clean when zoomed on a 4K screen and readable on phone.

### Standard enemies

```text
Source frame target: 2048x2048
Runtime high tier: 1024x1024 per frame
Runtime standard tier: 768x768 or 512x512 per frame depending screen scale
Runtime mobile tier: 512x512 per frame
```

The laundry pile monster should be authored at the high tier because it is a hero enemy and appears large on screen.

### Boss enemies

```text
Source frame target: 3072x3072 or 4096x4096
Runtime high tier: 1536x1536 or 2048x2048 per frame when needed
Runtime standard tier: 1024x1024 per frame
Split sheets by animation to avoid huge atlases.
```

### Items and props

```text
Inventory icon source: 1024x1024
Inventory icon runtime: 256x256 / 512x512 depending tier
Pickup world prop source: 1024x1024
Pickup world prop runtime: 256-512px equivalent
```

Icons should be clean, high-contrast, and readable at phone size.

## Texture atlas guidance

Texture limits differ by platform. Plan for multiple atlas tiers.

```text
Mobile atlas max target: 4096x4096
Desktop atlas max target: 8192x8192
Do not pack every animation into one huge atlas.
Use one atlas per character state group or room segment group.
```

Recommended atlas groups:

```text
player_core_atlas
laundry_monster_idle_crawl_atlas
laundry_monster_attack_hurt_atlas
room_bedroom_segment_01_layers
room_bedroom_segment_02_layers
ui_icons_core_atlas
```

Use mipmaps or pre-scaled export tiers so downscaled art does not shimmer or crawl.

## UI scaling system

UI must be layout-driven, not baked into concept art.

### UI principles

- Anchor HUD elements to safe areas, not absolute pixels.
- Use scale tokens for phone, desktop, 4K, and ultrawide.
- Use SDF/vector-style fonts where possible.
- Use 9-slice panels for HUD boxes so borders scale cleanly.
- Keep touch controls separate from keyboard/controller hints.
- Never place mandatory gameplay UI under phone notches or home indicators.

### Breakpoints

| Breakpoint | Width / condition | HUD behavior |
|---|---:|---|
| phone_compact | under 900 logical px height or touch enabled | compact bars, collapsible labels, larger buttons |
| tablet | touch enabled and large screen | standard HUD with touch-safe spacing |
| desktop_1080 | 1280-2559 width | normal HUD |
| desktop_1440_4k | 2560+ width | normal HUD, larger render scale, avoid tiny UI |
| ultrawide | aspect ratio >= 2.1 | HUD stays in safe center/edge zones, not extreme corners if unreadable |

### Minimum UI sizes

```text
Touch target minimum: 44-48 logical px
Critical HUD text minimum: 16 logical px desktop, 18 logical px phone
Inventory icon minimum display: 56 logical px phone, 64 logical px desktop
Prompt text minimum: 18 logical px phone, 16 logical px desktop
```

On phone, item names can be hidden until selected, but icons and counts must remain visible.

## Phone controls

For v1, phone should use landscape orientation with touch controls.

Suggested layout:

```text
Left thumb: movement joystick or touch-drag lane movement
Right thumb: flashlight aim cone / attack / search context button
Bottom center: compact inventory strip
Top left: compact health/stamina/mess meters
Top right: objective/time minimized panel
```

The player should be able to search, aim the flashlight up/down into foreground/background, and move without blocking the monster with their thumbs.

## Flashlight and depth readability

The flashlight is a core visual mechanic and must scale cleanly.

The flashlight should have three readable depth zones:

```text
low/foreground sweep
main lane beam
high/background sweep
```

On big displays, the beam can show more environmental detail and parallax. On phones, the beam should be simplified but still clearly indicate which layer is being inspected.

Enemy reactions to light must remain readable at all resolutions:

```text
freeze enemies: visible hard stop + twitch silhouette
lunge enemies: crouch/wind-up before attack
light-feeding enemies: eye glow intensifies
shadow enemies: retreat into unlit clutter
```

## Responsive testing matrix

Every production milestone should capture screenshots and gameplay clips at:

```text
1280x720
1920x1080
2560x1440
3840x2160
3440x1440 ultrawide
phone landscape logical viewport
small phone landscape logical viewport
```

Acceptance criteria:

- No stretched backgrounds.
- No blurry hero enemy sprites at 4K.
- No unreadable item icons on phone.
- No HUD overlap with objective text, inventory, or touch controls.
- Player and main enemy remain readable at all sizes.
- Foreground parallax enhances depth without hiding unavoidable attacks.
- Room length feels consistent because movement is world-unit based.
- Ultrawide reveals more atmosphere, not broken empty space.

## MVP production recommendation

For v1, build the first level with these minimum export tiers:

```text
Desktop standard: 2560x1440 room layers, 768-1024 frame hero sprites
Desktop high/4K: 3840x2160 room layers, 1024 frame hero sprites
Mobile: 1920x1080 room layers, 512 frame sprites, compact HUD
```

Source art should be painted at the ultra source tier where feasible so later ports, trailers, Steam page art, and high-res promotional material do not require repainting from scratch.
