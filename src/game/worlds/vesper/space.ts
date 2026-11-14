import { contains } from '../geometry.ts';
import type { Facing, Point, Rect } from '../geometry.ts';
import { projectGround } from './projection.ts';
import { FLOOR, WALK } from './layout.ts';

export const COVER_HEIGHT = 27;
export const project = (point: Point, height = 0) => projectGround(point, FLOOR, height);
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
export const FACING_VECTOR: Readonly<Record<Facing, Point>> = {
    up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
};

export function inFront(origin: Point, facing: Facing, target: Point, range: number, alignment: number): boolean {
    const facingVector = FACING_VECTOR[facing];
    const toward = direction(origin, target);
    return distance(origin, target) <= range && toward.x * facingVector.x + toward.y * facingVector.y >= alignment;
}

export function direction(from: Point, to: Point): Point {
    const length = distance(from, to);
    return length === 0 ? { x: 0, y: 0 } : { x: (to.x - from.x) / length, y: (to.y - from.y) / length };
}

export function offset(point: Point, vector: Point, amount: number): Point {
    return { x: point.x + vector.x * amount, y: point.y + vector.y * amount };
}

export function boundsAround(feet: Point, width: number, height: number, elevation = 0): Rect {
    const at = project(feet, elevation);
    return { x: at.x - width / 2, y: at.y - height, width, height };
}

export function projectedCover(rect: Rect & { readonly heightAboveGround?: number }): Rect {
    const top = project(rect, rect.heightAboveGround ?? COVER_HEIGHT);
    const bottom = project({ x: rect.x, y: rect.y + rect.height });
    return { x: top.x, y: top.y, width: rect.width, height: bottom.y - top.y };
}

export function segmentHit(from: Point, to: Point, rect: Rect): number {
    let enter = 0;
    let leave = 1;
    for (const [axis, size] of [['x', 'width'], ['y', 'height']] as const) {
        const delta = to[axis] - from[axis];
        const edge = rect[axis] + rect[size];
        if (delta === 0) {
            if (from[axis] < rect[axis] || from[axis] > edge) return Infinity;
            continue;
        }
        const a = (rect[axis] - from[axis]) / delta;
        const b = (edge - from[axis]) / delta;
        enter = Math.max(enter, Math.min(a, b));
        leave = Math.min(leave, Math.max(a, b));
        if (enter > leave) return Infinity;
    }
    return enter;
}

export function moveOnGround(from: Point, vector: Point, speed: number, walls: readonly Rect[], radius: number): Point {
    const clear = (point: Point) => contains(point, WALK, -radius)
        && !walls.some((wall) => contains(point, wall, radius));
    const xStep = { x: from.x + vector.x * speed, y: from.y };
    const x = clear(xStep) ? xStep.x : from.x;
    const yStep = { x, y: from.y + vector.y * speed };
    return clear(yStep) ? yStep : { x, y: from.y };
}

export function routeAroundCover(from: Point, to: Point, walls: readonly Rect[], radius: number): Point {
    const padded = walls.map(({ x, y, width, height }) => ({
        x: x - radius, y: y - radius, width: width + radius * 2, height: height + radius * 2,
    }));
    const clear = (a: Point, b: Point) => padded.every((wall) => segmentHit(a, b, wall) === Infinity);
    if (clear(from, to)) return to;
    const corners = padded.flatMap(({ x, y, width, height }) => [
        { x: x - 2, y: y - 2 }, { x: x + width + 2, y: y - 2 },
        { x: x - 2, y: y + height + 2 }, { x: x + width + 2, y: y + height + 2 },
    ]).filter((point) => contains(point, WALK, -radius) && !padded.some((wall) => contains(point, wall)));
    const nodes = [from, to, ...corners];
    const costs = nodes.map(() => Infinity);
    const first = nodes.map(() => to);
    const visited = new Set<number>();
    costs[0] = 0;
    while (visited.size < nodes.length) {
        let closest = -1;
        for (const index of nodes.keys()) {
            if (!visited.has(index) && (closest === -1 || costs[index] < costs[closest])) closest = index;
        }
        if (closest === -1 || !Number.isFinite(costs[closest])) break;
        if (closest === 1) return first[1];
        visited.add(closest);
        for (const [index, node] of nodes.entries()) {
            const cost = costs[closest] + distance(nodes[closest], node);
            if (!visited.has(index) && cost < costs[index] && clear(nodes[closest], node)) {
                costs[index] = cost;
                first[index] = closest === 0 ? node : first[closest];
            }
        }
    }
    return to;
}
