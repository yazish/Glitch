import { WaymarkHud } from './WaymarkHud';
import type { MicrophoneStatus } from '../input/microphone';
import type { BorealisLayout } from '../worlds/borealis/layout';
import { currentBorealisObjective } from '../worlds/borealis/objectives';
import type { BorealisState } from '../worlds/borealis/simulation';

const micMessages: Record<MicrophoneStatus, string> = {
    off: 'Enable the microphone to reveal the ice etching.',
    requesting: 'Waiting for microphone permission.',
    calibrating: 'Stay quiet while the microphone calibrates.',
    ready: 'Make a short, soft sound near the resonant ice.',
    denied: 'Allow microphone access in your browser and try again.',
    unavailable: 'Connect a microphone and try again.',
};

export class BorealisHud {
    private readonly location = document.querySelector<HTMLElement>('#location')!;
    private readonly objective = document.querySelector<HTMLElement>('#objective')!;
    private readonly checkmark = document.querySelector<HTMLElement>('#objective-completed')!;
    private readonly compass = document.querySelector<HTMLElement>('#borealis-compass-direction')!;
    private readonly compassPanel = document.querySelector<HTMLElement>('#viridia-compass')!;
    private readonly waymarks = new WaymarkHud();
    private readonly micPanel = document.querySelector<HTMLElement>('#microphone')!;
    private readonly micText = document.querySelector<HTMLElement>('#mic-status')!;
    private readonly meter = document.querySelector<HTMLMeterElement>('#mic-level')!;
    private readonly micButton = document.querySelector<HTMLButtonElement>('#mic-toggle')!;
    private active?: ReturnType<typeof currentBorealisObjective>;
    private checkTime = 0;

    constructor(private readonly layout: BorealisLayout) {
        this.checkmark.hidden = true;
        const clue = document.querySelector<HTMLOListElement>('#viridia-compass-clue')!;
        clue.hidden = true;
        document.querySelector<HTMLElement>('#hermes-help')!.hidden = true;
        document.querySelector<HTMLElement>('#star-map')!.hidden = false;
        this.compassPanel.hidden = false;
        this.compass.hidden = false;
    }

    render(state: BorealisState, mic: MicrophoneStatus, level: number, delta: number): void {
        const objective = currentBorealisObjective(state);
        if (objective !== this.active && this.active?.done(state)) {
            this.setText(this.checkmark, '✓ ' + this.active.text);
            this.checkTime = 900;
        }
        this.active = objective;
        this.checkTime = Math.max(0, this.checkTime - delta);
        this.checkmark.hidden = this.checkTime === 0;
        this.setText(this.objective, state.finished ? 'Borealis complete. The portal leads to Vesper.'
            : this.checkTime > 0 ? '' : objective?.text ?? '');
        this.setText(this.location, 'Borealis · ' + state.areaName);
        this.waymarks.render(state.waymarks, 'Borealis');

        const target = objective?.target(this.layout, state);
        this.compass.hidden = !target;
        if (target) {
            const dx = target.x - state.player.x;
            const dy = target.y - state.player.y;
            const direction = Math.hypot(dx, dy) <= 34 ? '• Nearby'
                : Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? '← West' : '→ East')
                    : dy < 0 ? '↑ North' : '↓ South';
            this.setText(this.compass, direction);
        }

        this.micPanel.hidden = !state.needsMicrophone;
        if (state.needsMicrophone) {
            this.setText(this.micText, micMessages[mic]);
            const active = mic === 'ready' || mic === 'calibrating' || mic === 'requesting';
            this.setText(this.micButton, active ? 'Disable microphone' : 'Enable microphone');
            this.meter.value = Math.min(1, level * 8);
        }
    }

    private setText(element: HTMLElement, value: string): void {
        if (element.textContent !== value) element.textContent = value;
    }
}
