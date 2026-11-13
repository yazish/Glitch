import type { Pose } from './room.ts';

const MAX_TICKS = 60 * 60 * 5;

export class EchoReplay {
    private run: Pose[] = [];
    private saved: readonly Pose[] = [];
    private tick = 0;

    begin(pose: Pose): void {
        this.run = [pose];
        this.tick = 0;
    }

    record(pose: Pose): void {
        this.tick += 1;
        if (this.run.length <= MAX_TICKS) this.run.push(pose);
    }

    rewind(): boolean {
        if (this.run.length < 2 || this.recordingFull) return false;
        this.saved = this.run;
        return true;
    }

    clear(): void {
        this.saved = [];
    }

    get pose(): Pose | undefined {
        return this.saved[Math.min(this.tick, this.saved.length - 1)];
    }

    get recordingFull(): boolean {
        return this.tick > MAX_TICKS;
    }
}
