import type { CircularMachineConfig } from './circular-machine.ts';

import type { Pose, Rect } from '../geometry.ts';
export { contains, STEP_MS, TILE_SIZE } from '../geometry.ts';
export type { Facing, Point, Pose, Rect } from '../geometry.ts';

export interface HermesLayout {
    floor: Rect;
    outpost: {
        spawn: Pose;
        map: Rect;
        receiver: Rect;
        rift: Rect;
        bridge: Rect;
        walls: readonly Rect[];
    };
    chamber: {
        startX: number;
        plate: Rect;
        gate: Rect;
        walls: readonly Rect[];
        machineStartX: number;
        machine: CircularMachineConfig;
        anchor: Rect;
        gateway: Rect;
    };
}

export const hermes: HermesLayout = {
    floor: { x: 32, y: 96, width: 1280, height: 224 },
    outpost: {
        spawn: { x: 96, y: 240, facing: 'right' },
        map: { x: 141, y: 219, width: 38, height: 42 },
        receiver: { x: 215, y: 188, width: 72, height: 72 },
        rift: { x: 288, y: 96, width: 64, height: 224 },
        // Enlarged bridge box (height 112 instead of 64) so the player does not easily walk off.
        bridge: { x: 288, y: 168, width: 64, height: 112 },
        walls: [],
    },
    chamber: {
        startX: 608,
        plate: { x: 686, y: 132, width: 36, height: 32 },
        gate: { x: 960, y: 208, width: 24, height: 64 },
        walls: [
            { x: 960, y: 96, width: 24, height: 112 },
            { x: 960, y: 272, width: 24, height: 48 },
        ],
        machineStartX: 992,
        machine: {
            center: { x: 1128, y: 224 },
            radius: 72,
            control: { x: 1020, y: 216, width: 40, height: 40 },
            pillar: { x: 1114, y: 210, width: 28, height: 28 },
            symbols: [
                { x: 1112, y: 136, width: 32, height: 32 },
                { x: 1176, y: 208, width: 32, height: 32 },
                { x: 1112, y: 276, width: 32, height: 32 },
            ],
        },
        anchor: { x: 1112, y: 208, width: 32, height: 32 },
        gateway: { x: 1236, y: 201, width: 42, height: 46 },
    },
};
