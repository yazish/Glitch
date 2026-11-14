import type { Pose } from './room.ts';

const MAX_TICKS = 60 * 60 * 5;

/**
 * Single Responsibility (SRP): Records Kobe's current run and replays one
 * Shadow Echo from the active checkpoint.
 * - Ignores zero-tick accidental R presses (`run.length < 2`).
 * - A new rewind cleanly replaces the previous Echo.
 */
export class EchoReplay {
    private run: Pose[] = [];
    private saved: readonly Pose[] = [];
    private tick = 0;

    begin(pose: Pose): void {
        this.run = [pose];
        this.tick = 0;
    }

    startCheckpointRun(pose: Pose): void {
        this.run = [pose];
    }

    record(pose: Pose): void {
        this.tick += 1;
        if (this.run.length <= MAX_TICKS) this.run.push(pose);
    }

    rewind(): boolean {
        if (this.run.length < 2 || this.recordingFull) return false;
        this.saved = this.run;
        this.tick = 0;
        return true;
    }

    clear(): void {
        this.saved = [];
        this.tick = 0;
    }

    get pose(): Pose | undefined {
        if (this.saved.length === 0) return undefined;
        return this.saved[Math.min(this.tick, this.saved.length - 1)];
    }

    get recordingFull(): boolean {
        return this.run.length > MAX_TICKS;
    }
}
