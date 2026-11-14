import type { GameObjects, Scene } from 'phaser';
import type { Rect } from '../worlds/geometry';
import type { ViridiaLayout } from '../worlds/viridia/layout';
import type { ViridiaState } from '../worlds/viridia/simulation';
import type { RoomProjection } from './RoomProjection';

const SHEETS = { bloom: 'purple-burst', prism: 'prism', shatter: 'shatter', resonance: 'resonance' } as const;
type EffectKind = keyof typeof SHEETS;
const DURATION = 1800;

export function preloadViridiaMagic(scene: Scene): void {
    for (const [key, file] of Object.entries(SHEETS)) {
        scene.load.spritesheet(`viridia-magic-${key}`, `${import.meta.env.BASE_URL}assets/viridia/vfx/${file}.png`,
            { frameWidth: 192, frameHeight: 192 });
    }
}

export class ViridiaMagic {
    private previous?: ViridiaState;
    private readonly bursts: { sprite: GameObjects.Sprite; elapsed: number }[] = [];
    private readonly motes: GameObjects.Graphics;
    private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    private elapsed = 0;

    constructor(private readonly scene: Scene, private readonly layout: ViridiaLayout, private readonly projection: RoomProjection) {
        this.motes = scene.add.graphics().setDepth(-0.7);
    }

    render(state: ViridiaState | undefined, delta: number): void {
        if (!state) return;
        const previous = this.previous;
        if (previous) {
            if (state.rootHits > previous.rootHits) this.burst(this.layout.roots, 'shatter', 76);
            if (state.flowersOpen && !previous.flowersOpen) this.burst(this.layout.flowerBarrier, 'bloom', 64);
            if (state.vinesOpen && !previous.vinesOpen) this.burst(this.layout.vines, 'prism', 70);
            if (state.stoneIndex > previous.stoneIndex) this.burst(this.layout.tree, 'resonance', 82);
            if (state.sealOpen && !previous.sealOpen) this.burst(this.layout.plate, 'prism', 68);
            if (state.collected && !previous.collected) this.burst(this.layout.pedestal, 'bloom', 58);
        }
        this.previous = state;
        const step = Math.max(0, Math.min(delta, 100));
        this.elapsed += step;
        this.motes.clear();
        for (const [i, x] of [1635, 2040, 2540, 3040].entries()) {
            const phase = this.reducedMotion.matches ? i : this.elapsed / 1600 + i * 1.7;
            const y = this.projection.project({ x, y: 135 }).y - 20 + Math.sin(phase) * 5;
            this.motes.fillStyle(0xc29af0, 0.25 + 0.2 * (1 + Math.sin(phase)) / 2)
                .fillCircle(x, y, 1.5);
        }
        for (let i = this.bursts.length - 1; i >= 0; i--) {
            const effect = this.bursts[i];
            effect.elapsed += step;
            if (effect.elapsed >= DURATION) {
                effect.sprite.destroy();
                this.bursts.splice(i, 1);
            } else {
                const progress = effect.elapsed / DURATION;
                effect.sprite.setFrame(this.reducedMotion.matches ? 14 : Math.min(29, Math.floor(progress * 30)));
                effect.sprite.setAlpha(0.65 * Math.min(1, 0.25 + progress * 5, (1 - progress) * 3));
            }
        }
    }

    private burst(rect: Rect, kind: EffectKind, size: number): void {
        const point = this.projection.center(rect, 16);
        const sprite = this.scene.add.sprite(point.x, point.y, `viridia-magic-${kind}`, 0)
            .setDisplaySize(size, size).setDepth(350).setAlpha(0.3);
        this.bursts.push({ sprite, elapsed: 0 });
    }
}
