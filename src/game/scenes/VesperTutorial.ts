import type { VesperState } from '../worlds/vesper/simulation';

const LINES = {
    gear: 'Press E to pick up the weapons.',
    shoot: 'Hold K to fire the shotgun.',
    melee: 'Press L to strike enemies up close.',
    shield: 'Hold F to raise your shield.',
    cannon: 'Enable the microphone, then snap or clap to fire the resonance cannon.',
} as const;

export function vesperTutorial(state: VesperState): { id: string; text: string } | undefined {
    if (state.mode === 'gear') return { id: 'gear', text: LINES.gear };
    if (state.mode === 'wave' && state.area === 'street') {
        const key = state.wave === 0 ? 'shoot' : state.wave === 1 ? 'melee' : 'shield';
        return { id: key, text: LINES[key] };
    }
    if (state.mode === 'barrier') return { id: 'cannon', text: LINES.cannon };
}
