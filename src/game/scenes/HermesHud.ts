import { WAYMARK_TOTAL } from '../worlds/journey';
import { WaymarkHud } from './WaymarkHud';
import type { HermesState } from '../worlds/hermes/simulation';
import type { MicrophoneStatus } from '../input/microphone';

const micMessages: Record<MicrophoneStatus, string> = {
    off: 'Enable the microphone to hum at the bridge receiver.',
    requesting: 'Waiting for microphone permission.',
    calibrating: 'Calibrating. Stay quiet for a moment.',
    ready: 'Microphone ready. Hum near the bridge.',
    denied: 'Allow microphone access in your browser and try again.',
    unavailable: 'Connect a microphone and try again.',
};

function objective(state: HermesState): string {
    if (state.screen === 'complete') return 'Hermes complete. Next destination: Viridia.';
    if (state.screen === 'outpost') {
        if (state.riftFallProgress !== undefined) return 'Falling into the rift…';
        if (state.fellInRift) return 'You fell into the rift! Cross only on the extended bridge.';
        if (!state.hasMap) return 'Find the star compass on the transit platform.';
        if (state.bridgePermanent) return 'Bridge secured. Head right to the anchor chamber.';
        if (state.bridgeOpen) return 'Bridge extended. Stay on the bridge to cross to the anchor chamber.';
        if (state.canActivateBridge) return 'Hum steadily near the receiver to extend the bridge.';
        return `Home signal detected. Collect ${WAYMARK_TOTAL} Waymarks. Find the SING!!! cue near the bridge.`;
    }
    if (state.canDepart) return 'Constellation route revealed! Next destination: Viridia. Enter the gateway.';
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
    private readonly completed = document.querySelector<HTMLElement>('#objective-completed')!;
    private readonly map = document.querySelector<HTMLElement>('#star-map')!;
    private readonly waymarks = new WaymarkHud();
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
        const detail = state.canDepart
            ? 'Constellation route complete · Next destination: Viridia'
            : `Constellations: ${state.constellations}/3`;
        this.waymarks.render(state.waymarks, detail);

        this.micPanel.hidden = state.screen !== 'outpost' || state.bridgePermanent;
        const micMessage = micMessages[status];
        if (this.micText.textContent !== micMessage) this.micText.textContent = micMessage;
        const enabled = status === 'ready' || status === 'calibrating' || status === 'requesting';
        const button = enabled ? 'Disable microphone' : 'Enable microphone';
        if (this.micButton.textContent !== button) this.micButton.textContent = button;
        this.meter.value = Math.min(1, level * 8);
    }
}
