export const WIDTH = 640;
export const HEIGHT = 360;

// The browser shell sizes the canvas. Scene cameras and input stay in this
// fixed coordinate space, including when the browser window changes size.
export const GAME_VIEWPORT = {
    width: WIDTH,
    height: HEIGHT,
    pixelArt: true,
};
