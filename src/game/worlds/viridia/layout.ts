import type { Pose, Rect } from '../geometry.ts';

export type AreaId = 'arrival' | 'trail' | 'heart';
export type SoundKind = 'soft' | 'loud' | 'sustained';
export type SoundTarget = 'flowers' | 'reflector' | 'receiver' | 'bloom' | 'fracture' | 'resonance';

export interface SoundProp {
    readonly id: SoundTarget;
    readonly sound: SoundKind;
    readonly zone: Rect;
    readonly art: Rect;
}

export interface ViridiaLayout {
    readonly floor: Rect;
    readonly entry: Pose;
    readonly areas: readonly { id: AreaId; name: string; startX: number; endX: number }[];
    readonly log: Rect;
    readonly logBrace: Rect;
    readonly logTrackWalls: readonly Rect[];
    readonly logTravel: number;
    readonly flowerBarrier: Rect;
    readonly roots: Rect;
    readonly vines: Rect;
    readonly soundProps: readonly SoundProp[];
    readonly reflectorTurns: number;
    readonly alignedTurn: number;
    readonly tree: Rect;
    readonly trunk: Rect;
    readonly discovery: Rect;
    readonly plate: Rect;
    readonly pedestal: Rect;
    readonly exit: Rect;
    readonly arrivalPortal: Rect;
    readonly heartCheckpoint: Pose;
}

export const viridia: ViridiaLayout = {
    floor: { x: 1344, y: 96, width: 1856, height: 224 },
    entry: { x: 1400, y: 224, facing: 'right' },
    areas: [
        { id: 'arrival', name: 'Arrival Clearing', startX: 1344, endX: 1936 },
        { id: 'trail', name: 'Rootbound Trail', startX: 1936, endX: 2496 },
        { id: 'heart', name: 'Heart Tree', startX: 2496, endX: 3200 },
    ],
    log: { x: 1552, y: 195, width: 30, height: 66 },
    logBrace: { x: 1504, y: 189, width: 48, height: 76 },
    logTrackWalls: [
        { x: 1552, y: 96, width: 30, height: 99 },
        { x: 1552, y: 261, width: 30, height: 59 },
    ],
    logTravel: 59,
    flowerBarrier: { x: 1792, y: 96, width: 24, height: 224 },
    roots: { x: 2192, y: 96, width: 28, height: 224 },
    vines: { x: 2400, y: 96, width: 24, height: 224 },
    soundProps: [
        { id: 'flowers', sound: 'soft', zone: { x: 1736, y: 164, width: 52, height: 118 },
            art: { x: 1792, y: 200, width: 24, height: 48 } },
        { id: 'reflector', sound: 'loud', zone: { x: 2092, y: 174, width: 76, height: 102 },
            art: { x: 2110, y: 203, width: 40, height: 44 } },
        { id: 'receiver', sound: 'sustained', zone: { x: 2320, y: 170, width: 74, height: 108 },
            art: { x: 2337, y: 204, width: 40, height: 40 } },
        { id: 'bloom', sound: 'soft', zone: { x: 2692, y: 129, width: 65, height: 54 },
            art: { x: 2705, y: 136, width: 40, height: 40 } },
        { id: 'fracture', sound: 'loud', zone: { x: 2862, y: 129, width: 65, height: 54 },
            art: { x: 2875, y: 136, width: 40, height: 40 } },
        { id: 'resonance', sound: 'sustained', zone: { x: 2782, y: 250, width: 65, height: 54 },
            art: { x: 2795, y: 257, width: 40, height: 40 } },
    ],
    reflectorTurns: 4,
    alignedTurn: 1,
    tree: { x: 2772, y: 176, width: 86, height: 62 },
    trunk: { x: 2801, y: 202, width: 28, height: 20 },
    discovery: { x: 2590, y: 96, width: 300, height: 224 },
    // Mirrored around the Resonance Stone's center at x = 2815.
    plate: { x: 2916, y: 251, width: 44, height: 32 },
    pedestal: { x: 2583, y: 193, width: 52, height: 56 },
    exit: { x: 3054, y: 195, width: 50, height: 58 },
    arrivalPortal: { x: 1348, y: 202, width: 36, height: 44 },
    heartCheckpoint: { x: 2590, y: 224, facing: 'right' },
};

export const STONE_SEQUENCE = ['bloom', 'fracture', 'resonance'] as const satisfies readonly SoundTarget[];
