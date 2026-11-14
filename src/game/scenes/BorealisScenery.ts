import type { GameObjects, Scene } from 'phaser';
import type { BorealisArea, BorealisLayout } from '../worlds/borealis/layout';
import { HEIGHT, WIDTH } from '../viewport';
import type { RoomProjection } from './RoomProjection';
import { addHorizonFade } from './HorizonFade';

const palette: Record<BorealisArea, { sky: number; far: number; near: number; snow: number; shade: number }> = {
    pass: { sky: 0xa6cee0, far: 0x789db6, near: 0x526e8e, snow: 0xd2e5ed, shade: 0x91adbf },
    basin: { sky: 0x709cb9, far: 0x578aae, near: 0x2e5578, snow: 0xb2d6e7, shade: 0x709db9 },
    summit: { sky: 0x454467, far: 0x65688f, near: 0x363957, snow: 0xaeb8d7, shade: 0x747b9e },
};

const ASSETS = {
    sky: 'background/sky.png', mountains: 'background/glacial_mountains.png', clouds: 'background/clouds_mg_1.png',
    pass: 'terrain/wind_swept_snow.png', ice: 'terrain/icy_snow.png', summit: 'terrain/crusted_snow.png',
    tracks: 'terrain/snow_tracks.png', large: 'trees/large-spruce.png', small: 'trees/small-pine.png',
    field: 'winterwake/01_the_field.png', pines: 'winterwake/02_the_pines.png',
    river: 'winterwake/03_the_frozen_river.png', aurora: 'winterwake/04_the_aurora.png',
} as const;

export function preloadBorealisScenery(scene: Scene): void {
    for (const [name, path] of Object.entries(ASSETS)) {
        scene.load.image(`borealis-${name}`, `${import.meta.env.BASE_URL}assets/borealis/${path}`);
    }
}

export class BorealisParallax {
    private readonly layers: { sprite: GameObjects.TileSprite; start: number; factor: number; scale: number }[] = [];
    private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    private aurora?: GameObjects.TileSprite;
    private transitions?: { river: GameObjects.TileSprite; pines: GameObjects.TileSprite; basin: number; summit: number };

    setAurora(sprite: GameObjects.TileSprite): void { this.aurora = sprite; }
    setTransitions(river: GameObjects.TileSprite, pines: GameObjects.TileSprite, basin: number, summit: number): void {
        this.transitions = { river, pines, basin, summit };
    }

    add(sprite: GameObjects.TileSprite, start: number, factor: number, scale: number): void {
        this.layers.push({ sprite, start, factor, scale });
    }

    render(cameraX: number, auroraStrength = 0): void {
        let summitBlend = 1;
        if (this.transitions) {
            const focus = cameraX + WIDTH * 0.45;
            const blend = (boundary: number) => Math.max(0, Math.min(1, (focus - boundary + 180) / 360));
            this.transitions.river.setAlpha(blend(this.transitions.basin));
            summitBlend = blend(this.transitions.summit);
            this.transitions.pines.setAlpha(summitBlend);
        }
        this.aurora?.setAlpha(Math.max(0, Math.min(1, auroraStrength)) * summitBlend);
        for (const { sprite, start, factor, scale } of this.layers) {
            sprite.tilePositionX = this.reducedMotion.matches ? 0 : -(cameraX - start) * (1 - factor) / scale;
        }
    }
}

export function drawBorealisScenery(scene: Scene, layout: BorealisLayout, projection: RoomProjection): BorealisParallax {
    const parallax = new BorealisParallax();
    if (Object.keys(ASSETS).every((key) => scene.textures.exists(`borealis-${key}`))) {
        drawTexturedScenery(scene, layout, projection, parallax);
        addHorizonFade(scene, layout.floor.x, layout.floor.width, projection.project(layout.floor).y, 0x91adbe, -2.14);
        return parallax;
    }
    const art = scene.add.graphics().setDepth(-2.2);
    const horizon = projection.project(layout.floor).y;
    let start = layout.floor.x;
    for (const area of Object.values(layout.areas)) {
        const { endX, id } = area;
        const colors = palette[id];
        art.fillStyle(colors.sky).fillRect(start, 0, endX - start, horizon);
        if (id !== 'summit') art.fillStyle(0xe5f3f5, 0.8).fillCircle(start + 160, 46, 17);
        for (let x = start; x < endX; x += 127) {
            const edge = Math.min(endX, x + 155);
            const peak = (x + edge) / 2;
            const peakY = 29 + x % 45;
            art.fillStyle(colors.far).fillTriangle(x, horizon, peak, peakY, edge, horizon);
            art.fillStyle(colors.snow).fillTriangle(peak - 20, peakY + 22, peak, peakY, peak + 19, peakY + 23);
        }
        for (let x = start; x < endX; x += 191) {
            const edge = Math.min(endX, x + 220);
            const peak = (x + edge) / 2;
            const peakY = 75 + x % 39;
            art.fillStyle(colors.near).fillTriangle(x, horizon, peak, peakY, edge, horizon);
            art.fillStyle(colors.snow, 0.75).fillTriangle(peak - 21, peakY + 14, peak, peakY, peak + 21, peakY + 14);
        }
        art.fillStyle(colors.snow).fillRect(start, horizon, endX - start, HEIGHT - horizon);
        projection.surface(art, { x: start, y: 205, width: endX - start, height: 47 }, colors.shade, 0.35);
        for (let x = start + 12; x < endX - 18; x += 23) {
            const y = horizon + 12 + (x * 13) % 187;
            art.fillStyle(colors.shade, 0.45).fillEllipse(x, y, 15 + x % 9, 3 + x % 4);
            art.fillStyle(0xf6fcff, 0.68).fillEllipse(x + 4, y + 4, 8, 2);
        }
        start = endX;
    }
    projection.surface(art, layout.ice, 0x6ca3c1);
    projection.outline(art, layout.ice, 0xe0f7ff, 0.9);
    for (let x = layout.ice.x + 18; x < layout.ice.x + layout.ice.width - 24; x += 63) {
        const p = projection.project({ x, y: layout.ice.y + 12 + x % 123 });
        art.lineStyle(2, 0xb4e6fa, 0.5).lineBetween(p.x, p.y, p.x + 21, p.y + 5);
    }
    addHorizonFade(scene, layout.floor.x, layout.floor.width, horizon, 0x91adbe, -2.14);
    return parallax;
}

function drawTexturedScenery(scene: Scene, layout: BorealisLayout, projection: RoomProjection, parallax: BorealisParallax): void {
    const horizon = projection.project(layout.floor).y;
    const cloudScale = horizon / 216;
    const backdropScale = horizon / 144;
    const startX = layout.floor.x;
    const totalWidth = layout.floor.width;
    const background = (key: string, depth: number) => {
        const sprite = scene.add.tileSprite(startX, 0, totalWidth, horizon, `borealis-${key}`)
            .setOrigin(0).setTileScale(backdropScale).setDepth(depth);
        parallax.add(sprite, startX, 0.2, backdropScale);
        return sprite;
    };
    background('field', -2.3);
    const river = background('river', -2.295).setAlpha(0);
    const pines = background('pines', -2.29).setAlpha(0);
    parallax.setTransitions(river, pines, layout.areas.pass.endX, layout.areas.basin.endX);
    const aurora = background('aurora', -2.285).setAlpha(0);
    parallax.setAurora(aurora);
    const clouds = scene.add.tileSprite(startX, 0, totalWidth, horizon, 'borealis-clouds')
        .setOrigin(0).setTileScale(cloudScale).setTint(0x9fb9d3).setAlpha(0.24).setDepth(-2.28);
    parallax.add(clouds, startX, 0.17, cloudScale);
    let start = layout.floor.x;
    for (const area of Object.values(layout.areas)) {
        const width = area.endX - start;
        const ground = area.id === 'summit' ? 'summit' : 'pass';
        scene.add.rectangle(start, horizon, width, HEIGHT - horizon, area.id === 'summit' ? 0x9aabc1 : 0xb8d0dd)
            .setOrigin(0).setDepth(-2.2);
        scene.add.tileSprite(start, horizon, width, HEIGHT - horizon, `borealis-${ground}`)
            .setOrigin(0).setAlpha(0.24).setDepth(-2.19);
        start = area.endX;
    }
    const iceTop = projection.project(layout.ice);
    const iceBottom = projection.project({ x: layout.ice.x, y: layout.ice.y + layout.ice.height });
    scene.add.tileSprite(iceTop.x, iceTop.y, layout.ice.width, iceBottom.y - iceTop.y, 'borealis-ice')
        .setOrigin(0).setTint(0xa4e3ff).setAlpha(0.7).setDepth(-2.17);
    scene.add.rectangle(iceTop.x, iceTop.y, layout.ice.width, iceBottom.y - iceTop.y, 0x8bd2f3, 0.28)
        .setOrigin(0).setDepth(-2.165);
    const iceOutline = scene.add.graphics().setDepth(-2.16);
    projection.outline(iceOutline, layout.ice, 0xe0f7ff, 0.8);
    for (const track of [layout.basinTrack, ...layout.summitTracks]) {
        const top = projection.project({ x: track.left, y: track.y - 12 });
        const bottom = projection.project({ x: track.left, y: track.y + 12 });
        scene.add.tileSprite(top.x, top.y - 7, track.right - track.left, bottom.y - top.y + 14, 'borealis-prop-sled-rails')
            .setOrigin(0).setDepth(-2.15);
    }
    const trees: readonly (readonly [number, number, 'large' | 'small', number])[] = [
        [3315, 125, 'large', 0.6], [3495, 296, 'small', 0.8], [3690, 130, 'small', 0.7],
        [3900, 298, 'large', 0.6], [4120, 305, 'small', 0.65], [4410, 303, 'small', 0.7],
        [4708, 125, 'small', 0.6], [5370, 305, 'large', 0.55],
    ];
    for (const [x, y, kind, size] of trees) {
        const point = projection.project({ x, y });
        scene.add.image(point.x, point.y, `borealis-${kind}`).setOrigin(0.5, 1).setScale(size).setDepth(point.y);
    }
}
