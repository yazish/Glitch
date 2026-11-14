import type { HermesState } from '../worlds/hermes/simulation';
import type { MicrophoneStatus } from '../input/microphone';

const micMessages: Record<MicrophoneStatus, string> = {
    off: 'Mic off · Hum near the bridge receiver or press Space.',
    requesting: 'Waiting for microphone permission.',
    calibrating: 'Calibrating. Stay quiet for a moment.',
    ready: 'Mic ready · Hum near the bridge receiver.',
    denied: 'Microphone access blocked. Use Space.',
    unavailable: 'Microphone unavailable. Use Space.',
};

function objective(state: HermesState): string {
    if (state.screen === 'complete') return 'Hermes complete. Next destination: Demeter.';
    if (state.screen === 'outpost') {
        if (!state.hasMap) return ['Find the Star Compass.', 'Move with WASD or the arrow keys.'][0];
        if (state.bridgePermanent) return 'Go to the broken bridge.';
        if (state.bridgeOpen) return 'Cross the bridge.';
        if (state.canActivateBridge) return 'Hum near the gap to reveal the bridge, or press Space.';
        return 'Go to the broken bridge. At the gap, hum softly to reveal it (or press Space).';
    }
    if (state.canDepart) return 'Hermes restored. Next destination: Demeter. Enter the gateway.';
    if (state.canDepart) return 'Return to the gate and activate the portal.';
    if (state.waymarks) return 'Return to the gate.';
    if (state.echo && state.plateHeld) return 'Your Echo holds the plate. Go through the gate and find the Waymark.';
    if (state.echo) return 'Your Echo is replaying your movement. Let it reach the glowing plate.';
    if (state.recordingFull) return 'Recording full. Press R to rewind, or Esc to restart the room.';
    if (state.plateHeld) return 'Press R to rewind and create an Echo on the plate.';
    return 'Stand on the glowing pressure plate, then press R to rewind.';
}

export class HermesHud {
    private readonly objective = document.querySelector<HTMLElement>('#objective')!;
    private readonly completed = document.querySelector<HTMLElement>('#objective-completed')!;
    private readonly map = document.querySelector<HTMLElement>('#star-map')!;
    private readonly route = document.querySelector<HTMLElement>('#route')!;
    private readonly slots = Array.from(document.querySelectorAll<HTMLElement>('#waymarks li'));
    private readonly micPanel = document.querySelector<HTMLElement>('#microphone')!;
    private readonly micText = document.querySelector<HTMLElement>('#mic-status')!;
    private readonly meter = document.querySelector<HTMLMeterElement>('#mic-level')!;
    readonly micButton = document.querySelector<HTMLButtonElement>('#mic-toggle')!;

    render(state: HermesState, status: MicrophoneStatus, level: number): void {
        const message = objective(state);
        if (this.objective.textContent !== message) this.objective.textContent = message;
        const done = state.screen === 'outpost' && state.hasMap || state.screen === 'chamber' && state.waymarks > 0;
        this.completed.hidden = !done;
        this.completed.textContent = state.screen === 'outpost' ? '✓ Find the Star Compass' : '✓ Collect the Waymark';
        this.map.hidden = !state.hasMap;
        const route = state.canDepart ? '1 of 6 · Next destination: Demeter' : '0 of 6 · Current world: Hermes';
        if (this.route.textContent !== route) this.route.textContent = route;
        this.slots.forEach((slot, i) => slot.classList.toggle('filled', i < state.waymarks));

        this.micPanel.hidden = state.screen !== 'outpost' || state.bridgePermanent;
        const micMessage = micMessages[status];
        if (this.micText.textContent !== micMessage) this.micText.textContent = micMessage;
        const enabled = status === 'ready' || status === 'calibrating' || status === 'requesting';
        const button = enabled ? 'Disable microphone' : 'Enable microphone';
        if (this.micButton.textContent !== button) this.micButton.textContent = button;
        this.meter.value = Math.min(1, level * 8);
    }
}
