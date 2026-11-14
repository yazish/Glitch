import type { Scene, Sound } from 'phaser';

const FILES = {
    hermes: 'music/hermes.mp3', viridia: 'music/viridia.mp3', borealis: 'music/borealis.mp3',
    snowMusic: 'music/borealis-snow.mp3', boss: 'music/boss.mp3', wind: 'ambience/wind.mp3',
    forest: 'footsteps/forest.wav', woods: 'footsteps/woods.wav', pavement: 'footsteps/pavement.wav',
    snow: 'footsteps/snow.wav',
} as const;

type AudioKey = keyof typeof FILES;
type Music = 'hermes' | 'viridia' | 'borealis' | 'snowMusic' | 'boss';
type Surface = 'forest' | 'woods' | 'pavement' | 'snow';
type Mix = { music?: Music; wind: boolean; surface: Surface; moving: boolean; quietMusic?: boolean };
const MUSIC_VOLUME = 0.22;
const BOREALIS_MUSIC_VOLUME = 0.16;
const QUIET_MUSIC_VOLUME = 0.015;
const WIND_VOLUME = 0.16;

export function preloadAdventureAudio(scene: Scene): void {
    for (const [key, path] of Object.entries(FILES)) {
        if (!scene.cache.audio.exists(`adventure-${key}`)) {
            scene.load.audio(`adventure-${key}`, `${import.meta.env.BASE_URL}assets/audio/${path}`);
        }
    }
}

export function preloadVesperShot(scene: Scene): void {
    if (!scene.cache.audio.exists('vesper-laser-shot')) {
        scene.load.audio('vesper-laser-shot', `${import.meta.env.BASE_URL}assets/audio/effects/laser-shot.mp3`);
    }
}

/** Owns playback for one scene, and releases every sound on scene shutdown. */
export class AdventureAudio {
    private music?: Sound.BaseSound;
    private musicKey?: Music;
    private musicVolume?: number;
    private wind?: Sound.BaseSound;
    private steps?: Sound.BaseSound;
    private shot?: Sound.BaseSound;
    private stepKey?: Surface;
    private readonly button: HTMLButtonElement;
    private readonly scene: Scene;

    constructor(scene: Scene) {
        this.scene = scene;
        this.button = document.createElement('button');
        this.button.type = 'button';
        this.button.className = 'adventure-audio-toggle';
        this.button.addEventListener('click', this.toggle);
        document.querySelector<HTMLElement>('#game-stage')!.append(this.button);
        this.updateButton();
    }

    sync(mix: Mix): void {
        const volume = mix.quietMusic ? QUIET_MUSIC_VOLUME
            : mix.music === 'borealis' || mix.music === 'snowMusic' ? BOREALIS_MUSIC_VOLUME : MUSIC_VOLUME;
        if (this.musicKey !== mix.music) {
            this.music?.destroy();
            this.music = undefined;
            this.musicKey = mix.music;
            if (mix.music) this.music = this.loop(mix.music, volume);
            this.musicVolume = volume;
        } else if (this.music && this.musicVolume !== volume) {
            // Adjust only the music channel; wind and footsteps keep their own levels.
            const sound = this.music as Sound.BaseSound & { setVolume?: (value: number) => unknown };
            sound.setVolume?.(volume);
            this.musicVolume = volume;
        }
        if (mix.wind && !this.wind) this.wind = this.loop('wind', WIND_VOLUME);
        if (!mix.wind && this.wind) { this.wind.destroy(); this.wind = undefined; }
        if (this.stepKey !== mix.surface) {
            this.steps?.destroy();
            this.steps = undefined;
            this.stepKey = mix.surface;
        }
        if (mix.moving) {
            if (!this.steps) this.steps = this.loop(mix.surface, 0.28);
            else if (this.steps.isPaused) this.steps.resume();
        } else if (this.steps?.isPlaying) this.steps.pause();
    }

    stop(): void {
        this.music?.destroy(); this.music = undefined; this.musicKey = undefined; this.musicVolume = undefined;
        this.wind?.destroy(); this.wind = undefined;
        this.steps?.destroy(); this.steps = undefined; this.stepKey = undefined;
        this.shot?.destroy(); this.shot = undefined;
    }

    playShot(): void {
        if (!this.scene.cache.audio.exists('vesper-laser-shot')) return;
        if (!this.shot) this.shot = this.scene.sound.add('vesper-laser-shot');
        if (this.shot.isPlaying || this.shot.isPaused) this.shot.stop();
        this.shot.play({ volume: 0.35 });
    }

    destroy(): void {
        this.stop();
        this.button.removeEventListener('click', this.toggle);
        this.button.remove();
    }

    private loop(key: AudioKey, volume: number): Sound.BaseSound | undefined {
        if (!this.scene.cache.audio.exists(`adventure-${key}`)) return undefined;
        const sound = this.scene.sound.add(`adventure-${key}`);
        sound.play({ loop: true, volume });
        return sound;
    }

    private readonly toggle = (): void => {
        this.scene.sound.mute = !this.scene.sound.mute;
        this.updateButton();
    };

    private updateButton(): void {
        this.button.textContent = this.scene.sound.mute ? 'Sound off' : 'Sound on';
        this.button.setAttribute('aria-pressed', String(!this.scene.sound.mute));
        this.button.setAttribute('aria-label', this.scene.sound.mute ? 'Turn sound on' : 'Turn sound off');
    }
}
