import { contains } from '../geometry.ts';
import type { Rect } from '../geometry.ts';
import type { Journey } from '../journey.ts';
import { EchoReplay } from '../replay.ts';
import type { BorealisArea, BorealisLayout, SlidingProp } from './layout.ts';
import { advanceSled, propBody, sledBody } from './track.ts';
import type { Wind } from './track.ts';
import { BorealisWalking, PLAYER_RADIUS } from './walking.ts';

const CLEAR_TICKS = 105;
const PROP_TICKS = 24;
const GATE_TICKS = 42;
const CRACK_TICKS = 84;
const VANE_REACH = 39;

type Discovery = 'drift' | 'gate' | 'sled' | 'monument' | 'plates' | 'sleds';

export class BorealisSimulation {
    private readonly layout: BorealisLayout;
    private readonly journey: Journey;
    private readonly replay = new EchoReplay();
    private readonly walking: BorealisWalking;
    private readonly discoveries = new Set<Discovery>();
    private readonly wind: Record<BorealisArea, Wind> = { pass: 1, basin: -1, summit: 1 };
    private area: BorealisArea = 'pass';
    private driftTicks = 0;
    private blockTicks = 0;
    private blockMoving = false;
    private basinSled: number;
    private gateTicks = 0;
    private leftSled: number;
    private rightSled: number;
    private summitWindStarted = false;
    private breakTicks = 0;
    private breakMoving = false;
    private monumentTicks = 0;
    private etching = false;
    private finished = false;

    constructor(layout: BorealisLayout, journey: Journey) {
        this.layout = layout;
        this.journey = journey;
        this.walking = new BorealisWalking(layout.areas.pass.entry);
        this.basinSled = layout.basinTrack.start;
        this.leftSled = layout.summitTracks[0].start;
        this.rightSled = layout.summitTracks[1].start;
        this.replay.begin(this.player);
        this.observe();
    }

    get player() { return this.walking.player; }
    get needsMicrophone(): boolean {
        return this.area === 'pass' && !this.etching && contains(this.player, this.layout.formation, 28);
    }

    get state() {
        const echo = this.replay.frame;
        return {
            player: this.player, walkTicks: this.walking.walkTicks, echo: echo?.pose,
            echoWalkTicks: echo?.walkTicks ?? 0,
            area: this.area, areaName: this.layout.areas[this.area].name, wind: { ...this.wind },
            seenDrift: this.discoveries.has('drift'), seenGate: this.discoveries.has('gate'),
            seenSled: this.discoveries.has('sled'), seenMonument: this.discoveries.has('monument'),
            seenPlates: this.discoveries.has('plates'), seenSleds: this.discoveries.has('sleds'),
            drift: this.driftTicks / CLEAR_TICKS, block: this.blockTicks / PROP_TICKS,
            basinSled: this.basinSled, basinPlate: this.basinPlate, gate: this.gateTicks / GATE_TICKS,
            leftSled: this.leftSled, rightSled: this.rightSled, leftPlate: this.leftPlate, rightPlate: this.rightPlate,
            windbreak: this.breakTicks / PROP_TICKS, monument: this.monumentTicks / CRACK_TICKS,
            etching: this.etching, collected: this.collected, finished: this.finished,
            hint: this.hint(), needsMicrophone: this.needsMicrophone, waymarks: this.journey.waymarkCount,
        } as const;
    }

    reverseWind(): void {
        if (!this.vaneInReach || this.solved) return;
        if (this.area === 'summit') this.summitWindStarted = true;
        this.wind[this.area] = this.wind[this.area] === 1 ? -1 : 1;
    }

    interact(): void {
        const { iceBlock, windbreak, monument, exit } = this.layout;
        if (this.area === 'basin' && !this.basinPlate && contains(this.player, iceBlock.reach)) {
            this.blockMoving = true;
        } else if (this.area === 'summit') {
            if (this.monumentTicks === 0 && this.leftPlate && contains(this.player, windbreak.reach)) {
                this.breakMoving = true;
            } else if (this.monumentTicks === CRACK_TICKS && contains(this.player, monument, 20)) {
                this.journey.collectWaymark('borealis');
            } else if (this.collected && contains(this.player, exit)) {
                this.finished = true;
            }
        }
    }

    sound(pulse: 'soft' | 'loud' | undefined): void {
        if (pulse === 'soft' && this.needsMicrophone) this.etching = true;
    }

    rewind(): void {
        if (!this.finished && this.replay.rewind()) this.returnToEntry();
    }

    restart(): void {
        if (this.finished) return;
        if (!this.solved) {
            switch (this.area) {
                case 'pass':
                    this.driftTicks = 0;
                    this.wind.pass = 1;
                    break;
                case 'basin':
                    this.blockTicks = 0;
                    this.blockMoving = false;
                    this.basinSled = this.layout.basinTrack.start;
                    this.wind.basin = -1;
                    break;
                case 'summit':
                    this.breakTicks = 0;
                    this.breakMoving = false;
                    this.leftSled = this.layout.summitTracks[0].start;
                    this.rightSled = this.layout.summitTracks[1].start;
                    this.wind.summit = 1;
                    this.summitWindStarted = false;
                    break;
            }
        }
        this.replay.clear();
        this.returnToEntry();
    }

    step(horizontal: number, vertical: number): void {
        if (this.finished) return;
        const { floor, ice, areas } = this.layout;
        this.walking.step(horizontal, vertical, floor, ice, this.obstacles());
        const area = this.player.x < areas.pass.endX ? 'pass'
            : this.player.x < areas.basin.endX ? 'basin' : 'summit';
        if (this.area !== area) {
            this.area = area;
            this.replay.clear();
            this.replay.begin(this.player, this.walking.walkTicks);
        } else {
            this.replay.record(this.player, this.walking.walkTicks);
        }
        this.advancePuzzles();
        this.observe();
    }

    private get collected(): boolean { return this.journey.hasWaymark('borealis'); }
    private get basinPlate(): boolean { return this.basinSled === this.layout.basinTrack.plate; }
    private get leftPlate(): boolean { return this.leftSled === this.layout.summitTracks[0].plate; }
    private get rightPlate(): boolean { return this.rightSled === this.layout.summitTracks[1].plate; }
    private get solved(): boolean {
        switch (this.area) {
            case 'pass': return this.driftTicks === CLEAR_TICKS;
            case 'basin': return this.basinPlate;
            case 'summit': return this.monumentTicks > 0;
        }
    }

    private get vaneInReach(): boolean {
        const vane = this.layout.areas[this.area].vane;
        return Math.hypot(this.player.x - vane.x, this.player.y - vane.y) <= VANE_REACH;
    }

    private obstacles(): Rect[] {
        const { basinTrack, summitTracks, iceBlock, windbreak, drift, gate } = this.layout;
        const obstacles = [
            sledBody(basinTrack, this.basinSled), sledBody(summitTracks[0], this.leftSled),
            sledBody(summitTracks[1], this.rightSled), propBody(iceBlock, this.blockTicks / PROP_TICKS),
            propBody(windbreak, this.breakTicks / PROP_TICKS),
        ];
        if (this.driftTicks < CLEAR_TICKS) obstacles.push(drift);
        if (this.gateTicks < GATE_TICKS) obstacles.push(gate);
        return obstacles;
    }

    private advancePuzzles(): void {
        const { basinTrack, iceBlock, summitTracks, windbreak } = this.layout;
        if (this.wind.pass < 0 && this.driftTicks < CLEAR_TICKS) this.driftTicks++;

        if (this.blockMoving) this.blockTicks = this.advanceProp(iceBlock, this.blockTicks);
        if (!this.basinPlate) {
            this.basinSled = advanceSled(basinTrack, this.basinSled, this.wind.basin, this.player,
                PLAYER_RADIUS, this.blockTicks < PROP_TICKS ? iceBlock.body : undefined);
        }
        if (this.basinPlate && this.gateTicks < GATE_TICKS) this.gateTicks++;

        if (this.monumentTicks > 0) {
            this.monumentTicks = Math.min(CRACK_TICKS, this.monumentTicks + 1);
            return;
        }
        if (!this.summitWindStarted) return;
        if (this.breakMoving && this.leftPlate) this.breakTicks = this.advanceProp(windbreak, this.breakTicks);
        if (this.breakTicks < PROP_TICKS) {
            this.leftSled = advanceSled(summitTracks[0], this.leftSled, this.wind.summit, this.player, PLAYER_RADIUS);
        }
        this.rightSled = advanceSled(summitTracks[1], this.rightSled, this.wind.summit, this.player, PLAYER_RADIUS);
        if (this.leftPlate && this.rightPlate) this.monumentTicks = 1;
    }

    private advanceProp(prop: SlidingProp, ticks: number): number {
        const next = Math.min(PROP_TICKS, ticks + 1);
        return contains(this.player, propBody(prop, next / PROP_TICKS), PLAYER_RADIUS) ? ticks : next;
    }

    private observe(): void {
        const { drift, gate, monument, basinTrack, summitTracks } = this.layout;
        const notice = (id: Discovery, rect: Rect, reach: number) => {
            if (contains(this.player, rect, reach)) this.discoveries.add(id);
        };
        if (this.area === 'pass') {
            notice('drift', drift, 160);
        } else if (this.area === 'basin') {
            // The gate is visible from the basin overlook to the first sled.
            notice('sled', sledBody(basinTrack, this.basinSled), 105);
            notice('gate', { ...gate, x: gate.x - 360, width: gate.width + 360 }, 0);
        } else {
            notice('monument', monument, 140);
            const [left, right] = summitTracks;
            notice('plates', sledBody(right, right.plate), 85);
            notice('plates', sledBody(left, left.plate), 85);
            notice('sleds', { x: left.left, y: left.y, width: left.right - left.left, height: right.y - left.y }, 65);
        }
    }

    private returnToEntry(): void {
        this.walking.reset(this.layout.areas[this.area].entry);
        this.replay.begin(this.player);
    }

    private hint(): string {
        const { formation, iceBlock, windbreak, monument, exit } = this.layout;
        if (this.finished) return '';
        if (this.vaneInReach && !this.solved) {
            const next = this.wind[this.area] === 1 ? 'left' : 'right';
            return 'F · Turn the wind ' + next;
        }
        if (this.needsMicrophone) return 'Short, soft sound · Resonate with the ice';
        if (this.etching && contains(this.player, formation, 28)) return 'An etched constellation glows in the ice.';
        if (this.area === 'basin' && !this.blockMoving && contains(this.player, iceBlock.reach)) {
            return 'E · Slide the ice block into its recess';
        }
        if (this.area === 'summit') {
            if (this.monumentTicks === 0 && this.breakTicks < PROP_TICKS && contains(this.player, windbreak.reach)) {
                return this.leftPlate ? 'E · Slide the windbreak into its socket'
                    : 'Guide the first sled onto its plate.';
            }
            if (contains(this.player, monument, 20) && !this.collected) {
                return this.monumentTicks === CRACK_TICKS ? 'E · Collect the Waymark' : 'Both locks must release.';
            }
            if (contains(this.player, exit)) return this.collected ? 'E · Enter the exit portal' : 'The portal needs the Waymark.';
        }
        return '';
    }
}

export type BorealisState = BorealisSimulation['state'];
