import type { Pose } from './geometry.ts';

type RecordedFrame = Readonly<{ pose: Pose; walkTicks: number }>;

const MAX_TICKS = 60 * 60 * 5;

/**
 * Single Responsibility (SRP): Records Kobi's current run and replays one
 * Shadow Echo from the active checkpoint.
 * - Ignores zero-tick accidental R presses (`run.length < 2`).
 * - A new rewind cleanly replaces the previous Echo.
 */
export class EchoReplay {
    private run: RecordedFrame[] = [];
    private saved: readonly RecordedFrame[] = [];
    private tick = 0;

    begin(pose: Pose, walkTicks = 0): void {
        this.run = [{ pose, walkTicks }];
        this.tick = 0;
    }

    startCheckpointRun(pose: Pose, walkTicks: number): void {
        this.run = [{ pose, walkTicks }];
    }

    record(pose: Pose, walkTicks: number): void {
        this.tick += 1;
        if (this.run.length <= MAX_TICKS) this.run.push({ pose, walkTicks });
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

    get frame(): RecordedFrame | undefined {
        const last = this.saved[this.saved.length - 1];
        if (!last) return undefined;
        return this.saved[this.tick] ?? { pose: last.pose, walkTicks: 0 };
    }

    get recordingFull(): boolean {
        return this.run.length > MAX_TICKS;
    }
}
