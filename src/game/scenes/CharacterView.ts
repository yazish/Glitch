import type { GameObjects, Scene } from 'phaser';
import type { Facing, Pose } from '../worlds/hermes/room';
import { KOBE_FOOT_ANCHOR, kobeFrame } from './KobeSprites';

const IDLE_BOB_PERIOD = 1250;
const IDLE_BOB_HEIGHT = 2;

const FACING_OFFSET = {
    up: { x: 0, y: -2 },
    down: { x: 0, y: 2 },
    left: { x: -4, y: 0 },
    right: { x: 4, y: 0 },
} satisfies Record<Facing, { x: number; y: number }>;

export class CharacterView {
    private readonly image: GameObjects.Image;
    private readonly placeholder: GameObjects.Graphics;
    private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    private idleTime = 0;

    constructor(
        private readonly scene: Scene,
        private readonly placeholderColor: number,
        tint: number,
        alpha: number,
    ) {
        this.image = scene.add.image(0, 0, '__MISSING')
            .setTint(tint)
            .setAlpha(alpha)
            .setVisible(false);
        this.placeholder = scene.add.graphics().setAlpha(alpha);
    }

    render(pose: Pose | undefined, depth: number, walkTicks: number, delta: number): void {
        this.idleTime = pose && walkTicks === 0 && !this.reducedMotion.matches
            ? (this.idleTime + delta) % IDLE_BOB_PERIOD
            : 0;
        const lift = Math.round(IDLE_BOB_HEIGHT * Math.sin(Math.PI * this.idleTime / IDLE_BOB_PERIOD) ** 2);
        const frame = pose && kobeFrame(this.scene.textures, pose.facing, walkTicks);
        const graphics = this.placeholder;
        if (frame && pose) {
            if (this.image.frame !== frame) {
                this.image.setFrame(frame).setDisplayOrigin(KOBE_FOOT_ANCHOR.x, KOBE_FOOT_ANCHOR.y);
            }
            this.image.setVisible(true).setPosition(pose.x, pose.y - lift).setDepth(depth);
            graphics.setVisible(false);
            return;
        }

        this.image.setVisible(false);
        graphics.clear().setVisible(pose !== undefined).setDepth(depth);
        if (!pose) return;

        const { x, y, facing } = pose;
        const offset = FACING_OFFSET[facing];
        graphics.fillStyle(0x171624, 0.7).fillEllipse(x, y, 20, 7);
        const bodyY = y - lift;
        graphics.fillStyle(this.placeholderColor)
            .fillRoundedRect(x - 7, bodyY - 13, 14, 14, 3)
            .fillCircle(x, bodyY - 17, 8);
        graphics.fillStyle(0x171624).fillRoundedRect(x - 4 + offset.x, bodyY - 19 + offset.y, 8, 4, 2);
    }
}
