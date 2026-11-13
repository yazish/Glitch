import { Journey } from './journey.ts';
import { EchoReplay } from './replay.ts';
import { contains, STEP_MS } from './room.ts';
import type { HermesLayout, Point, Pose } from './room.ts';

export type GameCommand = 'activateBridge' | 'rewind' | 'restart';
export type Screen = 'outpost' | 'chamber' | 'complete';

const BODY = 7;
const STEP_DISTANCE = 135 * STEP_MS / 1000;
const BRIDGE_TICKS = 360;

export class HermesSimulation {
    private readonly layout: HermesLayout;
    private readonly journey = new Journey();
    private readonly replay = new EchoReplay();
    private currentScreen: Screen = 'outpost';
    private player: Pose;
    private bridgeTicks = 0;
    private bridgeOccupied = false;
    private bridgePermanent = false;
    private gateOccupied = false;
    private chamberCheckpoint?: Pose;

    constructor(layout: HermesLayout) {
        this.layout = layout;
        this.player = layout.outpost.spawn;
    }

    get canActivateBridge(): boolean {
        return this.currentScreen === 'outpost' && this.journey.hasMap
            && !this.bridgeOpen && contains(this.player, this.layout.outpost.receiver);
    }

    private get bridgeOpen(): boolean {
        return this.bridgePermanent || this.bridgeTicks > 0 || this.bridgeOccupied;
    }

    private get plateHeld(): boolean {
        const plate = this.layout.chamber.plate;
        const echo = this.replay.pose;
        return contains(this.player, plate) || (echo !== undefined && contains(echo, plate));
    }

    private get gateOpen(): boolean {
        return this.journey.canDepart || this.plateHeld || this.gateOccupied;
    }

    get state() {
        return {
            screen: this.currentScreen,
            player: this.player,
            echo: this.currentScreen === 'chamber' ? this.replay.pose : undefined,
            plateHeld: this.currentScreen === 'chamber' && this.plateHeld,
            gateOpen: this.gateOpen,
            bridgeOpen: this.bridgeOpen,
            bridgePermanent: this.bridgePermanent,
            canActivateBridge: this.canActivateBridge,
            hasMap: this.journey.hasMap,
            waymarks: Number(this.journey.hasWaymark),
            canDepart: this.journey.canDepart,
            recordingFull: this.replay.recordingFull,
        } as const;
    }

    command(command: GameCommand): void {
        if (this.currentScreen === 'complete') return;

        switch (command) {
            case 'activateBridge':
                if (this.canActivateBridge) this.bridgeTicks = BRIDGE_TICKS;
                break;
            case 'rewind':
                if (this.currentScreen === 'chamber' && !this.journey.canDepart && this.replay.rewind()) {
                    this.resetRoom();
                }
                break;
            case 'restart':
                this.replay.clear();
                this.resetRoom();
                break;
        }
    }

    step(horizontal: number, vertical: number): void {
        if (this.currentScreen === 'complete') return;

        const { outpost, chamber } = this.layout;
        const wasInChamber = this.currentScreen === 'chamber';
        const bridgeWasOpen = this.bridgeOpen;
        const gateWasOpen = this.gateOpen;
        this.move(horizontal, vertical, bridgeWasOpen, gateWasOpen);

        this.bridgeTicks = Math.max(0, this.bridgeTicks - 1);
        this.bridgeOccupied = bridgeWasOpen && contains(this.player, outpost.bridge, BODY);
        if (bridgeWasOpen && this.player.x >= outpost.bridge.x + outpost.bridge.width + BODY) {
            this.bridgePermanent = true;
        }
        this.gateOccupied = gateWasOpen && contains(this.player, chamber.gate, BODY);
        if (contains(this.player, outpost.map)) this.journey.findMap();

        const inChamber = this.player.x >= chamber.startX;
        this.currentScreen = inChamber ? 'chamber' : 'outpost';
        if (inChamber && !wasInChamber) {
            this.chamberCheckpoint = this.player;
            this.replay.begin(this.player);
        } else if (inChamber) {
            this.replay.record(this.player);
        } else if (wasInChamber) {
            this.chamberCheckpoint = undefined;
            this.replay.clear();
            this.replay.begin(this.player);
        }

        if (contains(this.player, chamber.anchor)) this.journey.restoreHermes();
        if (contains(this.player, chamber.gateway) && this.journey.canDepart) this.currentScreen = 'complete';
    }

    private move(horizontal: number, vertical: number, bridgeOpen: boolean, gateOpen: boolean): void {
        if (!horizontal && !vertical) return;
        const stride = STEP_DISTANCE / Math.hypot(horizontal, vertical);
        const facing = Math.abs(horizontal) >= Math.abs(vertical)
            ? (horizontal < 0 ? 'left' : 'right')
            : (vertical < 0 ? 'up' : 'down');
        const { floor, outpost, chamber } = this.layout;
        const canMove = (point: Point) => contains(point, floor, -BODY)
            && !outpost.walls.some((wall) => contains(point, wall, BODY))
            && !chamber.walls.some((wall) => contains(point, wall, BODY))
            && (bridgeOpen || !contains(point, outpost.bridge, BODY))
            && (gateOpen || !contains(point, chamber.gate, BODY));
        const xStep = { x: this.player.x + horizontal * stride, y: this.player.y };
        const x = canMove(xStep) ? xStep.x : this.player.x;
        const yStep = { x, y: this.player.y + vertical * stride };
        this.player = { x, y: canMove(yStep) ? yStep.y : this.player.y, facing };
    }

    private resetRoom(): void {
        this.bridgeTicks = 0;
        this.bridgeOccupied = false;
        this.gateOccupied = false;
        this.player = this.chamberCheckpoint ?? this.layout.outpost.spawn;
        this.replay.begin(this.player);
    }
}

export type HermesState = HermesSimulation['state'];
