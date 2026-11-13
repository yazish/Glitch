export type Point = Readonly<{ x: number; y: number }>;
export type Rect = Readonly<Point & { width: number; height: number }>;
export type Facing = 'up' | 'down' | 'left' | 'right';
export type Pose = Readonly<Point & { facing: Facing }>;

export const TILE_SIZE = 32;
export const STEP_MS = 1000 / 60;

export function contains(point: Point, rect: Rect, padding = 0): boolean {
    return point.x > rect.x - padding && point.x < rect.x + rect.width + padding
        && point.y > rect.y - padding && point.y < rect.y + rect.height + padding;
}

export interface HermesLayout {
    floor: Rect;
    outpost: {
        spawn: Pose;
        map: Rect;
        receiver: Rect;
        bridge: Rect;
        walls: readonly Rect[];
        entrance: Rect;
    };
    chamber: {
        spawn: Pose;
        plate: Rect;
        gate: Rect;
        walls: readonly Rect[];
        anchor: Rect;
        gateway: Rect;
    };
}

export const hermes: HermesLayout = {
    floor: { x: 32, y: 96, width: 576, height: 224 },
    outpost: {
        spawn: { x: 96, y: 240, facing: 'right' },
        map: { x: 141, y: 219, width: 38, height: 42 },
        receiver: { x: 215, y: 188, width: 72, height: 72 },
        bridge: { x: 288, y: 192, width: 64, height: 64 },
        walls: [
            { x: 288, y: 96, width: 64, height: 96 },
            { x: 288, y: 256, width: 64, height: 64 }
        ],
        entrance: { x: 537, y: 201, width: 42, height: 46 }
    },
    chamber: {
        spawn: { x: 96, y: 240, facing: 'right' },
        plate: { x: 142, y: 132, width: 36, height: 32 },
        gate: { x: 416, y: 208, width: 24, height: 64 },
        walls: [
            { x: 416, y: 96, width: 24, height: 112 },
            { x: 416, y: 272, width: 24, height: 48 }
        ],
        anchor: { x: 479, y: 217, width: 42, height: 46 },
        gateway: { x: 546, y: 217, width: 42, height: 46 }
    }
};
