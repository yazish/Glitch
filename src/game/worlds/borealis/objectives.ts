import type { Point, Rect } from '../geometry.ts';
import type { BorealisArea, BorealisLayout } from './layout.ts';
import type { BorealisState } from './simulation.ts';

function center(rect: Rect): Point {
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

interface Objective {
    readonly text: string;
    readonly done: (state: BorealisState) => boolean;
    readonly target: (layout: BorealisLayout, state: BorealisState) => Point;
}

export const borealisObjectives: Readonly<Record<BorealisArea, readonly Objective[]>> = {
    pass: [
        { text: 'Follow the Star Compass to the snowdrift.', done: (s) => s.seenDrift,
            target: (l) => center(l.drift) },
        { text: 'Find the wind vane and turn the wind away from the drift.', done: (s) => s.drift === 1,
            target: (l) => l.areas.pass.vane },
        { text: 'Follow the cleared mountain path.', done: (s) => s.area !== 'pass',
            target: (l) => l.areas.basin.entry },
    ],
    basin: [
        { text: 'Trace the signal from the sled plate to the fence.', done: (s) => s.seenGate || s.block === 1,
            target: (l) => ({ x: l.gate.x - 350, y: 228 }) },
        { text: 'Find the wind sled on its rails.', done: (s) => s.seenSled || s.block === 1,
            target: (l, s) => ({ x: s.basinSled, y: l.basinTrack.y }) },
        { text: 'Slide the ice block into its marked recess.', done: (s) => s.block === 1,
            target: (l) => center(l.iceBlock.reach) },
        { text: 'Use the vane to send the sled onto the plate.', done: (s) => s.basinPlate,
            target: (l) => l.areas.basin.vane },
        { text: 'Continue through the opened fence.', done: (s) => s.area === 'summit',
            target: (l) => l.areas.summit.entry },
    ],
    summit: [
        { text: 'Inspect the frozen Waymark and its two locks.', done: (s) => s.seenMonument || s.leftPlate || s.windbreak > 0,
            target: (l) => center(l.monument) },
        { text: 'Follow the sled rails to the plates; their signals power the monument.', done: (s) => (s.seenPlates && s.seenSleds) || s.leftPlate || s.windbreak > 0,
            target: (l) => ({ x: l.summitTracks[0].left, y: l.summitTracks[0].y }) },
        { text: 'Use the vane to send the first sled left.', done: (s) => s.leftPlate,
            target: (l) => l.areas.summit.vane },
        { text: 'Slide the windbreak into place to shelter the first sled.', done: (s) => s.windbreak === 1,
            target: (l) => ({ ...center(l.windbreak.reach), x: l.windbreak.reach.x + l.windbreak.reach.width - 9 }) },
        { text: 'Reverse the wind to send the second sled right.', done: (s) => s.rightPlate,
            target: (l) => l.areas.summit.vane },
        { text: 'Collect the third Waymark when the ice breaks.', done: (s) => s.collected,
            target: (l) => center(l.monument) },
        { text: 'Enter the lit portal.', done: (s) => s.finished, target: (l) => center(l.exit) },
    ],
};

export function currentBorealisObjective(state: BorealisState) {
    return borealisObjectives[state.area].find((objective) => !objective.done(state));
}
