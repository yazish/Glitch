import type { MicrophoneStatus } from '../input/microphone';
import { STONE_SEQUENCE } from '../worlds/viridia/layout';
import { viridiaObjectives } from '../worlds/viridia/objectives';
import type { ViridiaState } from '../worlds/viridia/simulation';

const micMessages: Record<MicrophoneStatus, string> = {
    off: 'Enable the microphone or use Space.',
    requesting: 'Waiting for microphone permission.',
    calibrating: 'Stay quiet while the microphone calibrates.',
    ready: 'Microphone ready. Follow the sound prompt.',
    denied: 'Microphone access blocked. Use Space.',
    unavailable: 'Microphone unavailable. Use Space.',
};

export class ViridiaHud {
    private readonly objective = document.querySelector<HTMLElement>('#objective')!;
    private readonly checkmark = document.querySelector<HTMLElement>('#objective-completed')!;
    private readonly location = document.querySelector<HTMLElement>('#location')!;
    private readonly route = document.querySelector<HTMLElement>('#route')!;
    private readonly slots = Array.from(document.querySelectorAll('#waymarks li'));
    private readonly micPanel = document.querySelector<HTMLElement>('#microphone')!;
    private readonly micText = document.querySelector<HTMLElement>('#mic-status')!;
    private readonly meter = document.querySelector<HTMLMeterElement>('#mic-level')!;
    private readonly micButton = document.querySelector<HTMLButtonElement>('#mic-toggle')!;
    private activeId?: string;
    private checkTime = 0;

    constructor() {
        this.checkmark.hidden = true;
        document.querySelector<HTMLElement>('#game-hud .controls')!.hidden = true;
        document.querySelector<HTMLElement>('#how-to-play')!.hidden = true;
        document.querySelector<HTMLElement>('#star-map')!.hidden = false;
    }

    render(state: ViridiaState, status: MicrophoneStatus, level: number, delta: number): void {
        const next = viridiaObjectives.find((entry) => !entry.done(state));
        if (this.activeId !== next?.id) {
            const previous = viridiaObjectives.find((entry) => entry.id === this.activeId);
            if (previous?.done(state)) {
                this.checkmark.textContent = '✓ ' + previous.text;
                this.checkTime = 900;
            }
            this.activeId = next?.id;
        }
        this.checkTime = Math.max(0, this.checkTime - delta);
        this.checkmark.hidden = this.checkTime === 0;
        const prompt = state.recordingFull && state.treeAwake && !state.collected
            ? 'Recording full. Press Esc to restart this attempt.'
            : next?.text ?? 'Viridia complete. Two Waymarks recovered.';
        this.setText(this.objective, this.checkTime > 0 && !state.finished ? '' : prompt);
        this.setText(this.location, 'Viridia · ' + state.areaName);
        const sequence = state.discoveredTree ? ' · ' + STONE_SEQUENCE
            .map((stone, index) => (index < state.stoneIndex ? '✓ ' : '') + stone[0].toUpperCase() + stone.slice(1)).join(' → ') : '';
        this.setText(this.route, `${state.waymarks} of 6 · Current world: Viridia${sequence}`);
        this.slots.forEach((slot, index) => slot.classList.toggle('filled', index < state.waymarks));
        this.micPanel.hidden = state.treeAwake || state.finished;
        this.setText(this.micText, micMessages[status]);
        const active = ['ready', 'calibrating', 'requesting'].includes(status);
        this.setText(this.micButton, active ? 'Disable microphone' : 'Enable microphone');
        this.meter.value = Math.min(1, level * 8);
    }

    private setText(element: HTMLElement, value: string): void {
        if (element.textContent !== value) element.textContent = value;
    }
}
