import { AUTO, Game, Scale } from 'phaser';
import { GAME_VIEWPORT } from './viewport';
import { Cutscene } from './scenes/Cutscene';
import { Game as AdventureScene } from './scenes/Game';
import { Vesper } from './scenes/Vesper';
import '../vesper.css';

export default function startGame(parent: string): Game {
    return new Game({
        type: AUTO,
        ...GAME_VIEWPORT,
        parent,
        scale: { mode: Scale.FIT },
        scene: [Cutscene, AdventureScene, Vesper],
    });
}
