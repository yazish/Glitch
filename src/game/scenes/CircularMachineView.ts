import type { GameObjects, Scene } from 'phaser';
import { Math as PhaserMath } from 'phaser';
import type { CircularMachineConfig } from '../worlds/hermes/circular-machine';
import type { Point, Rect } from '../worlds/hermes/room';
import type { HermesState } from '../worlds/hermes/simulation';
import type { RoomProjection } from './RoomProjection';

const TEAL = 0x87e0d0;
const GOLD = 0xffcc82;
const VIOLET = 0xa7a4ff;
const SHADOW_INK = 0x120f1d;
const PILLAR_STONE = { top: 0xb99dae, left: 0x5c4a63, right: 0x7a6580 };
const CONTROL_INACTIVE = { top: 0x7c637c, left: 0x473953, right: 0x5b4762 };
const CONTROL_ACTIVE = { top: 0x4d8d89, left: 0x355c61, right: 0x427477 };

const CONSTELLATION_CLUSTERS: readonly (readonly Point[])[] = [
    [
        { x: 140, y: 58 },
        { x: 168, y: 42 },
        { x: 196, y: 54 },
        { x: 174, y: 74 },
    ],
    [
        { x: 268, y: 64 },
        { x: 302, y: 40 },
        { x: 334, y: 56 },
        { x: 312, y: 80 },
    ],
    [
        { x: 410, y: 52 },
        { x: 446, y: 34 },
        { x: 482, y: 48 },
        { x: 458, y: 72 },
    ],
];

/**
 * Single Responsibility (SRP): Renders the ancient circular machine, rotating stone pillar,
 * cast shadow, ordered symbol pads, and sky constellation projections.
 */
export class CircularMachineView {
    private readonly skyConstellations: GameObjects.Graphics;

    constructor(
        scene: Scene,
        private readonly projection: RoomProjection,
        private readonly machine: CircularMachineConfig,
    ) {
        this.skyConstellations = scene.add.graphics().setDepth(-2.1).setScrollFactor(0);
    }

    render(art: GameObjects.Graphics, state: HermesState): void {
        this.drawCircularRing(art, state);
        this.drawControlPad(art, state);
        this.drawShadowBeam(art, state);
        this.drawSymbols(art, state);
        this.drawPillar(art, state);
        this.drawSkyConstellations(state);
    }

    private drawCircularRing(art: GameObjects.Graphics, state: HermesState): void {
        const { center, radius } = this.machine;
        const ringColor = state.machine.completed ? TEAL : 0x9b829c;
        const segments = 24;
        const outerPoints: PhaserMath.Vector2[] = [];
        const innerPoints: PhaserMath.Vector2[] = [];

        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            outerPoints.push(this.projection.project({
                x: center.x + Math.cos(angle) * radius,
                y: center.y + Math.sin(angle) * radius,
            }));
            innerPoints.push(this.projection.project({
                x: center.x + Math.cos(angle) * (radius * 0.56),
                y: center.y + Math.sin(angle) * (radius * 0.56),
            }));
        }

        art.fillStyle(0x2a2236, 0.55).fillPoints(outerPoints, true);
        art.lineStyle(2, ringColor, state.machine.completed ? 0.85 : 0.45).strokePoints(outerPoints, true);
        art.lineStyle(1, GOLD, 0.32).strokePoints(innerPoints, true);
    }

    private drawControlPad(art: GameObjects.Graphics, state: HermesState): void {
        const { control } = this.machine;
        const held = state.controlHeld;
        const height = held ? 1 : 4;
        this.projection.block(art, control, height, held ? CONTROL_ACTIVE : CONTROL_INACTIVE);
        this.projection.outline(art, control, held ? TEAL : 0xc29ab6, 0.9, height);
    }

    private drawShadowBeam(art: GameObjects.Graphics, state: HermesState): void {
        const shadowIndex = state.shadowSymbol;
        if (shadowIndex === undefined) return;

        const targetSymbol = this.machine.symbols[shadowIndex];
        const origin = this.projection.center(this.machine.pillar);
        const target = this.projection.center(targetSymbol);
        const dx = target.x - origin.x;
        const dy = target.y - origin.y;
        const length = Math.hypot(dx, dy) || 1;
        const nx = (-dy / length) * 14;
        const ny = (dx / length) * 9;

        art.fillStyle(SHADOW_INK, 0.62).fillPoints([
            new PhaserMath.Vector2(origin.x - nx * 0.4, origin.y - ny * 0.4),
            new PhaserMath.Vector2(origin.x + nx * 0.4, origin.y + ny * 0.4),
            new PhaserMath.Vector2(target.x + nx, target.y + ny),
            new PhaserMath.Vector2(target.x - nx, target.y - ny),
        ], true);
        art.lineStyle(1, VIOLET, 0.55).strokePoints([
            new PhaserMath.Vector2(origin.x, origin.y),
            new PhaserMath.Vector2(target.x, target.y),
        ], false);
    }

    private drawSymbols(art: GameObjects.Graphics, state: HermesState): void {
        this.machine.symbols.forEach((symbolRect, index) => {
            const aligned = index < state.alignedSymbols;
            const shadowed = state.shadowSymbol === index;
            const color = aligned ? TEAL : shadowed ? GOLD : 0x8d7794;
            const alpha = aligned ? 0.42 : shadowed ? 0.28 : 0.14;

            this.projection.surface(art, symbolRect, color, alpha);
            this.projection.outline(art, symbolRect, color, aligned || shadowed ? 0.95 : 0.45);
            this.drawSymbolGlyph(art, symbolRect, index, color, aligned);
        });
    }

    private drawSymbolGlyph(
        art: GameObjects.Graphics,
        rect: Rect,
        index: number,
        color: number,
        aligned: boolean,
    ): void {
        const center = this.projection.center(rect);
        for (let pip = 0; pip <= index; pip++) {
            const offset = (pip - index / 2) * 6;
            art.fillStyle(color, aligned ? 1 : 0.85).fillCircle(center.x + offset, center.y, 2.2);
        }
        if (aligned) {
            art.fillStyle(TEAL, 0.2).fillEllipse(center.x, center.y - 14, 18, 28);
        }
    }

    private drawPillar(art: GameObjects.Graphics, state: HermesState): void {
        const { pillar } = this.machine;
        const active = state.controlHeld || state.machine.completed;
        this.projection.block(art, pillar, 26, PILLAR_STONE);
        this.projection.outline(art, pillar, active ? TEAL : GOLD, active ? 0.9 : 0.55, 26);

        const topCenter = this.projection.center(pillar, 28);
        const pointerLength = 9;
        const angle = state.machine.pillarAngle;
        art.lineStyle(2, active ? TEAL : GOLD, 0.95).lineBetween(
            topCenter.x,
            topCenter.y,
            topCenter.x + Math.cos(angle) * pointerLength,
            topCenter.y + Math.sin(angle) * (pointerLength * 0.6),
        );
    }

    private drawSkyConstellations(state: HermesState): void {
        this.skyConstellations.clear();
        const count = state.constellations;
        if (count <= 0) return;

        for (let c = 0; c < count && c < CONSTELLATION_CLUSTERS.length; c++) {
            const stars = CONSTELLATION_CLUSTERS[c];
            this.skyConstellations.lineStyle(1.5, TEAL, 0.78);
            for (let i = 0; i < stars.length; i++) {
                const current = stars[i];
                const next = stars[(i + 1) % stars.length];
                this.skyConstellations.lineBetween(current.x, current.y, next.x, next.y);
            }
            for (const star of stars) {
                this.skyConstellations.fillStyle(GOLD, 0.95).fillCircle(star.x, star.y, 2.5);
                this.skyConstellations.fillStyle(TEAL, 0.28).fillCircle(star.x, star.y, 6);
            }
            if (c > 0) {
                const prevAnchor = CONSTELLATION_CLUSTERS[c - 1][2];
                const currAnchor = stars[0];
                this.skyConstellations.lineStyle(1.5, GOLD, 0.65)
                    .lineBetween(prevAnchor.x, prevAnchor.y, currAnchor.x, currAnchor.y);
            }
        }
    }
}
