# PILEUP Asset Style Contract

This contract applies to generated character, enemy, room, prop, UI, and VFX batches. It complements `docs/PILEUP_Art_Bible_and_Asset_Spec.md` and `docs/PILEUP_Asset_Generation_Runbook.md`.

## Visual Direction

- Camera: side-view 2D/2.5D house diorama with layered foreground, main plane, background clutter, wall plane, and light/fx.
- Tone: domestic survival horror. The home must feel specific and lived-in before it feels supernatural.
- Silhouette: readable at gameplay scale, with pose and role clear before surface detail.
- Palette: cold blue-grey shadows, warm amber practical-light accents, muted domestic colors, slight desaturation.
- Lighting: strong flashlight direction through runtime VFX, deep room shadows, warm local light pockets, no painted flashlight cones on character sprites, no generic glowing magic effects.
- Material language: fabric, toys, dishes, coats, bags, mail, bedding, and other household clutter. Avoid fantasy or sci-fi materials.
- Texture density: enough hand-painted detail for close review, but simple enough to read on phone landscape and 720p.

## Character.player_child Lock

- Asset ID: `character.player_child`
- Current lifecycle: candidate
- Silhouette: small child survivor with flashlight and carried item poses.
- Motion language: careful, tense, quick when panicked, never superheroic.
- Must preserve: child scale relative to threats, domestic survival tone, standing/search child palette and identity, readable flashlight prop direction.
- Allowed variation: pose, search posture, flashlight aim direction, minor clothing folds that preserve silhouette.
- Forbidden variation: skin-tone drift between animation states, visible hair accessories not present in the standing pose, baked flashlight beams or cones in character sheets.

## Negative Prompt Base

Avoid photorealistic rendering, superhero poses, fantasy armor, sci-fi gear, cute mobile-cartoon proportions, mascot styling, generic haunted-house tropes, adult hero proportions, unreadable flashlight prop direction, baked flashlight beams, baked room backgrounds, text, labels, watermarks, checkerboard backgrounds, halo edges, and unrelated props.

## Review Gates

1. Identity review: silhouette, role, palette, and pose language match registry locks.
2. Technical review: file exists, dimensions match target, alpha is real when required, no fake checkerboard, no watermark.
3. Gameplay review: pose reads at gameplay scale and flashlight direction supports player-facing mechanics.
4. Promotion review: only approved contact sheets move to `art/approved_contact_sheets/`; only sliced and tiered runtime exports move to `public/assets`.
