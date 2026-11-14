import type { GameObjects, Scene } from 'phaser';
import type { Rect } from '../worlds/geometry';
import type { ViridiaLayout } from '../worlds/viridia/layout';
import type { ViridiaState } from '../worlds/viridia/simulation';
import type { RoomProjection } from './RoomProjection';

/** Visual cues only: puzzle state and collision remain in the simulation. */
export class ViridiaEffects {
    private readonly graphics: GameObjects.Graphics;

    constructor(scene: Scene, private readonly layout: ViridiaLayout, private readonly projection: RoomProjection) {
        this.graphics = scene.add.graphics().setDepth(-0.6);
    }

    render(state: ViridiaState | undefined, time: number): void {
        const g = this.graphics.clear();
        if (!state?.rootsBroken) {
            this.barrier(this.layout.roots, false, state?.rootHits === 1);
            this.rootDamage(state?.rootHits ?? 0);
        }
        if (!state?.vinesOpen) this.barrier(this.layout.vines, true, false);
        const reflector = this.layout.soundProps.find((p) => p.id === 'reflector')!.art;
        const p = this.projection.center(reflector, 11);
        // Broad translucent shafts start at the top of the screen and converge on the mirror.
        g.fillStyle(0xffdf8c, 0.11).fillTriangle(p.x - 180, 0, p.x - 105, 0, p.x + 5, p.y);
        g.fillStyle(0xffedb5, 0.16).fillTriangle(p.x - 137, 0, p.x - 113, 0, p.x - 3, p.y);
        g.fillStyle(0xffedb5, 0.10).fillTriangle(p.x - 92, 0, p.x - 76, 0, p.x + 9, p.y);
        const angle = ((state?.reflectorTurn ?? 0) - 1) * Math.PI / 2;
        const root = this.projection.center(this.layout.roots, 11);
        const end = state?.aligned && !state.rootsBroken ? root : { x: p.x + Math.cos(angle) * 80, y: p.y + Math.sin(angle) * 55 };
        const dx = end.x - p.x;
        const dy = end.y - p.y;
        const length = Math.hypot(dx, dy) || 1;
        const nx = -dy / length;
        const ny = dx / length;
        g.fillStyle(0xffd67d, 0.22).fillTriangle(p.x - nx * 8, p.y - ny * 8,
            end.x - nx * 19, end.y - ny * 19, end.x + nx * 19, end.y + ny * 19);
        g.fillStyle(0xffe8ac, 0.17).fillTriangle(p.x + nx * 8, p.y + ny * 8,
            end.x + nx * 19, end.y + ny * 19, p.x - nx * 8, p.y - ny * 8);
        for (const offset of [-7, 0, 7]) {
            g.lineStyle(offset === 0 ? 2 : 1, 0xffefb9, offset === 0 ? 0.85 : 0.55)
                .lineBetween(p.x + nx * offset * 0.35, p.y + ny * offset * 0.35,
                    end.x + nx * offset, end.y + ny * offset);
        }
        g.fillStyle(0xfff0b7, 0.95).fillCircle(p.x, p.y, 4).fillCircle(end.x, end.y, 3);
        // Sound-wave marks identify the receiver and its function.
        const receiver = this.layout.soundProps.find((item) => item.id === 'receiver')!.art;
        const rp = this.projection.center(receiver, 8);
        g.lineStyle(2, 0xb8fff1, 0.9).beginPath().arc(rp.x, rp.y, 16, -0.7, 0.7).strokePath();
        g.lineStyle(2, 0xb8fff1, 0.75).beginPath().arc(rp.x, rp.y, 22, -0.7, 0.7).strokePath();
        if ((state?.receiverCharge ?? 0) > 0) {
            g.lineStyle(3, 0x82f5d8).beginPath().arc(rp.x, rp.y, 28, -Math.PI / 2,
                -Math.PI / 2 + state!.receiverCharge * Math.PI * 2).strokePath();
        }
        const tree = this.projection.center(this.layout.tree, 40);
        if (state?.treeAwake) {
            const heart = this.projection.center(this.layout.tree, 34);
            const pulse = 0.8 + 0.2 * Math.sin(time / 500);
            g.fillStyle(0x8ffff0, 0.13 * pulse).fillCircle(heart.x, heart.y, 30);
            g.fillStyle(0x8ffff0, 0.3 * pulse).fillCircle(heart.x, heart.y, 17);
            g.fillStyle(0xd9fff2, 0.95).fillCircle(heart.x, heart.y, 7);
            g.lineStyle(2, 0xe9fff8, 0.8).lineBetween(heart.x - 12, heart.y, heart.x + 12, heart.y)
                .lineBetween(heart.x, heart.y - 12, heart.x, heart.y + 12);
        }
        for (let i = 0; i < 10; i++) {
            const angle = i * Math.PI * 2 / 10 + time / 6500;
            const x = tree.x + Math.cos(angle) * (95 + (i % 3) * 8);
            const y = tree.y - 28 + Math.sin(angle) * 42;
            const bright = state?.treeAwake ? 0.9 : 0.45;
            g.fillStyle(0xd6a3ff, bright).fillRect(Math.round(x), Math.round(y), 3, 3);
            if (i % 3 === 0) g.lineStyle(1, 0xd5fff0, bright).lineBetween(x - 3, y + 1, x + 5, y + 1)
                .lineBetween(x + 1, y - 3, x + 1, y + 5);
        }
    }

    private rootDamage(hits: number): void {
        if (hits <= 0) return;
        const g = this.graphics;
        const rect = this.layout.roots;
        const top = this.projection.project(rect).y;
        const bottom = this.projection.project({ x: rect.x, y: rect.y + rect.height }).y;
        const x = rect.x + rect.width / 2;
        if (hits === 1) {
            const y = (top + bottom) / 2;
            // A lasting, bright fracture signals that the first of two hits landed.
            g.lineStyle(5, 0x38291f).lineBetween(x - 16, y - 29, x + 5, y - 9)
                .lineBetween(x + 5, y - 9, x - 8, y + 6).lineBetween(x - 8, y + 6, x + 15, y + 31);
            g.lineStyle(2, 0xffd287).lineBetween(x - 16, y - 29, x + 5, y - 9)
                .lineBetween(x + 5, y - 9, x - 8, y + 6).lineBetween(x - 8, y + 6, x + 15, y + 31);
            g.fillStyle(0xffd287).fillCircle(x, y, 3);
        } else {
            // Remnants make the second hit and the now-open passage visible.
            g.fillStyle(0x25212d, 0.9).fillEllipse(x - 6, top + 7, 33, 13)
                .fillEllipse(x + 7, bottom - 5, 36, 14);
            g.lineStyle(2, 0xcda16e, 0.8).lineBetween(x - 16, top + 5, x + 5, top + 10)
                .lineBetween(x - 6, bottom - 7, x + 17, bottom - 3);
        }
    }

    private barrier(rect: Rect, vine: boolean, damaged: boolean): void {
        const g = this.graphics;
        const top = this.projection.project(rect).y;
        const bottom = this.projection.project({ x: rect.x, y: rect.y + rect.height }).y;
        const center = rect.x + rect.width / 2;
        const dark = vine ? 0x342047 : 0x121019;
        const main = vine ? 0x744893 : damaged ? 0x554757 : 0x302b37;
        const light = vine ? 0xc18ce0 : 0x756a7d;
        // Multiple staggered strands cross over each other to form a solid barrier.
        for (let column = 0; column < 3; column++) {
            const x = center + (column - 1) * 15;
            for (let y = top - 4, row = 0; y < bottom; y += 22, row++) {
                const fromX = x + ((row + column) % 2 ? 8 : -8);
                const toX = x + ((row + column) % 2 ? -8 : 8);
                const endY = Math.min(y + 24, bottom + 3);
                g.lineStyle(vine ? 8 : 11, dark, 1).lineBetween(fromX, y, toX, endY);
                g.lineStyle(vine ? 5 : 7, main, 1).lineBetween(fromX, y, toX, endY);
                g.lineStyle(2, light, 0.8).lineBetween(fromX - 1, y + 2, toX - 1, endY - 2);
                if (vine && (row + column) % 2 === 0) {
                    g.fillStyle(0x9a65bc).fillEllipse(toX + 5, endY - 2, 12, 6);
                    g.fillStyle(0xd2a6e8).fillRect(toX + 4, endY - 3, 4, 2);
                }
            }
        }
    }
}
