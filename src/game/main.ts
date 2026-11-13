import { AUTO, Game, Scale } from 'phaser';
import { HEIGHT, WIDTH } from './viewport';
import { prologuePanels } from './prologue/panels';
import { Prologue } from './scenes/Prologue';
import { Game as HermesScene } from './scenes/Game';

export default function startGame(parent: string): Game {
    const prologue = new Prologue(prologuePanels, () => prologue.scene.start('Game'));
    return new Game({
        type: AUTO,
        width: WIDTH,
        height: HEIGHT,
        parent,
        pixelArt: true,
        scale: { mode: Scale.FIT, autoCenter: Scale.CENTER_BOTH },
        scene: [prologue, HermesScene],
    });
}
