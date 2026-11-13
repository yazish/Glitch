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
        caption: 'Kobe had made this crossing a dozen times. Home was one gate away.',
        description: 'Kobe sits at a transit terminal beside a window overlooking a planet.',
        placeholder: crossing,
        motion: 'drift',
    },
    {
        id: 'signal-changes',
        caption: 'Then the coordinates changed.',
        description: 'Kobe looks up as the coordinates on the terminal change.',
        placeholder: signal,
        motion: 'glow',
    },
    {
        id: 'malfunction',
        caption: 'The gate opened before Kobe could shut it down.',
        description: 'A violet gateway flares in a dark room as Kobe stands in front of it.',
        placeholder: malfunction,
        motion: 'glow',
    },
    {
        id: 'hermes',
        caption: 'The gate was gone. A light still burned in the outpost.',
        description: 'Kobe stands on a sand-covered platform. The portal fades behind them and an outpost glows to the right.',
        placeholder: arrival,
        motion: 'fade',
    },
];
