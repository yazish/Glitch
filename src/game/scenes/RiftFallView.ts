import type { GameObjects, Scene } from 'phaser';
import type { Facing } from '../worlds/hermes/room';
import { HEIGHT, WIDTH } from '../viewport';
import { kobiFrame } from './KobiSprites';

const INK = 0x110e1e;
const VIOLET = 0x59436b;
const STRATA = [0x2c2035, 0x39283e, 0x463044, 0x513649];
const FRAME_DEPTH = HEIGHT + 1;

export class RiftFallView {
    private readonly art: GameObjects.Graphics;
    private readonly sprite: GameObjects.Image;
    private readonly fade: GameObjects.Rectangle;
    private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    constructor(private readonly scene: Scene) {
        this.art = scene.add.graphics().setDepth(FRAME_DEPTH).setScrollFactor(0);
        this.sprite = scene.add.image(0, 0, '__MISSING').setDepth(FRAME_DEPTH + 1).setScrollFactor(0);
        this.fade = scene.add.rectangle(0, 0, WIDTH, HEIGHT, INK)
            .setOrigin(0).setDepth(FRAME_DEPTH + 2).setScrollFactor(0);
        this.hide();
    }

    render(facing: Facing, progress: number | undefined): void {
        if (progress === undefined) {
            this.hide();
            return;
        }

        const still = this.reducedMotion.matches;
        const time = still ? 0.44 : progress;
        const direction = facing === 'left' ? -1 : 1;
        const x = Math.round(WIDTH / 2 + direction * (Math.sin(time * 5) * 44 - 30));
        const y = Math.round(73 + 205 * time ** 1.35);

        this.art.clear().setVisible(true);
        this.drawRavine(time);
        if (!still) this.drawDebris(time);

        const frame = kobiFrame(this.scene.textures, facing, 0);
        this.sprite.setVisible(Boolean(frame));
        if (frame) {
            if (this.sprite.frame !== frame) this.sprite.setFrame(frame);
            this.sprite.setPosition(x, y).setScale(2.6 - time * 0.8)
                .setRotation(still ? 0.45 : direction * (0.12 + 3.8 * time));
        } else {
            this.art.fillStyle(0xffcc82).fillCircle(x, y, 13);
        }

        this.fade.setVisible(true).setAlpha(Math.max(0, (progress - 0.79) / 0.21));
    }

    private hide(): void {
        this.art.setVisible(false);
        this.sprite.setVisible(false);
        this.fade.setVisible(false);
    }

    private drawRavine(time: number): void {
        const art = this.art;
        art.fillStyle(INK).fillRect(0, 0, WIDTH, HEIGHT);
        art.fillStyle(0x211831).fillEllipse(314, 145 - 150 * time, 360, 430);
        art.fillStyle(0x2b1e41).fillEllipse(318, 66 - 150 * time, 220, 240);

        // Strata pass upward at two speeds as Kobi drops below the surface.
        for (let layer = 0; layer < 2; layer++) {
            const stride = 16;
            const offset = Math.round(time * (layer === 0 ? 164 : 390));
            const first = Math.floor(offset / stride);
            for (let row = first; row * stride - offset < HEIGHT; row++) {
                const y = row * stride - offset;
                const width = (layer === 0 ? 174 : 97) + (row * 37 % 47) + (row * 19 % 26);
                const right = width + (row * 11 % 29) - 16;
                const color = STRATA[(row + layer * 2) % STRATA.length];
                art.fillStyle(color).fillRect(0, y, width, stride).fillRect(WIDTH - right, y, right, stride);
                art.fillStyle(layer === 0 ? VIOLET : 0x281e31, 0.65)
                    .fillRect(width - 16, y, 16, 3).fillRect(WIDTH - right, y, 17, 3);
                if (layer === 1 && row % 3 === 0) {
                    art.fillStyle(0xa36b80, 0.7).fillRect(width - 41, y + 5, 14, 2)
                        .fillRect(WIDTH - right + 21, y + 10, 19, 2);
                }
            }
        }
        art.fillStyle(INK).fillRect(0, 0, WIDTH, 7).fillRect(0, HEIGHT - 7, WIDTH, 7);
    }

    private drawDebris(time: number): void {
        for (let index = 0; index < 25; index++) {
            const x = 126 + (index * 137 % 390);
            const y = HEIGHT - ((index * 61 + Math.round(time * (205 + index % 5 * 67))) % HEIGHT);
            const color = index % 4 ? 0x9b768e : 0xdec29e;
            this.art.fillStyle(color, 0.35 + (index % 3) * 0.16)
                .fillRect(x, y, 2 + index % 3, 3 + Math.round(time * (4 + index % 7)));
        }
    }
}
