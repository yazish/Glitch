import type { GameObjects, Scene } from 'phaser';
import type { Facing, Pose } from '../worlds/hermes/room';

// Facing follows the room axes. The projection turns those axes diagonally on screen.
const KOBE_POSES = {
    up: 'rear-right',
    down: 'front-left',
    left: 'rear-left',
    right: 'front-right',
} satisfies Record<Facing, string>;

const FACING_OFFSET = {
    up: { x: 4, y: -2 },
    down: { x: -4, y: 2 },
    left: { x: -4, y: -2 },
    right: { x: 4, y: 2 },
} satisfies Record<Facing, { x: number; y: number }>;

export function preloadKobe(scene: Scene): void {
    for (const key of Object.values(KOBE_POSES)) {
        scene.load.image(key, `${import.meta.env.BASE_URL}assets/characters/kobe/idle-${key}.png`);
    }
}

export class CharacterView {
    private readonly image?: GameObjects.Image;
    private readonly placeholder?: GameObjects.Graphics;

    constructor(
        scene: Scene,
        private readonly placeholderColor: number,
        tint: number,
        alpha: number,
    ) {
        if (Object.values(KOBE_POSES).every((key) => scene.textures.exists(key))) {
            this.image = scene.add.image(0, 0, KOBE_POSES.down)
                .setDisplayOrigin(24, 44)
                .setTint(tint)
                .setAlpha(alpha)
                .setVisible(false);
        } else {
            this.placeholder = scene.add.graphics().setAlpha(alpha);
        }
    }

    render(pose: Pose | undefined, depth: number): void {
        if (this.image) {
            this.image.setVisible(pose !== undefined);
            if (pose) {
                const texture = KOBE_POSES[pose.facing];
                if (this.image.texture.key !== texture) this.image.setTexture(texture);
                this.image.setPosition(pose.x, pose.y).setDepth(depth);
            }
            return;
        }

        const graphics = this.placeholder;
        if (!graphics) return;
        graphics.clear().setDepth(depth);
        if (!pose) return;

        const { x, y, facing } = pose;
        const offset = FACING_OFFSET[facing];
        graphics.fillStyle(0x171624, 0.7).fillEllipse(x, y, 20, 7);
        graphics.fillStyle(this.placeholderColor)
            .fillRoundedRect(x - 7, y - 13, 14, 14, 3)
            .fillCircle(x, y - 17, 8);
        graphics.fillStyle(0x171624).fillRoundedRect(x - 4 + offset.x, y - 19 + offset.y, 8, 4, 2);
    }
}
