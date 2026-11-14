import { HEIGHT } from '../../viewport.ts';
import type { Point, Rect } from '../geometry.ts';

export function projectGround(point: Point, floor: Rect, height = 0): Point {
    const horizon = 142;
    const distance = (point.y - floor.y) / floor.height;
    return { x: point.x, y: horizon + distance * (HEIGHT - horizon) - height };
}
