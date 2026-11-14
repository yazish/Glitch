import type { Point, Pose, Rect } from '../geometry.ts';

export type BorealisArea = 'pass' | 'basin' | 'summit';

interface AreaLayout {
    readonly id: BorealisArea;
    readonly name: string;
    readonly endX: number;
    readonly entry: Pose;
    readonly vane: Point;
}

export interface SledTrack {
    readonly left: number;
    readonly right: number;
    readonly y: number;
    readonly start: number;
    readonly plate: number;
}

export interface SlidingProp {
    readonly body: Rect;
    readonly destinationY: number;
    readonly reach: Rect;
}

export interface BorealisLayout {
    readonly floor: Rect;
    readonly areas: Readonly<Record<BorealisArea, AreaLayout>>;
    readonly drift: Rect;
    readonly formation: Rect;
    readonly ice: Rect;
    readonly iceBlock: SlidingProp;
    readonly basinTrack: SledTrack;
    readonly gate: Rect;
    readonly summitTracks: readonly [SledTrack, SledTrack];
    readonly windbreak: SlidingProp;
    readonly monument: Rect;
    readonly exit: Rect;
}

export const borealis: BorealisLayout = {
    floor: { x: 3200, y: 96, width: 2368, height: 224 },
    areas: {
        pass: {
            id: 'pass', name: 'Windward Pass', endX: 3840,
            entry: { x: 3264, y: 224, facing: 'right' }, vane: { x: 3648, y: 208 },
        },
        basin: {
            id: 'basin', name: 'Frozen Basin', endX: 4672,
            entry: { x: 3854, y: 224, facing: 'right' }, vane: { x: 4180, y: 272 },
        },
        summit: {
            id: 'summit', name: 'Skybreak Summit', endX: 5568,
            entry: { x: 4686, y: 224, facing: 'right' }, vane: { x: 5010, y: 269 },
        },
    },
    drift: { x: 3744, y: 96, width: 64, height: 224 },
    formation: { x: 3380, y: 272, width: 44, height: 26 },
    ice: { x: 3920, y: 113, width: 585, height: 155 },
    iceBlock: {
        body: { x: 4216, y: 151, width: 28, height: 26 },
        destinationY: 110,
        reach: { x: 4194, y: 170, width: 72, height: 52 },
    },
    basinTrack: { left: 4016, right: 4450, y: 164, start: 4016, plate: 4450 },
    gate: { x: 4544, y: 96, width: 34, height: 224 },
    summitTracks: [
        { left: 4816, right: 5176, y: 155, start: 4912, plate: 4816 },
        { left: 4816, right: 5176, y: 214, start: 4952, plate: 5176 },
    ],
    windbreak: {
        body: { x: 4845, y: 106, width: 24, height: 16 },
        destinationY: 128,
        reach: { x: 4817, y: 120, width: 72, height: 36 },
    },
    monument: { x: 5252, y: 180, width: 80, height: 61 },
    exit: { x: 5440, y: 194, width: 58, height: 60 },
};
