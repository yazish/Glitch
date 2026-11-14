const CALIBRATION_MS = 650;
const HUM_MS = 250;
const REARM_MS = 150;

export class HumDetector {
    private calibrationMs = 0;
    private noiseSum = 0;
    private soundMs = 0;
    private quietMs = 0;
    private latched = false;

    get calibrating(): boolean {
        return this.calibrationMs < CALIBRATION_MS;
    }

    get noiseLevel(): number {
        return this.calibrationMs ? this.noiseSum / this.calibrationMs : 0;
    }

    update(level: number, delta: number, nearReceiver: boolean): boolean {
        if (this.calibrating) {
            this.calibrationMs += delta;
            this.noiseSum += level * delta;
            return false;
        }

        const noise = this.noiseLevel;
        const threshold = Math.max(0.012, noise * 2.2, noise + 0.008);
        if (level < threshold) {
            this.soundMs = 0;
            this.quietMs += delta;
            if (this.quietMs >= REARM_MS) this.latched = false;
        } else {
            this.quietMs = 0;
            this.soundMs = nearReceiver ? this.soundMs + delta : 0;
        }

        if (this.latched || this.soundMs < HUM_MS) return false;
        this.latched = true;
        return true;
    }
}
