import { contains } from '../geometry.ts';
import type { Point, Pose, Rect } from '../geometry.ts';
import type { Journey } from '../journey.ts';
import { EchoReplay } from '../replay.ts';
import type { SoundInput } from '../../input/commands.ts';
import { STONE_SEQUENCE } from './layout.ts';
import type { SoundProp, SoundTarget, ViridiaLayout } from './layout.ts';

const BODY = 7;
const STEP_DISTANCE = 2.25;
const CHARGE_TICKS = 180;
const FEEDBACK_TICKS = 90;

type Feedback = Readonly<{ target: SoundTarget; kind: 'soft' | 'loud' | 'wrong' | 'order' }>;

export class ViridiaSimulation {
    private readonly replay = new EchoReplay();
    private readonly layout: ViridiaLayout;
    private readonly journey: Journey;
    private player: Pose;
    private walkTicks = 0;
    private logDistance = 0;
    private braced = false;
    private flowersOpen = false;
    private reflectorTurn = 0;
    private rootHits = 0;
    private receiverCharge = 0;
    private vinesOpen = false;
    private stoneIndex = 0;
    private fractureHits = 0;
    private resonanceCharge = 0;
    private readonly examinedStones = new Set<SoundTarget>();
    private discoveredTree = false;
    private investigatedRoots = false;
    private seenReflector = false;
    private seenLog = false;
    private seenFlowers = false;
    private seenReceiver = false;
    private reachedTrail = false;
    private reachedHeart = false;
    private passedLog = false;
    private checkpoint?: Pose;
    private feedback?: Feedback;
    private feedbackTicks = 0;
    private finished = false;

    constructor(layout: ViridiaLayout, journey: Journey) {
        this.layout = layout;
        this.journey = journey;
        this.player = layout.entry;
    }

    get needsMicrophone(): boolean { return !this.treeAwake; }

    get target(): SoundProp | undefined {
        return this.layout.soundProps.find((prop) => this.isSoundPending(prop.id) && contains(this.player, prop.zone));
    }

    get state() {
        const echo = this.replay.frame;
        const area = this.layout.areas.find((candidate) => this.player.x < candidate.endX) ?? this.layout.areas[2];
        const collected = this.journey.hasWaymark('viridia');
        const target = this.target;
        const feedback = this.feedback && this.feedbackTicks > 0 ? this.feedback : undefined;
        return {
            player: this.player, walkTicks: this.walkTicks, echo: echo?.pose, echoWalkTicks: echo?.walkTicks ?? 0,
            area: area.id, areaName: area.name, target, hint: this.hint(target, feedback), feedback,
            logDistance: this.logDistance, braced: this.braced, logMoved: this.logMoved,
            flowersOpen: this.flowersOpen, reflectorTurn: this.reflectorTurn, aligned: this.aligned,
            rootHits: this.rootHits, rootsBroken: this.rootsBroken, receiverCharge: this.receiverCharge / CHARGE_TICKS, vinesOpen: this.vinesOpen,
            discoveredTree: this.discoveredTree, examinedStones: this.examinedStones.size, stoneIndex: this.stoneIndex,
            fractureHits: this.fractureHits, resonanceCharge: this.resonanceCharge / CHARGE_TICKS,
            sealOpen: this.sealOpen, plateHeld: this.plateHeld,
            treeAwake: this.treeAwake, collected, finished: this.finished, recordingFull: this.replay.recordingFull,
            seenLog: this.seenLog, seenFlowers: this.seenFlowers, investigatedRoots: this.investigatedRoots,
            seenReflector: this.seenReflector, seenReceiver: this.seenReceiver,
            reachedTrail: this.reachedTrail, reachedHeart: this.reachedHeart, passedLog: this.passedLog,
            waymarks: this.journey.waymarkCount,
        } as const;
    }

    interact(): void {
        const { logBrace, pedestal, exit } = this.layout;
        if (this.braced || (!this.logMoved && contains(this.player, logBrace))) {
            this.braced = !this.braced;
            if (this.braced) {
                this.player = { ...this.player, facing: 'right' };
            }
        } else if (this.target?.id === 'reflector') {
            this.reflectorTurn = (this.reflectorTurn + 1) % this.layout.reflectorTurns;
        } else if (this.sealOpen && contains(this.player, pedestal)) {
            this.journey.collectWaymark('viridia');
        } else if (this.journey.hasWaymark('viridia') && contains(this.player, exit)) {
            this.finished = true;
        }
    }

    rewind(): void {
        if (this.checkpoint && this.treeAwake && !this.journey.hasWaymark('viridia') && this.replay.rewind()) {
            this.resetAttempt(this.checkpoint);
        }
    }

    restart(): void {
        this.replay.clear();
        this.resetAttempt(this.checkpoint ?? this.layout.entry);
    }

    step(horizontal: number, vertical: number, sound: SoundInput): void {
        this.feedbackTicks = Math.max(0, this.feedbackTicks - 1);
        this.move(horizontal, vertical);
        this.observe();
        if (this.checkpoint && !this.journey.hasWaymark('viridia')) this.replay.record(this.player, this.walkTicks);
        this.applySound(sound);
    }

    private get logMoved(): boolean { return this.logDistance >= this.layout.logTravel; }
    private get rootsBroken(): boolean { return this.rootHits === 2; }
    private get logGapOpen(): boolean { return this.logDistance > BODY * 2; }
    private get aligned(): boolean { return this.reflectorTurn === this.layout.alignedTurn; }
    private get treeAwake(): boolean { return this.stoneIndex === STONE_SEQUENCE.length; }
    private get plateHeld(): boolean {
        const echo = this.replay.frame?.pose;
        return echo !== undefined && contains(echo, this.layout.plate);
    }
    private get sealOpen(): boolean { return this.treeAwake && this.plateHeld; }

    private isSoundPending(id: SoundTarget): boolean {
        switch (id) {
            case 'flowers': return !this.flowersOpen;
            case 'reflector': return !this.rootsBroken;
            case 'receiver': return !this.vinesOpen && this.rootsBroken;
            default: return this.discoveredTree && STONE_SEQUENCE.indexOf(id) >= this.stoneIndex;
        }
    }

    private hint(target: SoundProp | undefined, feedback: Feedback | undefined): string {
        if (this.braced) {
            return this.logGapOpen ? 'E · Let go, then walk around the log' : 'Hold ↓ to move the log · E to let go';
        }
        const { log, flowerBarrier } = this.layout;
        if (this.logGapOpen && this.player.x < log.x && this.player.x > log.x - 60) {
            const gapY = log.y + this.logDistance / 2;
            if (Math.abs(this.player.y - gapY) >= this.logDistance / 2 - BODY) {
                return this.player.y > gapY ? 'Move up to the gap, then right.' : 'Move down to the gap, then right.';
            }
            return 'Walk right through the gap.';
        }
        if (!this.flowersOpen && this.player.x > flowerBarrier.x - 105 && target?.id !== 'flowers') {
            return 'Approach the center of the flowers.';
        }
        if (!this.logMoved && contains(this.player, this.layout.logBrace)) return 'E · Brace against the log';
        if (feedback && target?.id === feedback.target) {
            if (feedback.kind === 'wrong' && (target.id !== 'reflector' || this.aligned)) return 'Try the sound shown for this prop.';
            if (feedback.kind === 'order') return 'Follow the Star Compass sequence.';
        }
        if (target) {
            if (target.id === 'reflector' && !this.aligned) return 'E · Rotate the reflector toward the roots';
            const rotate = target.id === 'reflector' ? 'E · Rotate · ' : '';
            const prompt = { soft: 'Short, soft sound', loud: 'Loud burst', sustained: 'Steady hum' };
            return rotate + prompt[target.sound];
        }
        if (this.treeAwake && !this.journey.hasWaymark('viridia')) {
            if (contains(this.player, this.layout.plate)) return 'R · Rewind and leave an Echo on the plate';
            if (contains(this.player, this.layout.pedestal)) return this.sealOpen ? 'E · Collect Waymark' : 'The Echo must hold the seal plate.';
        }
        if (!this.finished && this.journey.hasWaymark('viridia') && contains(this.player, this.layout.exit)) return 'E · Enter the exit portal';
        return '';
    }

    private observe(): void {
        const { logBrace, soundProps, discovery, heartCheckpoint } = this.layout;
        const near = (id: SoundTarget, padding = 0) =>
            soundProps.some((prop) => prop.id === id && contains(this.player, prop.zone, padding));
        this.reachedTrail ||= this.player.x >= this.layout.areas[1].startX;
        this.reachedHeart ||= this.player.x >= this.layout.areas[2].startX;
        this.passedLog ||= this.player.x >= this.layout.log.x + this.layout.log.width + BODY;
        this.seenLog ||= this.passedLog || contains(this.player, logBrace, 22);
        this.seenFlowers ||= near('flowers', 20);
        this.investigatedRoots ||= this.player.x > this.layout.roots.x - 148;
        this.seenReflector ||= near('reflector', 16);
        this.seenReceiver ||= near('receiver', 18);
        this.discoveredTree ||= contains(this.player, discovery);
        if (this.discoveredTree) {
            for (const stone of STONE_SEQUENCE) if (near(stone, 12)) this.examinedStones.add(stone);
        }
        if (!this.checkpoint && this.player.x >= heartCheckpoint.x) {
            this.checkpoint = heartCheckpoint;
            this.replay.begin(this.player, this.walkTicks);
        }
    }

    private applySound(sound: SoundInput): void {
        const target = this.target;
        const active = target !== undefined && this.readyForSound(target);
        this.receiverCharge = this.updateCharge(this.receiverCharge, active && target?.id === 'receiver' && sound.sustained, this.vinesOpen, CHARGE_TICKS);
        this.resonanceCharge = this.updateCharge(this.resonanceCharge, active && target?.id === 'resonance' && sound.sustained, this.treeAwake, 0.5);
        if (this.receiverCharge === CHARGE_TICKS) this.vinesOpen = true;
        if (this.resonanceCharge === CHARGE_TICKS && !this.treeAwake) this.stoneIndex++;
        const pulse = sound.pulse;
        if (!target) return;
        if (!pulse) {
            if (!active && target.sound === 'sustained' && sound.sustained) this.showFeedback(target.id, 'order');
            return;
        }

        if (!active) {
            this.showFeedback(target.id, target.id === 'reflector' ? 'wrong' : 'order');
        } else if (pulse !== target.sound) {
            this.showFeedback(target.id, 'wrong');
        } else {
            this.showFeedback(target.id, pulse);
            switch (target.id) {
                case 'flowers': this.flowersOpen = true; break;
                case 'reflector': this.rootHits++; break;
                case 'bloom': this.stoneIndex++; break;
                case 'fracture':
                    if (++this.fractureHits === 2) this.stoneIndex++;
                    break;
            }
        }
    }

    private readyForSound(target: SoundProp): boolean {
        if (target.id === 'reflector') return this.aligned;
        const stone = STONE_SEQUENCE.findIndex((id) => id === target.id);
        return stone < 0 || stone === this.stoneIndex;
    }

    private updateCharge(charge: number, held: boolean, complete: boolean, drain: number): number {
        if (complete) return CHARGE_TICKS;
        return held ? Math.min(CHARGE_TICKS, charge + 1) : Math.max(0, charge - drain);
    }

    private showFeedback(target: SoundTarget, kind: Feedback['kind']): void {
        this.feedback = { target, kind };
        this.feedbackTicks = FEEDBACK_TICKS;
    }

    private move(horizontal: number, vertical: number): void {
        if (this.braced) {
            const delta = vertical > 0 ? Math.min(1.8, this.layout.logTravel - this.logDistance) : 0;
            this.logDistance += delta;
            const maxY = this.layout.floor.y + this.layout.floor.height - BODY - 1;
            this.player = { ...this.player, y: Math.min(this.player.y + delta, maxY), facing: 'right' };
            this.braced = !this.logMoved;
            this.walkTicks = delta ? this.walkTicks + 1 : 0;
            return;
        }
        if (!horizontal && !vertical) {
            this.walkTicks = 0;
            return;
        }
        const { floor, log, logTrackWalls, flowerBarrier, roots, vines, trunk } = this.layout;
        const barriers: Rect[] = [trunk, ...logTrackWalls, { ...log, y: log.y + this.logDistance }];
        if (!this.flowersOpen) barriers.push(flowerBarrier);
        if (!this.rootsBroken) barriers.push(roots);
        if (!this.vinesOpen) barriers.push(vines);
        const canMove = (point: Point) => contains(point, floor, -BODY)
            && !barriers.some((rect) => contains(point, rect, BODY));
        const { x, y } = this.player;
        const stride = STEP_DISTANCE / Math.hypot(horizontal, vertical);
        const nextX = x + horizontal * stride;
        const movedX = canMove({ x: nextX, y }) ? nextX : x;
        const nextY = y + vertical * stride;
        const movedY = canMove({ x: movedX, y: nextY }) ? nextY : y;
        const facing = Math.abs(horizontal) >= Math.abs(vertical)
            ? (horizontal < 0 ? 'left' : 'right')
            : (vertical < 0 ? 'up' : 'down');
        this.player = { x: movedX, y: movedY, facing };
        this.walkTicks = movedX !== x || movedY !== y ? this.walkTicks + 1 : 0;
    }

    private resetAttempt(pose: Pose): void {
        this.player = pose;
        this.walkTicks = 0;
        this.braced = false;
        this.feedbackTicks = 0;
        this.receiverCharge = this.vinesOpen ? CHARGE_TICKS : 0;
        this.resonanceCharge = this.treeAwake ? CHARGE_TICKS : 0;
        if (this.checkpoint) this.replay.begin(pose);
    }
}

export type ViridiaState = ViridiaSimulation['state'];
