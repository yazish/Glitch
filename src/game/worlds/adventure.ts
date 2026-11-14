import type { GameCommand, SoundInput } from '../input/commands.ts';
import { Journey } from './journey.ts';
import type { WorldId } from './journey.ts';
import { hermes } from './hermes/room.ts';
import { HermesSimulation } from './hermes/simulation.ts';
import { viridia } from './viridia/layout.ts';
import type { SoundTarget } from './viridia/layout.ts';
import { ViridiaSimulation } from './viridia/simulation.ts';
import { borealis } from './borealis/layout.ts';
import { BorealisSimulation } from './borealis/simulation.ts';

export class Adventure {
    private readonly journey = new Journey();
    readonly hermes = new HermesSimulation(hermes, this.journey);
    viridia?: ViridiaSimulation;
    borealis?: BorealisSimulation;
    private world: WorldId = 'hermes';
    private keyboardPulse?: { target: SoundTarget; pulse: 'soft' | 'loud' };

    get activeWorld(): WorldId { return this.world; }

    get player() {
        return this.borealis?.player ?? this.viridia?.state.player ?? this.hermes.state.player;
    }

    command(command: GameCommand): void {
        switch (this.world) {
            case 'hermes': this.hermes.command(command); return;
            case 'viridia': this.commandViridia(this.viridia!, command); return;
            case 'borealis': {
                const level = this.borealis!;
                switch (command) {
                    case 'reverseWind': level.reverseWind(); break;
                    case 'interact': level.interact(); break;
                    case 'rewind': level.rewind(); break;
                    case 'restart': level.restart(); break;
                    case 'activateBridge': level.sound('soft'); break;
                }
            }
        }
    }

    step(horizontal: number, vertical: number, mic: SoundInput, spaceHeld: boolean): void {
        switch (this.world) {
            case 'hermes': {
                this.hermes.step(horizontal, vertical);
                const state = this.hermes.state;
                if (state.screen === 'complete') {
                    this.viridia = new ViridiaSimulation(viridia, this.journey);
                    this.world = 'viridia';
                }
                break;
            }
            case 'viridia': {
                const level = this.viridia!;
                if (level.state.finished) {
                    this.keyboardPulse = undefined;
                    this.borealis = new BorealisSimulation(borealis, this.journey);
                    this.world = 'borealis';
                    return;
                }
                const target = level.target;
                const pulse = this.keyboardPulse?.target === target?.id ? this.keyboardPulse?.pulse : undefined;
                this.keyboardPulse = undefined;
                level.step(horizontal, vertical, { pulse: pulse ?? mic.pulse, sustained: spaceHeld || mic.sustained });
                break;
            }
            case 'borealis':
                this.borealis!.sound(mic.pulse);
                this.borealis!.step(horizontal, vertical);
                break;
        }
    }

    private commandViridia(level: ViridiaSimulation, command: GameCommand): void {
        switch (command) {
            case 'interact': level.interact(); break;
            case 'rewind': this.keyboardPulse = undefined; level.rewind(); break;
            case 'restart': this.keyboardPulse = undefined; level.restart(); break;
            case 'activateBridge': {
                const target = level.target;
                if (target && target.sound !== 'sustained') {
                    this.keyboardPulse = { target: target.id, pulse: target.sound };
                }
                break;
            }
        }
    }
}
