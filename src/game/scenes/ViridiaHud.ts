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
    private readonly compassSteps: readonly HTMLLIElement[];
    private activeId?: string;
    private stoneIndex = -1;
    private checkTime = 0;

    constructor() {
        this.checkmark.hidden = true;
        const clue = document.querySelector<HTMLOListElement>('#viridia-compass-clue')!;
        this.compassSteps = STONE_SEQUENCE.map((stone, index) => {
            const item = document.createElement('li');
            item.textContent = `${index + 1}${stone[0].toUpperCase()}`;
            if (index > 0) {
                const separator = document.createElement('span');
                separator.setAttribute('aria-hidden', 'true');
                separator.textContent = '· ';
                item.prepend(separator);
            }
            return item;
        });
        clue.replaceChildren(...this.compassSteps);
        clue.hidden = false;
        document.querySelector<HTMLElement>('#viridia-compass')!.hidden = false;
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
        this.setText(this.route, `${state.waymarks} of 5 · Current world: Viridia`);
        if (this.stoneIndex !== state.stoneIndex) {
            this.stoneIndex = state.stoneIndex;
            this.compassSteps.forEach((step, index) => {
                const solved = index < state.stoneIndex;
                step.classList.toggle('solved', solved);
                step.setAttribute('aria-label', `${index + 1} ${STONE_SEQUENCE[index]}${solved ? ', complete' : ''}`);
            });
        }
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
