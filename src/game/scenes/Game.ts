import { Scene } from 'phaser';
import { hermes, STEP_MS } from '../hermes/room';
import { HermesSimulation } from '../hermes/simulation';
import { KeyboardControls } from '../input/keyboard';
import { Microphone } from '../input/microphone';
import { HermesHud } from './HermesHud';
import { HermesView } from './HermesView';

export class Game extends Scene {
    private simulation: HermesSimulation;
    private microphone: Microphone;
    private keyboard: KeyboardControls;
    private hud: HermesHud;
    private view: HermesView;
    private elapsed = 0;

    constructor() {
        super('Game');
    }

    create(): void {
        this.simulation = new HermesSimulation(hermes);
        this.microphone = new Microphone();
        this.hud = new HermesHud();
        this.view = new HermesView(this, hermes);
        this.elapsed = 0;

        const gameElement = document.querySelector<HTMLElement>('#game-container')!;
        this.keyboard = new KeyboardControls(gameElement, (command) => {
            this.simulation.command(command);
            if (command !== 'activateBridge') this.elapsed = 0;
        });

        const toggleMicrophone = (event: MouseEvent) => {
            if (event.detail > 0) gameElement.focus({ preventScroll: true });
            if (['ready', 'calibrating', 'requesting'].includes(this.microphone.status)) {
                this.microphone.disable();
            } else {
                void this.microphone.enable();
            }
        };
        const stopMicrophone = () => this.microphone.disable();
        this.hud.micButton.addEventListener('click', toggleMicrophone);
        window.addEventListener('pagehide', stopMicrophone);
        this.events.once('shutdown', () => {
            stopMicrophone();
            this.keyboard.destroy();
            this.hud.micButton.removeEventListener('click', toggleMicrophone);
            window.removeEventListener('pagehide', stopMicrophone);
        });
        this.render();
    }

    update(_time: number, delta: number): void {
        const { horizontal, vertical } = this.keyboard.movement;
        this.elapsed += Math.min(delta, 100);
        while (this.elapsed >= STEP_MS) {
            this.simulation.step(horizontal, vertical);
            this.elapsed -= STEP_MS;
        }

        const state = this.simulation.state;
        if (state.screen === 'outpost') {
            if (this.microphone.poll(delta, state.canActivateBridge)) this.simulation.command('activateBridge');
        } else if (this.microphone.status !== 'off') {
            this.microphone.disable();
        }
        this.render();
    }

    private render(): void {
        const state = this.simulation.state;
        this.view.render(state);
        this.hud.render(state, this.microphone.status, this.microphone.level);
    }
}
