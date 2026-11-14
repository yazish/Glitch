import { Scene } from 'phaser';
import { hermes, STEP_MS } from '../worlds/hermes/room';
import { Adventure } from '../worlds/adventure';
import type { WorldId } from '../worlds/journey';
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
import { preloadKobi, prepareKobiWalkFrames } from './KobiSprites';
import { HermesHud } from './HermesHud';
import { DEPARTURE_GATEWAY_TEXTURE, STAR_COMPASS_TEXTURE, WAYMARK_SCROLL_TEXTURE, HermesView } from './HermesView';
import { preloadOutpostBackground } from './OutpostBackground';
import { preloadHermesTerrain } from './HermesTerrainAssets';
import { preloadCircularMachine } from './CircularMachineView';
import { preloadViridiaProps } from './ViridiaProps';
import { preloadViridiaMagic } from './ViridiaMagic';
import type { CutsceneId } from '../cutscenes/sequences';
import { AdventureAudio, preloadAdventureAudio } from '../audio/AdventureAudio';
import { showControls } from './ControlsHud';

export class Game extends Scene {
    private adventure: Adventure;
    private followCamera: FollowCamera;
    private renderedWorld: WorldId;
    private viridiaView?: ViridiaView;
    private viridiaHud?: ViridiaHud;
    private borealisView?: BorealisView;
    private borealisHud?: BorealisHud;
    private voice: SoundInput = { sustained: false };
    private microphone: Microphone;
    private keyboard: KeyboardControls;
    private hud: HermesHud;
    private view: HermesView;
    private elapsed = 0;
    private audio: AdventureAudio;
    private lastMovementAt = -Infinity;

    constructor() {
        super('Game');
    }

    preload(): void {
        preloadAdventureAudio(this);
        preloadKobi(this);
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
        prepareKobiWalkFrames(this);
        this.adventure = new Adventure();
        this.audio = new AdventureAudio(this);
        this.lastMovementAt = -Infinity;
        this.renderedWorld = 'hermes';
        this.viridiaView = undefined;
        this.viridiaHud = undefined;
        this.borealisView = undefined;
        this.borealisHud = undefined;
        this.voice = { sustained: false };
        this.followCamera = new FollowCamera(this.cameras.main, hermes.floor.width + 2 * hermes.floor.x);
        this.microphone = new Microphone();
        this.hud = new HermesHud();
        this.view = new HermesView(this, hermes);
        this.elapsed = 0;
        this.showWorld('hermes');

        const gameElement = document.querySelector<HTMLElement>('#game-container')!;
        document.querySelector<HTMLElement>('#game-hud')!.hidden = false;
        document.querySelector<HTMLElement>('#objective-guide')!.hidden = false;
        document.querySelector<HTMLElement>('#viridia-compass')!.hidden = true;
        document.querySelector<HTMLElement>('#borealis-compass-direction')!.hidden = true;
        document.querySelector<HTMLElement>('#star-map')!.hidden = true;
        document.querySelector<HTMLElement>('#objective-completed')!.hidden = true;
        document.querySelector<HTMLElement>('#microphone')!.hidden = false;
        document.querySelector<HTMLElement>('#location')!.hidden = false;
        gameElement.setAttribute('aria-label', 'Hermes game room');
        gameElement.focus({ preventScroll: true });
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

        const stopMicrophone = () => {
            this.microphone.disable();
            this.voice = { sustained: false };
        };
        const toggleMicrophone = (event: MouseEvent) => {
            if (event.detail > 0) gameElement.focus({ preventScroll: true });
            if (['ready', 'calibrating', 'requesting'].includes(this.microphone.status)) {
                stopMicrophone();
            } else {
                void this.microphone.enable();
            }
        };
        this.hud.micButton.addEventListener('click', toggleMicrophone);
        window.addEventListener('pagehide', stopMicrophone);
        this.events.once('shutdown', () => {
            this.audio.destroy();
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
            const world = this.adventure.activeWorld;
            const { x, y } = this.adventure.player;
            this.adventure.step(horizontal, vertical, this.voice);
            if (this.adventure.activeWorld !== world) {
                this.playTransition(world === 'hermes' ? 'to-viridia' : 'to-borealis');
                return;
            }
            const player = this.adventure.player;
            if ((horizontal || vertical) && (x !== player.x || y !== player.y)
                && !(world === 'hermes' && this.adventure.hermes.state.riftFallProgress !== undefined)) {
                this.lastMovementAt = this.time.now;
            }
            if (world === 'borealis' && this.adventure.borealis!.state.finished) {
                this.playTransition('to-vesper');
                return;
            }
            this.voice = { sustained: this.voice.sustained };
            this.elapsed -= STEP_MS;
        }
        const world = this.adventure.activeWorld;
        const viridiaArea = this.adventure.viridia?.state.area;
        const borealisArea = this.adventure.borealis?.state.area;
        this.audio.sync({
            music: world === 'hermes' ? 'hermes' : world === 'viridia' ? 'viridia'
                : borealisArea === 'pass' ? 'borealis' : 'snowMusic',
            wind: world === 'borealis',
            quietMusic: world === 'viridia'
                || (world === 'hermes' && this.adventure.hermes.state.screen === 'outpost')
                || (world === 'borealis' && Boolean(this.adventure.borealis?.needsMicrophone)),
            surface: world === 'borealis' ? 'snow' : world === 'viridia'
                ? viridiaArea === 'trail' ? 'woods' : 'forest' : 'pavement',
            moving: world !== 'borealis' && this.time.now - this.lastMovementAt < 100,
        });
        this.render(delta);
    }

    private playTransition(id: CutsceneId): void {
        this.audio.stop();
        this.lastMovementAt = -Infinity;
        this.keyboard.setEnabled(false);
        this.microphone.disable();
        this.elapsed = 0;
        this.voice = { sustained: false };
        this.scene.sleep();
        this.scene.launch('Cutscene', {
            id,
            onComplete: () => {
                if (id === 'to-vesper') {
                    this.scene.start('Vesper', { progress: this.adventure.vesperProgress, campaign: true });
                    return;
                }
                this.render(0, true);
                this.keyboard.setEnabled(true);
                this.scene.wake();
                document.querySelector<HTMLElement>('#game-container')!.focus({ preventScroll: true });
            },
        });
        this.scene.bringToTop('Cutscene');
    }

    private pollMicrophone(delta: number): void {
        const { activeWorld, hermes, viridia, borealis } = this.adventure;
        if (activeWorld === 'hermes' && hermes.state.screen === 'outpost' && !hermes.state.bridgePermanent) {
            if (this.microphone.pollHum(delta, hermes.canActivateBridge)) hermes.receiveHum();
            return;
        }
        const available = activeWorld === 'viridia' ? viridia?.needsMicrophone : borealis?.needsMicrophone;
        if (available) {
            const sample = this.microphone.pollSound(delta);
            this.voice = { pulse: this.voice.pulse ?? sample.pulse, sustained: sample.sustained };
        } else {
            if (this.microphone.status !== 'off') this.microphone.disable();
            this.voice = { sustained: false };
        }
    }

    private render(delta: number, snap = false): void {
        const world = this.adventure.activeWorld;
        if (world !== this.renderedWorld) {
            for (const object of this.children.getChildren().slice()) object.destroy();
            this.renderedWorld = world;
            this.showWorld(world);
            snap = true;
        }
        if (world === 'borealis') {
            this.renderBorealis(delta, snap);
            return;
        }
        if (world === 'viridia') {
            this.renderViridia(delta, snap);
            return;
        }
        const hermes = this.adventure.hermes.state;
        this.followCamera.follow(hermes.player.x, delta, snap);
        this.view.render(hermes, delta, snap);
        this.hud.render(hermes, this.microphone.status, this.microphone.level);
    }

    private showWorld(world: WorldId): void {
        const shell = document.querySelector<HTMLElement>('.game-shell');
        if (shell) shell.dataset.world = world;
        showControls(world);
    }

    private renderViridia(delta: number, snap: boolean): void {
        const state = this.adventure.viridia!.state;
        if (!this.viridiaView || !this.viridiaHud) {
            this.viridiaView = new ViridiaView(this, viridiaLayout);
            this.viridiaHud = new ViridiaHud();
            const { x, width } = viridiaLayout.floor;
            this.followCamera.setBounds(x, x + width);
            document.querySelector('#game-container')?.setAttribute('aria-label', 'Viridia game world');
        }
        const playerX = state.player.x;
        const { pedestal, plate } = viridiaLayout;
        const sealFrame = state.treeAwake && !state.collected
            && playerX >= pedestal.x - 24 && playerX <= plate.x + plate.width
            ? { left: pedestal.x - 24, right: plate.x + plate.width + 24 }
            : undefined;
        this.followCamera.follow(playerX, delta, snap, sealFrame);
        this.viridiaView.render(state, snap ? 0 : delta);
        this.viridiaHud.render(state, this.microphone.status, this.microphone.level, delta);
    }

    private renderBorealis(delta: number, snap: boolean): void {
        const state = this.adventure.borealis!.state;
        if (!this.borealisView || !this.borealisHud) {
            this.borealisView = new BorealisView(this, borealisLayout);
            this.borealisHud = new BorealisHud(borealisLayout);
            const { x, width } = borealisLayout.floor;
            this.followCamera.setBounds(x, x + width);
            document.querySelector('#game-container')?.setAttribute('aria-label', 'Borealis game world');
        }
        this.followCamera.follow(state.player.x, delta, snap);
        this.borealisView.render(state, snap ? 0 : delta);
        this.borealisHud.render(state, this.microphone.status, this.microphone.level, delta);
    }
}
