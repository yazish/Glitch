import { HumDetector } from './hum-detector.ts';
import type { SoundInput } from './commands.ts';
import { ViridiaSoundDetector } from './viridia-sound.ts';

export type MicrophoneStatus = 'off' | 'requesting' | 'calibrating' | 'ready' | 'denied' | 'unavailable';

export class Microphone {
    status: MicrophoneStatus = 'off';
    level = 0;
    private request = 0;
    private stream?: MediaStream;
    private context?: AudioContext;
    private analyser?: AnalyserNode;
    private samples = new Float32Array(1024);
    private detector = new HumDetector();
    private viridiaDetector = new ViridiaSoundDetector();

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
            this.viridiaDetector = new ViridiaSoundDetector();
            this.status = 'calibrating';
        } catch (error) {
            if (request !== this.request) return;
            this.disable();
            this.status = error instanceof DOMException && error.name === 'NotAllowedError'
                ? 'denied' : 'unavailable';
        }
    }

    pollHum(delta: number, nearReceiver: boolean): boolean {
        if (!this.sample()) return false;
        const activated = this.detector.update(this.level, Math.min(delta, 50), nearReceiver);
        this.status = this.detector.calibrating ? 'calibrating' : 'ready';
        return activated;
    }

    pollSound(delta: number): SoundInput {
        if (!this.sample()) return { sustained: false };
        const sampleMs = Math.min(delta, 50);
        if (this.detector.calibrating) {
            this.detector.update(this.level, sampleMs, false);
            this.status = this.detector.calibrating ? 'calibrating' : 'ready';
            return { sustained: false };
        }
        return this.viridiaDetector.update(this.level, this.detector.noiseLevel, sampleMs);
    }

    private sample(): boolean {
        if (!this.analyser) return false;
        this.analyser.getFloatTimeDomainData(this.samples);
        let energy = 0;
        for (const sample of this.samples) energy += sample * sample;
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
        this.status = 'off';
    }
}
