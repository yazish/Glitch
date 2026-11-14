import type { VesperState } from '../worlds/vesper/simulation';

// Edit these lines to change Kael's contextual tutorial dialogue.
const LINES = {
    gear: 'Kael: I can pick these up with E.',
    shoot: 'Kael: Hold K to fire the shotgun.',
    melee: 'Kael: L will strike enemies up close.',
    shield: 'Kael: Hold F to raise my shield.',
    cannon: 'Kael: B fires the resonance cannon.',
} as const;

export function vesperTutorial(state: VesperState): { id: string; text: string } | undefined {
    if (state.mode === 'gear') return { id: 'gear', text: LINES.gear };
    if (state.mode === 'wave' && state.area === 'street') {
        const key = state.wave === 0 ? 'shoot' : state.wave === 1 ? 'melee' : 'shield';
        return { id: key, text: LINES[key] };
    }
    if (state.mode === 'barrier') return { id: 'cannon', text: LINES.cannon };
}
