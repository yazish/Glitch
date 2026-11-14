import type { Point } from '../geometry.ts';
import { AMPLIFIER, ARENAS, FIRING_POSITION, GEAR, PORTAL, TRANSMITTER, WAYMARK } from './layout.ts';
import type { VesperState } from './simulation.ts';

export function vesperGuidance(state: VesperState): { task: string; at?: Point; label?: string } {
    switch (state.mode) {
        case 'gear': return { task: 'Walk to the shotgun and blade. Press E to pick them up.', at: GEAR, label: 'Pick up · E' };
        case 'wave':
            if (!state.enemies.length && state.spawns.length) {
                return { task: 'Rift opening. Keep clear of the marked entry and face it.', at: state.spawns[0], label: 'Incoming' };
            }
            if (state.area === 'avenue') return { task: 'Clear the enemies. Hold K to shoot or press L up close. Snap or clap to fire the cannon.' };
            if (state.wave === 0) return { task: 'Face the enemy and hold K to fire a three-pellet spread.' };
            if (state.wave === 1) return { task: 'Clear the next wave. Press L to defeat nearby enemies in one swing.' };
            return { task: 'Clear the last street wave. Hold F to block claw swipes.' };
        case 'exit': {
            const gate = ARENAS[state.area].exit!;
            return { task: state.area === 'street' ? 'Street cleared. Take the southeast gate to Transmitter Avenue.'
                : 'Avenue cleared. Take the northeast gate to the Celestial Crown.',
                at: { x: gate.x + gate.width / 2, y: gate.y + gate.height / 2 }, label: 'Next district →' };
        }
        case 'amplifier': return { task: 'Go around the generator to the north amplifier. Press E to unlock the cannon.', at: AMPLIFIER, label: 'Amplifier · E' };
        case 'calibration': return { task: 'Press E when the needle enters the striped zone.' };
        case 'barrier': return { task: state.barrier === 1
            ? 'The core cracked. Face the gate and fire once more when the cannon is ready.'
            : 'Follow the lower lane to the firing mark. Face right and snap or clap.',
            at: FIRING_POSITION, label: 'Cannon firing position' };
        case 'bossApproach': return { task: 'Enter the arena.', at: { x: 320, y: 278 }, label: 'Arena' };
        case 'boss': {
            if (state.remaining) return { task: 'Clear the enemies while the boss pauses.' };
            if (state.drake?.warning?.kind === 'orb') return { task: 'Fireball incoming. Move aside or hold F to block.' };
            if (state.drake?.warning?.kind === 'beam') return { task: 'Fire incoming. Move up or down out of the marked lane.' };
            if (state.drake?.warning?.kind === 'shockwave') return { task: 'Ground shockwave. Leave the marked circle.' };
            if (state.drake?.open) return { task: 'Face the boss and hold K to shoot. Integrity refills at each phase.' };
            return { task: 'Face the boss and snap or clap once to break its armor.' };
        }
        case 'waymark': return { task: 'Boss defeated. Press E at the glowing pedestal to collect the fourth Waymark.', at: WAYMARK, label: 'Waymark · E' };
        case 'transmitter': return { task: 'Place all four Waymarks in the transmitter. Press E at the lectern.', at: TRANSMITTER, label: 'Waymark transmitter · E' };
        case 'portal': return { task: 'The four Waymarks opened the Earth portal.', at: PORTAL, label: 'Earth portal' };
        case 'abyss': return { task: 'Falling through the rift.' };
        case 'arrival': return { task: 'Vesper complete.' };
    }
}
