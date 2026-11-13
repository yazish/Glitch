import type { GameObjects, Scene } from 'phaser';
import { HEIGHT, WIDTH } from '../viewport';

// Stack the original layers from farthest to nearest.
const LAYERS = ['sky', 'planets', 'distant-mountains', 'rocky-mountains'] as const;
const SCALE = 2;
const TERRAIN_BASE = 0x7a4841;
const LAYER_HEIGHT = 160 * SCALE;
const MOUNTAIN_Y = -54;

export function preloadOutpostBackground(scene: Scene): void {
    for (const layer of LAYERS) {
        scene.load.image(
            `hermes-background-${layer}`,
            `${import.meta.env.BASE_URL}assets/hermes/background/${layer}.png`,
        );
    }
}

export class OutpostBackground {
    private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    private readonly group?: GameObjects.Container;
    private readonly sky?: GameObjects.TileSprite;
    private readonly planets?: GameObjects.TileSprite;

    constructor(scene: Scene) {
        const keys = LAYERS.map((layer) => `hermes-background-${layer}`);
        if (!keys.every((key) => scene.textures.exists(key))) return;

        // Match the nearest mountain's base color beneath the raised skyline.
        const base = scene.add.rectangle(0, 0, WIDTH, HEIGHT, TERRAIN_BASE).setOrigin(0);
        this.sky = scene.add.tileSprite(0, 0, WIDTH, LAYER_HEIGHT, keys[0]).setOrigin(0).setTileScale(SCALE);
        this.planets = scene.add.tileSprite(0, 0, WIDTH, LAYER_HEIGHT, keys[1]).setOrigin(0).setTileScale(SCALE);
        const mountains = keys.slice(2).map((key) => scene.add.image(0, MOUNTAIN_Y, key).setOrigin(0).setScale(SCALE));
        const mountainBaseY = MOUNTAIN_Y + LAYER_HEIGHT;
        const mountainBase = scene.add.rectangle(
            0, mountainBaseY, WIDTH, HEIGHT - mountainBaseY, TERRAIN_BASE,
        ).setOrigin(0);
        const shade = scene.add.rectangle(0, 0, WIDTH, HEIGHT, 0x171624, 0.4).setOrigin(0);
        this.group = scene.add.container(0, 0, [base, this.sky, this.planets, ...mountains, mountainBase, shade])
            .setDepth(-2.5);
    }

    render(visible: boolean, time: number): void {
        this.group?.setVisible(visible);
        if (!visible || !this.sky || !this.planets) return;

        const elapsed = this.reducedMotion.matches ? 0 : time / 1000;
        this.sky.tilePositionX = Math.floor(elapsed * 2) % WIDTH;
        this.planets.tilePositionX = Math.floor(elapsed * 4) % WIDTH;
    }
}
