import type { Scene } from 'phaser';
import type { BorealisArea, BorealisLayout } from '../worlds/borealis/layout';
import { HEIGHT } from '../viewport';
import type { RoomProjection } from './RoomProjection';

const palette: Record<BorealisArea, { sky: number; far: number; near: number; snow: number; shade: number }> = {
    pass: { sky: 0xa6cee0, far: 0x789db6, near: 0x526e8e, snow: 0xd2e5ed, shade: 0x91adbf },
    basin: { sky: 0x709cb9, far: 0x578aae, near: 0x2e5578, snow: 0xb2d6e7, shade: 0x709db9 },
    summit: { sky: 0x454467, far: 0x65688f, near: 0x363957, snow: 0xaeb8d7, shade: 0x747b9e },
};

export function drawBorealisScenery(scene: Scene, layout: BorealisLayout, projection: RoomProjection): void {
    const art = scene.add.graphics().setDepth(-2.2);
    const horizon = projection.project(layout.floor).y;
    let start = layout.floor.x;
    for (const area of Object.values(layout.areas)) {
        const { endX, id } = area;
        const colors = palette[id];
        art.fillStyle(colors.sky).fillRect(start, 0, endX - start, horizon);
        if (id !== 'summit') art.fillStyle(0xe5f3f5, 0.8).fillCircle(start + 160, 46, 17);
        for (let x = start; x < endX; x += 127) {
            const edge = Math.min(endX, x + 155);
            const peak = (x + edge) / 2;
            const peakY = 29 + x % 45;
            art.fillStyle(colors.far).fillTriangle(x, horizon, peak, peakY, edge, horizon);
            art.fillStyle(colors.snow).fillTriangle(peak - 20, peakY + 22, peak, peakY, peak + 19, peakY + 23);
        }
        for (let x = start; x < endX; x += 191) {
            const edge = Math.min(endX, x + 220);
            const peak = (x + edge) / 2;
            const peakY = 75 + x % 39;
            art.fillStyle(colors.near).fillTriangle(x, horizon, peak, peakY, edge, horizon);
            art.fillStyle(colors.snow, 0.75).fillTriangle(peak - 21, peakY + 14, peak, peakY, peak + 21, peakY + 14);
        }
        art.fillStyle(colors.snow).fillRect(start, horizon, endX - start, HEIGHT - horizon);
        projection.surface(art, { x: start, y: 205, width: endX - start, height: 47 }, colors.shade, 0.35);
        for (let x = start + 12; x < endX - 18; x += 23) {
            const y = horizon + 12 + (x * 13) % 187;
            art.fillStyle(colors.shade, 0.45).fillEllipse(x, y, 15 + x % 9, 3 + x % 4);
            art.fillStyle(0xf6fcff, 0.68).fillEllipse(x + 4, y + 4, 8, 2);
        }
        start = endX;
    }
    projection.surface(art, layout.ice, 0x6ca3c1);
    projection.outline(art, layout.ice, 0xe0f7ff, 0.9);
    for (let x = layout.ice.x + 18; x < layout.ice.x + layout.ice.width - 24; x += 63) {
        const p = projection.project({ x, y: layout.ice.y + 12 + x % 123 });
        art.lineStyle(2, 0xb4e6fa, 0.5).lineBetween(p.x, p.y, p.x + 21, p.y + 5);
    }
}
