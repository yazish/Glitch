import type { ViridiaState } from './simulation';

type Objective = Readonly<{ id: string; text: string; done: (state: ViridiaState) => boolean }>;

export const viridiaObjectives: readonly Objective[] = [
    { id: 'compass', text: 'Follow the Star Compass to the fallen tree.', done: (s) => s.seenLog },
    { id: 'inspect-log', text: 'Find a way past the fallen tree.', done: (s) => s.inspectedLog },
    { id: 'move-log', text: 'Brace with E and hold Down to move the log.', done: (s) => s.logMoved },
    { id: 'find-flowers', text: 'Examine the glowing flowers ahead.', done: (s) => s.seenFlowers },
    { id: 'bloom-flowers', text: 'Use a soft sound or tap Space to awaken the flowers.', done: (s) => s.flowersOpen },
    { id: 'pollen', text: 'Follow the glowing pollen.', done: (s) => s.reachedTrail },
    { id: 'roots', text: 'Investigate the hardened roots ahead.', done: (s) => s.investigatedRoots },
    { id: 'reflector', text: 'Examine the stone reflector.', done: (s) => s.seenReflector },
    { id: 'align', text: 'Press E to rotate the reflector toward the roots.', done: (s) => s.aligned || s.rootHits > 0 },
    { id: 'crack', text: 'Use a loud burst or tap Space to crack the roots.', done: (s) => s.rootHits >= 1 },
    { id: 'break', text: 'Use a second burst to break the roots.', done: (s) => s.rootHits >= 2 },
    { id: 'find-receiver', text: 'Find the stone receiver behind the roots.', done: (s) => s.seenReceiver },
    { id: 'charge-receiver', text: 'Hum or hold Space for three seconds to retract the vines.', done: (s) => s.vinesOpen },
    { id: 'open-path', text: 'Follow the opened path to the Heart Tree clearing.', done: (s) => s.reachedHeart },
    { id: 'tree', text: 'Approach the Heart Tree to reveal the compass sequence.', done: (s) => s.discoveredTree },
    { id: 'inspect-stones', text: 'Examine the three stones. Check the Star Compass for their order.', done: (s) => s.examinedStones === 3 },
    { id: 'bloom-stone', text: 'First, awaken the Bloom Stone with a soft sound or tap Space.', done: (s) => s.stoneIndex >= 1 },
    { id: 'fracture-stone', text: 'Next, break the Fracture Stone’s roots with two loud bursts or two Space taps.', done: (s) => s.stoneIndex >= 2 },
    { id: 'resonance-stone', text: 'Hum or hold Space to charge the Resonance Stone.', done: (s) => s.treeAwake },
    { id: 'seal', text: 'Stand on the seal plate, then press R. Let the Echo hold the seal open.', done: (s) => s.sealOpen || s.collected },
    { id: 'waymark', text: 'While the Echo holds the seal, press E at the pedestal.', done: (s) => s.collected },
    { id: 'exit', text: 'Return to the lit exit portal and press E.', done: (s) => s.finished },
];
