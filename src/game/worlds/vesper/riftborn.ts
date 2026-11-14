import type { Point, Rect } from '../geometry.ts';
import { boundsAround, direction, distance, moveOnGround, routeAroundCover, segmentHit } from './space.ts';

export type Riftborn = Readonly<{
    id: number;
    feet: Point;
    hp: number;
    flash: number;
    windup: number;
    recovery: number;
    walk: number;
}>;

export const CLAW_RANGE = 37;
export const riftbornBody = (feet: Point) => boundsAround(feet, 35, 44);

export function updateRiftborn(
    enemy: Riftborn, player: Point, walls: readonly Rect[], others: readonly Riftborn[], slow: boolean,
): { enemy: Riftborn; strike: boolean } {
    const next = { ...enemy, flash: Math.max(0, enemy.flash - 1) };
    const inRange = distance(enemy.feet, player) <= CLAW_RANGE
        && walls.every((wall) => segmentHit(enemy.feet, player, wall) === Infinity);
    if (enemy.windup) {
        next.windup -= 1;
        if (!next.windup) next.recovery = 52;
        return { enemy: next, strike: next.windup === 0 && inRange };
    }
    next.recovery = Math.max(0, enemy.recovery - 1);
    if (inRange) {
        if (!next.recovery) next.windup = slow ? 60 : 49;
    } else {
        const toward = direction(enemy.feet, routeAroundCover(enemy.feet, player, walls, 9));
        let x = toward.x;
        let y = toward.y;
        for (const other of others) {
            if (other.id === enemy.id || distance(enemy.feet, other.feet) > 24) continue;
            const away = direction(other.feet, enemy.feet);
            x += away.x * 0.65;
            y += away.y * 0.65;
        }
        next.feet = moveOnGround(enemy.feet, direction({ x: 0, y: 0 }, { x, y }), slow ? 0.48 : 0.76, walls, 9);
        if (distance(next.feet, enemy.feet) > 0) next.walk += 1;
    }
    return { enemy: next, strike: false };
}
