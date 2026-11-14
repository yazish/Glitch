import type { GameObjects, Scene } from 'phaser';
import { prologuePanels } from '../prologue/panels';
import { aurora, campus, earth, gate, hermes, viridia, vesper } from './art';

interface Panel {
    readonly id: string;
    readonly caption: string;
    readonly description: string;
    readonly image?: string;
    readonly motion?: 'drift' | 'glow' | 'fade';
    readonly placeholder?: (art: GameObjects.Graphics) => void;
    readonly draw?: (scene: Scene, animate: boolean) => void;
}

interface Sequence {
    readonly title: string;
    readonly continueLabel: string;
    readonly panels: readonly [Panel, ...Panel[]];
}

export type CutsceneId = 'opening' | 'to-viridia' | 'to-borealis' | 'to-vesper' | 'ending';

export const cutscenes: Record<CutsceneId, Sequence> = {
    opening: { title: 'A glitch in the coordinates', continueLabel: 'Play', panels: prologuePanels },
    'to-viridia': {
        title: 'Hermes → Viridia', continueLabel: 'Enter Viridia', panels: [
            {
                id: 'hermes-departure', draw: hermes,
                caption: 'The first Waymark lit up the Star Compass. Kobi followed its signal through the gate.',
                description: 'Kobi stands before a gold portal beneath the planets of Hermes.',
            },
            {
                id: 'viridia-reveal', draw: viridia,
                caption: 'Under Viridia’s enormous moon, a distant pulse answered the Compass.',
                description: 'A violet moon lights the cliffs and waterfalls of Viridia as Kobi looks across the valley.',
            },
        ],
    },
    'to-borealis': {
        title: 'Viridia → Borealis', continueLabel: 'Enter Borealis', panels: [
            {
                id: 'heart-tree', draw: (scene, animate) => gate(scene, animate, 'viridia'),
                caption: 'The Heart Tree released the second Waymark. Its last pulse opened a path to Borealis.',
                description: 'The Heart Tree glows beside a violet gate under the Viridia moon.',
            },
            {
                id: 'borealis-reveal', draw: aurora,
                caption: 'The pulse became a ribbon of light over the ice. The Compass pointed into the mountains.',
                description: 'Green and violet aurora hang above an icy lake and snowy pines.',
            },
        ],
    },
    'to-vesper': {
        title: 'Borealis → Vesper', continueLabel: 'Enter Vesper', panels: [
            {
                id: 'summit-departure', draw: (scene, animate) => gate(scene, animate, 'borealis'),
                caption: 'With three Waymarks aligned, the Compass picked up a signal beyond the aurora.',
                description: 'An icy portal opens beneath the aurora at Skybreak Summit.',
            },
            {
                id: 'vesper-reveal', draw: vesper,
                caption: 'The signal led to Vesper. A transmitter still blinked above the ruined city.',
                description: 'A teal beacon blinks over a violet skyline as Kobi approaches the Breached Streets.',
            },
        ],
    },
    ending: {
        title: 'Earth · Winnipeg', continueLabel: 'Play again', panels: [
            {
                id: 'earth-orbit', draw: earth,
                caption: 'The portal carried Kobi to Earth. The Compass held its signal over Winnipeg.',
                description: 'Earth rises against the stars. A teal marker pulses over central Canada.',
            },
            {
                id: 'campus-arrival', draw: campus,
                caption: 'Kobi landed in front of the University of Manitoba. The final Waymark was close.',
                description: 'Kobi steps out of the portal onto the path in front of the University of Manitoba.',
            },
        ],
    },
};
