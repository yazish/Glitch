import type { VesperMicrophone } from '../worlds/vesper/microphone';
import { ARENAS, TUNING } from '../worlds/vesper/layout';
import type { VesperState } from '../worlds/vesper/simulation';
import { VESPER_WAYMARK_TOTAL } from '../worlds/vesper/progress';

import { vesperGuidance } from '../worlds/vesper/guidance';
import { vesperTutorial } from './VesperTutorial';

export class VesperHud {
    private readonly panel = document.querySelector<HTMLElement>('#vesper-hud')!;
    private readonly location = document.querySelector<HTMLElement>('#location')!;
    private readonly objectiveGuide = document.querySelector<HTMLElement>('#objective-guide')!;
    private readonly objective = document.querySelector<HTMLElement>('#objective')!;
    private readonly route = document.querySelector<HTMLElement>('#route')!;
    private readonly combat = document.querySelector<HTMLElement>('#vesper-combat')!;
    private readonly integrity = this.combat.querySelector<HTMLElement>('#vesper-integrity')!;
    private readonly health = this.combat.querySelector<HTMLElement>('#vesper-health')!;
    private readonly charge = this.combat.querySelector<HTMLElement>('#vesper-shield')!;
    private readonly tutorial = document.querySelector<HTMLElement>('#vesper-tutorial')!;
    private readonly shownTutorials = new Set<string>();
    private tutorialUntil = 0;
    private readonly cannon = this.combat.querySelector<HTMLElement>('#vesper-cannon')!;
    private readonly encounter = this.combat.querySelector<HTMLElement>('#vesper-encounter')!;
    private readonly bossHealth = this.combat.querySelector<HTMLProgressElement>('#vesper-boss-health')!;
    private readonly feedback = this.panel.querySelector<HTMLElement>('#vesper-feedback')!;
    private readonly transmission = document.querySelector<HTMLElement>('#vesper-transmission')!;
    private readonly arrival = document.querySelector<HTMLElement>('#vesper-arrival')!;
    private readonly micPanel = document.querySelector<HTMLElement>('#microphone')!;
    private readonly micText = document.querySelector<HTMLElement>('#mic-status')!;
    private readonly micLevel = document.querySelector<HTMLMeterElement>('#mic-level')!;
    private readonly slots = Array.from(document.querySelectorAll('#waymarks li'));
    readonly micButton = document.querySelector<HTMLButtonElement>('#mic-toggle')!;
    constructor() {
        for (const selector of ['#location', '#objective-guide', '#game-hud', '#star-map', '#vesper-hud']) {
            document.querySelector<HTMLElement>(selector)!.hidden = false;
        }
        for (const selector of ['#viridia-compass', '#objective-completed', '#game-hud > .controls', '#how-to-play']) {
            const element = document.querySelector<HTMLElement>(selector);
            if (element) element.hidden = true;
        }
        document.querySelector('#game-stage')!.classList.add('vesper-stage');
    }

    render(state: VesperState, microphone: VesperMicrophone): void {
        const cinematic = state.mode === 'portal' || state.mode === 'abyss';
        this.objectiveGuide.hidden = cinematic;
        this.text(this.location, 'Vesper · ' + ARENAS[state.area].name);
        this.text(this.objective, (state.mode === 'arrival' ? '✓ ' : '☐ ') + vesperGuidance(state).task);
        this.text(this.route, state.waymarks + ' of ' + VESPER_WAYMARK_TOTAL + ' Waymarks recovered');
        this.slots.forEach((slot, index) => slot.classList.toggle('filled', index < state.waymarks));
        this.text(this.integrity, state.integrity + ' / ' + TUNING.integrity);
        this.bar(this.health, state.integrity, TUNING.integrity);
        this.bar(this.charge, state.shield, TUNING.shieldCapacity);
        const hint = vesperTutorial(state);
        if (hint && !this.shownTutorials.has(hint.id)) {
            this.shownTutorials.add(hint.id);
            this.text(this.tutorial, hint.text);
            this.tutorialUntil = performance.now() + 6500;
        }
        this.tutorial.hidden = cinematic || state.mode === 'arrival' || performance.now() >= this.tutorialUntil;
        this.combat.hidden = cinematic || ['arrival', 'waymark', 'transmitter'].includes(state.mode);
        this.cannon.hidden = !state.cannonOnline;
        this.text(this.cannon, state.cannon ? 'Cannon ' + Math.ceil(state.cannon / 60) + 's' : 'Cannon ready · B / sound');
        this.encounter.hidden = state.mode !== 'wave' && state.mode !== 'boss';
        const boss = state.drake;
        this.bossHealth.hidden = !boss;
        if (boss) this.bossHealth.value = this.bossHealth.max - boss.hits;
        this.text(this.encounter, boss ? 'Phase ' + boss.phase + '/' + TUNING.phases
            + ' · ' + this.bossHealth.value + '/' + this.bossHealth.max + ' HP'
            + (state.remaining ? ' · Enemies ' + state.remaining : '')
            : 'Wave ' + (state.wave + 1) + '/' + ARENAS[state.area].waves.length + ' · Enemies ' + state.remaining);
        this.text(this.feedback, state.feedback);
        this.feedback.hidden = !state.feedback || state.mode === 'arrival' || state.mode === 'calibration';
        this.transmission.hidden = state.mode !== 'portal';
        this.arrival.hidden = state.mode !== 'arrival';
        this.micPanel.hidden = !state.cannonOnline || !['barrier', 'wave', 'bossApproach', 'boss', 'exit'].includes(state.mode);
        const active = ['ready', 'requesting', 'calibrating'].includes(microphone.status);
        this.text(this.micButton, active ? 'Disable microphone' : 'Enable microphone');
        const status = {
            off: 'Microphone off. Press B to fire the cannon.',
            requesting: 'Waiting for microphone permission.',
            calibrating: 'Stay quiet while the microphone calibrates.',
            ready: 'Microphone ready. Snap or clap to fire the cannon.',
            denied: 'Microphone access denied. Press B to fire.',
            unavailable: 'Microphone unavailable. Press B to fire.',
        };
        this.text(this.micText, status[microphone.status]);
        this.micLevel.value = Math.min(1, microphone.level * 8);
    }

    destroy(): void {
        this.panel.hidden = true;
        this.combat.hidden = true;
        this.transmission.hidden = true;
        this.arrival.hidden = true;
        this.tutorial.hidden = true;
        document.querySelector('#game-stage')!.classList.remove('vesper-stage');
    }

    private text(element: HTMLElement, value: string): void {
        if (element.textContent !== value) element.textContent = value;
    }

    private bar(element: HTMLElement, value: number, max: number): void {
        element.setAttribute('aria-valuenow', String(Math.round(value)));
        element.querySelector<HTMLElement>('i')!.style.width = `${Math.max(0, Math.min(1, value / max)) * 100}%`;
    }
}
