import type { GameObjects, Scene } from 'phaser';
import { HEIGHT, WIDTH } from '../viewport';

// Stack the original layers from farthest to nearest.
const LAYERS = ['sky', 'planets', 'distant-mountains', 'rocky-mountains'] as const;
const SCALE = 2;
const TERRAIN_BASE = 0x7a4841;
const LAYER_HEIGHT = 160 * SCALE;
const MOUNTAIN_Y = -54;
const SCROLL_FACTORS = [0.09, 0.06, 0.22, 0.38];

export function preloadOutpostBackground(scene: Scene): void {
    for (const layer of LAYERS) {
        const key = `hermes-background-${layer}`;
        if (!scene.textures.exists(key)) {
            scene.load.image(key, `${import.meta.env.BASE_URL}assets/hermes/background/${layer}.png`);
        }
    }
}

export class OutpostBackground {
    private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    private readonly layers: GameObjects.TileSprite[] = [];

    constructor(scene: Scene) {
        const keys = LAYERS.map((layer) => `hermes-background-${layer}`);
        if (!keys.every((key) => scene.textures.exists(key))) return;

        // Match the nearest mountain's base color beneath the raised skyline.
        const base = scene.add.rectangle(0, 0, WIDTH, HEIGHT, TERRAIN_BASE).setOrigin(0);
        this.layers = keys.map((key, index) => scene.add
            .tileSprite(0, index < 2 ? 0 : MOUNTAIN_Y, WIDTH, LAYER_HEIGHT, key)
            .setOrigin(0).setTileScale(SCALE));
        const mountainBaseY = MOUNTAIN_Y + LAYER_HEIGHT;
        const mountainBase = scene.add.rectangle(
            0, mountainBaseY, WIDTH, HEIGHT - mountainBaseY, TERRAIN_BASE,
        ).setOrigin(0);
        const shade = scene.add.rectangle(0, 0, WIDTH, HEIGHT, 0x171624, 0.4).setOrigin(0);
        scene.add.container(0, 0, [base, ...this.layers, mountainBase, shade])
            .setDepth(-2.5).setScrollFactor(0, 0, true);
    }

    render(cameraOffset: number): void {
        const offset = this.reducedMotion.matches ? 0 : cameraOffset;
        this.layers.forEach((layer, index) => {
            layer.tilePositionX = Math.round(offset * SCROLL_FACTORS[index] / SCALE);
        });
    }
}
