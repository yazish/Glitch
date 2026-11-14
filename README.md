# Glitch

Glitch is a Phaser browser puzzle game. The playable route starts at the Forgotten Outpost on Hermes and continues through Viridia, Borealis, and Vesper before Kobi reaches Earth.

## Run locally

Use Node.js 22.

```sh
npm ci
npm run dev-nolog
```

Open the URL printed by Vite. Move with WASD or the arrow keys. Find the Star Compass, enable the microphone, and stay quiet during calibration. Hum steadily near the SING!!! cue to extend the bridge. In the anchor chamber, stand on the pressure plate and press R. Let your Shadow Echo hold the plate while you pass through the gate. Use the Echo again at the sundial and align its three symbols to recover the first Waymark. Walk into the departure gateway to teleport to Viridia's Arrival Clearing. Gateways between worlds are one-way.

Hermes scrolls horizontally from the outpost to the anchor chamber. The first bridge crossing secures it for the return trip. Walking out of the chamber clears its Echo. Esc restarts the current area and clears its Echo. The star compass, secured bridge, and collected Waymark are kept until you reload the page.


In Viridia, use E to interact and follow the sound prompt beside each prop. Enable the microphone and make a short soft sound, a loud burst, or a steady hum as indicated. At the Heart Tree, rewind with R to leave an Echo on the seal plate. Press E at the Waymark pedestal and at the lit exit portal to reach Borealis.

In Borealis, press F near a wind vane and use E for physical interactions. Follow the Star Compass through the Windward Pass, Frozen Basin, and Skybreak Summit. Use R to rewind to the current area entrance and leave an optional Shadow Echo, or Esc to reset the current puzzle attempt. Make a short, soft sound near the resonant ice to reveal an optional etching.

Enter the portal at the end of Borealis to reach Vesper. Vesper introduces the shotgun (K), melee (L), and shield (F or right click). Press E to calibrate the amplifier when the needle reaches the striped zone. Enable the microphone and snap or clap to fire the resonance cannon. Follow the objectives to recover the fourth and final Waymark and open the Earth portal. The campaign ends when Kobi arrives on Earth.

The [Viridia art slots](public/assets/viridia/README.md) show where to put the background and floor PNGs. Placeholder scenery is used when those layers are absent.

## Code and art

- `src/game/cutscenes/sequences.ts` defines the opening, the three portal transitions, and the Earth finale. The opening reuses the four pixel-art stills in `public/assets/prologue/`. The other scenes combine the game’s existing sprites and backgrounds with Phaser effects. The finale uses the supplied campus artwork at `public/assets/cutscenes/university-of-manitoba.png`. Captions stay in the HTML interface.
- `src/game/worlds/` groups code by destination. Each world can contain multiple rooms.
- `src/game/worlds/hermes/` holds the room layouts, puzzle simulation, replay, and journey progress. The simulation runs on fixed 60 Hz steps and has no Phaser or browser dependency.
- `src/game/input/` handles keyboard commands and detects microphone sounds. Microphone audio is sampled locally for its volume and is neither saved nor transmitted.
- `src/game/scenes/` connects inputs and the simulation to the Phaser room view and the HTML interface.
- `public/assets/` is for exported game art and sound. The current view draws placeholders. The game view is 640 × 360 with a 32 px grid. Start with 48 × 48 px Kobi frames and a consistent foot position, plus a floor tile and matching open/closed gate sprites.

Hermes outpost background uses [Parallax Terrestrial Planet](https://kayillustrations.itch.io/parallax-terrestrial-planet) by **kayillustrations**, licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Glitch uses four layers, scaled 2× and darkened in-game.

Hermes uses ground and decorations from the Free Cursed Land Top Down Pixel Art Tileset; its included license points to [CraftPix's file licenses](https://craftpix.net/file-licenses/). The floor combines its ground tile with crack and spot details. The bridge uses the Wood Texture Pack by Owletrius, marked [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).

## Verify and build

```sh
npm run typecheck
npm test
npm run build-nolog
```

Serve the contents of `dist/` over HTTPS so the browser can grant microphone access. Localhost supports microphone access during development. An embedded game may also need microphone permission from the parent page. The campaign requires microphone access for its sound puzzles.
