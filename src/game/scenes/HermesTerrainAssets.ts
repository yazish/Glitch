import type { Scene } from 'phaser';
import type { HermesLayout } from '../worlds/hermes/room';
import type { RoomProjection } from './RoomProjection';

const ASSETS = ['cursed-ground', 'cursed-rock', 'cursed-ruin', 'cursed-growth', 'cursed-eye', 'wood-bridge', 'brick-wall', 'skull-door'] as const;
const key = (name: typeof ASSETS[number]) => `hermes-terrain-${name}`;

export function preloadHermesTerrain(scene: Scene): void {
    for (const name of ASSETS) {
        scene.load.image(key(name), `${import.meta.env.BASE_URL}assets/hermes/terrain/${name}.png`);
    }
}

/** The floor textures are purely visual; the simulation owns walkable areas. */
export function drawHermesTerrainAssets(scene: Scene, projection: RoomProjection, layout: HermesLayout): boolean {
    if (!scene.textures.exists(key('cursed-ground'))) return false;
    const { floor, outpost } = layout;
    const left = projection.project({ x: 0, y: floor.y });
    const bottom = projection.project({ x: 0, y: floor.y + floor.height });
    const rightEdge = floor.x * 2 + floor.width;
    const bridgeEnd = outpost.bridge.x + outpost.bridge.width;
    for (const [x, width] of [[0, outpost.bridge.x], [bridgeEnd, rightEdge - bridgeEnd]]) {
        scene.add.tileSprite(x, left.y, width, bottom.y - left.y, key('cursed-ground'))
            .setOrigin(0).setDepth(-2.01);
    }

    const decorations: readonly [typeof ASSETS[number], number, number, number][] = [
        ['cursed-rock', 55, 135, 25], ['cursed-ruin', 190, 128, 30],
        ['cursed-growth', 260, 140, 20], ['cursed-eye', 105, 302, 24],
        ['cursed-rock', 395, 139, 27], ['cursed-growth', 470, 300, 19],
        ['cursed-rock', 545, 307, 25], ['cursed-ruin', 800, 130, 30],
        ['cursed-eye', 850, 302, 24], ['cursed-growth', 1080, 145, 19],
    ];
    for (const [name, x, y, size] of decorations) {
        if (!scene.textures.exists(key(name))) continue;
        const point = projection.project({ x, y });
        const image = scene.add.image(point.x, point.y, key(name)).setOrigin(0.5, 1);
        image.setDisplaySize(size, size * image.height / image.width).setDepth(point.y);
    }
    return true;
}
