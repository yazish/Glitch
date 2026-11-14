import { contains } from '../geometry.ts';
import type { Point, Rect } from '../geometry.ts';
import type { SledTrack, SlidingProp } from './layout.ts';

export type Wind = -1 | 1;

const SLED_HALF_WIDTH = 18;
const SLED_HALF_DEPTH = 10;
const SLED_SPEED = 2.4;

export function sledBody(track: SledTrack, x: number): Rect {
    return { x: x - SLED_HALF_WIDTH, y: track.y - SLED_HALF_DEPTH, width: 36, height: 20 };
}

export function advanceSled(track: SledTrack, x: number, wind: Wind, player: Point, bodyPadding: number,
    obstruction?: Rect): number {
    let right = track.right;
    if (obstruction && obstruction.y < track.y + SLED_HALF_DEPTH
        && obstruction.y + obstruction.height > track.y - SLED_HALF_DEPTH) {
        right = Math.min(right, obstruction.x - SLED_HALF_WIDTH);
    }
    const next = Math.max(track.left, Math.min(right, x + wind * SLED_SPEED));
    return contains(player, sledBody(track, next), bodyPadding) ? x : next;
}

export function propBody(prop: SlidingProp, progress: number): Rect {
    return { ...prop.body, y: prop.body.y + (prop.destinationY - prop.body.y) * progress };
}
