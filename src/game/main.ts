import { AUTO, Game, Scale } from 'phaser';
import { HEIGHT, WIDTH } from './worlds/hermes/room';
import { Game as HermesScene } from './scenes/Game';

export default function startGame(parent: string): Game {
    return new Game({
        type: AUTO,
        width: WIDTH,
        height: HEIGHT,
        parent,
        pixelArt: true,
        scale: { mode: Scale.FIT, autoCenter: Scale.CENTER_BOTH },
        scene: [HermesScene],
    });
}
