import StartGame from './game/main';
import { loadGameFonts } from './game/typography';

document.addEventListener('DOMContentLoaded', async () => {

    await loadGameFonts();
    StartGame('game-container');

});
