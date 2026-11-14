Original procedurally generated snow tiles, 32x32 px, free to use in any project.

tiles/            one PNG per tile
atlas_8cols.png  all tiles in one sheet, 8 columns, row-major in the order below
preview.png      3x labelled preview

Seamless: all base tiles (fresh..scattered, patchy, over_*) wrap on all sides.

Edge/corner naming (ground rectangle surrounded by snow, edge line at tile midpoint):
  *_snow_top/bottom/left/right  snow on that side, ground on the other
  *_ground_corner_XX            ground only in that quadrant (convex corner of the ground area)
  *_snow_corner_XX              snow only in that quadrant (concave corner of the ground area)

Atlas order:
   0 (col 0, row 0)  fresh_snow
   1 (col 1, row 0)  fluffy_snow
   2 (col 2, row 0)  smooth_snow
   3 (col 3, row 0)  compact_snow
   4 (col 4, row 0)  icy_snow
   5 (col 5, row 0)  deep_snow
   6 (col 6, row 0)  crusted_snow
   7 (col 7, row 0)  wind_swept_snow
   8 (col 0, row 1)  trodden_snow
   9 (col 1, row 1)  snow_footprints
  10 (col 2, row 1)  snow_tracks
  11 (col 3, row 1)  snow_drifts
  12 (col 4, row 1)  snow_dunes
  13 (col 5, row 1)  slushy_snow
  14 (col 6, row 1)  frozen_ground
  15 (col 7, row 1)  scattered_snow
  16 (col 0, row 2)  thin_snow
  17 (col 1, row 2)  patchy_snow
  18 (col 2, row 2)  snow_over_dirt
  19 (col 3, row 2)  snow_over_grass
  20 (col 4, row 2)  snow_over_stone
  21 (col 5, row 2)  stone_snow_top
  22 (col 6, row 2)  stone_snow_bottom
  23 (col 7, row 2)  stone_snow_left
  24 (col 0, row 3)  stone_snow_right
  25 (col 1, row 3)  stone_ground_corner_tl
  26 (col 2, row 3)  stone_ground_corner_tr
  27 (col 3, row 3)  stone_ground_corner_bl
  28 (col 4, row 3)  stone_ground_corner_br
  29 (col 5, row 3)  stone_snow_corner_tl
  30 (col 6, row 3)  stone_snow_corner_tr
  31 (col 7, row 3)  stone_snow_corner_bl
  32 (col 0, row 4)  stone_snow_corner_br
  33 (col 1, row 4)  dirt_snow_top
  34 (col 2, row 4)  dirt_snow_bottom
  35 (col 3, row 4)  dirt_snow_left
  36 (col 4, row 4)  dirt_snow_right
  37 (col 5, row 4)  dirt_ground_corner_tl
  38 (col 6, row 4)  dirt_ground_corner_tr
  39 (col 7, row 4)  dirt_ground_corner_bl
  40 (col 0, row 5)  dirt_ground_corner_br
  41 (col 1, row 5)  dirt_snow_corner_tl
  42 (col 2, row 5)  dirt_snow_corner_tr
  43 (col 3, row 5)  dirt_snow_corner_bl
  44 (col 4, row 5)  dirt_snow_corner_br
