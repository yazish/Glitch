import type { GameCommand, SoundInput } from '../input/commands.ts';
import { Journey } from './journey.ts';
import type { WorldId } from './journey.ts';
import { hermes } from './hermes/room.ts';
import { HermesSimulation } from './hermes/simulation.ts';
import { viridia } from './viridia/layout.ts';
import { ViridiaSimulation } from './viridia/simulation.ts';
import { borealis } from './borealis/layout.ts';
import { BorealisSimulation } from './borealis/simulation.ts';
import type { VesperProgress } from './vesper/progress.ts';

export class Adventure {
    private readonly journey = new Journey();
    readonly hermes = new HermesSimulation(hermes, this.journey);
    viridia?: ViridiaSimulation;
    borealis?: BorealisSimulation;
    private world: WorldId = 'hermes';

    get activeWorld(): WorldId { return this.world; }
    get vesperProgress(): VesperProgress { return this.journey; }

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
                }
            }
        }
    }

    step(horizontal: number, vertical: number, mic: SoundInput): void {
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
                    this.borealis = new BorealisSimulation(borealis, this.journey);
                    this.world = 'borealis';
                    return;
                }
                level.step(horizontal, vertical, mic);
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
            case 'rewind': level.rewind(); break;
            case 'restart': level.restart(); break;
        }
    }
}
