import { PARCHMENT_LABEL } from '../typography';
import type { GameObjects, Scene } from 'phaser';
import type { Point, Rect } from '../worlds/geometry';
import type { BorealisArea, BorealisLayout, SledTrack } from '../worlds/borealis/layout';
import type { BorealisState } from '../worlds/borealis/simulation';
import { WIDTH } from '../viewport';
import { CharacterView } from './CharacterView';
import { RoomProjection } from './RoomProjection';
import { drawBorealisScenery, type BorealisParallax } from './BorealisScenery';
import { BorealisProps } from './BorealisProps';

const ICE = { top: 0xc4f4ff, left: 0x4b89ae, right: 0x7ebdd4 };
const STONE = { top: 0xa7b6cb, left: 0x3a4964, right: 0x607593 };
const LIT = 0x91ffea;
const INACTIVE = 0x44556d;

export class BorealisView {
    private readonly projection: RoomProjection;
    private readonly scenery: BorealisParallax;
    private readonly props: BorealisProps;
    private readonly art: GameObjects.Graphics;
    private readonly atmosphere: GameObjects.Graphics;
    private readonly prompt: GameObjects.Text;
    private readonly player: CharacterView;
    private readonly echo: CharacterView;
    private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    private time = 0;

    constructor(private readonly scene: Scene, private readonly layout: BorealisLayout) {
        this.projection = new RoomProjection(layout.floor);
        this.scenery = drawBorealisScenery(scene, layout, this.projection);
        this.props = new BorealisProps(scene, layout, this.projection);
        this.atmosphere = scene.add.graphics().setDepth(-2);
        this.art = scene.add.graphics().setDepth(-1);
        this.prompt = scene.add.text(0, 0, '', {
            ...PARCHMENT_LABEL, fontSize: '10px',
            padding: { x: 5, y: 4 }, wordWrap: { width: 230 },
        }).setOrigin(0.5, 1).setDepth(365);
        this.player = new CharacterView(scene, 0xffbb75, 0xffffff, 1);
        this.echo = new CharacterView(scene, 0xc2a0ff, 0xc2a0ff, 0.65);
    }

    render(state: BorealisState, delta: number): void {
        this.scenery.render(this.scene.cameras.main.scrollX, state.monument);
        if (!this.reducedMotion.matches) this.time += delta;
        this.props.render(state, this.time);
        this.art.clear();
        this.atmosphere.clear();
        this.drawPass(state);
        this.drawBasin(state);
        this.drawSummit(state);
        for (const area of Object.values(this.layout.areas)) {
            this.drawVane(area.vane, state.wind[area.id], this.calm(area.id, state) === 1);
            this.drawSnow(area.id, state);
        }

        const p = this.projection.project(state.player);
        this.player.render({ ...state.player, x: p.x, y: p.y }, p.y + 0.01, state.walkTicks, delta);
        const echo = state.echo && this.projection.project(state.echo);
        this.echo.render(echo && state.echo ? { ...state.echo, x: echo.x, y: echo.y } : undefined,
            echo?.y ?? 0, state.echoWalkTicks, delta);
        const cameraX = this.scene.cameras.main.scrollX;
        const promptX = Math.max(cameraX + 120, Math.min(cameraX + WIDTH - 120, p.x));
        this.prompt.setVisible(Boolean(state.hint)).setText(state.hint).setPosition(promptX, p.y - 43);
    }

    private drawPass(state: BorealisState): void {
        const { drift, formation } = this.layout;
        for (let y = drift.y + 10; y < drift.y + drift.height; y += 26) {
            if (state.drift < 1) {
                const p = this.projection.project({ x: drift.x + drift.width / 2 - 24 * state.drift, y });
                const size = 1 - state.drift * 0.84;
                this.art.fillStyle(0x759bb4, 1 - state.drift).fillEllipse(p.x, p.y + 3, 55 * size, 29 * size);
                this.art.fillStyle(0xe3f3fa, 1 - state.drift).fillEllipse(p.x - 4, p.y - 6, 52 * size, 27 * size);
            }
        }
        this.projection.block(this.art, formation, 16, ICE);
        const p = this.projection.center(formation, 21);
        this.art.fillStyle(state.etching ? LIT : 0x87a6f2, 0.76).fillCircle(p.x, p.y, state.etching ? 15 : 5);
        if (state.etching) {
            this.art.lineStyle(2, 0x315d85).beginPath().moveTo(p.x - 9, p.y + 4)
                .lineTo(p.x - 4, p.y - 6).lineTo(p.x + 4, p.y - 2).lineTo(p.x + 9, p.y + 6).strokePath();
        }
    }

    private drawBasin(state: BorealisState): void {
        const { basinTrack, iceBlock, gate } = this.layout;
        this.drawTrack(basinTrack, state.basinPlate);
        this.drawSocket(iceBlock.body, iceBlock.destinationY, state.block === 1);
        this.drawLink({ x: basinTrack.plate, y: basinTrack.y }, { x: gate.x, y: basinTrack.y }, state.basinPlate);
        const lamp = this.projection.center(gate, 54 * state.gate + 18);
        this.art.fillStyle(state.basinPlate ? LIT : 0xab6237).fillCircle(lamp.x, lamp.y, 4);
    }

    private drawSummit(state: BorealisState): void {
        const { summitTracks: [left, right], windbreak, monument } = this.layout;
        this.drawTrack(left, state.leftPlate);
        this.drawTrack(right, state.rightPlate);
        this.drawSocket(windbreak.body, windbreak.destinationY, state.windbreak === 1);
        this.drawLink({ x: left.plate, y: left.y }, { x: monument.x, y: monument.y + 9 }, state.leftPlate);
        this.drawLink({ x: right.plate, y: right.y }, { x: monument.x, y: monument.y + 44 }, state.rightPlate);
        this.projection.block(this.art, monument, 12, STONE);
        const center = this.projection.center(monument, 12);
        this.art.fillStyle(state.leftPlate ? LIT : 0xbd734a).fillCircle(center.x - 24, center.y, 5);
        this.art.fillStyle(state.rightPlate ? LIT : 0xbd734a).fillCircle(center.x + 24, center.y, 5);
        if (state.monument < 1) {
            const spread = 24 * state.monument;
            this.art.fillStyle(0x9bdff7, 0.88)
                .fillTriangle(center.x - 28 - spread, center.y, center.x - spread, center.y - 58, center.x - spread, center.y)
                .fillTriangle(center.x + 28 + spread, center.y, center.x + spread, center.y - 58, center.x + spread, center.y);
            this.art.lineStyle(2, 0xe6fbff)
                .lineBetween(center.x - spread, center.y - 57, center.x - 12 - spread, center.y - 12)
                .lineBetween(center.x + spread, center.y - 57, center.x + 12 + spread, center.y - 16);
        } else if (!state.collected) {
            const y = center.y - 28 + 3 * Math.sin(this.time / 220);
            this.art.fillStyle(LIT, 0.25).fillCircle(center.x, y, 23);
        }

        if (state.monument > 0) {
            for (let x = this.layout.areas.basin.endX + 23; x < this.layout.areas.summit.endX - 24; x += 11) {
                const y = 64 + 18 * Math.sin(x / 95 + this.time / 3100);
                this.atmosphere.fillStyle(0x85ffcf, state.monument * 0.19).fillEllipse(x, y, 32, 42);
                this.atmosphere.fillStyle(0xc0a1ff, state.monument * 0.17).fillEllipse(x, y - 6, 27, 25);
            }
        }
    }

    private drawTrack(track: SledTrack, held: boolean): void {
        this.projection.block(this.art, { x: track.plate - 21, y: track.y - 15, width: 42, height: 30 },
            held ? 1 : 4, { ...STONE, top: held ? LIT : 0xbc8952 });
    }

    private drawSocket(body: Rect, y: number, locked: boolean): void {
        const rect = { ...body, y };
        this.projection.surface(this.art, rect, INACTIVE);
        this.projection.outline(this.art, rect, locked ? LIT : 0xffdc91);
    }

    private drawLink(from: Point, to: Point, lit: boolean): void {
        const a = this.projection.project(from);
        const b = this.projection.project(to);
        this.art.lineStyle(lit ? 3 : 2, lit ? LIT : INACTIVE, 0.84).beginPath().moveTo(a.x, a.y)
            .lineTo(a.x + 25, b.y).lineTo(b.x, b.y).strokePath();
        this.art.fillStyle(lit ? LIT : 0x9aadc1, 0.95).fillCircle(a.x, a.y, 4).fillCircle(b.x, b.y, 4);
        if (lit) {
            const phase = this.reducedMotion.matches ? 0.5 : (this.time % 1100) / 1100;
            const bend = { x: a.x + 25, y: b.y };
            const first = Math.hypot(bend.x - a.x, bend.y - a.y);
            const second = Math.abs(b.x - bend.x);
            const distance = phase * (first + second);
            const x = distance < first ? a.x + (bend.x - a.x) * distance / (first || 1)
                : bend.x + Math.sign(b.x - bend.x) * (distance - first);
            const y = distance < first ? a.y + (bend.y - a.y) * distance / (first || 1) : b.y;
            this.art.fillStyle(0xe8fffc).fillCircle(x, y, 2.5);
        }
    }

    private drawVane(vane: Point, wind: number, calm: boolean): void {
        const p = this.projection.project(vane);
        this.art.lineStyle(2, calm ? 0x92d4da : 0x293851).lineBetween(p.x - wind * 11, p.y + 12, p.x + wind * 14, p.y + 12);
        this.art.fillStyle(calm ? 0x92d4da : 0x293851).fillTriangle(p.x + wind * 17, p.y + 12, p.x + wind * 9, p.y + 8, p.x + wind * 9, p.y + 16);
    }

    private calm(area: BorealisArea, state: BorealisState): number {
        return area === 'summit' ? state.monument : 0;
    }

    private drawSnow(area: BorealisArea, state: BorealisState): void {
        const { areas, floor, summitTracks } = this.layout;
        const start = area === 'pass' ? floor.x : area === 'basin' ? areas.pass.endX : areas.basin.endX;
        const width = areas[area].endX - start;
        const wind = state.wind[area];
        const calm = this.calm(area, state);
        if (calm === 1 || this.reducedMotion.matches) return;
        for (let i = 0; i < 48; i++) {
            const offset = (i * 97 + wind * this.time * (0.09 + i % 3 * 0.026)) % width;
            const x = start + (offset + width) % width;
            const y = 99 + i * 73 % 238;
            if (area === 'summit' && state.windbreak === 1 && i % 4 !== 0
                && Math.abs(x - summitTracks[0].plate) < 48 && Math.abs(y - 199) < 48) continue;
            const end = Math.max(start, Math.min(areas[area].endX, x + wind * (3 + i % 8)));
            this.art.lineStyle(1, 0xf1fbff, (1 - calm) * (0.28 + (i % 3) * 0.12)).lineBetween(x, y, end, y - 1);
        }
    }

}
