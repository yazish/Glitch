import { Scene } from 'phaser';
import { hermes, STEP_MS } from '../worlds/hermes/room';
import { HermesSimulation } from '../worlds/hermes/simulation';
import { KeyboardControls } from '../input/keyboard';
import { Microphone } from '../input/microphone';
import { preloadKobi } from './CharacterView';
import { HermesHud } from './HermesHud';
import { DEPARTURE_GATEWAY_TEXTURE, STAR_COMPASS_TEXTURE, WAYMARK_SCROLL_TEXTURE, HermesView } from './HermesView';
import { preloadOutpostBackground } from './OutpostBackground';
import { preloadHermesTerrain } from './HermesTerrainAssets';

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

    preload(): void {
        preloadKobi(this);
        preloadOutpostBackground(this);
        preloadHermesTerrain(this);
        this.load.image(WAYMARK_SCROLL_TEXTURE, `${import.meta.env.BASE_URL}assets/hermes/props/waymark-scroll.png`);
        this.load.image(STAR_COMPASS_TEXTURE, `${import.meta.env.BASE_URL}assets/hermes/props/star-compass.png`);
        this.load.image(
            DEPARTURE_GATEWAY_TEXTURE,
            `${import.meta.env.BASE_URL}assets/hermes/props/departure-gateway.png`,
        );
    }

    create(): void {
        this.simulation = new HermesSimulation(hermes);
        this.microphone = new Microphone();
        this.hud = new HermesHud();
        this.view = new HermesView(this, hermes);
        this.elapsed = 0;

        const gameElement = document.querySelector<HTMLElement>('#game-container')!;
        document.querySelector<HTMLElement>('#game-hud')!.hidden = false;
        document.querySelector<HTMLElement>('#location')!.hidden = false;
        gameElement.setAttribute('aria-label', 'Hermes game room');
        gameElement.focus({ preventScroll: true });
        this.keyboard = new KeyboardControls(gameElement, (command) => {
            const previous = this.simulation.state.player;
            this.simulation.command(command);
            if (command !== 'activateBridge') {
                this.elapsed = 0;
                const player = this.simulation.state.player;
                if (player.x !== previous.x || player.y !== previous.y) this.render(0, true);
            }
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
        this.render(0, true);
    }

    update(_time: number, delta: number): void {
        const { horizontal, vertical } = this.keyboard.movement;
        this.elapsed += Math.min(delta, 100);
        while (this.elapsed >= STEP_MS) {
            this.simulation.step(horizontal, vertical);
            this.elapsed -= STEP_MS;
        }

        const state = this.simulation.state;
        if (state.screen === 'outpost' && !state.bridgePermanent) {
            if (this.microphone.poll(delta, state.canActivateBridge)) this.simulation.command('activateBridge');
        } else if (this.microphone.status !== 'off') {
            this.microphone.disable();
        }
        this.render(delta);
    }

    private render(delta: number, snap = false): void {
        const state = this.simulation.state;
        this.view.render(state, delta, snap);
        this.hud.render(state, this.microphone.status, this.microphone.level);
    }
}
