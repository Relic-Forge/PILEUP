# Player Child Contact Sheet v0.2 QA

Asset ID: `character.player_child`

Batch ID: `character.player_child.contact_sheet.v0_2.2026_05_30`

## Output Files

- Raw generated source: `art/source/characters/player_child/player_child_contact_sheet_v0_2_candidate.png`
- Cleaned review candidate: `art/source/characters/player_child/player_child_contact_sheet_v0_2_candidate_rgba.png`

## Prompt Matrix

| Variant | Pose target | Required read | Status |
|---|---|---|---|
| idle | flashlight forward | small child silhouette, cautious stance | candidate |
| walk | cautious movement | tense forward motion, carried item retained | candidate |
| search | searching clutter | hand interaction and flashlight support | candidate |
| hurt | recoil | vulnerable non-heroic body language | candidate |
| high aim | flashlight high/deep | readable upward beam direction | candidate |
| door unlock | front-door escape | nervous lock interaction, flashlight retained | candidate |

## Automated Checks

- File exists: pass.
- Cleaned PNG dimensions: 1536x1024.
- Cleaned PNG format: RGBA.
- Bundle size: about 1.6 MB for the raw generated source.

## Visual Review

Pass:

- Six distinct player poses are present.
- Flashlight direction reads in all poses.
- Character scale and body language match the child survivor identity.
- Palette fits the muted home-at-night direction.

Caveats:

- Raw generation included a baked checkerboard and had no alpha channel.
- `scripts/prepare-contact-sheet.mjs` cleaned near-white checker pixels into alpha for the review candidate.
- The sheet is not sliced, pivoted, or exported into runtime tiers.
- Door and clutter props appear inside two poses; acceptable for identity review, but separate runtime animation frames should isolate or layer props deliberately.

Decision:

Keep as a candidate identity contact sheet. Do not promote to approved art or runtime exports until art-direction review confirms the identity and a follow-up sprite-sheet pass produces sliced, pivoted, tiered frames.
