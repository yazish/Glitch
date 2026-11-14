import { AUTO, Game, Scale } from 'phaser';
import { Vesper } from './game/scenes/Vesper';
import { GAME_VIEWPORT } from './game/viewport';
import { VesperPreviewProgress } from './game/worlds/vesper/progress';
import { loadGameFonts } from './game/typography';

async function startVesper(): Promise<void> {
    await loadGameFonts();
    const game = new Game({
        type: AUTO,
        ...GAME_VIEWPORT,
        parent: 'game-container',
        scale: { mode: Scale.FIT },
    });

    game.events.once('ready', () => {
        game.scene.add('Vesper', Vesper, true, { progress: new VesperPreviewProgress() });
    });
}

void startVesper();
