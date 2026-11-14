# Viridia art slots

For each area, place optional PNGs in its folder. The current game draws the missing layers and all interactive props.

| Area | Folder | Background slot | Floor slot |
| --- | --- | --- | --- |
| Arrival Clearing | arrival | 592 × 142 px | 592 × 218 px |
| Rootbound Trail | trail | 560 × 142 px | 560 × 218 px |
| Heart Tree | heart | 704 × 142 px | 704 × 218 px |

Name the files `background.png` and `floor.png`. The floor starts at screen y 142 and runs to the bottom. Each layer scrolls with its area.

The prop placeholders are drawn in `ViridiaView.ts` at positions from `layout.ts`. Swap the drawing for sprites or renders from the same top-down angle. Keep collision and interaction zones in the layout. The seal and pedestal have separate visual states.
