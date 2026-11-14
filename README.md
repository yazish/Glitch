# Glitch

Glitch is a Phaser browser puzzle game. The playable route covers Hermes, the Forgotten Outpost, and the three connected areas of Viridia.

## Run locally

Use Node.js 22.

```sh
npm ci
npm run dev-nolog
```

Open the URL printed by Vite. Move with WASD or the arrow keys. Find the star compass and press Space near the SING!!! cue to extend the bridge. You can also enable the microphone, stay quiet during calibration, then hum near the cue. In the anchor chamber, stand on the pressure plate and press R. Let your Shadow Echo hold the plate while you pass through the gate. Use the Echo again at the sundial and align its three symbols to recover the first Waymark. Walk through the departure gateway to reach Viridia.

Hermes scrolls horizontally from the outpost to the anchor chamber. The first bridge crossing secures it for the return trip. Walking out of the chamber clears its Echo. Esc restarts the current area and clears its Echo. The star compass, secured bridge, and collected Waymark are kept until you reload the page.


In Viridia, use E to interact and follow the sound prompt beside each prop. Tap Space for soft sounds and loud bursts, or hold it for sustained charge. The optional microphone accepts the same actions. At the Heart Tree, rewind with R to leave an Echo on the seal plate. Press E at the Waymark pedestal and at the lit exit portal to finish the level.

The [Viridia art slots](public/assets/viridia/README.md) show where to put the background and floor PNGs. Placeholder scenery is used when those layers are absent.

## Code and art

- `src/game/prologue/panels.ts` defines the intro order, captions, and illustrations. Press Next through the four panels, then Play to start Hermes, or use Skip intro. The opening four panels use 640 × 360 pixel-art SVG stills in `public/assets/prologue/`; they reuse Kobi's game sprite frames from `public/assets/characters/kobe/` to keep the character consistent. Keep captions in the panel data so they remain readable at every display size. The SVG files can be opened and edited in Krita.
- `src/game/worlds/` groups code by destination. Each world can contain multiple rooms. Add `demeter/` alongside Hermes when Demeter development starts.
- `src/game/worlds/hermes/` holds the room layouts, puzzle simulation, replay, and journey progress. The simulation runs on fixed 60 Hz steps and has no Phaser or browser dependency.
- `src/game/input/` translates keyboard and microphone input into game commands. Microphone audio is sampled locally for its volume and is neither saved nor transmitted.
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

Serve the contents of `dist/` over HTTP for keyboard play or HTTPS for microphone play. Localhost supports microphone access during development. Embedded hosting can also require microphone permission from the parent page. Space is available when the microphone is unavailable.
