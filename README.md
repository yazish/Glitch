# Glitch

Glitch is a Phaser browser puzzle game. The first playable build covers Hermes, the Forgotten Outpost.

## Run locally

Use Node.js 22.

```sh
npm ci
npm run dev-nolog
```

Open the URL printed by Vite. Move with WASD or the arrow keys. Find the star map and press Space near the receiver to extend the bridge. You can also enable the microphone, stay quiet during calibration, then hum at the receiver. In the anchor chamber, stand on the pressure plate and press R. Let your Shadow Echo hold the plate while you pass through the gate. Touch the anchor to recover the Waymark, then enter the departure gateway.

Esc restarts the current room and clears its Echo. The star map and collected Waymark are kept until you reload the page.

## Code and art

- `src/game/prologue/panels.ts` defines the intro order, captions, and illustrations. Press Next through the four panels, then Play to start Hermes, or use Skip intro. To replace a placeholder, put the still in `public/assets/prologue/` and set that panel's `image` to the filename. Use 16:9 stills with captions kept in the panel data.
- `src/game/worlds/` groups code by destination. Each world can contain multiple rooms. Add `demeter/` alongside Hermes when Demeter development starts.
- `src/game/worlds/hermes/` holds the room layouts, puzzle simulation, replay, and journey progress. The simulation runs on fixed 60 Hz steps and has no Phaser or browser dependency.
- `src/game/input/` translates keyboard and microphone input into game commands. Microphone audio is sampled locally for its volume and is neither saved nor transmitted.
- `src/game/scenes/` connects inputs and the simulation to the Phaser room view and the HTML interface.
- `public/assets/` is for exported game art and sound. The current view draws placeholders. The game view is 640 × 360 with a 32 px grid. Start with 48 × 48 px Kobe frames and a consistent foot position, plus a floor tile and matching open/closed gate sprites.

## Verify and build

```sh
npm run typecheck
npm test
npm run build-nolog
```

Serve the contents of `dist/` over HTTP for keyboard play or HTTPS for microphone play. Localhost supports microphone access during development. Embedded hosting can also require microphone permission from the parent page. Space is available when the microphone is unavailable.
