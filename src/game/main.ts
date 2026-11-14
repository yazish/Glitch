import { AUTO, Game, Scale } from 'phaser';
import { HEIGHT, WIDTH } from './viewport';
import { Cutscene } from './scenes/Cutscene';
import { Game as AdventureScene } from './scenes/Game';
import { Vesper } from './scenes/Vesper';
import '../vesper.css';

export default function startGame(parent: string): Game {
    return new Game({
        type: AUTO,
        width: WIDTH,
        height: HEIGHT,
        parent,
        pixelArt: true,
        scale: { mode: Scale.FIT, autoCenter: Scale.CENTER_BOTH },
        scene: [Cutscene, AdventureScene, Vesper],
    });
}
