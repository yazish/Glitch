import type { Facing } from '../worlds/hermes/room';

type PixelRow = readonly [left: number, right: number];

const BOOT_Y = 44;
const HIP_Y = 34;
const ARM_Y = 24;
const DARK_LEG = 0.62;

const FRONT_ARMS = [
    [[14, 19], [14, 20], [14, 20], [14, 19], [14, 19], [14, 19], [14, 19], [14, 18], [14, 18], [14, 18]],
    [[28, 33], [28, 33], [28, 33], [28, 33], [28, 33], [28, 33], [28, 33], [28, 33], [29, 33], [30, 33]],
] as const;

const PROFILE_ARMS = {
    right: [[22, 27], [22, 27], [22, 27], [23, 27], [23, 27], [23, 27], [23, 27], [23, 27], [23, 27], [24, 27]],
    left: [[20, 25], [20, 25], [20, 25], [20, 24], [20, 24], [20, 24], [20, 24], [20, 24], [20, 24], [20, 24]],
} as const;

// A pair of contacts alternating with passing poses. Each lift is in source pixels.
const STRIDE = [1, 0, -1, 0] as const;
const LIFT = [[0, 3], [0, 1], [3, 0], [1, 0]] as const;

function drawArm(
    ctx: CanvasRenderingContext2D,
    source: HTMLImageElement,
    rows: readonly PixelRow[],
    offsetX: number,
    lift: number,
): void {
    for (const [index, [left, right]] of rows.entries()) {
        ctx.clearRect(left, ARM_Y + index, right - left, 1);
    }
    for (const [index, [left, right]] of rows.entries()) {
        const swing = index / (rows.length - 1);
        const x = left + Math.round(offsetX * swing);
        const y = ARM_Y + index - Math.round(lift * swing);
        ctx.drawImage(source, left, ARM_Y + index, right - left, 1, x, y, right - left, 1);
    }
}

function drawLeg(
    ctx: CanvasRenderingContext2D,
    source: HTMLImageElement,
    left: number,
    width: number,
    stride: number,
    lift: number,
): void {
    const length = BOOT_Y - HIP_Y;
    for (let row = 0; row < length; row++) {
        const progress = row / (length - 1);
        ctx.drawImage(source, left, HIP_Y + row, width, 1,
            left + Math.round(stride * progress), HIP_Y + row - Math.round(lift * progress), width, 1);
    }
}

export function drawKobeWalkFrame(
    ctx: CanvasRenderingContext2D,
    source: HTMLImageElement,
    facing: Facing,
    frame: number,
): void {
    const stride = STRIDE[frame];
    const [leftLift, rightLift] = LIFT[frame];
    ctx.drawImage(source, 0, 0);
    ctx.clearRect(0, HIP_Y, source.width, source.height - HIP_Y);

    if (facing === 'up' || facing === 'down') {
        const direction = facing === 'up' ? -1 : 1;
        drawArm(ctx, source, FRONT_ARMS[0], 0, rightLift);
        drawArm(ctx, source, FRONT_ARMS[1], 0, leftLift);
        drawLeg(ctx, source, 12, 11, -stride * direction, leftLift);
        drawLeg(ctx, source, 23, 11, stride * direction, rightLift);
        return;
    }

    const direction = facing === 'right' ? 1 : -1;
    drawArm(ctx, source, PROFILE_ARMS[facing], -stride * direction * 3, Math.abs(stride));

    const extent = stride === 0 ? direction : stride * direction * 5;
    ctx.globalAlpha = DARK_LEG;
    drawLeg(ctx, source, 17, 14, -extent, rightLift);
    ctx.globalAlpha = 1;
    drawLeg(ctx, source, 17, 14, extent, leftLift);
}
