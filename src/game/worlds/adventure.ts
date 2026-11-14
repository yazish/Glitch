import type { GameCommand, SoundInput } from '../input/commands.ts';
import { Journey } from './journey.ts';
import { hermes } from './hermes/room.ts';
import { HermesSimulation } from './hermes/simulation.ts';
import { viridia } from './viridia/layout.ts';
import type { SoundTarget } from './viridia/layout.ts';
import { ViridiaSimulation } from './viridia/simulation.ts';

export class Adventure {
    private readonly journey = new Journey();
    readonly hermes = new HermesSimulation(hermes, this.journey);
    viridia?: ViridiaSimulation;
    private keyboardPulse?: { target: SoundTarget; pulse: 'soft' | 'loud' };

    command(command: GameCommand): void {
        if (!this.viridia) {
            this.hermes.command(command);
            return;
        }
        const target = this.viridia.target;
        switch (command) {
            case 'interact': this.viridia.interact(); break;
            case 'rewind': this.keyboardPulse = undefined; this.viridia.rewind(); break;
            case 'restart': this.keyboardPulse = undefined; this.viridia.restart(); break;
            case 'activateBridge':
                if (target && target.sound !== 'sustained') {
                    this.keyboardPulse = { target: target.id, pulse: target.sound };
                }
                break;
        }
    }

    step(horizontal: number, vertical: number, mic: SoundInput, spaceHeld: boolean): void {
        if (!this.viridia) {
            this.hermes.step(horizontal, vertical);
            const state = this.hermes.state;
            if (state.screen === 'complete') {
                this.viridia = new ViridiaSimulation(viridia, this.journey, state.player, state.playerWalkTicks);
            }
            return;
        }
        const target = this.viridia.target;
        const keyboardPulse = this.keyboardPulse?.target === target?.id ? this.keyboardPulse?.pulse : undefined;
        this.keyboardPulse = undefined;
        this.viridia.step(horizontal, vertical, {
            pulse: keyboardPulse ?? mic.pulse,
            sustained: spaceHeld || mic.sustained,
        });
    }
}
