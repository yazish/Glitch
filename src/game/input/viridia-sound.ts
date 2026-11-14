import type { SoundInput } from './commands.ts';

const SOFT_RMS_FLOOR = 0.006;
const LOUD_RMS_FLOOR = 0.055;
const SOFT_MIN_MS = 55;
const SOFT_MAX_MS = 450;
const QUIET_REARM_MS = 150;

export class ViridiaSoundDetector {
    private quietMs = QUIET_REARM_MS;
    private duration = 0;
    private loud = false;
    private armed = true;
    private armedOnset = false;

    update(level: number, noise: number, delta: number): SoundInput {
        const audible = Math.max(SOFT_RMS_FLOOR, noise * 1.65, noise + 0.003);
        const peak = Math.max(LOUD_RMS_FLOOR, noise * 3, audible * 2);
        if (level < audible) {
            const soft = this.armedOnset && !this.loud && this.duration >= SOFT_MIN_MS && this.duration <= SOFT_MAX_MS;
            this.duration = 0;
            this.loud = false;
            this.armedOnset = false;
            this.quietMs += delta;
            if (this.quietMs >= QUIET_REARM_MS) this.armed = true;
            return { pulse: soft ? 'soft' : undefined, sustained: false };
        }

        if (this.duration === 0) this.armedOnset = this.armed;
        this.quietMs = 0;
        this.duration += delta;
        const loud = this.armedOnset && !this.loud && level >= peak && this.duration <= 100;
        this.loud ||= loud || level >= peak;
        this.armed = false;
        return { pulse: loud ? 'loud' : undefined, sustained: !this.loud };
    }
}
