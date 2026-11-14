import type { Scene, Textures } from 'phaser';
import type { AreaId, ViridiaLayout } from '../worlds/viridia/layout';
import type { RoomProjection } from './RoomProjection';
import { HEIGHT } from '../viewport';
import { alienTexture } from './ViridiaPalette';

const palette: Record<AreaId, { sky: number; canopy: number; floor: number; path: number }> = {
    arrival: { sky: 0x92b9a3, canopy: 0x315f49, floor: 0x537b4b, path: 0xa98960 },
    trail: { sky: 0x668d87, canopy: 0x244838, floor: 0x394d3a, path: 0x847050 },
    heart: { sky: 0x8dbaa3, canopy: 0x285a48, floor: 0x4d7355, path: 0x8e9a76 },
};
const layers = ['background', 'floor'] as const;
const availableArt = import.meta.glob('/public/assets/viridia/*/*.png', { query: '?url', eager: true, import: 'default' });

function recolorTile(scene: Scene, key: string, source: HTMLImageElement, x: number, y: number,
    colors: readonly [number, number, number]): boolean {
    if (scene.textures.exists(key)) return true;
    const tile = scene.textures.createCanvas(key, 16, 16);
    if (!tile) return false;
    const context = tile.getContext();
    context.drawImage(source, x, y, 16, 16, 0, 0, 16, 16);
    const pixels = context.getImageData(0, 0, 16, 16);
    for (let i = 0; i < pixels.data.length; i += 4) {
        const brightness = 0.299 * pixels.data[i] + 0.587 * pixels.data[i + 1] + 0.114 * pixels.data[i + 2];
        pixels.data[i] = brightness * colors[0];
        pixels.data[i + 1] = brightness * colors[1];
        pixels.data[i + 2] = brightness * colors[2];
    }
    context.putImageData(pixels, 0, 0);
    tile.refresh();
    return true;
}

export function preloadViridiaScenery(scene: Scene, layout: ViridiaLayout): void {
    scene.load.image('viridia-starry-sky', `${import.meta.env.BASE_URL}assets/viridia/starry-night/sky.png`);
    scene.load.image('viridia-falling-star', `${import.meta.env.BASE_URL}assets/viridia/starry-night/falling-star.gif`);
    scene.load.image('viridia-jungle-tiles', `${import.meta.env.BASE_URL}assets/viridia/jungle/tileset.png`);
    scene.load.image('viridia-jungle-vines', `${import.meta.env.BASE_URL}assets/viridia/jungle/vines.png`);
    for (let i = 1; i <= 5; i++) {
        scene.load.image(`viridia-jungle-background-${i}`, `${import.meta.env.BASE_URL}assets/viridia/jungle/background-${i}.png`);
    }
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
    const hasStarrySky = scene.textures.exists('viridia-starry-sky');
    let starTexture: string | undefined;
    if (scene.textures.exists('viridia-falling-star')) {
        const image = scene.textures.get('viridia-falling-star').getSourceImage();
        if (image instanceof HTMLImageElement) {
            const canvas = scene.textures.exists('viridia-animated-star')
                ? scene.textures.get('viridia-animated-star') as Textures.CanvasTexture
                : scene.textures.createCanvas('viridia-animated-star', image.width, image.height);
            if (canvas) {
                const redraw = () => {
                    const context = canvas.getContext();
                    context.clearRect(0, 0, image.width, image.height);
                    context.drawImage(image, 0, 0);
                    canvas.refresh();
                };
                redraw();
                if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                    scene.events.on('update', redraw);
                    scene.events.once('shutdown', () => scene.events.off('update', redraw));
                }
                starTexture = 'viridia-animated-star';
            }
        }
    }
    const hasTiles = scene.textures.exists('viridia-jungle-tiles');
    let grassTexture = 'viridia-jungle-tiles';
    let grassFrame: string | undefined = 'grass';
    let pathTexture = 'viridia-jungle-tiles';
    let pathFrame: string | undefined = 'dirt';
    let scenery: { tree: string; flowers: string; rocks: string; vines: string } | undefined;
    if (hasTiles) {
        const texture = scene.textures.get('viridia-jungle-tiles');
        if (!texture.has('grass')) {
            texture.add('grass', 0, 16, 16, 16, 16);
            texture.add('dirt', 0, 280, 24, 16, 16);
        }
        const source = texture.getSourceImage();
        if (source instanceof HTMLImageElement && recolorTile(scene, 'viridia-dusk-grass', source, 16, 16, [0.72, 0.43, 0.91])) {
            grassTexture = 'viridia-dusk-grass';
            grassFrame = undefined;
        }
        if (source instanceof HTMLImageElement && recolorTile(scene, 'viridia-slate-path', source, 280, 24, [0.75, 0.71, 0.94])) {
            pathTexture = 'viridia-slate-path';
            pathFrame = undefined;
        }
        if (scene.textures.exists('viridia-jungle-vines')) {
            scenery = {
                tree: alienTexture(scene, 'viridia-alien-tree', 'viridia-jungle-tiles', [160, 80, 80, 80], true),
                flowers: alienTexture(scene, 'viridia-alien-flowers', 'viridia-jungle-tiles', [16, 48, 32, 16]),
                rocks: alienTexture(scene, 'viridia-alien-rocks', 'viridia-jungle-tiles', [48, 96, 32, 16]),
                vines: alienTexture(scene, 'viridia-alien-vines', 'viridia-jungle-vines'),
            };
        }
    }
    for (const area of layout.areas) {
        const { startX, endX, id } = area;
        const width = endX - startX;
        const colors = palette[id];
        const backdrop = `viridia-${id}-background`;
        const floor = `viridia-${id}-floor`;
        if (hasStarrySky) {
            scene.add.tileSprite(startX, 0, width, horizon, 'viridia-starry-sky')
                .setOrigin(0).setDepth(-2.15);
            if (starTexture) scene.add.image(startX + width * 0.65, 12, starTexture)
                .setOrigin(0).setDepth(-2.14);
        } else if (scene.textures.exists('viridia-jungle-background-1')) {
            for (let i = 1; i <= 5; i++) {
                scene.add.tileSprite(startX, 0, width, horizon, `viridia-jungle-background-${i}`)
                    .setOrigin(0).setTileScale(1, horizon / 216).setDepth(-2.2 + i * 0.001);
            }
        } else if (scene.textures.exists(backdrop)) {
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

        if (hasTiles) {
            scene.add.tileSprite(startX, horizon, width, HEIGHT - horizon, grassTexture, grassFrame)
                .setOrigin(0).setDepth(-2.15);
            scene.add.rectangle(startX, horizon, width, 15, 0x120b22, 0.23)
                .setOrigin(0).setDepth(-2.145);
            const path = projection.project({ x: startX, y: 190 });
            const pathEnd = projection.project({ x: startX, y: 263 });
            scene.add.tileSprite(startX, path.y, width, pathEnd.y - path.y, pathTexture, pathFrame)
                .setOrigin(0).setDepth(-2.14);
            scene.add.rectangle(startX, path.y, width, 3, 0x1a102b, 0.25)
                .setOrigin(0).setDepth(-2.13);
            scene.add.rectangle(startX, pathEnd.y - 3, width, 3, 0x1a102b, 0.18)
                .setOrigin(0).setDepth(-2.13);
            if (scenery) {
                for (let x = startX + 40; x < endX - 30; x += 140) {
                    const point = projection.project({ x, y: layout.floor.y + 18 });
                    scene.add.image(point.x, point.y, x % 3 === 0 ? scenery.flowers : scenery.rocks)
                        .setOrigin(0.5, 1).setDepth(-1.9);
                }
                const tree = projection.project({ x: startX + width * 0.55, y: layout.floor.y + 10 });
                scene.add.image(tree.x, tree.y, scenery.tree).setOrigin(0.5, 1).setDepth(-1.9);
                scene.add.image(startX + width * 0.3, horizon - 5, scenery.vines)
                    .setOrigin(0.5, 1).setScale(2).setDepth(-1.9);
            }
        } else if (scene.textures.exists(floor)) {
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
    if (scenery) {
        // Sort by each tree's ground contact point so characters can walk behind it.
        const trees: readonly (readonly [number, number, number])[] = [
            [1450, 160, 0.9], [1680, 292, 1.0], [1998, 280, 0.85],
            [2260, 150, 0.9], [2578, 290, 0.85], [3115, 292, 0.95],
        ];
        for (const [x, y, scale] of trees) {
            const point = projection.project({ x, y });
            scene.add.image(point.x, point.y, scenery.tree).setOrigin(0.5, 1)
                .setScale(scale).setDepth(point.y);
        }
    }
}
