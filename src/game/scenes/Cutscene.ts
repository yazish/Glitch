import { Scene } from 'phaser';
import { HEIGHT, WIDTH } from '../viewport';
import { cutscenes, type CutsceneId } from '../cutscenes/sequences';
import { animateOpening, preloadCutsceneArt } from '../cutscenes/art';

type CutsceneData = { id?: CutsceneId; onComplete?: () => void };

export class Cutscene extends Scene {
    private dataForScene: CutsceneData;

    constructor() {
        super('Cutscene');
    }

    init(data: CutsceneData = {}): void {
        this.dataForScene = data;
    }

    preload(): void {
        for (const panel of cutscenes.opening.panels) {
            if (panel.image && !this.textures.exists(panel.id)) {
                this.load.image(panel.id, `${import.meta.env.BASE_URL}assets/prologue/${panel.image}`);
            }
        }
        preloadCutsceneArt(this);
    }

    create(): void {
        const { id = 'opening', onComplete } = this.dataForScene;
        const sequence = cutscenes[id];
        const section = document.querySelector<HTMLElement>('#cutscene')!;
        const display = document.querySelector<HTMLElement>('#game-container')!;
        const title = document.querySelector<HTMLElement>('#cutscene-title')!;
        const caption = document.querySelector<HTMLElement>('#cutscene-caption')!;
        const description = document.querySelector<HTMLElement>('#cutscene-description')!;
        const next = document.querySelector<HTMLButtonElement>('#cutscene-next')!;
        const skip = document.querySelector<HTMLButtonElement>('#cutscene-skip')!;
        const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
        const camera = this.cameras.main;
        const gameLabel = display.getAttribute('aria-label');
        let index = 0;
        let finished = false;

        const showPanel = () => {
            const panel = sequence.panels[index];
            const last = index === sequence.panels.length - 1;
            this.tweens.killAll();
            this.children.removeAll(true);
            camera.resetFX().setZoom(1);
            if (panel.image && this.textures.exists(panel.id)) {
                this.add.image(WIDTH / 2, HEIGHT / 2, panel.id);
                if (!motion.matches) animateOpening(this, panel.id);
            } else if (panel.draw) {
                panel.draw(this, !motion.matches);
            } else {
                panel.placeholder?.(this.add.graphics());
            }
            if (!motion.matches) camera.fadeIn(panel.motion === 'glow' ? 240 : 370, 15, 13, 28);

            caption.textContent = panel.caption;
            description.textContent = panel.description;
            next.textContent = last ? sequence.continueLabel : 'Next';
            skip.hidden = id === 'ending' && last;
            if (skip.hidden && document.activeElement === skip) next.focus({ preventScroll: true });
        };

        const finish = () => {
            if (finished) return;
            finished = true;
            next.disabled = true;
            skip.disabled = true;
            if (id === 'ending') {
                this.scene.restart({ id: 'opening' });
            } else if (onComplete) {
                this.events.once('shutdown', onComplete);
                this.scene.stop();
            } else {
                this.scene.start('Game');
            }
        };
        const advance = (event: MouseEvent) => {
            if (finished || event.detail > 1) return;
            if (index === sequence.panels.length - 1) finish();
            else {
                index += 1;
                showPanel();
            }
        };
        const skipScene = () => {
            if (id === 'ending') {
                index = sequence.panels.length - 1;
                showPanel();
            } else finish();
        };

        next.disabled = false;
        skip.disabled = false;
        skip.textContent = id === 'opening' ? 'Skip intro' : id === 'ending' ? 'Skip to arrival' : 'Skip scene';
        next.addEventListener('click', advance);
        skip.addEventListener('click', skipScene);
        motion.addEventListener('change', showPanel);
        this.events.once('shutdown', () => {
            next.removeEventListener('click', advance);
            skip.removeEventListener('click', skipScene);
            motion.removeEventListener('change', showPanel);
            section.hidden = true;
            display.removeAttribute('aria-describedby');
            if (gameLabel) display.setAttribute('aria-label', gameLabel);
        });

        title.textContent = sequence.title;
        display.setAttribute('aria-label', sequence.title + ' illustration');
        display.setAttribute('aria-describedby', description.id);
        section.hidden = false;
        showPanel();
        next.focus({ preventScroll: true });
    }
}
