import { Journey } from './journey.ts';
import { EchoReplay } from './replay.ts';
import { contains, STEP_MS } from './room.ts';
import type { HermesLayout, Point, Pose, Rect } from './room.ts';

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
    private gateOccupied = false;

    constructor(layout: HermesLayout) {
        this.layout = layout;
        this.player = layout.outpost.spawn;
    }

    get canActivateBridge(): boolean {
        return this.currentScreen === 'outpost' && this.journey.hasMap
            && !this.bridgeOpen && contains(this.player, this.layout.outpost.receiver);
    }

    private get bridgeOpen(): boolean {
        return this.bridgeTicks > 0 || this.bridgeOccupied;
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
            gateOpen: this.currentScreen !== 'outpost' && this.gateOpen,
            bridgeOpen: this.bridgeOpen,
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

        if (this.currentScreen === 'outpost') {
            this.stepOutpost(horizontal, vertical);
        } else {
            this.stepChamber(horizontal, vertical);
        }
    }

    private stepOutpost(horizontal: number, vertical: number): void {
        const { bridge, walls, map, entrance } = this.layout.outpost;
        const bridgeWasOpen = this.bridgeOpen;
        this.move(horizontal, vertical, walls, bridgeWasOpen ? undefined : bridge);
        this.bridgeTicks = Math.max(0, this.bridgeTicks - 1);
        this.bridgeOccupied = bridgeWasOpen && contains(this.player, bridge, BODY);

        if (contains(this.player, map)) this.journey.findMap();
        if (contains(this.player, entrance) && this.journey.hasMap) {
            this.currentScreen = 'chamber';
            this.resetRoom();
        }
    }

    private stepChamber(horizontal: number, vertical: number): void {
        const { gate, walls, anchor, gateway } = this.layout.chamber;
        const gateWasOpen = this.gateOpen;
        this.move(horizontal, vertical, walls, gateWasOpen ? undefined : gate);
        this.gateOccupied = gateWasOpen && contains(this.player, gate, BODY);
        this.replay.record(this.player);

        if (contains(this.player, anchor)) this.journey.restoreHermes();
        if (contains(this.player, gateway) && this.journey.canDepart) this.currentScreen = 'complete';
    }

    private move(horizontal: number, vertical: number, walls: readonly Rect[], blocker?: Rect): void {
        if (!horizontal && !vertical) return;
        const stride = STEP_DISTANCE / Math.hypot(horizontal, vertical);
        const facing = Math.abs(horizontal) >= Math.abs(vertical)
            ? (horizontal < 0 ? 'left' : 'right')
            : (vertical < 0 ? 'up' : 'down');
        const canMove = (point: Point) => contains(point, this.layout.floor, -BODY)
            && !walls.some((wall) => contains(point, wall, BODY))
            && (!blocker || !contains(point, blocker, BODY));
        const xStep = { x: this.player.x + horizontal * stride, y: this.player.y };
        const x = canMove(xStep) ? xStep.x : this.player.x;
        const yStep = { x, y: this.player.y + vertical * stride };
        this.player = { x, y: canMove(yStep) ? yStep.y : this.player.y, facing };
    }

    private resetRoom(): void {
        this.bridgeTicks = 0;
        this.bridgeOccupied = false;
        this.gateOccupied = false;
        this.player = this.currentScreen === 'outpost' ? this.layout.outpost.spawn : this.layout.chamber.spawn;
        this.replay.begin(this.player);
    }
}

export type HermesState = HermesSimulation['state'];
