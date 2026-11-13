import { Scene } from 'phaser';
import { HEIGHT, WIDTH } from '../viewport';
import type { ProloguePanel } from '../prologue/panels';

export class Prologue extends Scene {
    private panelIndex = 0;
    private finished = false;

    constructor(
        private readonly panels: readonly [ProloguePanel, ...ProloguePanel[]],
        private readonly onComplete: () => void,
    ) {
        super('Prologue');
    }

    preload(): void {
        for (const panel of this.panels) {
            if (panel.image) {
                this.load.image(this.textureKey(panel), `${import.meta.env.BASE_URL}assets/prologue/${panel.image}`);
            }
        }
    }

    create(): void {
        const intro = document.querySelector<HTMLElement>('#prologue')!;
        const display = document.querySelector<HTMLElement>('#game-container')!;
        const progress = intro.querySelector<HTMLElement>('#prologue-progress')!;
        const caption = intro.querySelector<HTMLElement>('#prologue-caption')!;
        const description = intro.querySelector<HTMLElement>('#prologue-description')!;
        const next = intro.querySelector<HTMLButtonElement>('#prologue-next')!;
        const skip = intro.querySelector<HTMLButtonElement>('#prologue-skip')!;
        const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
        const placeholder = this.add.graphics();
        const still = this.add.image(WIDTH / 2, HEIGHT / 2, '__DEFAULT').setVisible(false);
        this.panelIndex = 0;
        this.finished = false;

        const showPanel = () => {
            const panel = this.panels[this.panelIndex];
            const texture = this.textureKey(panel);
            const hasImage = Boolean(panel.image) && this.textures.exists(texture);
            placeholder.clear().setVisible(!hasImage);
            still.setVisible(hasImage);
            if (hasImage) {
                still.setTexture(texture);
                still.setScale(Math.max(WIDTH / still.width, HEIGHT / still.height));
            } else {
                panel.placeholder(placeholder);
            }

            progress.textContent = `Panel ${this.panelIndex + 1} of ${this.panels.length}`;
            description.textContent = panel.description;
            caption.textContent = panel.caption;
            next.textContent = this.panelIndex === this.panels.length - 1 ? 'Play' : 'Next';

            this.cameras.main.resetFX();
            this.cameras.main.setZoom(1);
            if (motion.matches) return;
            if (panel.motion === 'drift') this.cameras.main.zoomTo(1.045, 4200, 'Sine.easeOut');
            if (panel.motion === 'glow') this.cameras.main.fadeIn(380, 68, 47, 83);
            if (panel.motion === 'fade') this.cameras.main.fadeIn(450, 23, 22, 36);
        };

        const finish = () => {
            if (this.finished) return;
            this.finished = true;
            next.disabled = true;
            skip.disabled = true;
            this.onComplete();
        };
        const advance = (event: MouseEvent) => {
            if (this.finished || event.detail > 1) return;
            if (this.panelIndex === this.panels.length - 1) {
                finish();
                return;
            }
            this.panelIndex += 1;
            showPanel();
        };
        const syncMotion = () => {
            if (motion.matches) {
                this.cameras.main.resetFX();
                this.cameras.main.setZoom(1);
            }
        };

        next.disabled = false;
        skip.disabled = false;
        next.addEventListener('click', advance);
        skip.addEventListener('click', finish);
        motion.addEventListener('change', syncMotion);
        this.events.once('shutdown', () => {
            next.removeEventListener('click', advance);
            skip.removeEventListener('click', finish);
            motion.removeEventListener('change', syncMotion);
            intro.remove();
            display.removeAttribute('aria-describedby');
        });

        display.setAttribute('aria-describedby', description.id);
        intro.hidden = false;
        showPanel();
    }

    private textureKey(panel: ProloguePanel): string {
        return `prologue:${panel.id}`;
    }
}
