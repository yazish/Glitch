import { CircularMachinePuzzle } from './circular-machine.ts';
import { Journey } from './journey.ts';
import { EchoReplay } from './replay.ts';
import { RiftHazard } from './rift-hazard.ts';
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
    private readonly riftHazard: RiftHazard;
    private readonly machine: CircularMachinePuzzle;
    private currentScreen: Screen = 'outpost';
    private player: Pose;
    private bridgeTicks = 0;
    private bridgeOccupied = false;
    private bridgePermanent = false;
    private gateOccupied = false;
    private fellInRift = false;
    private fallCount = 0;
    private chamberEntryCheckpoint?: Pose;
    private chamberCheckpoint?: Pose;
    private inMachineZone = false;

    constructor(layout: HermesLayout) {
        this.layout = layout;
        this.player = layout.outpost.spawn;
        this.riftHazard = new RiftHazard(layout.outpost);
        this.machine = new CircularMachinePuzzle(layout.chamber.machine, () => {
            this.journey.restoreHermes();
        });
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
        const echo = this.currentScreen === 'chamber' ? this.replay.pose : undefined;
        const machine = this.machine.getState(this.player, echo);
        return {
            screen: this.currentScreen,
            player: this.player,
            echo,
            plateHeld: this.currentScreen === 'chamber' && this.plateHeld,
            gateOpen: this.gateOpen,
            bridgeOpen: this.bridgeOpen,
            bridgePermanent: this.bridgePermanent,
            canActivateBridge: this.canActivateBridge,
            fellInRift: this.fellInRift,
            fallCount: this.fallCount,
            machine,
            controlHeld: this.currentScreen === 'chamber' && machine.controlHeld,
            shadowSymbol: this.currentScreen === 'chamber' ? machine.shadowSymbol : undefined,
            alignedSymbols: machine.alignedSymbols,
            constellations: machine.constellations,
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
                if (this.canActivateBridge) {
                    this.bridgeTicks = BRIDGE_TICKS;
                    this.fellInRift = false;
                }
                break;
            case 'rewind':
                if (this.currentScreen === 'chamber' && !this.journey.canDepart && this.replay.rewind()) {
                    this.machine.reset(true);
                    this.resetRoom(false);
                }
                break;
            case 'restart':
                this.replay.clear();
                this.machine.reset(true);
                this.inMachineZone = false;
                this.chamberCheckpoint = this.chamberEntryCheckpoint;
                this.resetRoom(true);
                break;
        }
    }

    step(horizontal: number, vertical: number): void {
        if (this.currentScreen === 'complete') return;

        const { outpost, chamber } = this.layout;
        const wasInChamber = this.currentScreen === 'chamber';
        const bridgeWasOpen = this.bridgeOpen;
        const gateWasOpen = this.gateOpen;
        this.move(horizontal, vertical, gateWasOpen);

        this.bridgeTicks = Math.max(0, this.bridgeTicks - 1);
        this.bridgeOccupied = this.riftHazard.isBridgeOccupied(this.player, bridgeWasOpen, BODY);
        if (this.riftHazard.hasCrossedBridge(this.player, bridgeWasOpen, BODY)) {
            this.bridgePermanent = true;
        }

        if (this.riftHazard.didFallOffMap(this.player, this.bridgeOpen, BODY)) {
            this.fellInRift = true;
            this.fallCount += 1;
            this.bridgeTicks = 0;
            this.bridgeOccupied = false;
            this.player = outpost.spawn;
            return;
        }
        if (this.fellInRift && this.player.x > outpost.spawn.x) {
            this.fellInRift = false;
        }

        this.gateOccupied = gateWasOpen && contains(this.player, chamber.gate, BODY);
        if (contains(this.player, outpost.map)) this.journey.findMap();

        const inChamber = this.player.x >= chamber.startX;
        this.currentScreen = inChamber ? 'chamber' : 'outpost';
        if (inChamber && !wasInChamber) {
            this.chamberEntryCheckpoint = this.player;
            this.chamberCheckpoint = this.player;
            this.inMachineZone = false;
            this.replay.begin(this.player);
        } else if (inChamber) {
            if (!this.inMachineZone && this.player.x >= chamber.machineStartX) {
                this.inMachineZone = true;
                this.chamberCheckpoint = this.player;
                this.replay.clear();
                this.replay.startCheckpointRun(this.player);
            } else {
                this.replay.record(this.player);
            }
        } else if (wasInChamber) {
            this.chamberEntryCheckpoint = undefined;
            this.chamberCheckpoint = undefined;
            this.inMachineZone = false;
            this.machine.reset(true);
            this.replay.clear();
            this.replay.begin(this.player);
        }

        if (inChamber) {
            this.machine.step(this.player, this.replay.pose);
        }
        if (contains(this.player, chamber.gateway) && this.journey.canDepart) {
            this.currentScreen = 'complete';
        }
    }

    private move(horizontal: number, vertical: number, gateOpen: boolean): void {
        if (!horizontal && !vertical) return;
        const stride = STEP_DISTANCE / Math.hypot(horizontal, vertical);
        const facing = Math.abs(horizontal) >= Math.abs(vertical)
            ? (horizontal < 0 ? 'left' : 'right')
            : (vertical < 0 ? 'up' : 'down');
        const { floor, outpost, chamber } = this.layout;
        const canMove = (point: Point) => contains(point, floor, -BODY)
            && !outpost.walls.some((wall) => contains(point, wall, BODY))
            && !chamber.walls.some((wall) => contains(point, wall, BODY))
            && (gateOpen || !contains(point, chamber.gate, BODY));
        const xStep = { x: this.player.x + horizontal * stride, y: this.player.y };
        const x = canMove(xStep) ? xStep.x : this.player.x;
        const yStep = { x, y: this.player.y + vertical * stride };
        this.player = { x, y: canMove(yStep) ? yStep.y : this.player.y, facing };
    }

    private resetRoom(fullChamberReset: boolean): void {
        this.bridgeTicks = 0;
        this.bridgeOccupied = false;
        this.gateOccupied = false;
        this.fellInRift = false;
        const checkpoint = fullChamberReset ? this.chamberEntryCheckpoint : this.chamberCheckpoint;
        this.player = checkpoint ?? this.layout.outpost.spawn;
        this.replay.begin(this.player);
    }
}

export type HermesState = HermesSimulation['state'];
