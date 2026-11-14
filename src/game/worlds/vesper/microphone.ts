import { HumDetector } from '../../input/hum-detector.ts';

type MicrophoneStatus = 'off' | 'requesting' | 'calibrating' | 'ready' | 'denied' | 'unavailable';

export class VesperMicrophone {
    status: MicrophoneStatus = 'off';
    level = 0;
    private request = 0;
    private stream?: MediaStream;
    private context?: AudioContext;
    private analyser?: AnalyserNode;
    private samples = new Float32Array(1024);
    private detector = new HumDetector();
    private peak = 0;
    private cannonQuietMs = 100;
    private cannonNoisePeak = 0;

    async enable(): Promise<void> {
        this.disable();
        const request = this.request;
        if (!navigator.mediaDevices?.getUserMedia || !window.AudioContext) {
            this.status = 'unavailable';
            return;
        }

        this.status = 'requesting';
        try {
            // Start Web Audio inside the click gesture for browsers with autoplay restrictions.
            const context = new AudioContext();
            this.context = context;
            const resumed = context.resume().then(() => true, () => false);
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { autoGainControl: false, noiseSuppression: false },
            });
            if (request !== this.request) {
                stream.getTracks().forEach((track) => track.stop());
                return;
            }

            this.stream = stream;
            for (const track of stream.getAudioTracks()) {
                track.addEventListener('ended', () => {
                    if (this.stream !== stream) return;
                    this.disable();
                    this.status = 'unavailable';
                }, { once: true });
            }
            const analyser = context.createAnalyser();
            analyser.fftSize = this.samples.length;
            context.createMediaStreamSource(stream).connect(analyser);
            const audioReady = await resumed;
            if (request !== this.request) return;
            if (!audioReady) {
                this.disable();
                this.status = 'unavailable';
                return;
            }
            this.analyser = analyser;
            this.detector = new HumDetector();
            this.cannonQuietMs = 100;
            this.cannonNoisePeak = 0;
            this.status = 'calibrating';
        } catch (error) {
            if (request !== this.request) return;
            this.disable();
            this.status = error instanceof DOMException && error.name === 'NotAllowedError'
                ? 'denied' : 'unavailable';
        }
    }

    pollCannon(delta: number): boolean {
        if (!this.sample()) return false;
        const sampleMs = Math.min(delta, 50);
        if (this.detector.calibrating) {
            this.detector.update(this.level, sampleMs, false);
            this.cannonNoisePeak += (this.peak - this.cannonNoisePeak) * 0.14;
            this.status = this.detector.calibrating ? 'calibrating' : 'ready';
            return false;
        }
        const noise = this.detector.noiseLevel;
        const quiet = this.level < Math.max(0.007, noise * 1.5, noise + 0.003)
            && this.peak < Math.max(0.016, this.cannonNoisePeak * 1.7);
        if (quiet) {
            this.cannonQuietMs = Math.min(100, this.cannonQuietMs + sampleMs);
            return false;
        }
        const triggered = this.cannonQuietMs >= 75 && (
            this.peak >= Math.max(0.024, this.cannonNoisePeak * 2.1)
            || this.level >= Math.max(0.013, noise * 2.2, noise + 0.008)
        );
        this.cannonQuietMs = 0;
        return triggered;
    }

    private sample(): boolean {
        if (!this.analyser) return false;
        this.analyser.getFloatTimeDomainData(this.samples);
        let energy = 0;
        this.peak = 0;
        for (const sample of this.samples) {
            energy += sample * sample;
            this.peak = Math.max(this.peak, Math.abs(sample));
        }
        this.level = Math.sqrt(energy / this.samples.length);
        return true;
    }

    disable(): void {
        this.request += 1;
        this.stream?.getTracks().forEach((track) => track.stop());
        if (this.context && this.context.state !== 'closed') void this.context.close().catch(() => {});
        this.stream = undefined;
        this.context = undefined;
        this.analyser = undefined;
        this.level = 0;
        this.peak = 0;
        this.status = 'off';
    }
}
