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
