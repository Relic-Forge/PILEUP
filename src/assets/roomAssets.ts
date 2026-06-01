export const WINDOW_OUTSIDE_WORLD_TEXTURE_KEY = 'room-window-outside-world-v0-1';
export const WINDOW_OUTSIDE_WORLD_URL = `${import.meta.env.BASE_URL}assets/rooms/level01/outside_world/window_outside_world_layer_v0_1.png`;

export const BEDROOM_WALL_BASE_TEXTURE_KEY = 'bedroom-wall-base-v0-1';
export const BEDROOM_BASEBOARD_TEXTURE_KEY = 'bedroom-baseboard-v0-1';
export const BEDROOM_CARPET_FLOOR_TEXTURE_KEY = 'bedroom-carpet-floor-v0-1';
export const BEDROOM_WALL_BASE_URL = `${import.meta.env.BASE_URL}assets/rooms/level01/bedroom/wall_base/v0_1/bedroom_wall_base_v0_1_5120x768.png`;
export const BEDROOM_BASEBOARD_URL = `${import.meta.env.BASE_URL}assets/rooms/level01/bedroom/wall_base/v0_1/bedroom_baseboard_v0_1_5120x192.png`;
export const BEDROOM_CARPET_FLOOR_URL = `${import.meta.env.BASE_URL}assets/rooms/level01/bedroom/flooring/v0_1/bedroom_carpet_floor_v0_1_5120x640.png`;

export interface BedroomStaticPropAsset {
  id: string;
  textureKey: string;
  file: string;
}

export const BEDROOM_STATIC_PROP_PACK_KEY = 'bedroom-static-props-v0-1';
export const BEDROOM_STATIC_PROP_BASE_URL = `${import.meta.env.BASE_URL}assets/rooms/level01/bedroom/static_props/v0_1`;
export const BEDROOM_STATIC_PROP_PACK_URL = `${BEDROOM_STATIC_PROP_BASE_URL}/bedroom_static_props_v0_1.asset.json`;

export const BEDROOM_STATIC_PROP_ASSETS: BedroomStaticPropAsset[] = [
  {
    id: 'overflowing_laundry_basket',
    textureKey: 'bedroom-static-prop-overflowing_laundry_basket-v0-1',
    file: 'bedroom_static_prop_01_overflowing_laundry_basket_v0_1.png',
  },
  {
    id: 'dirty_clothes_mound',
    textureKey: 'bedroom-static-prop-dirty_clothes_mound-v0-1',
    file: 'bedroom_static_prop_02_dirty_clothes_mound_v0_1.png',
  },
  {
    id: 'child_bed_corner',
    textureKey: 'bedroom-static-prop-child_bed_corner-v0-1',
    file: 'bedroom_static_prop_03_child_bed_corner_v0_1.png',
  },
  {
    id: 'nightstand_lamp',
    textureKey: 'bedroom-static-prop-nightstand_lamp-v0-1',
    file: 'bedroom_static_prop_04_nightstand_lamp_v0_1.png',
  },
  {
    id: 'toy_bin_spill',
    textureKey: 'bedroom-static-prop-toy_bin_spill-v0-1',
    file: 'bedroom_static_prop_05_toy_bin_spill_v0_1.png',
  },
  {
    id: 'small_chair_clothes',
    textureKey: 'bedroom-static-prop-small_chair_clothes-v0-1',
    file: 'bedroom_static_prop_06_small_chair_clothes_v0_1.png',
  },
  {
    id: 'battered_plush',
    textureKey: 'bedroom-static-prop-battered_plush-v0-1',
    file: 'bedroom_static_prop_07_battered_plush_v0_1.png',
  },
  {
    id: 'scattered_books_comics',
    textureKey: 'bedroom-static-prop-scattered_books_comics-v0-1',
    file: 'bedroom_static_prop_08_scattered_books_comics_v0_1.png',
  },
  {
    id: 'toy_truck_blocks',
    textureKey: 'bedroom-static-prop-toy_truck_blocks-v0-1',
    file: 'bedroom_static_prop_09_toy_truck_blocks_v0_1.png',
  },
  {
    id: 'backpack_shoes_pile',
    textureKey: 'bedroom-static-prop-backpack_shoes_pile-v0-1',
    file: 'bedroom_static_prop_10_backpack_shoes_pile_v0_1.png',
  },
  {
    id: 'tipped_cardboard_box',
    textureKey: 'bedroom-static-prop-tipped_cardboard_box-v0-1',
    file: 'bedroom_static_prop_11_tipped_cardboard_box_v0_1.png',
  },
  {
    id: 'low_dresser_crates',
    textureKey: 'bedroom-static-prop-low_dresser_crates-v0-1',
    file: 'bedroom_static_prop_12_low_dresser_crates_v0_1.png',
  },
];

export const bedroomStaticPropUrl = (file: string): string => `${BEDROOM_STATIC_PROP_BASE_URL}/${file}`;
