import { contains } from '../geometry.ts';
import type { Point, Pose, Rect } from '../geometry.ts';

export const PLAYER_RADIUS = 7;
const WALK_SPEED = 2.25;

export class BorealisWalking {
    private vx = 0;
    private vy = 0;
    private ticks = 0;

    private pose: Pose;

    constructor(pose: Pose) {
        this.pose = pose;
    }

    get player(): Pose { return this.pose; }
    get walkTicks(): number { return this.ticks; }

    reset(pose: Pose): void {
        this.pose = pose;
        this.vx = this.vy = this.ticks = 0;
    }

    step(horizontal: number, vertical: number, floor: Rect, ice: Rect, obstacles: readonly Rect[]): void {
        const { x, y, facing } = this.pose;
        const stride = WALK_SPEED / Math.max(1, Math.hypot(horizontal, vertical));
        const targetX = horizontal * stride;
        const targetY = vertical * stride;
        const grip = contains(this.pose, ice) ? 0.22 : 1;
        this.vx += (targetX - this.vx) * grip;
        this.vy += (targetY - this.vy) * grip;
        if (Math.hypot(this.vx, this.vy) < 0.06) this.vx = this.vy = 0;

        const canMove = (point: Point) => contains(point, floor, -PLAYER_RADIUS)
            && !obstacles.some((rect) => contains(point, rect, PLAYER_RADIUS));
        const nextX = canMove({ x: x + this.vx, y }) ? x + this.vx : x;
        if (nextX === x) this.vx = 0;
        const nextY = canMove({ x: nextX, y: y + this.vy }) ? y + this.vy : y;
        if (nextY === y) this.vy = 0;
        this.pose = {
            x: nextX, y: nextY,
            facing: horizontal ? (horizontal < 0 ? 'left' : 'right')
                : vertical ? (vertical < 0 ? 'up' : 'down') : facing,
        };
        this.ticks = nextX !== x || nextY !== y ? this.ticks + 1 : 0;
    }
}
