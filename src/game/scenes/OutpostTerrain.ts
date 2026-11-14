import type { GameObjects } from 'phaser';
import { TILE_SIZE } from '../worlds/hermes/room';
import type { Rect } from '../worlds/hermes/room';
import type { RoomProjection } from './RoomProjection';

const DUST = 0x87634e;
const RIFT = 0x211b2b;

export function drawOutpostTerrain(
    art: GameObjects.Graphics,
    projection: RoomProjection,
    floor: Rect,
    riftStart: number,
    riftEnd: number,
    textured = false,
): void {
    const rift = { ...floor, x: riftStart, width: riftEnd - riftStart };
    const west = { ...floor, width: riftStart - floor.x };
    const east = { ...floor, x: riftEnd, width: floor.x + floor.width - riftEnd };

    projection.surface(art, rift, RIFT);
    drawRiftBank(art, projection, rift, 'left');
    drawRiftBank(art, projection, rift, 'right');
    if (!textured) {
        projection.ground(art, west, DUST);
        projection.ground(art, east, DUST);
    }
}

function drawRiftBank(
    art: GameObjects.Graphics,
    projection: RoomProjection,
    rift: Rect,
    side: 'left' | 'right',
): void {
    const endY = rift.y + rift.height;
    const edgeX = side === 'left' ? rift.x : rift.x + rift.width;
    const direction = side === 'left' ? 1 : -1;
    for (let y = rift.y; y < endY; y += TILE_SIZE / 2) {
        const height = Math.min(TILE_SIZE / 2, endY - y);
        const width = 8 + ((y * 5) % 7);
        const lip = { x: edgeX + direction * width / 2 - width / 2, y, width, height };
        projection.surface(art, lip, side === 'left' ? 0x543b3b : 0x44313a);
        projection.surface(art, {
            ...lip,
            x: lip.x + (side === 'left' ? width : -5),
            width: 5,
        }, 0x332633);
    }
}
