import type { GameObjects, Scene } from 'phaser';
import { ARENAS } from '../worlds/vesper/layout';
import type { AreaId } from '../worlds/vesper/layout';
import { project } from '../worlds/vesper/space';

const ASSETS = [
    'city_asphalt', 'city_asphalt_wet', 'city_sidewalk_wet', 'city_crosswalk', 'city_puddle',
    'bld_tower6', 'bld_garage2_door_sw_closed', 'bld_garage2_door_sw_open', 'bld_shop2', 'bld_bar2',
    'cover_barrier_x_broken', 'sec_turret_broken', 'fuel_cell_broken', 'trash', 'crates',
    'altwall_0101', 'altwall_1010', 'pipe_0101', 'pipe_1010', 'neon_lamp', 'fire_barrel',
    'toxic_barrel_ok', 'hydrant', 'traffic_light_sw', 'cone', 'loot_crate_locked',
] as const;
const SIGNS = ['banner-a1', 'banner-c1', 'lights1'] as const;
const SKYLINE = ['back', 'middle', 'front'] as const;
const FLOOR_PROPS = new Set<string>([
    'cover_barrier_x_broken', 'sec_turret_broken', 'fuel_cell_broken', 'trash', 'crates',
    'altwall_0101', 'altwall_1010', 'pipe_0101', 'pipe_1010', 'neon_lamp', 'fire_barrel',
    'toxic_barrel_ok', 'hydrant', 'traffic_light_sw', 'cone', 'loot_crate_locked',
]);

export function preloadVesperCity(scene: Scene): void {
    for (const asset of ASSETS) {
        const folder = FLOOR_PROPS.has(asset) ? 'visible' : 'neon-city';
        scene.load.image(`vesper-city-${asset}`, `${import.meta.env.BASE_URL}assets/vesper/cosmic/${folder}/${asset}.png`);
    }
    for (const asset of SIGNS) {
        scene.load.image(`vesper-skyline-${asset}`, `${import.meta.env.BASE_URL}assets/vesper/cosmic/cyberpunk-city-2/${asset}.png`);
    }
    for (const asset of SKYLINE) {
        scene.load.image(`vesper-skyline-${asset}`, `${import.meta.env.BASE_URL}assets/vesper/cosmic/cyberpunk-city-2/${asset}.png`);
    }
    scene.load.image('vesper-shotgun', `${import.meta.env.BASE_URL}assets/vesper/weapons/winchester-shotgun.png`);
    scene.load.image('vesper-blade', `${import.meta.env.BASE_URL}assets/vesper/weapons/blade.png`);
}

/** Decorative art only: arena cover and gameplay continue to use the existing layout. */
export class VesperCityArt {
    private readonly objects: GameObjects.GameObject[] = [];

    constructor(private readonly scene: Scene) {}

    setArea(area: AreaId): void {
        for (const object of this.objects) object.destroy();
        this.objects.length = 0;
        const add = (key: typeof ASSETS[number], x: number, y: number, scale: number, depth: number, alpha = 1) => {
            if (!this.scene.textures.exists(`vesper-city-${key}`)) return;
            const image = this.scene.add.image(x, y, `vesper-city-${key}`).setOrigin(0.5, 1)
                .setScale(scale).setDepth(depth).setAlpha(alpha);
            this.objects.push(image);
        };

        // The pack's 2:1 diamonds form a continuous street without changing movement coordinates.
        for (let row = 0; row < 16; row++) {
            for (let column = -1; column < 11; column++) {
                const x = column * 64 + (row % 2) * 32;
                const y = 158 + row * 16;
                const key = row < 2 || row > 13 ? 'city_sidewalk_wet'
                    : (column === 2 && row >= 5 && row <= 11) ? 'city_crosswalk'
                        : (row + column * 3) % 9 === 0 ? 'city_asphalt_wet' : 'city_asphalt';
                add(key, x, y, 1, -19, 0.86);
            }
        }
        const road = this.scene.add.graphics().setDepth(-18.95);
        road.lineStyle(2, 0x748fc2, 0.45).lineBetween(0, 176, 640, 176)
            .lineBetween(0, 336, 640, 336);
        for (let x = 48; x < 640; x += 96) {
            road.fillStyle(0xa9b7f2, 0.46).fillRect(x, 253, 41, 3);
        }
        this.objects.push(road);
        // The original layers repeat at native proportions, behind the foreground buildings.
        for (const [layer, width, depth] of [
            ['back', 96, -19.95], ['middle', 144, -19.9], ['front', 272, -19.85],
        ] as const) {
            if (!this.scene.textures.exists(`vesper-skyline-${layer}`)) continue;
            for (let x = 0; x < 640; x += width) {
                this.objects.push(this.scene.add.image(x, 142, `vesper-skyline-${layer}`)
                    .setOrigin(0, 1).setDepth(depth));
            }
        }

        // A distant ringed world sits above the skyline in every district.
        const planet = this.scene.add.graphics().setDepth(-19.84);
        planet.lineStyle(7, 0x7567bd, 0.55).strokeEllipse(373, 25, 207, 45)
            .lineStyle(2, 0x9fc1ed, 0.65).strokeEllipse(373, 25, 221, 52)
            .fillStyle(0x1a204a).fillCircle(373, 12, 57)
            .fillStyle(0x5451a3).fillCircle(367, 7, 49)
            .fillStyle(0x9e9be6, 0.35).fillEllipse(354, 10, 72, 14)
            .fillStyle(0x303b7c, 0.32).fillEllipse(374, 33, 86, 10)
            .lineStyle(2, 0xa8a7f4, 0.65).strokeEllipse(373, 25, 207, 45);
        this.objects.push(planet);

        // Keep the individual buildings in front of the distant city.
        const buildings = area === 'street'
            ? [['bld_tower6', 96, 0.30], ['bld_garage2_door_sw_closed', 529, 0.34]] as const
            : area === 'avenue'
                ? [['bld_bar2', 112, 0.34], ['bld_tower6', 536, 0.29]] as const
                : [['bld_tower6', 90, 0.28], ['bld_tower6', 550, 0.28]] as const;
        for (const [key, x, scale] of buildings) add(key, x, 145, scale, -19.7, 0.85);
        const signs = area === 'street'
            ? [['banner-c1', 120, 115], ['banner-a1', 479, 116]] as const
            : area === 'avenue'
                ? [['banner-a1', 180, 117], ['lights1', 541, 123]] as const
                : [['banner-c1', 96, 118], ['banner-c1', 550, 118]] as const;
        for (const [key, x, y] of signs) {
            if (this.scene.textures.exists(`vesper-skyline-${key}`)) {
                this.objects.push(this.scene.add.image(x, y, `vesper-skyline-${key}`)
                    .setOrigin(0.5, 1).setScale(0.55).setDepth(-19.6).setAlpha(0.9));
            }
        }

        // Soften the seam without covering the playfield or its interactive objects.
        const haze = this.scene.add.graphics().setDepth(-18.9);
        for (let band = 0; band < 10; band++) {
            const alpha = 0.20 * (1 - band / 10);
            haze.fillStyle(0x211b30, alpha).fillRect(0, 138 + band * 3, 640, 3);
        }
        this.objects.push(haze);

        const detail: readonly (readonly [typeof ASSETS[number], number, number, number])[] =
            area === 'street'
                ? [['trash', 75, 164, 0.85], ['cover_barrier_x_broken', 260, 150, 1.0],
                    ['sec_turret_broken', 507, 155, 0.95], ['cone', 72, 324, 0.8],
                    ['fire_barrel', 552, 335, 0.8], ['fuel_cell_broken', 174, 323, 0.9],
                    ['neon_lamp', 588, 153, 0.85], ['city_puddle', 351, 342, 1.1],
                    ['fire_barrel', 322, 202, 0.72], ['cone', 485, 305, 0.75]]
                : area === 'avenue'
                    ? [['altwall_0101', 70, 160, 0.7], ['altwall_1010', 577, 160, 0.7],
                        ['pipe_0101', 333, 160, 1.0], ['pipe_1010', 442, 336, 1.0],
                        ['sec_turret_broken', 571, 328, 0.9], ['fuel_cell_broken', 345, 335, 0.9],
                        ['trash', 72, 322, 0.8], ['traffic_light_sw', 609, 165, 0.8],
                        ['toxic_barrel_ok', 110, 159, 0.8], ['fire_barrel', 355, 210, 0.72],
                        ['cone', 528, 300, 0.75]]
                    : [['cover_barrier_x_broken', 62, 327, 1], ['cover_barrier_x_broken', 578, 326, 1],
                        ['sec_turret_broken', 75, 169, 0.9], ['fuel_cell_broken', 557, 169, 0.85],
                        ['neon_lamp', 35, 181, 0.8], ['neon_lamp', 605, 181, 0.8],
                        ['fire_barrel', 140, 310, 0.72], ['cone', 513, 305, 0.75]];
        for (const [key, x, y, scale] of detail) add(key, x, y, scale * 1.12, y - 2);

        // Dress the existing cover positions so the artwork stays aligned with collision and targeting.
        for (const [index, wall] of ARENAS[area].cover.entries()) {
            const at = project({ x: wall.x + wall.width / 2, y: wall.y + wall.height });
            const variants = area === 'street'
                ? ['crates', 'fuel_cell_broken', 'cover_barrier_x_broken', 'sec_turret_broken'] as const
                : area === 'avenue'
                    ? ['fuel_cell_broken', 'pipe_0101', 'pipe_1010', 'sec_turret_broken', 'crates'] as const
                    : ['crates', 'fuel_cell_broken'] as const;
            const key = variants[index % variants.length];
            const pieces = wall.width >= 75 ? 2 : 1;
            for (let part = 0; part < pieces; part++) {
                const x = at.x + (part - (pieces - 1) / 2) * 28;
                add(key, x, at.y, 1.25, wall.y + wall.height + 0.1 + part * 0.001, 0.96);
            }
        }
    }
}
