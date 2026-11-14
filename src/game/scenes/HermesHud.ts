import type { HermesState } from '../worlds/hermes/simulation';
import type { MicrophoneStatus } from '../input/microphone';

const micMessages: Record<MicrophoneStatus, string> = {
    off: 'Microphone off. Space activates the bridge.',
    requesting: 'Waiting for microphone permission.',
    calibrating: 'Calibrating. Stay quiet for a moment.',
    ready: 'Microphone ready. Hum near the bridge.',
    denied: 'Microphone access blocked. Use Space.',
    unavailable: 'Microphone unavailable. Use Space.',
};

function objective(state: HermesState): string {
    if (state.screen === 'complete') return 'Hermes complete. Next destination: Demeter.';
    if (state.screen === 'outpost') {
        if (state.fellInRift) return 'You fell into the rift! Cross only on the extended bridge.';
        if (!state.hasMap) return 'Find the star compass on the transit platform.';
        if (state.bridgePermanent) return 'Bridge secured. Head right to the anchor chamber.';
        if (state.bridgeOpen) return 'Bridge extended. Stay on the bridge to cross to the anchor chamber.';
        if (state.canActivateBridge) return 'Hum or press Space to extend the bridge.';
        return 'Home signal detected. Six Waymarks needed. Find the SING!!! cue near the bridge.';
    }
    if (state.canDepart) return 'Constellation route revealed! Next destination: Demeter. Enter the gateway.';
    if (state.recordingFull) return 'Recording limit reached. Press Esc to restart the chamber.';
    if (state.controlHeld && !state.echo) {
        return 'Pillar rotating. Press R to rewind so your Echo holds the rotation control.';
    }
    if (state.echo && state.controlHeld) {
        const nextSymbol = state.alignedSymbols + 1;
        return `Echo holding pillar control (${state.constellations}/3 constellations). Step onto Symbol ${nextSymbol} when the shadow aligns.`;
    }
    if (state.player.x >= 992) {
        return `Stand on the pillar control and press R so your Echo rotates the shadow across Symbols I, II, and III (${state.constellations}/3 constellations).`;
    }
    if (state.plateHeld && !state.echo) return 'Press R while you are on the pressure plate.';
    if (state.echo && state.plateHeld) return 'Cross the gate while your Echo holds the plate.';
    if (state.echo) return 'Watch your Echo reach its target. Esc clears the Echo.';
    return 'Stand on the pressure plate, then press R to rewind.';
}

export class HermesHud {
    private readonly objective = document.querySelector<HTMLElement>('#objective')!;
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
        this.map.hidden = !state.hasMap;
        const route = state.canDepart
            ? '1 of 6 · Constellation route complete · Next destination: Demeter'
            : `0 of 6 · Current world: Hermes · Constellations: ${state.constellations}/3`;
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
