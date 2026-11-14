import { CircularMachinePuzzle } from './circular-machine.ts';
import { Journey } from '../journey.ts';
import { EchoReplay } from '../replay.ts';
import { RiftHazard } from './rift-hazard.ts';
import { contains, STEP_MS } from './room.ts';
import type { HermesLayout, Point, Pose } from './room.ts';

import type { GameCommand } from '../../input/commands.ts';
export type Screen = 'outpost' | 'chamber' | 'complete';

const BODY = 7;
const STEP_DISTANCE = 135 * STEP_MS / 1000;
const BRIDGE_TICKS = 360;
const RIFT_FALL_TICKS = 96;

export class HermesSimulation {
    private readonly journey: Journey;
    private readonly layout: HermesLayout;
    private readonly replay = new EchoReplay();
    private readonly riftHazard: RiftHazard;
    private readonly machine: CircularMachinePuzzle;
    private currentScreen: Screen = 'outpost';
    private player: Pose;
    private playerWalkTicks = 0;
    private bridgeTicks = 0;
    private bridgeOccupied = false;
    private bridgePermanent = false;
    private gateOccupied = false;
    private fellInRift = false;
    private fallTick?: number;
    private fallCount = 0;
    private chamberEntryCheckpoint?: Pose;
    private chamberCheckpoint?: Pose;
    private inMachineZone = false;

    constructor(layout: HermesLayout, journey = new Journey()) {
        this.journey = journey;
        this.layout = layout;
        this.player = layout.outpost.spawn;
        this.riftHazard = new RiftHazard(layout.outpost);
        this.machine = new CircularMachinePuzzle(layout.chamber.machine, () => {
            this.journey.collectWaymark('hermes');
        });
    }

    get canActivateBridge(): boolean {
        return this.currentScreen === 'outpost' && this.journey.hasMap
            && this.fallTick === undefined && !this.bridgeOpen && contains(this.player, this.layout.outpost.receiver);
    }

    private get bridgeOpen(): boolean {
        return this.bridgePermanent || this.bridgeTicks > 0 || this.bridgeOccupied;
    }

    private get plateHeld(): boolean {
        const plate = this.layout.chamber.plate;
        const echo = this.replay.frame?.pose;
        return contains(this.player, plate) || (echo !== undefined && contains(echo, plate));
    }

    private get gateOpen(): boolean {
        return this.journey.hasWaymark('hermes') || this.plateHeld || this.gateOccupied;
    }

    get state() {
        const echoFrame = this.currentScreen === 'chamber' ? this.replay.frame : undefined;
        const echo = echoFrame?.pose;
        const machine = this.machine.getState(this.player, echo);
        return {
            screen: this.currentScreen,
            player: this.player,
            playerWalkTicks: this.playerWalkTicks,
            echo,
            echoWalkTicks: echoFrame?.walkTicks ?? 0,
            plateHeld: this.currentScreen === 'chamber' && this.plateHeld,
            gateOpen: this.gateOpen,
            bridgeOpen: this.bridgeOpen,
            bridgePermanent: this.bridgePermanent,
            canActivateBridge: this.canActivateBridge,
            fellInRift: this.fellInRift,
            riftFallProgress: this.fallTick === undefined ? undefined : this.fallTick / RIFT_FALL_TICKS,
            fallCount: this.fallCount,
            machine,
            controlHeld: this.currentScreen === 'chamber' && machine.controlHeld,
            shadowSymbol: this.currentScreen === 'chamber' ? machine.shadowSymbol : undefined,
            alignedSymbols: machine.alignedSymbols,
            constellations: machine.constellations,
            hasMap: this.journey.hasMap,
            waymarks: this.journey.waymarkCount,
            canDepart: this.journey.hasWaymark('hermes'),
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
                if (this.currentScreen === 'chamber' && !this.journey.hasWaymark('hermes') && this.replay.rewind()) {
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
        if (this.fallTick !== undefined) {
            this.fallTick += 1;
            if (this.fallTick >= RIFT_FALL_TICKS) this.respawnAfterFall();
            return;
        }

        const { outpost, chamber } = this.layout;
        const wasInChamber = this.currentScreen === 'chamber';
        const bridgeWasOpen = this.bridgeOpen;
        const gateWasOpen = this.gateOpen;
        const previous = this.player;
        this.move(horizontal, vertical, gateWasOpen);
        const moved = previous.x !== this.player.x || previous.y !== this.player.y;
        this.playerWalkTicks = moved ? this.playerWalkTicks + 1 : 0;

        this.bridgeTicks = Math.max(0, this.bridgeTicks - 1);
        this.bridgeOccupied = this.riftHazard.isBridgeOccupied(this.player, bridgeWasOpen, BODY);
        if (this.riftHazard.hasCrossedBridge(this.player, bridgeWasOpen, BODY)) {
            this.bridgePermanent = true;
        }

        if (this.riftHazard.didFallOffMap(this.player, this.bridgeOpen, BODY)) {
            this.fallTick = 0;
            this.fallCount += 1;
            this.playerWalkTicks = 0;
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
            this.replay.begin(this.player, this.playerWalkTicks);
        } else if (inChamber) {
            if (!this.inMachineZone && this.player.x >= chamber.machineStartX) {
                this.inMachineZone = true;
                this.chamberCheckpoint = this.player;
                this.replay.clear();
                this.replay.startCheckpointRun(this.player, this.playerWalkTicks);
            } else {
                this.replay.record(this.player, this.playerWalkTicks);
            }
        } else if (wasInChamber) {
            this.chamberEntryCheckpoint = undefined;
            this.chamberCheckpoint = undefined;
            this.inMachineZone = false;
            this.machine.reset(true);
            this.replay.clear();
            this.replay.begin(this.player, this.playerWalkTicks);
        }

        if (inChamber) {
            this.machine.step(this.player, this.replay.frame?.pose);
        }
        if (contains(this.player, chamber.gateway) && this.journey.hasWaymark('hermes')) {
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
        this.fallTick = undefined;
        this.bridgeTicks = 0;
        this.bridgeOccupied = false;
        this.gateOccupied = false;
        this.fellInRift = false;
        const checkpoint = fullChamberReset ? this.chamberEntryCheckpoint : this.chamberCheckpoint;
        this.player = checkpoint ?? this.layout.outpost.spawn;
        this.playerWalkTicks = 0;
        this.replay.begin(this.player);
    }

    private respawnAfterFall(): void {
        this.fallTick = undefined;
        this.fellInRift = true;
        this.bridgeTicks = 0;
        this.bridgeOccupied = false;
        this.player = this.layout.outpost.spawn;
    }
}

export type HermesState = HermesSimulation['state'];
