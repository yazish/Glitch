import StartGame from './game/main';

document.addEventListener('DOMContentLoaded', () => {

    StartGame('game-container');

    if (import.meta.env.DEV) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = 'Developer: Open Level 4';
        button.addEventListener('click', () => {
            window.location.assign(`${import.meta.env.BASE_URL}vesper.html`);
        });
        document.querySelector('header')?.append(button);
    }

});
