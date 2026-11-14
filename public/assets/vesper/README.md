# Vesper artwork

The standalone preview uses Phaser-drawn placeholders and the shared Kobi sprite. The geometry and timing live in the simulation. When adding art, use matching bounds and anchors so a visible enemy, weak point, or piece of cover agrees with hit testing.

| Suggested file | Content | Frame and anchor |
| --- | --- | --- |
| `weapons-case.png` | Shotgun and blade supply case at the street entrance | Ground contact centered on the pickup |
| `shotgun.png`, `blade.png` | Held weapon frames for four directions and a short blade swing | Grip aligned to Kobi’s hand, muzzle and blade tip separate from effects |
| `riftborn-idle.png`, `riftborn-walk.png` | One bipedal creature, four facing directions | 48 × 64 px, feet at (24, 60) |
| `riftborn-attack.png`, `riftborn-hit.png`, `riftborn-death.png` | Claw warning and swipe, hit flash, dissolve | 48 × 64 px, same foot anchor |
| `rift-drake-idle.png`, `rift-drake-attack.png` | Single angle, wings spread, hover and attack poses | 192 × 160 px, ground shadow centered at (96, 154) |
| `rift-drake-armor.png`, `rift-drake-stagger.png`, `rift-drake-death.png` | Closed/open chest, stagger, defeat | Same drake frame and shadow anchor |
| `street-backdrop.png`, `avenue-backdrop.png`, `crown-backdrop.png` | Outdoor city, transmission pylons and rings, rift and transmitter | 640 px wide, horizon at y=142 |
| `street-gate.png`, `resonator.png`, `rift-barrier.png`, `waymark-seal.png`, `earth-portal.png` | Independent fixtures with separate state frames | Center the ground contact on the fixture position in the layout |

Put frames in consistently sized grid cells, document frame order and animation timing with the export, and use transparency for sprites, independent fixtures, and effects. Keep the muzzle flash, melee sweep, and attack warning footprints in the gameplay layer. These filenames are handoff slots. The placeholder build has no dependencies on these files.

## Contributor preview

From the repository root, run `npm ci` and `npm run dev-nolog -- --port 8084 --strictPort`.
Open [Vesper on port 8084](http://localhost:8084/vesper.html). The preview starts with three
Waymarks. It supports the full route through the Earth arrival. Use **Show placeholder labels**
under the arena to match the visual labels to the checklist below.

To package the standalone preview, run `npx --no-install vite build --config vite/config.vesper.mjs`
and serve `dist/vesper` over HTTP. Open `vesper.html` in that build.

Put artwork in `public/assets/vesper/` and wire replacements in the Vesper-specific renderer
(`src/game/scenes/VesperView.ts`) or cinematic (`src/game/scenes/VesperCinematic.ts`). The names
below are suggested filenames. Adding a file alone does not replace the drawn placeholder.
See `src/game/worlds/vesper/layout.ts` for the placement and cover geometry.

Keep artwork changes on a branch created from `level-4`. When the art is ready, merge that branch
into the campaign branch. Campaign entry is a separate change. The Vesper scene accepts a
`VesperProgress` adapter for reading the campaign Waymark count and recording the fourth Waymark.

## Placeholder checklist by area

Enable **Show placeholder labels** beneath the Vesper canvas to identify assets in the scene. The development preview enables it by default. Each row groups assets that can share a sheet.

| Area | Assets to replace |
| --- | --- |
| Breached Streets | Violet sky, moon, wrecked aircraft, ruined skyline silhouettes, road tiles and lane marks |
| Breached Streets cover | Collapsed building, stone rubble, broken wall, watchtower base |
| Breached Streets fixtures | Shotgun and blade case, southeast district gate in closed and open states |
| Transmitter Avenue | Teal sky, skyline, resonance pylons, floor tiles and glowing conduits |
| Transmitter Avenue cover | Cargo crates, generator housing, pipe barricade, broken conduit, pylon foundation |
| Transmitter Avenue fixtures | Resonance amplifier, calibration panel and needle, firing-position marker, shield barrier, barrier core in intact and cracked states, northeast gate |
| Celestial Crown | Rift sky, orbital rings, ruined skyline, arena floor and ring inlays, west and east stone buttresses |
| Celestial Crown fixtures | Waymark pedestal, floating Waymark, transmitter lectern with four Waymark slots in empty and lit states, Kobi hologram, Earth portal |
| Actors and equipment | Kobi sprite, held shotgun, blade and melee swing, Riftborn, Rift Drake and chest crystal with intact and broken armor |
| Combat effects | Riftborn spawn marker, claw warning, muzzle flash, three shotgun pellets, resonance cannon projectile, impact sparks, armor deflection, shield bubble and block, damage flash, dissolve particles, Rift Drake orb and aim line, beam lane, shockwave ring, and Drake defeat particles |
| Portal sequence | Portal interior and luminous rings, wind streaks, Kobi pulled toward the entrance, abyss tunnel rings and streaks, tumbling Kobi flight pose |

The canvas is 640 × 360. Cover assets use the footprint and height in the Vesper layout. Align the bottom of each prop to that footprint so its depth and collision match. The portal sits at the far right and intentionally extends beyond the frame. The cutscene uses the shared Kobi sprite as its flight placeholder.
