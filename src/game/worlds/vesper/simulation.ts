import { contains } from '../geometry.ts';
import type { Point, Pose, Rect } from '../geometry.ts';
import type { VesperProgress } from './progress.ts';
import { HEIGHT, WIDTH } from '../../viewport.ts';
import { Drake, groundAttackHits } from './drake.ts';
import type { DrakeAttack } from './drake.ts';
import {
    ABYSS_TICKS, AMPLIFIER, ARENAS, BARRIER, BARRIER_CORE, BARRIER_FACE, BOSS_FEET, GEAR, PORTAL,
    PORTAL_OPEN_TICKS, PORTAL_PULL_TICKS, REINFORCEMENTS, REQUIRED_WAYMARKS, TRANSMITTER, TUNING, WAYMARK, ZONES,
} from './layout.ts';
import type { AreaId, Wave } from './layout.ts';
import { riftbornBody, updateRiftborn } from './riftborn.ts';
import type { Riftborn } from './riftborn.ts';
import { boundsAround, direction, distance, FACING_VECTOR, inFront, moveOnGround, offset, project, projectedCover, segmentHit } from './space.ts';

type Mode = 'gear' | 'wave' | 'exit' | 'amplifier' | 'calibration' | 'barrier'
    | 'bossApproach' | 'boss' | 'waymark' | 'transmitter' | 'portal' | 'abyss' | 'arrival';
export type ShotKind = 'pellet' | 'cannon' | 'orb';
type Shot = Readonly<{ at: Point; vector: Point; kind: ShotKind }>;
type Effect = Readonly<{
    at: Point;
    kind: 'hit' | 'dissolve' | 'block' | 'damage' | 'fire' | 'armor' | 'drakeDefeat' | 'melee';
    ticks: number;
}>;
type SpawnPoint = { at: Point; delay: number; warning: number };
export type VesperInput = Readonly<{
    horizontal: number;
    vertical: number;
    shoot?: boolean;
    melee?: boolean;
    shield?: boolean;
    cannon?: boolean;
    interact?: boolean;
    synchronize?: boolean;
    restart?: boolean;
}>;

const SHOT_SPEED: Record<ShotKind, number> = { pellet: 14, cannon: 8, orb: 2.5 };
const SPREAD = Math.PI * 2 / 9;
const PELLET_ANGLES = [0, -SPREAD, SPREAD];
const PELLET_RADIUS = 3;
export const INTERACT_REACH = 39;
const START_DELAY = 45;

export class VesperSimulation {
    private readonly progressStore: VesperProgress;
    private area: AreaId = 'street';
    private mode: Mode = 'gear';
    private player: Pose = { ...ARENAS.street.entry, facing: 'right' };
    private walk = 0;
    private integrity: number = TUNING.integrity;
    private shield: number = TUNING.shieldCapacity;
    private shielding = false;
    private invulnerable = 0;
    private shotgunCooldown = 0;
    private meleeCooldown = 0;
    private armed = false;
    private cannon = 0;
    private barrier = 2;
    private round = 0;
    private calibrationTick = 0;
    private wave = 0;
    private enemies: Riftborn[] = [];
    private pending: SpawnPoint[] = [];
    private shots: Shot[] = [];
    private effects: Effect[] = [];
    private drake = new Drake();
    private impact?: Readonly<{ attack: DrakeAttack; ticks: number }>;
    private nextEnemy = 0;
    private feedback = '';
    private feedbackTicks = 0;
    private resetCount = 0;
    private sequenceTick = 0;
    private pullStart: Point = TRANSMITTER;
    private projectileEpoch = 0;

    constructor(progress: VesperProgress) { this.progressStore = progress; }

    get inputEpoch(): number { return this.resetCount; }

    get state() {
        const drake = this.mode === 'boss' ? this.drake : undefined;
        return {
            area: this.area, mode: this.mode, player: this.player, walk: this.walk,
            integrity: this.integrity, shield: this.shield, shielding: this.shielding,
            invulnerable: this.invulnerable, cannon: this.cannon, cannonOnline: this.cannonOnline,
            cannonAllowed: this.cannonAllowed, wave: this.wave, enemies: [...this.enemies] as readonly Riftborn[],
            spawns: this.pending.filter(({ delay }) => delay <= 0).map(({ at }) => at),
            remaining: this.enemies.length + this.pending.length, shots: [...this.shots] as readonly Shot[],
            effects: [...this.effects] as readonly Effect[], barrier: this.barrier, round: this.round,
            armed: this.armed, needle: this.needle, drake: drake && {
                phase: drake.phase, hits: drake.hits, open: drake.open, chest: drake.chest,
                muzzle: drake.muzzle, warning: drake.warning, lift: drake.lift,
            },
            impact: this.impact?.attack, feedback: this.feedback, resetCount: this.resetCount,
            waymarks: this.progressStore.waymarkCount, sequenceTick: this.sequenceTick,
        } as const;
    }

    private get arena() { return ARENAS[this.area]; }
    private get walls(): readonly Rect[] {
        const walls: Rect[] = [...this.arena.cover];
        if (this.arena.exit && this.mode !== 'exit') walls.push(this.arena.exit);
        if (this.area === 'avenue' && this.barrier) walls.push(BARRIER);
        return walls;
    }
    private get cannonOnline() { return this.round === ZONES.length; }
    private get cannonAllowed() {
        return this.cannonOnline && (this.mode === 'barrier' || this.mode === 'wave' || this.mode === 'boss')
            && this.cannon === 0;
    }
    private get needle() {
        const position = (this.calibrationTick % 180) / 90;
        return position <= 1 ? position : 2 - position;
    }

    step(input: VesperInput): void {
        if (this.mode === 'arrival') return;
        if (this.feedbackTicks > 0 && --this.feedbackTicks === 0) this.feedback = '';
        if (input.restart && (this.mode === 'wave' || this.mode === 'boss')) {
            this.retry();
            return;
        }
        if (this.mode === 'calibration') {
            if (input.interact || input.synchronize) this.synchronize();
            else this.calibrationTick += 1;
            return;
        }
        if (this.mode === 'portal' || this.mode === 'abyss') {
            this.advanceEnding();
            return;
        }

        const walls = this.walls;
        this.move(input, walls);
        this.shotgunCooldown = Math.max(0, this.shotgunCooldown - 1);
        this.meleeCooldown = Math.max(0, this.meleeCooldown - 1);
        this.cannon = Math.max(0, this.cannon - 1);
        this.invulnerable = Math.max(0, this.invulnerable - 1);
        this.effects = this.effects.filter(({ ticks }) => ticks > 1).map((effect) => ({ ...effect, ticks: effect.ticks - 1 }));
        this.impact = this.impact && this.impact.ticks > 1
            ? { ...this.impact, ticks: this.impact.ticks - 1 } : undefined;

        this.progress(input.interact === true);
        const combat = this.mode === 'wave' || this.mode === 'boss' || this.mode === 'barrier';
        this.updateShield(combat && input.shield === true);
        if (!combat) return;

        if (input.melee) this.swing(walls);
        if (input.shoot) this.shoot();
        if (input.cannon) this.fireCannon(walls);
        const encounter = this.resetCount;
        this.stepShots(walls);
        if (encounter !== this.resetCount || this.mode === 'waymark') return;
        this.stepEnemies(walls);
        if (encounter !== this.resetCount) return;
        if (this.mode === 'boss') this.stepDrake();
        if (this.mode === 'wave' && !this.pending.length && !this.enemies.length) this.finishWave();
    }

    private move(input: VesperInput, walls: readonly Rect[]): void {
        const vector = direction({ x: 0, y: 0 }, { x: input.horizontal, y: input.vertical });
        const next = moveOnGround(this.player, vector, TUNING.walk, walls, TUNING.radius);
        const moving = distance(next, this.player) > 0;
        const facing = vector.x || vector.y
            ? Math.abs(vector.x) >= Math.abs(vector.y) ? (vector.x < 0 ? 'left' : 'right') : (vector.y < 0 ? 'up' : 'down')
            : this.player.facing;
        this.player = { ...next, facing };
        this.walk = moving ? this.walk + 1 : 0;
    }

    private progress(interact: boolean): void {
        switch (this.mode) {
            case 'gear':
                if (interact && distance(this.player, GEAR) < INTERACT_REACH) {
                    this.armed = true;
                    this.startWave(0);
                }
                break;
            case 'exit':
                if (this.arena.exit && contains(this.player, this.arena.exit)) this.enterNextArea();
                break;
            case 'amplifier':
                if (interact && distance(this.player, AMPLIFIER) < INTERACT_REACH) {
                    this.mode = 'calibration';
                    this.calibrationTick = 0;
                }
                break;
            case 'bossApproach':
                if (this.player.y < 290) this.startBoss();
                break;
            case 'waymark':
                if (interact && distance(this.player, WAYMARK) < INTERACT_REACH) {
                    this.progressStore.collectVesperWaymark();
                    this.mode = 'transmitter';
                }
                break;
            case 'transmitter':
                if (interact && distance(this.player, TRANSMITTER) < INTERACT_REACH
                    && this.progressStore.waymarkCount >= REQUIRED_WAYMARKS) {
                    this.mode = 'portal';
                    this.sequenceTick = 0;
                    this.pullStart = this.player;
                    this.player = { ...this.player, facing: 'right' };
                    this.walk = 0;
                    this.feedback = '';
                }
                break;
        }
    }

    private advanceEnding(): void {
        ++this.sequenceTick;
        if (this.mode === 'abyss') {
            if (this.sequenceTick >= ABYSS_TICKS) this.mode = 'arrival';
            return;
        }
        if (this.sequenceTick <= PORTAL_OPEN_TICKS) return;
        const progress = (this.sequenceTick - PORTAL_OPEN_TICKS) / PORTAL_PULL_TICKS;
        // First draw Kael into the open lower lane, then accelerate toward the portal.
        const across = Math.max(0, (progress - 0.25) / 0.75) ** 2;
        const down = Math.min(1, progress * 4);
        this.player = {
            x: this.pullStart.x + (PORTAL.x - this.pullStart.x) * across,
            y: this.pullStart.y + (PORTAL.y - this.pullStart.y) * down,
            facing: 'right',
        };
        this.walk += 1;
        if (progress >= 1) {
            this.mode = 'abyss';
            this.sequenceTick = 0;
        }
    }

    private synchronize(): void {
        if (Math.abs(this.needle - 0.5) > ZONES[this.round] / 2) {
            this.calibrationTick = 0;
            this.message('Missed the zone. Try this round again.');
            return;
        }
        this.round += 1;
        this.calibrationTick = 0;
        this.feedback = '';
        if (this.cannonOnline) {
            this.mode = 'barrier';
            this.message('Cannon online. Face the violet gate and press B or snap.');
        }
    }

    private shoot(): void {
        if (!this.armed || this.shotgunCooldown > 0) return;
        this.shotgunCooldown = TUNING.shotgunInterval;
        const origin = project(this.player, 23);
        const { x, y } = FACING_VECTOR[this.player.facing];
        for (const angle of PELLET_ANGLES) {
            const vector = {
                x: x * Math.cos(angle) - y * Math.sin(angle),
                y: x * Math.sin(angle) + y * Math.cos(angle),
            };
            this.shots.push({ at: origin, vector, kind: 'pellet' });
        }
        this.effect(origin, 'fire', 5);
    }

    private fireCannon(walls: readonly Rect[]): void {
        if (!this.armed || !this.cannonAllowed) return;
        const origin = project(this.player, 23);
        const clear = (target: Point) => walls.every((wall) =>
            wall === BARRIER || segmentHit(origin, target, projectedCover(wall)) === Infinity);
        const enemy = this.enemies
            .filter(({ feet }) => inFront(this.player, this.player.facing, feet, TUNING.cannonRange, 0.60)
                && clear(project(feet, 22)))
            .sort((a, b) => distance(a.feet, this.player) - distance(b.feet, this.player))[0];
        const chest = this.drake.chest;
        const drakeTarget = { x: chest.x + chest.width / 2, y: chest.y + chest.height / 2 };
        const drakeVisible = this.mode === 'boss' && inFront(this.player, this.player.facing, BOSS_FEET, 340, 0.60)
            && clear(drakeTarget);
        const core = { x: BARRIER_CORE.x + BARRIER_CORE.width / 2, y: BARRIER_CORE.y + BARRIER_CORE.height / 2 };
        const target = this.mode === 'barrier'
            ? (this.player.facing === 'right' && clear(core) ? core : undefined)
            : drakeVisible && !this.reinforcements ? drakeTarget : enemy && project(enemy.feet, 22);
        if (target) {
            this.cannon = TUNING.cannonInterval;
            this.shots.push({ at: origin, vector: direction(origin, target), kind: 'cannon' });
            this.effect(origin, 'fire', 16);
        } else if (this.mode === 'boss' && !this.drake.open) this.message('Face the boss to fire the cannon.');
        else if (this.mode === 'barrier') this.message('Face the gate from the clear center lane.');
    }

    private get reinforcements(): boolean {
        return this.drake.phase === 2 && (this.pending.length > 0 || this.enemies.length > 0);
    }

    private swing(walls: readonly Rect[]): void {
        if (!this.armed || this.meleeCooldown) return;
        this.meleeCooldown = TUNING.meleeInterval;
        const at = offset(project(this.player, 14), FACING_VECTOR[this.player.facing], 26);
        this.effect(at, 'melee', 13);
        for (const enemy of this.enemies) {
            const withinReach = distance(this.player, enemy.feet) <= TUNING.radius
                || inFront(this.player, this.player.facing, enemy.feet, TUNING.meleeRange, 0.28);
            if (withinReach
                && walls.every((wall) => segmentHit(this.player, enemy.feet, wall) === Infinity)) {
                this.hitEnemy(enemy, enemy.hp);
            }
        }
    }

    private stepShots(walls: readonly Rect[]): void {
        const shots = this.shots;
        this.shots = [];
        const cover = walls.filter((wall) => wall !== BARRIER).map(projectedCover);
        const epoch = this.projectileEpoch;
        for (const shot of shots) {
            const at = offset(shot.at, shot.vector, SHOT_SPEED[shot.kind]);
            if (!this.hitShot(shot, at, cover) && at.x >= 0 && at.x <= WIDTH && at.y >= 0 && at.y <= HEIGHT) {
                this.shots.push({ ...shot, at });
            }
            if (this.projectileEpoch !== epoch) break;
        }
    }

    private hitShot(shot: Shot, to: Point, cover: readonly Rect[]): boolean {
        let first = Infinity;
        let apply: (() => void) | undefined;
        const consider = (rect: Rect, onHit: () => void) => {
            const hit = segmentHit(shot.at, to, rect);
            if (hit < first) {
                first = hit;
                apply = onHit;
            }
        };
        const hitAt = () => offset(shot.at, direction(shot.at, to), distance(shot.at, to) * first);
        for (const rect of cover) consider(rect, () => this.effect(hitAt(), 'hit', 10));
        if (shot.kind === 'orb') {
            consider(boundsAround(this.player, 20, 34), () => this.hurt(true));
        } else {
            if (this.area === 'avenue' && this.barrier) {
                consider(shot.kind === 'cannon' ? BARRIER_CORE : BARRIER_FACE, () => {
                    if (shot.kind === 'cannon' && this.mode === 'barrier') {
                        this.barrier -= 1;
                        this.effect(hitAt(), this.barrier ? 'hit' : 'dissolve', 32);
                        if (!this.barrier) {
                            this.startWave(0);
                        } else this.message('Core cracked. One more cannon hit.');
                    } else this.effect(hitAt(), 'armor', 14);
                });
            }
            for (const enemy of this.enemies) {
                const body = riftbornBody(enemy.feet);
                const radius = shot.kind === 'pellet' ? PELLET_RADIUS : 0;
                consider({ x: body.x - radius, y: body.y - radius, width: body.width + radius * 2,
                    height: body.height + radius * 2 },
                () => this.hitEnemy(enemy, shot.kind === 'cannon' ? 3 : TUNING.pelletDamage));
            }
            if (this.mode === 'boss') {
                const target = shot.kind === 'pellet' && this.drake.open ? this.drake.body : this.drake.chest;
                consider(target, () => this.hitDrake(shot.kind));
            }
        }
        if (!apply) return false;
        apply();
        return true;
    }

    private hitEnemy(enemy: Riftborn, damage: number): void {
        const hp = enemy.hp - damage;
        this.effect(project(enemy.feet, 24), hp <= 0 ? 'dissolve' : 'hit', hp <= 0 ? 26 : 10);
        this.enemies = hp <= 0 ? this.enemies.filter(({ id }) => id !== enemy.id)
            : this.enemies.map((target) => target.id === enemy.id ? { ...target, hp, flash: 8 } : target);
    }

    private hitDrake(kind: ShotKind): void {
        if (this.reinforcements) return;
        const result = this.drake.hit(kind === 'cannon');
        const chest = this.drake.chest;
        this.effect({ x: chest.x + chest.width / 2, y: chest.y + chest.height / 2 },
            result === 'armor' ? 'armor' : 'hit', 12);
        if (result === 'open') this.message('Armor broken for good. Face the boss and hold K to shoot.');
        if (result !== 'phase') return;
        this.clearShots();
        this.impact = undefined;
        this.shotgunCooldown = 0;
        this.integrity = TUNING.integrity;
        this.shield = TUNING.shieldCapacity;
        this.invulnerable = TUNING.immunity;
        if (!this.drake.defeated) this.message('Phase cleared. Integrity and shield refilled.');
        if (this.drake.phase === 2) this.schedule(REINFORCEMENTS);
        if (this.drake.defeated) {
            this.mode = 'waymark';
            this.message('The rift is closing. The fourth Waymark is free.');
            this.effect(this.drake.muzzle, 'drakeDefeat', 105);
        }
    }

    private schedule(wave: Wave): void {
        this.pending = wave.map(({ at, delay }) => ({ at, delay: START_DELAY + delay, warning: TUNING.warning }));
    }

    private stepEnemies(walls: readonly Rect[]): void {
        const waiting: SpawnPoint[] = [];
        for (const spawn of this.pending) {
            if (spawn.delay > 0) spawn.delay -= 1;
            else if (--spawn.warning <= 0) {
                this.enemies.push({ id: this.nextEnemy++, feet: spawn.at, hp: 3, flash: 0, windup: 0, recovery: 36, walk: 0 });
                continue;
            }
            waiting.push(spawn);
        }
        this.pending = waiting;
        const slow = this.area === 'street' && this.wave === 0;
        const updates = this.enemies.map((enemy) => updateRiftborn(enemy, this.player, walls, this.enemies, slow));
        this.enemies = updates.map(({ enemy }) => enemy);
        for (const { strike } of updates) {
            if (strike && this.hurt(true)) break;
        }
    }

    private stepDrake(): void {
        if (this.reinforcements) return;
        const attack = this.drake.step(this.player);
        if (!attack) return;
        this.impact = { attack, ticks: 25 };
        if (attack.kind === 'orb') {
            const at = this.drake.muzzle;
            this.shots.push({ at, vector: direction(at, project(attack.target, 18)), kind: 'orb' });
        } else if (groundAttackHits(attack, this.player)) {
            this.hurt(false);
        }
    }

    private updateShield(held: boolean): void {
        this.shielding = held && this.shield >= 1;
        if (this.shielding) this.shield = Math.max(0, this.shield - 1);
        else if (!held) this.shield = Math.min(TUNING.shieldCapacity, this.shield + TUNING.shieldRecharge);
    }

    private hurt(blockable: boolean): boolean {
        if (blockable && this.shielding) {
            this.shield = Math.max(0, this.shield - TUNING.shieldBlock);
            this.shielding = this.shield > 0;
            this.effect(project(this.player, 18), 'block', 19);
            return false;
        }
        if (this.invulnerable) return false;
        this.integrity -= 1;
        if (this.integrity <= 0) {
            this.retry();
            return true;
        }
        this.invulnerable = TUNING.immunity;
        this.effect(project(this.player, 18), 'damage', 22);
        return false;
    }

    private startWave(index: number): void {
        this.mode = 'wave';
        this.wave = index;
        this.clearShots();
        this.schedule(this.arena.waves[index]);
        if (this.area === 'street' && index === 0) this.message('Shotgun and blade equipped. Face an enemy and hold K. Press L up close.');
        if (this.area === 'street' && index === 2) this.message('Hold F to block a claw swipe, or press L to take down a nearby enemy.');
    }

    private finishWave(): void {
        if (this.wave + 1 < this.arena.waves.length) {
            this.startWave(this.wave + 1);
        } else {
            this.clearShots();
            this.mode = 'exit';
            this.message('Hostile signatures cleared. The gate is open.');
        }
    }

    private enterNextArea(): void {
        this.area = this.area === 'street' ? 'avenue' : 'crown';
        this.mode = this.area === 'avenue' ? 'amplifier' : 'bossApproach';
        this.resetCombat();
        this.feedback = '';
        if (this.area === 'crown') this.startBoss();
    }

    private startBoss(): void {
        this.mode = 'boss';
        const armorBroken = this.drake.open;
        this.drake = new Drake();
        this.drake.open = armorBroken;
        this.message(armorBroken ? 'Face the boss and hold K to shoot.' : 'Face the boss. Press B or snap once to break its armor.');
    }

    private retry(): void {
        this.resetCombat();
        if (this.mode === 'boss') this.startBoss();
        else this.startWave(this.wave);
        this.message('Encounter restarted. Integrity restored.');
    }

    private resetCombat(): void {
        this.player = { ...this.arena.entry, facing: 'right' };
        this.walk = 0;
        this.integrity = TUNING.integrity;
        this.shield = TUNING.shieldCapacity;
        this.shielding = false;
        this.invulnerable = TUNING.immunity;
        this.clearShots();
        this.enemies = [];
        this.pending = [];
        this.effects = [];
        this.impact = undefined;
        this.cannon = 0;
        this.shotgunCooldown = 0;
        this.meleeCooldown = 0;
        this.resetCount += 1;
    }

    private effect(at: Point, kind: Effect['kind'], ticks: number): void {
        this.effects.push({ at, kind, ticks });
    }

    private clearShots(): void {
        this.shots = [];
        this.projectileEpoch += 1;
    }

    private message(text: string): void {
        this.feedback = text;
        this.feedbackTicks = 240;
    }
}

export type VesperState = VesperSimulation['state'];
