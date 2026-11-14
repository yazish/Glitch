import type { Scene } from 'phaser';
import type { AreaId, ViridiaLayout } from '../worlds/viridia/layout';
import type { RoomProjection } from './RoomProjection';
import { HEIGHT } from '../viewport';

const palette: Record<AreaId, { sky: number; canopy: number; floor: number; path: number }> = {
    arrival: { sky: 0x92b9a3, canopy: 0x315f49, floor: 0x537b4b, path: 0xa98960 },
    trail: { sky: 0x668d87, canopy: 0x244838, floor: 0x394d3a, path: 0x847050 },
    heart: { sky: 0x8dbaa3, canopy: 0x285a48, floor: 0x4d7355, path: 0x8e9a76 },
};
const layers = ['background', 'floor'] as const;
const availableArt = import.meta.glob('/public/assets/viridia/*/*.png', { query: '?url', eager: true, import: 'default' });

export function preloadViridiaScenery(scene: Scene, layout: ViridiaLayout): void {
    for (const { id } of layout.areas) {
        for (const layer of layers) {
            if (!('/public/assets/viridia/' + id + '/' + layer + '.png' in availableArt)) continue;
            scene.load.image(`viridia-${id}-${layer}`, `${import.meta.env.BASE_URL}assets/viridia/${id}/${layer}.png`);
        }
    }
}

export function drawViridiaScenery(scene: Scene, layout: ViridiaLayout, projection: RoomProjection): void {
    const art = scene.add.graphics().setDepth(-2.2);
    const horizon = projection.project(layout.floor).y;
    for (const area of layout.areas) {
        const { startX, endX, id } = area;
        const width = endX - startX;
        const colors = palette[id];
        const backdrop = `viridia-${id}-background`;
        const floor = `viridia-${id}-floor`;
        if (scene.textures.exists(backdrop)) {
            scene.add.image(startX, 0, backdrop).setOrigin(0).setDisplaySize(width, horizon).setDepth(-2.15);
        } else {
            art.fillStyle(colors.sky).fillRect(startX, 0, width, horizon);
            art.fillStyle(0xf7e1a2, 0.65).fillCircle(startX + width * 0.56, 62, 21);
            for (let x = startX + 18; x < endX - 16; x += 64) {
                const treeHeight = 56 + ((x * 13) % 34);
                art.fillStyle(0x3e4636).fillRect(x - 3, horizon - treeHeight, 8, treeHeight);
                art.fillStyle(colors.canopy).fillEllipse(x, horizon - treeHeight, 34, 43);
                art.fillStyle(colors.floor).fillEllipse(x + 11, horizon - treeHeight - 6, 28, 20);
            }
        }

        if (scene.textures.exists(floor)) {
            scene.add.image(startX, horizon, floor).setOrigin(0).setDisplaySize(width, HEIGHT - horizon).setDepth(-2.15);
        } else {
            art.fillStyle(colors.floor).fillRect(startX, horizon, width, HEIGHT - horizon);
            projection.surface(art, { x: startX, y: 190, width, height: 73 }, colors.path);
            for (let x = startX + 10; x < endX; x += 22) {
                const offset = (x * 31) % 48;
                art.fillStyle(0xc1a77f, 0.35).fillEllipse(x, horizon + 102 + offset, 6, 2);
                art.fillStyle(0x9bc788, 0.5).fillTriangle(x, horizon + 20 + offset, x + 6, horizon + 15 + offset, x + 8, horizon + 23 + offset);
            }
        }
    }
}
