import type { Point } from '../geometry.ts';
import { AMPLIFIER, ARENAS, BOSS_FEET, FIRING_POSITION, GEAR, PORTAL, TRANSMITTER, WAYMARK } from './layout.ts';
import type { VesperState } from './simulation.ts';

export function vesperGuidance(state: VesperState): { task: string; at?: Point; label?: string } {
    switch (state.mode) {
        case 'gear': return { task: 'Walk to the supply case and press E to equip the shotgun and blade.', at: GEAR, label: 'Weapons · E' };
        case 'wave':
            if (!state.enemies.length && state.spawns.length) {
                return { task: 'Rift opening. Keep clear of the marked entry and face it.', at: state.spawns[0], label: 'Riftborn entry' };
            }
            if (state.area === 'avenue') return { task: 'Clear the Riftborn. Hold K to shoot, press L up close, or fire the cannon with B.' };
            if (state.wave === 0) return { task: 'Face the Riftborn and hold K to fire a three-pellet spread.' };
            if (state.wave === 1) return { task: 'Clear the next wave. Press L to defeat nearby Riftborn in one swing.' };
            return { task: 'Clear the last street wave. Hold F to block claw swipes.' };
        case 'exit': {
            const gate = ARENAS[state.area].exit!;
            return { task: state.area === 'street' ? 'Street cleared. Take the southeast gate to Transmitter Avenue.'
                : 'Avenue cleared. Take the northeast gate to the Celestial Crown.',
                at: { x: gate.x + gate.width / 2, y: gate.y + gate.height / 2 }, label: 'Next district →' };
        }
        case 'amplifier': return { task: 'Go around the generator to the north amplifier. Press E to unlock the cannon.', at: AMPLIFIER, label: 'Amplifier · E' };
        case 'calibration': return { task: 'Press E or Space when the needle enters the striped zone.' };
        case 'barrier': return { task: state.barrier === 1
            ? 'The core cracked. Face the gate and fire once more when the cannon is ready.'
            : 'Follow the lower lane to the firing mark. Face right and press B or snap.',
            at: FIRING_POSITION, label: 'Cannon firing position' };
        case 'bossApproach': return { task: 'Walk north to challenge the Rift Drake.', at: { x: 320, y: 278 }, label: 'Drake arena ↑' };
        case 'boss': {
            if (state.remaining) return { task: 'Clear the Riftborn while the drake pauses.' };
            if (state.drake?.warning?.kind === 'orb') return { task: 'Rift orb incoming. Move sideways or hold F to block.' };
            if (state.drake?.warning?.kind === 'beam') return { task: 'Rift beam. Step sideways out of the striped lane.' };
            if (state.drake?.warning?.kind === 'shockwave') return { task: 'Ground shockwave. Leave the marked circle.' };
            if (state.drake?.open) return { task: 'Face the drake and hold K to shoot. Integrity refills at each phase.' };
            return { task: 'Face the drake and press B or snap once to break its armor.', at: BOSS_FEET, label: 'Rift Drake' };
        }
        case 'waymark': return { task: 'Drake defeated. Press E at the glowing pedestal to collect the fourth Waymark.', at: WAYMARK, label: 'Waymark · E' };
        case 'transmitter': return { task: 'Place all four Waymarks in the transmitter. Press E at the lectern.', at: TRANSMITTER, label: 'Waymark transmitter · E' };
        case 'portal': return { task: 'The four Waymarks opened the Earth portal.', at: PORTAL, label: 'Earth portal' };
        case 'abyss': return { task: 'Kael is falling through the rift.' };
        case 'arrival': return { task: 'Vesper complete.' };
    }
}
