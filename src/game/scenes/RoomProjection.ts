import type { GameObjects } from 'phaser';
import { Math as PhaserMath } from 'phaser';
import { HEIGHT, WIDTH } from '../viewport';
import { TILE_SIZE } from '../worlds/hermes/room';
import type { Point, Rect } from '../worlds/hermes/room';

type Color = Readonly<{ top: number; left: number; right: number }>;

export class RoomProjection {
    constructor(private readonly floor: Rect) {}

    project(point: Point, height = 0): PhaserMath.Vector2 {
        const x = point.x - this.floor.x - this.floor.width / 2;
        const distance = (point.y - this.floor.y) / this.floor.height;
        const scale = 1 + distance * (WIDTH / this.floor.width - 1);
        const horizon = 142;
        return new PhaserMath.Vector2(WIDTH / 2 + x * scale, horizon + distance * (HEIGHT - horizon) - height);
    }

    center(rect: Rect, height = 0): Point {
        return this.project({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }, height);
    }

    surface(art: GameObjects.Graphics, rect: Rect, color: number, alpha = 1, height = 0): void {
        art.fillStyle(color, alpha).fillPoints(this.corners(rect, height), true);
    }

    outline(art: GameObjects.Graphics, rect: Rect, color: number, alpha = 1, height = 0): void {
        art.lineStyle(1, color, alpha).strokePoints(this.corners(rect, height), true);
    }

    block(art: GameObjects.Graphics, rect: Rect, height: number, color: Color, base = 0): void {
        const top = this.corners(rect, base + height);
        const bottom = this.corners(rect, base);
        art.fillStyle(color.left).fillPoints([top[3], top[2], bottom[2], bottom[3]], true);
        art.fillStyle(color.right).fillPoints([top[1], top[2], bottom[2], bottom[1]], true);
        art.fillStyle(color.top).fillPoints(top, true);
    }

    ground(art: GameObjects.Graphics, rect: Rect, color: number): void {
        this.surface(art, rect, color);
        const endX = rect.x + rect.width;
        const endY = rect.y + rect.height;
        for (let x = rect.x; x < endX; x += TILE_SIZE) {
            for (let y = rect.y; y < endY; y += TILE_SIZE) {
                const tile = {
                    x, y, width: Math.min(TILE_SIZE, endX - x), height: Math.min(TILE_SIZE, endY - y),
                };
                const variation = (x * 13 + y * 7 + (x / TILE_SIZE) * (y / TILE_SIZE)) % 17;
                this.surface(art, tile, variation < 7 ? 0xffe3b0 : 0x191322, 0.025 + variation * 0.003);
                this.outline(art, tile, 0x2d2030, 0.19);
            }
        }
        this.outline(art, rect, 0xc8a87e, 0.32);
    }

    private corners(rect: Rect, height: number): PhaserMath.Vector2[] {
        const { x, y, width, height: depth } = rect;
        return [
            this.project({ x, y }, height),
            this.project({ x: x + width, y }, height),
            this.project({ x: x + width, y: y + depth }, height),
            this.project({ x, y: y + depth }, height),
        ];
    }
}
