# PILEUP - Production Asset Checklist

## Character and enemy animation minimums

### Player
- idle
- walk
- run
- depth_step_up
- depth_step_down
- flashlight_forward
- flashlight_background
- flashlight_foreground
- search
- broom_attack
- spray_use
- hurt
- grab_escape
- unlock_door
- death/fail

### Laundry Pile Monster
- dormant_pile
- eye_open
- awaken
- crawl
- background_peek
- foreground_lunge
- attack_swipe
- attack_grab
- freeze_in_light
- light_lunge
- stunned
- retreat/death

### Socklings
- dormant_socks
- scatter
- swarm_move
- jump_attack
- hit
- disperse

### Drawer Mimic
- closed_idle
- suspicious_twitch
- reveal
- bite
- grab_hold
- stunned
- reset

### Hanging Coat Stalker
- hanging_idle
- silhouette_shift
- stalk_background
- foreground_drop
- lunge
- retreat

### Door Boss
- door_block_idle
- clutter_surge
- foreground_grab
- background_collapse
- main_lane_lunge
- stunned_segment
- pullback
- final_break

## Environment assets for Level 01

### Bedroom
- far wall layer
- dresser/shelf background layer
- bed/main floor layer
- toy/laundry foreground layer
- search piles: laundry, toy bin, backpack, under-bed, drawer

### Hallway
- family photos wall layer
- coat rack/closet background
- shoe/mail pile main clutter
- foreground banister/hanging coats

### Bathroom
- mirror/sink background
- laundry hamper main pile
- tub curtain foreground
- medicine cabinet searchable

### Kitchen
- counters/background dishes
- main floor trash/laundry/dishes
- foreground table/chair occluders
- cabinets/search drawers

### Living room / front door
- front door boss setup
- couch foreground
- coffee table/main clutter
- family photo wall background
- final escape VFX

## Export QA checklist

- All final sprites are RGBA PNG.
- No fake checkerboard remains.
- Each animation has equal frame dimensions.
- Each animation has consistent anchor point.
- Hitbox and hurtbox metadata exists.
- Frame filenames and sheet metadata match.
- Tested in engine at 720p, 1080p, and target camera zoom.
- UI readable at 720p.
- Parallax layers separated cleanly.
- Foreground occlusion never hides unavoidable damage.
- Prototype references archived separately from final production assets.


## Responsive display QA gate

Before any art is accepted as production-ready, verify:

- [ ] Source art exists at the approved source tier.
- [ ] Runtime exports exist for mobile, standard desktop, and high/4K where applicable.
- [ ] No production background is a single stretched image.
- [ ] Foreground and background layers include overscan bleed.
- [ ] Sprites have clean alpha, consistent pivots, and no fake checkerboard.
- [ ] Sprite animations are tested at phone size and 4K size.
- [ ] HUD anchors correctly to safe areas at 16:9, 16:10, 21:9, and phone landscape.
- [ ] Touch targets are at least 44-48 logical px on phone/tablet.
- [ ] Text remains readable on phone and is not tiny on 4K.
- [ ] Ultrawide shows additional environment or parallax, not stretched art or empty void.
- [ ] The flashlight beam remains readable for foreground/main/background inspection.
- [ ] The room still feels the same length because gameplay units, not pixels, control movement.
