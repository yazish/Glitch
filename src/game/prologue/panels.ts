import type { GameObjects } from 'phaser';
import { arrival, crossing, malfunction, signal } from './illustrations';

export interface ProloguePanel {
    readonly id: string;
    readonly caption: string;
    readonly description: string;
    readonly placeholder: (art: GameObjects.Graphics) => void;
    readonly image?: string;
    readonly motion?: 'drift' | 'glow' | 'fade';
}

export const prologuePanels: readonly [ProloguePanel, ...ProloguePanel[]] = [
    {
        id: 'before-crossing',
        caption: 'Kobi entered the coordinates for home. The portal was ready.',
        description: 'Kobi enters the coordinates for his homeworld at a transit console.',
        placeholder: crossing,
        image: '01-before-crossing.svg',
        motion: 'drift',
    },
    {
        id: 'signal-changes',
        caption: 'Then the coordinates glitched. The portal began to glitch with them.',
        description: 'A GLITCH warning interrupts the coordinates as the portal destabilizes.',
        placeholder: signal,
        image: '02-coordinate-shift.svg',
        motion: 'glow',
    },
    {
        id: 'malfunction',
        caption: 'Kobi stepped through the glitched portal—and landed on a different planet.',
        description: 'Kobi is pulled through a glitching portal toward an unknown world.',
        placeholder: malfunction,
        image: '03-gate-failure.svg',
        motion: 'glow',
    },
    {
        id: 'hermes',
        caption: 'Somewhere on this planet was the first clue to finding his way home. Kobi had to find it.',
        description: 'Kobi arrives on an empty, unfamiliar planet with the first clue ahead.',
        placeholder: arrival,
        image: '04-hermes-arrival.svg',
        motion: 'fade',
    },
];
