import { Scene } from 'phaser';
import { KeyboardControls } from '../input/keyboard';
import { VesperMicrophone } from '../worlds/vesper/microphone';
import { STEP_MS } from '../worlds/geometry';
import type { VesperProgress } from '../worlds/vesper/progress';
import { PORTAL_OPEN_TICKS, PORTAL_PULL_TICKS } from '../worlds/vesper/layout';
import { VesperSimulation } from '../worlds/vesper/simulation';
import { preloadKobe, prepareKobeWalkFrames } from './KobeSprites';
import { VesperHud } from './VesperHud';
import { VesperView } from './VesperView';
import { preloadVesperCity } from './VesperCityArt';
import { preloadVesperDragon } from './VesperDragonArt';
import { preloadVesperEnemies } from './VesperEnemyArt';

export class Vesper extends Scene {
    private progressStore: VesperProgress;
    private campaign = false;
    private simulation: VesperSimulation;
    private view: VesperView;
    private hud: VesperHud;
    private keyboard: KeyboardControls;
    private microphone: VesperMicrophone;
    private host: HTMLElement;
    private shieldKey = false;
    private shieldPointer = false;
    private cannonKey = false;
    private shootKey = false;
    private shootPressed = false;
    private meleeKey = false;
    private loud = false;
    private interact = false;
    private synchronize = false;
    private restart = false;
    private elapsed = 0;
    private shaking = false;

    constructor() { super('Vesper'); }

    init({ progress, campaign = false }: { progress: VesperProgress; campaign?: boolean }): void {
        this.progressStore = progress;
        this.campaign = campaign;
    }

    preload(): void {
        preloadKobe(this);
        preloadVesperCity(this);
        preloadVesperDragon(this);
        preloadVesperEnemies(this);
    }

    create(): void {
        prepareKobeWalkFrames(this);
        this.host = document.querySelector<HTMLElement>('#game-container')!;
        this.host.setAttribute('aria-label', 'Vesper combat arena');
        this.host.focus({ preventScroll: true });
        this.simulation = new VesperSimulation(this.progressStore);
        this.view = new VesperView(this);
        this.hud = new VesperHud();
        this.microphone = new VesperMicrophone();
        this.elapsed = 0;
        this.shaking = false;
        this.clearInput();
        this.keyboard = new KeyboardControls(this.host, (command) => {
            if (command === 'interact') this.interact = true;
            if (command === 'activateBridge') this.synchronize = true;
            if (command === 'restart') this.restart = true;
        });

        window.addEventListener('keydown', this.keyDown);
        window.addEventListener('keyup', this.keyUp);
        this.game.canvas.addEventListener('pointerdown', this.pointerDown);
        this.game.canvas.addEventListener('contextmenu', this.preventContextMenu);
        window.addEventListener('pointerup', this.pointerUp);
        window.addEventListener('pointercancel', this.pointerUp);
        window.addEventListener('blur', this.clearInput);
        window.addEventListener('pagehide', this.stopMicrophone);
        this.hud.micButton.addEventListener('click', this.toggleMicrophone);

        this.events.once('shutdown', () => {
            this.keyboard.destroy();
            this.stopMicrophone();
            this.hud.destroy();
            window.removeEventListener('keydown', this.keyDown);
            window.removeEventListener('keyup', this.keyUp);
            this.game.canvas.removeEventListener('pointerdown', this.pointerDown);
            this.game.canvas.removeEventListener('contextmenu', this.preventContextMenu);
            window.removeEventListener('pointerup', this.pointerUp);
            window.removeEventListener('pointercancel', this.pointerUp);
            window.removeEventListener('blur', this.clearInput);
            window.removeEventListener('pagehide', this.stopMicrophone);
            this.hud.micButton.removeEventListener('click', this.toggleMicrophone);
        });
        this.render(0);
    }

    update(_time: number, delta: number): void {
        const before = this.simulation.state;
        const sound = this.microphone.pollCannon(delta);
        this.loud = before.cannonAllowed && (this.loud || sound);
        let relocation = before.resetCount;
        this.elapsed += Math.min(delta, 100);
        while (this.elapsed >= STEP_MS) {
            this.simulation.step({
                ...this.keyboard.movement, shoot: this.shootKey || this.shootPressed,
                melee: this.meleeKey, shield: this.shieldKey || this.shieldPointer,
                cannon: this.cannonKey || this.loud, interact: this.interact,
                synchronize: this.synchronize, restart: this.restart,
            });
            this.cannonKey = this.meleeKey = this.loud = this.interact = this.synchronize = this.restart = false;
            this.shootPressed = false;
            const current = this.simulation.inputEpoch;
            if (current !== relocation) {
                this.shieldKey = false;
                this.shieldPointer = false;
                this.shootKey = false;
                relocation = current;
            }
            this.elapsed -= STEP_MS;
        }
        const { mode } = this.simulation.state;
        if (['portal', 'abyss', 'arrival'].includes(mode) && this.microphone.status !== 'off') {
            this.stopMicrophone();
        }
        if (this.campaign && mode === 'arrival') {
            this.scene.start('Cutscene', { id: 'ending' });
            return;
        }
        this.render(delta);
    }

    private render(delta: number): void {
        const state = this.simulation.state;
        if (state.mode === 'portal' && state.sequenceTick >= 28 && !this.shaking) {
            this.shaking = true;
            if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                const duration = (PORTAL_OPEN_TICKS + PORTAL_PULL_TICKS - state.sequenceTick) * STEP_MS;
                this.cameras.main.shake(duration, 0.007);
            }
        }
        if (state.mode === 'abyss' && this.shaking) {
            this.cameras.main.shakeEffect.reset();
            this.shaking = false;
        }
        this.view.render(state, delta);
        this.hud.render(state, this.microphone);
    }

    private readonly keyDown = (event: KeyboardEvent): void => {
        if (event.altKey || event.metaKey || event.ctrlKey || event.repeat) return;
        if (event.code === 'KeyF') this.shieldKey = true;
        if (event.code === 'KeyB') this.cannonKey = true;
        if (event.code === 'KeyK') this.shootKey = this.shootPressed = true;
        if (event.code === 'KeyL') this.meleeKey = true;
    };

    private readonly keyUp = (event: KeyboardEvent): void => {
        if (event.code === 'KeyF') this.shieldKey = false;
        if (event.code === 'KeyK') this.shootKey = false;
    };

    private readonly pointerDown = (event: PointerEvent): void => {
        if (event.button === 2) this.shieldPointer = true;
    };

    private readonly pointerUp = (event: PointerEvent): void => {
        if (event.type === 'pointercancel' || (event.buttons & 2) === 0) this.shieldPointer = false;
    };

    private readonly preventContextMenu = (event: Event): void => { event.preventDefault(); };

    private readonly clearInput = (): void => {
        this.shieldPointer = false;
        this.shootKey = this.shootPressed = false;
        this.shieldKey = this.cannonKey = this.meleeKey = this.loud = this.interact = this.synchronize = this.restart = false;
    };

    private readonly stopMicrophone = (): void => { this.loud = false; this.microphone.disable(); };

    private readonly toggleMicrophone = (): void => {
        this.host.focus({ preventScroll: true });
        if (['ready', 'calibrating', 'requesting'].includes(this.microphone.status)) this.stopMicrophone();
        else void this.microphone.enable();
    };
}
