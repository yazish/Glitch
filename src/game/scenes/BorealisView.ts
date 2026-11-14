import type { GameObjects, Scene } from 'phaser';
import type { Point, Rect } from '../worlds/geometry';
import type { BorealisArea, BorealisLayout, SledTrack } from '../worlds/borealis/layout';
import type { BorealisState } from '../worlds/borealis/simulation';
import { propBody, sledBody } from '../worlds/borealis/track';
import { WIDTH } from '../viewport';
import { CharacterView } from './CharacterView';
import { RoomProjection } from './RoomProjection';
import { drawBorealisScenery } from './BorealisScenery';

const ICE = { top: 0xc4f4ff, left: 0x4b89ae, right: 0x7ebdd4 };
const STONE = { top: 0xa7b6cb, left: 0x3a4964, right: 0x607593 };
const WOOD = { top: 0xc6a17c, left: 0x53506a, right: 0x826e6b };
const LIT = 0x91ffea;
const INACTIVE = 0x44556d;

export class BorealisView {
    private readonly projection: RoomProjection;
    private readonly art: GameObjects.Graphics;
    private readonly atmosphere: GameObjects.Graphics;
    private readonly prompt: GameObjects.Text;
    private readonly player: CharacterView;
    private readonly echo: CharacterView;
    private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    private time = 0;

    constructor(private readonly scene: Scene, private readonly layout: BorealisLayout) {
        this.projection = new RoomProjection(layout.floor);
        drawBorealisScenery(scene, layout, this.projection);
        this.atmosphere = scene.add.graphics().setDepth(-2);
        this.art = scene.add.graphics().setDepth(-1);
        this.prompt = scene.add.text(0, 0, '', {
            fontFamily: 'monospace', fontSize: '10px', color: '#fff5dd', backgroundColor: '#17273e',
            padding: { x: 5, y: 4 }, wordWrap: { width: 230 },
        }).setOrigin(0.5, 1).setDepth(365);
        this.player = new CharacterView(scene, 0xffbb75, 0xffffff, 1);
        this.echo = new CharacterView(scene, 0xc2a0ff, 0xc2a0ff, 0.65);
    }

    render(state: BorealisState, delta: number): void {
        if (!this.reducedMotion.matches) this.time += delta;
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
        const { drift, formation, areas } = this.layout;
        const entry = areas.pass.entry;
        this.portal(this.projection.project({ x: entry.x - 21, y: entry.y }), true);
        this.projection.surface(this.art, drift, 0x8eaaba);
        for (let y = drift.y + 10; y < drift.y + drift.height; y += 26) {
            this.projection.outline(this.art, { x: drift.x + 2, y, width: drift.width - 4, height: 24 }, 0x5e7f97);
            if (state.drift < 1) {
                const p = this.projection.project({ x: drift.x + drift.width / 2 - 24 * state.drift, y });
                const size = 1 - state.drift * 0.84;
                this.art.fillStyle(0x759bb4).fillEllipse(p.x, p.y + 3, 66 * size, 37 * size);
                this.art.fillStyle(0xe3f3fa).fillEllipse(p.x - 4, p.y - 6, 64 * size, 37 * size);
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
        this.projection.block(this.art, propBody(iceBlock, state.block), 19, ICE);
        this.drawSled(basinTrack, state.basinSled, state.wind.basin);
        this.drawLink({ x: basinTrack.plate, y: basinTrack.y }, { x: gate.x, y: basinTrack.y }, state.basinPlate);
        this.projection.outline(this.art, gate, INACTIVE, 0.75);
        this.projection.block(this.art, gate, 20, STONE, 50 * state.gate);
        const lamp = this.projection.center(gate, 54 * state.gate + 18);
        this.art.fillStyle(state.basinPlate ? LIT : 0xab6237).fillCircle(lamp.x, lamp.y, 4);
    }

    private drawSummit(state: BorealisState): void {
        const { summitTracks: [left, right], windbreak, monument, exit } = this.layout;
        this.drawTrack(left, state.leftPlate);
        this.drawTrack(right, state.rightPlate);
        this.drawSocket(windbreak.body, windbreak.destinationY, state.windbreak === 1);
        this.drawLink({ x: left.plate, y: left.y }, { x: monument.x, y: monument.y + 9 }, state.leftPlate);
        this.drawLink({ x: right.plate, y: right.y }, { x: monument.x, y: monument.y + 44 }, state.rightPlate);
        this.drawSled(left, state.leftSled, state.wind.summit, state.windbreak === 1);
        this.drawSled(right, state.rightSled, state.wind.summit);
        this.projection.block(this.art, propBody(windbreak, state.windbreak), 24, WOOD);
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
            this.art.fillStyle(LIT).fillTriangle(center.x - 9, y, center.x, y - 14, center.x + 9, y)
                .fillTriangle(center.x - 9, y, center.x, y + 14, center.x + 9, y);
        }

        if (state.monument > 0) {
            for (let x = this.layout.areas.basin.endX + 23; x < this.layout.areas.summit.endX - 24; x += 11) {
                const y = 64 + 18 * Math.sin(x / 95 + this.time / 3100);
                this.atmosphere.fillStyle(0x85ffcf, state.monument * 0.19).fillEllipse(x, y, 32, 42);
                this.atmosphere.fillStyle(0xc0a1ff, state.monument * 0.17).fillEllipse(x, y - 6, 27, 25);
            }
        }
        this.portal(this.projection.center(exit), state.collected);
    }

    private drawTrack(track: SledTrack, held: boolean): void {
        this.projection.surface(this.art, { x: track.left - 21, y: track.y - 12, width: track.right - track.left + 42, height: 24 }, INACTIVE, 0.62);
        for (const offset of [-9, 9]) {
            const p = this.projection.project({ x: track.left, y: track.y + offset });
            this.art.lineStyle(2, 0xc3e5f1).lineBetween(p.x, p.y, track.right, p.y);
        }
        this.projection.block(this.art, { x: track.plate - 21, y: track.y - 15, width: 42, height: 30 },
            held ? 1 : 4, { ...STONE, top: held ? LIT : 0xbc8952 });
    }

    private drawSled(track: SledTrack, x: number, wind: number, sheltered = false): void {
        const body = sledBody(track, x);
        this.projection.block(this.art, body, 7, WOOD);
        const p = this.projection.center(body, 6);
        this.art.lineStyle(3, 0x263852).lineBetween(p.x, p.y, p.x, p.y - 28);
        this.art.fillStyle(sheltered ? 0x98d9d8 : 0xffddad)
            .fillTriangle(p.x, p.y - 28, p.x, p.y - 6, p.x + wind * (sheltered ? 9 : 21), p.y - 10);
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
    }

    private drawVane(vane: Point, wind: number, calm: boolean): void {
        const p = this.projection.project(vane);
        this.projection.block(this.art, { x: vane.x - 11, y: vane.y - 9, width: 22, height: 18 }, 8, STONE);
        this.art.lineStyle(3, 0x34445d).lineBetween(p.x, p.y, p.x, p.y - 35);
        const tip = p.x + wind * 23;
        this.art.fillStyle(calm ? 0x92d4da : 0xdf8855).fillTriangle(p.x, p.y - 35, p.x, p.y - 21, tip, p.y - 29);
        this.art.lineStyle(2, 0x293851).lineBetween(p.x - wind * 11, p.y + 12, p.x + wind * 14, p.y + 12);
        this.art.fillStyle(0x293851).fillTriangle(p.x + wind * 17, p.y + 12, p.x + wind * 9, p.y + 8, p.x + wind * 9, p.y + 16);
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

    private portal(p: Point, lit: boolean): void {
        this.art.fillStyle(0x394962).fillEllipse(p.x, p.y - 17, 40, 55);
        this.art.fillStyle(lit ? 0x7de3e4 : 0x29364d).fillEllipse(p.x, p.y - 17, 28, 45);
        this.art.fillStyle(lit ? 0xb1f4ff : 0x344359, 0.8).fillEllipse(p.x, p.y - 17, 16, 33);
    }
}
