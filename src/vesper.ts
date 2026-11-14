import { AUTO, Game, Scale } from 'phaser';
import { Vesper } from './game/scenes/Vesper';
import { HEIGHT, WIDTH } from './game/viewport';
import { VesperPreviewProgress } from './game/worlds/vesper/progress';

const game = new Game({
    type: AUTO,
    width: WIDTH,
    height: HEIGHT,
    parent: 'game-container',
    pixelArt: true,
    scale: { mode: Scale.FIT, autoCenter: Scale.CENTER_BOTH },
});

game.events.once('ready', () => {
    game.scene.add('Vesper', Vesper, true, { progress: new VesperPreviewProgress() });
});
