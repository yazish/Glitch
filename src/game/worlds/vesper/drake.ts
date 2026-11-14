import { contains } from '../geometry.ts';
import type { Point, Rect } from '../geometry.ts';
import { BOSS_FEET, TUNING } from './layout.ts';
import { boundsAround, distance, project } from './space.ts';

export type DrakeAttack =
    | Readonly<{ kind: 'orb' | 'shockwave'; target: Point; ticks: number }>
    | Readonly<{ kind: 'beam'; lane: Rect; ticks: number }>;

export class Drake {
    phase = 1;
    hits = 0;
    open = false;
    warning?: DrakeAttack;
    private interval = 170;
    private attackIndex = 0;
    private animationTick = 0;

    get defeated(): boolean { return this.phase > TUNING.phases; }
    get lift(): number {
        return this.warning?.kind === 'shockwave' ? -15 : Math.round(Math.sin(this.animationTick * 0.05) * 4);
    }
    get chest(): Rect { return boundsAround(BOSS_FEET, 48, 37, 33 + this.lift); }
    get body(): Rect { return boundsAround(BOSS_FEET, 78, 73, 9 + this.lift); }
    get muzzle(): Point { return project({ x: BOSS_FEET.x - 45, y: BOSS_FEET.y }, 57 + this.lift); }

    hit(cannon: boolean, damage: number = TUNING.pelletDamage): 'armor' | 'open' | 'hit' | 'phase' {
        if (this.defeated) return 'armor';
        if (cannon) {
            if (this.open) return 'hit';
            this.open = true;
            this.warning = undefined;
            this.interval = 170;
            return 'open';
        }
        if (!this.open) return 'armor';
        this.hits = Math.min(this.phase * TUNING.phaseHits, this.hits + damage);
        if (this.hits < this.phase * TUNING.phaseHits) return 'hit';
        this.phase += 1;
        this.warning = undefined;
        this.interval = 35;
        this.attackIndex = 0;
        return 'phase';
    }

    step(player: Point): DrakeAttack | undefined {
        if (this.defeated) return;
        this.animationTick += 1;
        if (this.warning) {
            const attack = this.warning;
            if (attack.ticks > 1) {
                this.warning = { ...attack, ticks: attack.ticks - 1 };
                return;
            }
            this.warning = undefined;
            this.interval = 165;
            return attack;
        }
        if (--this.interval > 0) return;
        this.attackIndex += 1;
        if (this.attackIndex % 2 === 1 && this.phase === 2) {
            this.warning = { kind: 'beam', lane: { x: 18, y: player.y - 30, width: BOSS_FEET.x - 18, height: 60 }, ticks: 108 };
        } else if (this.attackIndex % 2 === 1 && this.phase === 3) {
            this.warning = { kind: 'shockwave', target: player, ticks: 114 };
        } else {
            this.warning = { kind: 'orb', target: player, ticks: 90 };
        }
    }
}

export const SHOCK_RADIUS = 56;

export function groundAttackHits(attack: DrakeAttack, point: Point): boolean {
    if (attack.kind === 'beam') return contains(point, attack.lane);
    return attack.kind === 'shockwave' && distance(point, attack.target) <= SHOCK_RADIUS;
}
