import type { WorldId } from '../worlds/journey';

type Control = Readonly<{ input: string | readonly string[]; action: string }>;

const move = { input: ['WASD', 'Arrow keys'], action: 'Move' };
const rewind = { input: ['R'], action: 'Rewind and leave an Echo' };
const interact = { input: ['E'], action: 'Interact' };
const restart = { input: ['Esc'], action: 'Restart room' };

// Arrays list keyboard or mouse alternatives. Plain labels describe sound inputs.
const controls: Record<WorldId | 'vesper', readonly Control[]> = {
    hermes: [
        move,
        { input: 'Steady hum', action: 'Extend bridge' },
        { ...rewind, action: 'Rewind and leave an Echo (chamber)' },
        restart,
    ],
    viridia: [
        move,
        interact,
        { input: 'Short, soft sound', action: 'Awaken flowers and Bloom Stone' },
        { input: 'Loud burst', action: 'Break roots' },
        { input: 'Steady hum', action: 'Retract vines or charge Resonance Stone' },
        rewind,
        restart,
    ],
    borealis: [
        move,
        interact,
        { input: ['F'], action: 'Reverse wind at vane' },
        { input: 'Short, soft sound', action: 'Reveal ice etching' },
        rewind,
        restart,
    ],
    vesper: [
        { ...move, action: 'Move and face' },
        { input: ['Hold K'], action: 'Fire shotgun' },
        { input: ['L'], action: 'Melee attack' },
        { input: ['Hold F', 'Hold right-click'], action: 'Raise shield' },
        interact,
        { input: 'Snap or clap', action: 'Fire resonance cannon' },
        { input: ['Esc'], action: 'Retry encounter' },
    ],
};

export function showControls(world: keyof typeof controls): void {
    const panel = document.querySelector<HTMLDetailsElement>('#controls-help')!;
    const list = panel.querySelector<HTMLDListElement>('.controls-list')!;
    panel.open = false;
    list.replaceChildren(...controls[world].map(({ input, action }) => {
        const row = document.createElement('div');
        const term = document.createElement('dt');
        if (typeof input === 'string') {
            term.textContent = input;
        } else {
            input.forEach((label, index) => {
                if (index > 0) term.append(' or ');
                const key = document.createElement('kbd');
                key.textContent = label;
                term.append(key);
            });
        }
        const description = document.createElement('dd');
        description.textContent = action;
        row.append(term, description);
        return row;
    }));
}
