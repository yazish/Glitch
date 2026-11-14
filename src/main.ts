import StartGame from './game/main';
import { loadGameFonts } from './game/typography';

document.addEventListener('DOMContentLoaded', async () => {

    await loadGameFonts();
    StartGame('game-container');

    if (import.meta.env.DEV) {
        const link = document.createElement('a');
        link.href = `${import.meta.env.BASE_URL}vesper.html`;
        link.textContent = 'Open Level 4 preview';
        document.querySelector('#hermes-help')?.append(link);
    }

});
