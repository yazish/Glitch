import type { Point, Rect } from '../geometry.ts';

export const FLOOR: Rect = { x: 0, y: 142, width: 640, height: 218 };
export const WALK: Rect = { x: 18, y: 154, width: 604, height: 190 };
export const BARRIER: Rect = { x: 552, y: 212, width: 36, height: 64 };
export const BARRIER_CORE: Rect = { x: 552, y: 201, width: 36, height: 44 };
export const BARRIER_FACE: Rect = { x: 543, y: 186, width: 54, height: 85 };
export const BOSS_FEET: Point = { x: 500, y: 250 };
export const GEAR: Point = { x: 119, y: 207 };
export const AMPLIFIER: Point = { x: 315, y: 186 };
export const FIRING_POSITION: Point = { x: 365, y: 243 };
export const WAYMARK: Point = { x: 252, y: 197 };
export const TRANSMITTER: Point = { x: 389, y: 302 };
export const PORTAL: Point = { x: 590, y: 303 };
export const PORTAL_OPEN_TICKS = 180;
export const PORTAL_PULL_TICKS = 150;
export const ABYSS_TICKS = 210;
export const ZONES = [0.40, 0.28, 0.18] as const;
export const TUNING = {
    walk: 2.2, radius: 8, shotgunInterval: 15, cannonInterval: 240,
    shieldCapacity: 90, shieldBlock: 21, shieldRecharge: 0.65, immunity: 72,
    warning: 65, phaseHits: 4, phases: 3, integrity: 3,
    cannonRange: 310, pelletDamage: 0.5, meleeRange: 62, meleeInterval: 30,
} as const;

export type AreaId = 'street' | 'avenue' | 'crown';
type Spawn = Readonly<{ at: Point; delay: number }>;
export type Wave = readonly Spawn[];
type Cover = Rect & Readonly<{ label: string; heightAboveGround: number }>;
type Arena = Readonly<{
    name: string;
    entry: Point;
    cover: readonly Cover[];
    exit?: Rect;
    waves: readonly Wave[];
}>;

const point = (x: number, y: number): Point => ({ x, y });
const cover = (x: number, y: number, width: number, height: number): Rect => ({ x, y, width, height });
const prop = (label: string, heightAboveGround: number, x: number, y: number, width: number, height: number): Cover =>
    ({ ...cover(x + width * 0.15, y + height * 0.175, width * 0.7, height * 0.65), label, heightAboveGround });
const spawn = (x: number, y: number, delay = 0): Spawn => ({ at: point(x, y), delay });

export const ARENAS: Readonly<Record<AreaId, Arena>> = {
    street: {
        name: 'The Breached Streets',
        entry: point(64, 250),
        cover: [prop('Collapsed building', 42, 195, 169, 65, 37), prop('Stone rubble', 17, 278, 279, 38, 36),
            prop('Broken wall', 28, 368, 244, 91, 42), prop('Watchtower base', 46, 454, 162, 59, 42)],
        exit: cover(589, 281, 32, 56),
        waves: [
            [spawn(305, 226)],
            [spawn(551, 191), spawn(527, 323, 15), spawn(343, 205, 32), spawn(580, 258, 105)],
            [spawn(232, 250), spawn(542, 188, 15), spawn(528, 322, 25), spawn(330, 319, 35), spawn(560, 254, 112)],
        ],
    },
    avenue: {
        name: 'Transmitter Avenue',
        entry: point(62, 247),
        cover: [prop('Generator housing', 37, 194, 163, 68, 43), prop('Pipe barricade', 25, 215, 279, 101, 29),
            prop('Broken conduit', 21, 389, 276, 76, 34), prop('Pylon foundation', 42, 464, 162, 61, 44),
            prop('Cargo crates', 31, 119, 266, 38, 34)],
        exit: cover(591, 157, 30, 46),
        waves: [
            [spawn(512, 224), spawn(525, 320, 13), spawn(124, 184, 24), spawn(147, 322, 38), spawn(384, 172, 110)],
            [spawn(554, 181), spawn(546, 325, 12), spawn(157, 185, 26), spawn(145, 321, 145), spawn(568, 233, 158), spawn(384, 172, 180)],
        ],
    },
    crown: {
        name: 'The Celestial Crown',
        entry: point(205, 250),
        cover: [prop('North barricade', 32, 295, 158, 65, 30), prop('South barricade', 32, 295, 310, 65, 30)],
        waves: [],
    },
};

export const REINFORCEMENTS: Wave = [spawn(69, 179), spawn(566, 179, 18)];
