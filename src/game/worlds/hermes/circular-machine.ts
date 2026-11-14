import { contains } from './room.ts';
import type { Point, Rect } from './room.ts';

export const SYMBOL_COUNT = 3;
export const TICKS_PER_SYMBOL = 60;
export const PILLAR_CYCLE_TICKS = SYMBOL_COUNT * TICKS_PER_SYMBOL;

export interface CircularMachineConfig {
    readonly center: Point;
    readonly radius: number;
    readonly control: Rect;
    readonly pillar: Rect;
    readonly symbols: readonly [Rect, Rect, Rect];
}

export interface CircularMachineState {
    readonly controlHeld: boolean;
    readonly pillarAngle: number;
    readonly shadowSymbol: number | undefined;
    readonly alignedSymbols: number;
    readonly constellations: number;
    readonly completed: boolean;
}

/**
 * Single Responsibility (SRP): Encapsulates the ancient circular machine puzzle.
 * - Holding the rotation control (by Kobi or the Shadow Echo) rotates the stone pillar.
 * - The pillar casts a rotating shadow across the three symbols in sequence.
 * - Illuminating the three symbols in order (0 -> 1 -> 2) projects three constellations.
 */
export class CircularMachinePuzzle {
    private readonly config: CircularMachineConfig;
    private readonly onComplete?: () => void;
    private rotationTicks = 0;
    private alignedCount = 0;

    constructor(config: CircularMachineConfig, onComplete?: () => void) {
        this.config = config;
        this.onComplete = onComplete;
    }

    get completed(): boolean {
        return this.alignedCount >= SYMBOL_COUNT;
    }

    isControlHeld(player: Point, echo: Point | undefined): boolean {
        const { control } = this.config;
        return contains(player, control) || (echo !== undefined && contains(echo, control));
    }

    step(player: Point, echo: Point | undefined): void {
        const held = this.isControlHeld(player, echo);
        if (held) {
            this.rotationTicks = (this.rotationTicks + 1) % PILLAR_CYCLE_TICKS;
        }

        if (this.completed) return;

        const shadowSymbol = this.getShadowSymbol(held);
        if (shadowSymbol === undefined) return;

        const symbolRect = this.config.symbols[shadowSymbol];
        const occupied = contains(player, symbolRect) || (echo !== undefined && contains(echo, symbolRect));
        if (!occupied) return;

        if (shadowSymbol === this.alignedCount) {
            this.alignedCount += 1;
            if (this.completed) {
                this.onComplete?.();
            }
        } else if (shadowSymbol > this.alignedCount) {
            this.alignedCount = 0;
        }
    }

    reset(preserveCompleted = true): void {
        this.rotationTicks = 0;
        if (!preserveCompleted || !this.completed) {
            this.alignedCount = 0;
        }
    }

    getState(player: Point, echo: Point | undefined): CircularMachineState {
        const controlHeld = this.isControlHeld(player, echo);
        return {
            controlHeld,
            pillarAngle: (this.rotationTicks / PILLAR_CYCLE_TICKS) * Math.PI * 2 - Math.PI / 2,
            shadowSymbol: this.getShadowSymbol(controlHeld),
            alignedSymbols: this.alignedCount,
            constellations: this.alignedCount,
            completed: this.completed,
        };
    }

    private getShadowSymbol(controlHeld: boolean): number | undefined {
        if (!controlHeld && !this.completed) return undefined;
        return Math.floor(this.rotationTicks / TICKS_PER_SYMBOL) % SYMBOL_COUNT;
    }
}
