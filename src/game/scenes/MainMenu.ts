import { Scene } from 'phaser';
import './MainMenu.css';

export class MainMenu extends Scene {
    constructor() {
        super('MainMenu');
    }

    create(): void {
        const menu = document.querySelector<HTMLElement>('#main-menu')!;
        const play = menu.querySelector<HTMLButtonElement>('#play-game')!;
        const start = () => {
            play.disabled = true;
            this.scene.start('Cutscene', { id: 'opening' });
        };

        menu.hidden = false;
        play.disabled = false;
        play.addEventListener('click', start, { once: true });
        this.events.once('shutdown', () => {
            play.removeEventListener('click', start);
            menu.hidden = true;
        });
    }
}
