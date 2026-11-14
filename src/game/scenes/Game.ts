import { Scene } from 'phaser';
import { hermes, STEP_MS } from '../worlds/hermes/room';
import { Adventure } from '../worlds/adventure';
import { borealis as borealisLayout } from '../worlds/borealis/layout';
import { BorealisHud } from './BorealisHud';
import { BorealisView } from './BorealisView';
import { preloadBorealisScenery } from './BorealisScenery';
import { preloadBorealisProps } from './BorealisProps';
import { viridia as viridiaLayout } from '../worlds/viridia/layout';
import type { SoundInput } from '../input/commands';
import { FollowCamera } from './FollowCamera';
import { ViridiaHud } from './ViridiaHud';
import { ViridiaView } from './ViridiaView';
import { preloadViridiaScenery } from './ViridiaScenery';
import { KeyboardControls } from '../input/keyboard';
import { Microphone } from '../input/microphone';
import { preloadKobe, prepareKobeWalkFrames } from './KobeSprites';
import { HermesHud } from './HermesHud';
import { DEPARTURE_GATEWAY_TEXTURE, STAR_COMPASS_TEXTURE, WAYMARK_SCROLL_TEXTURE, HermesView } from './HermesView';
import { preloadOutpostBackground } from './OutpostBackground';
import { preloadHermesTerrain } from './HermesTerrainAssets';
import { preloadCircularMachine } from './CircularMachineView';
import { preloadViridiaProps } from './ViridiaProps';
import { preloadViridiaMagic } from './ViridiaMagic';

export class Game extends Scene {
    private adventure: Adventure;
    private followCamera: FollowCamera;
    private viridiaView: ViridiaView;
    private viridiaHud?: ViridiaHud;
    private borealisView?: BorealisView;
    private borealisHud?: BorealisHud;
    private voice: SoundInput = { sustained: false };
    private microphone: Microphone;
    private keyboard: KeyboardControls;
    private hud: HermesHud;
    private view: HermesView;
    private elapsed = 0;

    constructor() {
        super('Game');
    }

    preload(): void {
        preloadKobe(this);
        preloadBorealisScenery(this);
        preloadBorealisProps(this);
        preloadViridiaScenery(this, viridiaLayout);
        preloadViridiaProps(this);
        preloadViridiaMagic(this);
        preloadOutpostBackground(this);
        preloadHermesTerrain(this);
        preloadCircularMachine(this);
        this.load.image(WAYMARK_SCROLL_TEXTURE, `${import.meta.env.BASE_URL}assets/hermes/props/waymark-scroll.png`);
        this.load.image(STAR_COMPASS_TEXTURE, `${import.meta.env.BASE_URL}assets/hermes/props/star-compass.png`);
        this.load.image(
            DEPARTURE_GATEWAY_TEXTURE,
            `${import.meta.env.BASE_URL}assets/hermes/props/departure-gateway.png`,
        );
    }

    create(): void {
        prepareKobeWalkFrames(this);
        this.adventure = new Adventure();
        this.viridiaHud = undefined;
        this.borealisView = undefined;
        this.borealisHud = undefined;
        this.voice = { sustained: false };
        this.followCamera = new FollowCamera(this.cameras.main, viridiaLayout.floor.x + viridiaLayout.floor.width);
        this.viridiaView = new ViridiaView(this, viridiaLayout);
        this.microphone = new Microphone();
        this.hud = new HermesHud();
        this.view = new HermesView(this, hermes);
        this.elapsed = 0;

        const gameElement = document.querySelector<HTMLElement>('#game-container')!;
        document.querySelector<HTMLElement>('#game-hud')!.hidden = false;
        document.querySelector<HTMLElement>('#objective-guide')!.hidden = false;
        document.querySelector<HTMLElement>('#viridia-compass')!.hidden = true;
        document.querySelector<HTMLElement>('#borealis-compass-direction')!.hidden = true;
        document.querySelector<HTMLElement>('#location')!.hidden = false;
        gameElement.setAttribute('aria-label', 'Hermes game room');
        gameElement.focus({ preventScroll: true });
        document.querySelector<HTMLElement>('#game-hud .controls')!.hidden = false;
        document.querySelector<HTMLElement>('#how-to-play')!.hidden = false;
        document.querySelector<HTMLElement>('#location')!.textContent = 'Hermes · The Forgotten Outpost';
        this.keyboard = new KeyboardControls(gameElement, (command) => {
            const previous = this.adventure.player;
            this.adventure.command(command);
            if (command === 'restart' || command === 'rewind') {
                this.elapsed = 0;
                this.voice = { sustained: false };
                const player = this.adventure.player;
                this.render(0, player.x !== previous.x || player.y !== previous.y);
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
        this.pollMicrophone(delta);

        this.elapsed += Math.min(delta, 100);
        while (this.elapsed >= STEP_MS) {
            this.adventure.step(horizontal, vertical, this.voice, this.keyboard.soundHeld);
            this.voice = { sustained: this.voice.sustained };
            this.elapsed -= STEP_MS;
        }
        this.render(delta);
    }

    private pollMicrophone(delta: number): void {
        const { activeWorld, hermes, viridia, borealis } = this.adventure;
        if (activeWorld === 'hermes' && hermes.state.screen === 'outpost' && !hermes.state.bridgePermanent) {
            if (this.microphone.poll(delta, hermes.state.canActivateBridge)) this.adventure.command('activateBridge');
            return;
        }
        const available = activeWorld === 'viridia' ? viridia?.needsMicrophone : borealis?.needsMicrophone;
        if (available) {
            const sample = this.microphone.pollViridia(delta);
            this.voice = { pulse: this.voice.pulse ?? sample.pulse, sustained: sample.sustained };
        } else {
            if (this.microphone.status !== 'off') this.microphone.disable();
            this.voice = { sustained: false };
        }
    }

    private render(delta: number, snap = false): void {
        if (this.adventure.activeWorld === 'borealis') {
            this.renderBorealis(delta, snap);
            return;
        }
        const hermes = this.adventure.hermes.state;
        const viridia = this.adventure.viridia?.state;
        const playerX = viridia?.player.x ?? hermes.player.x;
        const { pedestal, plate } = viridiaLayout;
        const sealFrame = viridia?.treeAwake && !viridia.collected
            && playerX >= pedestal.x - 24 && playerX <= plate.x + plate.width
            ? { left: pedestal.x - 24, right: plate.x + plate.width + 24 }
            : undefined;
        this.followCamera.follow(playerX, delta, snap, sealFrame);
        this.view.render(hermes, delta, snap);
        if (viridia) {
            if (!this.viridiaHud) {
                this.viridiaHud = new ViridiaHud();
                document.querySelector('#game-container')?.setAttribute('aria-label', 'Viridia game world');
            }
            this.viridiaView.render(viridia, snap ? 0 : delta);
            this.viridiaHud.render(viridia, this.microphone.status, this.microphone.level, delta);
        } else {
            this.hud.render(hermes, this.microphone.status, this.microphone.level);
        }
    }

    private renderBorealis(delta: number, snap: boolean): void {
        const state = this.adventure.borealis!.state;
        if (!this.borealisView || !this.borealisHud) {
            this.borealisView = new BorealisView(this, borealisLayout);
            this.borealisHud = new BorealisHud(borealisLayout);
            const { x, width } = borealisLayout.floor;
            this.followCamera.setBounds(x, x + width);
            document.querySelector('#game-container')?.setAttribute('aria-label', 'Borealis game world');
            snap = true;
        }
        this.followCamera.follow(state.player.x, delta, snap);
        this.borealisView.render(state, snap ? 0 : delta);
        this.borealisHud.render(state, this.microphone.status, this.microphone.level, delta);
    }
}
