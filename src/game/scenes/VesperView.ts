import { Math as PhaserMath } from 'phaser';

import type { GameObjects, Scene } from 'phaser';
import type { Point } from '../worlds/geometry';
import { AMPLIFIER, ARENAS, BARRIER, BARRIER_CORE, BARRIER_FACE, BOSS_FEET, FLOOR, GEAR,
    PORTAL_OPEN_TICKS, REQUIRED_WAYMARKS, TRANSMITTER, WAYMARK, ZONES } from '../worlds/vesper/layout';
import { vesperGuidance } from '../worlds/vesper/guidance';
import { SHOCK_RADIUS } from '../worlds/vesper/drake';
import type { DrakeAttack } from '../worlds/vesper/drake';
import { CLAW_RANGE } from '../worlds/vesper/riftborn';
import { COVER_HEIGHT, FACING_VECTOR, project } from '../worlds/vesper/space';
import type { VesperState } from '../worlds/vesper/simulation';
import { CharacterView } from './CharacterView';
import { RoomProjection } from './RoomProjection';
import { VesperCinematic } from './VesperCinematic';

const CYAN = 0x81f9ee;
const VIOLET = 0xb976ff;
const WARNING = 0xff9978;
const STONE = { top: 0x766783, left: 0x332a44, right: 0x45374f };
const PALETTES = {
    street: { sky: 0x30204e, haze: 0x815480, ground: 0x3b3049, skyline: 0x392844 },
    avenue: { sky: 0x172c43, haze: 0x3a8388, ground: 0x283c49, skyline: 0x223943 },
    crown: { sky: 0x271735, haze: 0x894668, ground: 0x453345, skyline: 0x3d2648 },
};

export class VesperView {
    private readonly room = new RoomProjection(FLOOR);
    private readonly backdrop: GameObjects.Graphics;
    private readonly structures: GameObjects.Graphics[] = [];
    private readonly ground: GameObjects.Graphics;
    private readonly fixtures: GameObjects.Graphics;
    private readonly fx: GameObjects.Graphics;
    private readonly kael: CharacterView;
    private readonly double: CharacterView;
    private readonly drake: GameObjects.Graphics;
    private readonly marker: GameObjects.Text;
    private readonly calibration: GameObjects.Text;
    private readonly calibrationFeedback: GameObjects.Text;
    private readonly calibrationArt: GameObjects.Graphics;
    private readonly cinematic: VesperCinematic;
    private readonly assetLabels: GameObjects.Container;
    private readonly monsters = new Map<number, GameObjects.Graphics>();
    private area?: VesperState['area'];

    constructor(private readonly scene: Scene) {
        this.backdrop = scene.add.graphics().setDepth(-20);
        this.ground = scene.add.graphics().setDepth(-10);
        this.fixtures = scene.add.graphics().setDepth(-5);
        this.fx = scene.add.graphics().setDepth(390);
        this.drake = scene.add.graphics();
        this.assetLabels = scene.add.container().setDepth(395);
        this.cinematic = new VesperCinematic(scene);
        this.marker = scene.add.text(0, 0, '', {
            fontFamily: 'system-ui', fontSize: '13px', color: '#f0fffa', backgroundColor: '#161d2f',
            padding: { x: 5, y: 3 },
        }).setOrigin(0.5, 1).setDepth(400);
        this.calibrationArt = scene.add.graphics().setDepth(410);
        this.calibration = scene.add.text(320, 194, '', {
            fontFamily: 'system-ui', fontSize: '16px', color: '#ecfff5', align: 'center', lineSpacing: 6,
        }).setOrigin(0.5, 0).setDepth(420);
        this.calibrationFeedback = scene.add.text(320, 281, '', {
            fontFamily: 'system-ui', fontSize: '13px', color: '#ffd8ba',
        }).setOrigin(0.5, 0).setDepth(420);
        this.kael = new CharacterView(scene, CYAN, 0xffffff, 1);
        this.double = new CharacterView(scene, VIOLET, VIOLET, 0.78);
    }

    render(state: VesperState, delta: number, showAssetLabels: boolean): void {
        if (this.area !== state.area) {
            this.area = state.area;
            this.drawBackdrop(state.area);
            this.drawCover(state.area);
        }
        this.ground.clear();
        this.fixtures.clear();
        this.fx.clear();
        this.drawFixtures(state);
        const feet = project(state.player);
        this.kael.render({ ...feet, facing: state.player.facing }, feet.y, state.walk, delta);
        if (state.armed) this.drawShotgun(feet, state.player.facing);
        if (state.invulnerable && state.effects.some(({ kind }) => kind === 'damage')) {
            this.fx.lineStyle(2, WARNING, 0.8).strokeEllipse(feet.x, feet.y - 16, 24, 35);
        }
        if (state.shielding) {
            this.fx.fillStyle(CYAN, 0.13).fillCircle(feet.x, feet.y - 20, 23)
                .lineStyle(2, CYAN).strokeCircle(feet.x, feet.y - 20, 23);
        }
        const double = project(TRANSMITTER, 26);
        const transmitting = state.mode === 'portal' && state.sequenceTick < PORTAL_OPEN_TICKS;
        this.double.render(transmitting ? { ...double, facing: 'down' } : undefined, 380, 0, 0);
        this.drawEnemies(state);
        this.drawDrake(state);
        this.drawCombat(state);
        this.drawGuidance(state);
        this.drawAssetLabels(state, showAssetLabels);
        this.cinematic.render(state, showAssetLabels);
    }

    private drawShotgun(feet: Point, facing: VesperState['player']['facing']): void {
        const { x, y } = FACING_VECTOR[facing];
        const grip = { x: feet.x + x * 6, y: feet.y - 21 + y * 5 };
        this.fx.lineStyle(5, 0x343c56).lineBetween(grip.x, grip.y, grip.x + x * 10, grip.y + y * 10)
            .fillStyle(CYAN).fillCircle(grip.x + x * 10, grip.y + y * 10, 2);
    }

    private drawGuidance(state: VesperState): void {
        const { at, label } = vesperGuidance(state);
        if (at && label) {
            const point = project(at);
            this.ground.lineStyle(2, CYAN, 0.8).strokeEllipse(point.x, point.y + 5, 49, 21);
            this.marker.setText(label).setPosition(Math.max(62, Math.min(574, point.x)), point.y - 32).setVisible(true);
        } else this.marker.setVisible(false);

        const calibrating = state.mode === 'calibration';
        this.calibration.setVisible(calibrating);
        this.calibrationFeedback.setVisible(calibrating);
        const art = this.calibrationArt.clear();
        if (!calibrating) return;
        const start = 194;
        const width = 252;
        const green = width * ZONES[state.round];
        const left = 320 - green / 2;
        const needle = start + width * state.needle;
        art.fillStyle(0x162234).fillRoundedRect(168, 182, 304, 124, 8)
            .lineStyle(2, CYAN, 0.75).strokeRoundedRect(168, 182, 304, 124, 8)
            .fillStyle(0x3e4056).fillRect(start, 253, width, 16)
            .fillStyle(0x459f77).fillRect(left, 253, green, 16)
            .lineStyle(1, 0xafeed0).strokeRect(left, 253, green, 16);
        for (let x = left + 4; x < left + green; x += 6) art.lineBetween(x, 256, x, 266);
        art.fillStyle(0xffead0).fillRect(needle - 2, 248, 4, 26);
        this.calibration.setText('Amplifier calibration · ' + (state.round + 1) + ' / 3\nE or Space in the striped zone');
        this.calibrationFeedback.setText(state.feedback);
    }

    private drawCover(area: VesperState['area']): void {
        for (const structure of this.structures) structure.destroy();
        this.structures.length = 0;
        for (const wall of ARENAS[area].cover) {
            const art = this.scene.add.graphics().setDepth(wall.y + wall.height);
            this.structures.push(art);
            this.room.block(art, wall, wall.heightAboveGround, STONE);
            const top = wall.y - wall.heightAboveGround + 12;
            art.lineStyle(1, STONE.left).lineBetween(wall.x + 9, top, wall.x + 20, top + 7)
                .lineBetween(wall.x + 20, top + 7, wall.x + 32, top + 2);
        }
    }

    private drawAssetLabels(state: VesperState, visible: boolean): void {
        const show = visible && !['calibration', 'portal', 'abyss', 'arrival'].includes(state.mode);
        this.assetLabels.setVisible(show);
        if (!show) return;

        const labels: { name: string; x: number; y: number }[] = [];
        const add = (name: string, { x, y }: Point) => labels.push({ name, x, y });
        add('Ground tiles · ' + ARENAS[state.area].name, { x: 190, y: 350 });
        add('Ruined skyline', { x: 323, y: 124 });
        if (state.area === 'street') {
            add('Vesper moon', { x: 106, y: 100 });
            add('Wrecked aircraft', { x: 490, y: 79 });
        } else if (state.area === 'avenue') {
            add('Resonance pylons', { x: 315, y: 87 });
            add('Resonance amplifier', { x: AMPLIFIER.x + 80, y: AMPLIFIER.y - 13 });
            if (state.barrier) add('Rift barrier and core', { x: BARRIER.x, y: BARRIER.y - 35 });
        } else {
            add('Orbital rift and rings', { x: 320, y: 34 });
            add('Crown floor rings', { x: 320, y: 274 });
            add('Waymark pedestal', { x: WAYMARK.x - 60, y: WAYMARK.y + 20 });
            add('Four-slot transmitter', { x: TRANSMITTER.x + 80, y: TRANSMITTER.y - 30 });
            if (state.drake) add('Rift Drake · chest crystal', { x: BOSS_FEET.x + 104, y: BOSS_FEET.y - 47 });
        }
        for (const wall of ARENAS[state.area].cover) {
            add(wall.label, this.room.center(wall, wall.heightAboveGround + 5));
        }
        const gate = ARENAS[state.area].exit;
        if (gate) add('District gate', { x: 592, y: gate.y + gate.height + 6 });
        if (!state.armed) add('Shotgun and blade case', { x: GEAR.x, y: GEAR.y + 14 });
        else add('Kael · shotgun', { x: state.player.x, y: state.player.y + 15 });
        for (const enemy of state.enemies) add('Riftborn', project(enemy.feet, 49));
        const effectNames = {
            hit: 'Impact sparks', dissolve: 'Riftborn dissolve', block: 'Shield impact',
            damage: 'Damage flash', fire: 'Muzzle flash', armor: 'Armor deflection',
            drakeDefeat: 'Drake defeat particles', melee: 'Blade sweep',
        };
        const activeEffect = state.effects.find(({ kind }) => kind === 'melee' || kind === 'drakeDefeat')
            ?? state.effects.find(({ kind }) => kind !== 'fire') ?? state.effects[0];
        if (activeEffect) add(effectNames[activeEffect.kind], { x: activeEffect.at.x, y: activeEffect.at.y - 14 });
        const projectile = state.shots.find(({ kind }) => kind !== 'pellet') ?? state.shots[0];
        if (projectile) {
            const names = { orb: 'Rift Drake orb', cannon: 'Resonance blast', pellet: 'Shotgun pellet' };
            add(names[projectile.kind], { x: projectile.at.x, y: projectile.at.y - 13 });
        }
        if (state.shielding) add('Shield bubble', { x: state.player.x - 45, y: state.player.y - 30 });

        const children = this.assetLabels.list as GameObjects.Text[];
        for (const [index, label] of labels.entries()) {
            const text = children[index] ?? this.scene.add.text(0, 0, '', {
                fontFamily: 'system-ui', fontSize: '10px', color: '#e4eaff', backgroundColor: '#202239',
                padding: { x: 3, y: 1 },
            }).setOrigin(0.5);
            if (!children[index]) this.assetLabels.add(text);
            if (text.text !== label.name) text.setText(label.name);
            text.setPosition(
                Math.max(text.width / 2, Math.min(640 - text.width / 2, label.x)),
                Math.max(8, Math.min(350, label.y)),
            ).setVisible(true);
        }
        for (let index = labels.length; index < children.length; index++) children[index].setVisible(false);
    }

    private drawBackdrop(area: VesperState['area']): void {
        const art = this.backdrop.clear();
        const colors = PALETTES[area];
        art.fillStyle(colors.sky).fillRect(0, 0, 640, 142)
            .fillStyle(colors.haze, 0.49).fillRect(0, 87, 640, 55);
        for (let i = 0; i < 35; i++) {
            art.fillStyle(0xffe7f9, 0.65).fillRect((i * 73 + 13) % 640, (i * 37 + 7) % 100, 2, 1);
        }
        if (area === 'street') {
            art.fillStyle(0xf3b7d0).fillCircle(106, 64, 38)
                .fillStyle(0xc68bb0).fillEllipse(102, 52, 31, 8)
                .fillStyle(0xab8bac).fillTriangle(454, 41, 558, 64, 478, 70);
        } else if (area === 'avenue') {
            for (const x of [113, 314, 530]) {
                art.lineStyle(3, CYAN, 0.55).strokeEllipse(x, 74, 143, 26).lineBetween(x, 74, x, 142);
                art.fillStyle(CYAN, 0.24).fillTriangle(x - 15, 142, x, 56, x + 15, 142);
            }
        } else {
            art.fillStyle(VIOLET, 0.26).fillEllipse(320, 51, 300, 79)
                .lineStyle(3, VIOLET).strokeEllipse(320, 51, 300, 79)
                .lineStyle(2, CYAN, 0.55).strokeEllipse(320, 84, 401, 57)
                .fillStyle(CYAN, 0.3).fillTriangle(294, 142, 320, 18, 346, 142);
        }
        for (let x = 0; x < 640; x += 23) {
            const h = 13 + (x * 11) % 44;
            art.fillStyle(colors.skyline).fillRect(x, 142 - h, 19, h)
                .fillTriangle(x, 142 - h, x + 8, 132 - h, x + 19, 142 - h);
            if (x % 3 === 1) art.fillStyle(0xba9abf).fillRect(x + 6, 147 - h, 3, 4);
        }
        this.room.ground(art, FLOOR, colors.ground);
        if (area === 'crown') {
            art.fillStyle(0x614960).fillEllipse(320, 250, 603, 190)
                .lineStyle(2, VIOLET, 0.56).strokeEllipse(320, 250, 603, 190)
                .strokeEllipse(320, 250, 540, 165).strokeEllipse(320, 250, 479, 141);
        } else {
            for (const y of [213, 267]) art.lineStyle(area === 'avenue' ? 3 : 1, area === 'avenue' ? CYAN : 0xb79ea5, 0.28)
                .lineBetween(0, y, 640, y);
        }
    }

    private drawFixtures(state: VesperState): void {
        const art = this.fixtures;
        if (!state.armed) {
            art.fillStyle(0x454d63).fillRoundedRect(GEAR.x - 19, GEAR.y - 15, 38, 16, 3)
                .lineStyle(2, CYAN).strokeRect(GEAR.x - 18, GEAR.y - 14, 36, 14)
                .fillStyle(0xe3efff).fillRect(GEAR.x - 11, GEAR.y - 10, 11, 4)
                .fillRect(GEAR.x + 3, GEAR.y - 6, 10, 2);
        }
        const gate = ARENAS[state.area].exit;
        if (gate) {
            this.room.outline(this.ground, gate, state.mode === 'exit' ? CYAN : VIOLET);
            if (state.mode !== 'exit') this.room.block(art, gate, COVER_HEIGHT, STONE);
            else art.lineStyle(3, CYAN).strokeEllipse(gate.x + 16, gate.y + 22, 29, 58);
        }
        if (state.area === 'avenue') {
            const { x, y } = AMPLIFIER;
            art.fillStyle(STONE.left).fillEllipse(x, y, 64, 20)
                .fillStyle(CYAN, 0.21).fillEllipse(x, y - 20, 56, 48)
                .lineStyle(2, CYAN).strokeEllipse(x, y - 20, 33, 43);
            if (state.barrier) {
                this.room.surface(this.ground, BARRIER, VIOLET, 0.19);
                const { x, y, width, height } = BARRIER_FACE;
                art.fillStyle(VIOLET, 0.37).fillRoundedRect(x, y, width, height, 9)
                    .lineStyle(2, CYAN).strokeRect(BARRIER_CORE.x, BARRIER_CORE.y, BARRIER_CORE.width, BARRIER_CORE.height);
                if (state.barrier === 1) art.lineStyle(2, 0xffeddc).lineBetween(581, 200, 561, 224).lineBetween(561, 224, 579, 243);
            }
        }
        if (state.area === 'crown') {
            art.fillStyle(STONE.top).fillEllipse(WAYMARK.x, WAYMARK.y + 2, 40, 14);
            if (state.mode === 'waymark') art.fillStyle(0xffdda1)
                .fillTriangle(WAYMARK.x, WAYMARK.y - 32, WAYMARK.x - 9, WAYMARK.y - 17, WAYMARK.x + 9, WAYMARK.y - 17)
                .fillTriangle(WAYMARK.x, WAYMARK.y - 5, WAYMARK.x - 9, WAYMARK.y - 17, WAYMARK.x + 9, WAYMARK.y - 17);
            const { x, y } = TRANSMITTER;
            art.fillStyle(STONE.left).fillEllipse(x, y + 2, 59, 15)
                .fillStyle(STONE.right).fillRect(x - 15, y - 36, 30, 39)
                .fillStyle(STONE.top).fillRoundedRect(x - 35, y - 49, 70, 23, 5)
                .lineStyle(2, 0xb6a1cf).strokeRoundedRect(x - 35, y - 49, 70, 23, 5);
            for (let slot = 0; slot < REQUIRED_WAYMARKS; slot++) {
                const at = x - 24 + slot * 16;
                const inserted = state.mode === 'portal' && state.sequenceTick >= slot * 8;
                art.fillStyle(inserted ? CYAN : 0x241c36)
                    .fillTriangle(at, y - 44, at - 5, y - 37, at + 5, y - 37)
                    .fillTriangle(at, y - 30, at - 5, y - 37, at + 5, y - 37);
            }
        }
    }

    private drawEnemies(state: VesperState): void {
        const ids = new Set(state.enemies.map(({ id }) => id));
        for (const [id, art] of this.monsters) {
            if (ids.has(id)) continue;
            art.destroy();
            this.monsters.delete(id);
        }
        for (const enemy of state.enemies) {
            let art = this.monsters.get(enemy.id);
            if (!art) {
                art = this.scene.add.graphics();
                this.monsters.set(enemy.id, art);
            }
            const { x, y } = project(enemy.feet);
            const stride = Math.round(Math.sin(enemy.walk * 0.23) * 4);
            art.clear().setDepth(y).fillStyle(0x251a34, 0.74).fillEllipse(x, y, 31, 8)
                .fillStyle(enemy.flash ? CYAN : 0x9c69b4).fillRoundedRect(x - 11, y - 21, 8, 19 + stride, 3)
                .fillRoundedRect(x + 3, y - 21, 8, 19 - stride, 3).fillRoundedRect(x - 12, y - 34, 24, 22, 5)
                .fillRoundedRect(x - 17, y - 32, 8, 22, 4).fillRoundedRect(x + 9, y - 32, 8, 22, 4)
                .fillStyle(0x482c5c).fillCircle(x, y - 36, 8)
                .fillStyle(CYAN).fillRect(x - 5, y - 37, 3, 2).fillRect(x + 2, y - 37, 3, 2);
            if (enemy.windup) {
                this.ground.fillStyle(WARNING, 0.17).fillCircle(x, y, CLAW_RANGE)
                    .lineStyle(2, WARNING).strokeCircle(x, y, CLAW_RANGE);
                art.fillStyle(WARNING).fillRect(x - 1, y - 55, 2, 7).fillRect(x - 1, y - 46, 2, 2);
            }
        }
    }

    private drawDrake(state: VesperState): void {
        const art = this.drake.clear().setDepth(BOSS_FEET.y);
        const boss = state.drake;
        const fade = state.effects.find(({ kind }) => kind === 'drakeDefeat');
        if (!boss && !fade) return;
        art.setAlpha(fade ? Math.min(1, fade.ticks / 85) : 1);
        const { x, y } = project(BOSS_FEET, boss?.lift);
        const chest = y - 51;
        this.ground.fillStyle(0x171226, 0.64).fillEllipse(x, BOSS_FEET.y, 153, 21);
        for (const side of [-1, 1]) {
            art.fillStyle(0x38284d).fillPoints([
                { x, y: chest }, { x: x + side * 103, y: y - 103 },
                { x: x + side * 79, y: y - 56 }, { x: x + side * 116, y: y - 32 },
                { x: x + side * 25, y: y - 26 },
            ].map(({ x, y }) => new PhaserMath.Vector2(x, y)), true);
            art.fillRoundedRect(x + side * 35 - 6, y - 49, 12, 31, 5)
                .fillRoundedRect(x + side * 21 - 6, y - 41, 12, 32, 5);
        }
        art.fillStyle(boss?.warning ? 0x8c6098 : 0x664475).fillEllipse(x, chest, 69, 65)
            .fillRoundedRect(x - 21, y - 109, 42, 27, 7)
            .fillTriangle(x - 8, y - 102, x - 30, y - 102, x - 26, y - 127)
            .fillTriangle(x + 8, y - 102, x + 30, y - 102, x + 26, y - 127)
            .fillStyle(WARNING).fillRect(x - 12, y - 98, 5, 3).fillRect(x + 7, y - 98, 5, 3)
            .fillStyle(boss?.open ? CYAN : VIOLET)
            .fillTriangle(x, chest - 17, x - 17, chest, x + 17, chest)
            .fillTriangle(x, chest + 17, x - 17, chest, x + 17, chest);
        if (boss && !boss.open) art.lineStyle(3, 0x442c54)
            .lineBetween(x - 22, chest - 12, x + 22, chest - 12).lineBetween(x - 22, chest + 11, x + 22, chest + 11);
    }

    private drawCombat(state: VesperState): void {
        for (const { x, y } of state.spawns) this.ground.lineStyle(2, WARNING).strokeCircle(x, y, 18)
            .lineBetween(x - 9, y - 9, x + 9, y + 9).lineBetween(x + 9, y - 9, x - 9, y + 9);
        if (state.drake?.warning) this.drawWarning(state.drake.warning, false, state.drake.muzzle);
        if (state.impact) this.drawWarning(state.impact, true);
        for (const { at, kind, vector } of state.shots) {
            const color = kind === 'orb' ? VIOLET : CYAN;
            const radius = kind === 'cannon' ? 8 : kind === 'orb' ? 6 : 3;
            this.fx.lineStyle(radius, color, 0.48)
                .lineBetween(at.x, at.y, at.x - vector.x * 12, at.y - vector.y * 12)
                .fillStyle(color).fillCircle(at.x, at.y, radius);
        }
        for (const { at, kind, ticks } of state.effects) {
            if (kind === 'melee') {
                this.fx.lineStyle(3, 0xffeda9, ticks / 13).strokeEllipse(at.x, at.y, 30, 20)
                    .lineBetween(at.x - 13, at.y + 6, at.x + 13, at.y - 6);
                continue;
            }
            const color = kind === 'damage' ? WARNING : ['dissolve', 'drakeDefeat', 'armor'].includes(kind) ? VIOLET : CYAN;
            const spread = (kind === 'drakeDefeat' ? 68 : kind === 'dissolve' ? 25 : 12) * (1 - Math.min(ticks, 80) / 108);
            for (let index = 0; index < (kind === 'drakeDefeat' ? 18 : 6); index++) {
                const angle = index * 2.4;
                this.fx.fillStyle(color, Math.min(1, ticks / 12)).fillCircle(
                    at.x + Math.cos(angle) * spread, at.y + Math.sin(angle) * spread, 2,
                );
            }
        }
    }

    private drawWarning(attack: DrakeAttack, impact: boolean, muzzle?: Point): void {
        if (attack.kind === 'orb') {
            if (muzzle) this.fx.lineStyle(1, VIOLET, 0.72)
                .lineBetween(muzzle.x, muzzle.y, attack.target.x, attack.target.y - 18);
            return;
        }
        const art = this.ground.lineStyle(2, WARNING).fillStyle(WARNING, impact ? 0.55 : 0.23);
        if (attack.kind === 'beam') {
            const { x, y, width, height } = attack.lane;
            art.fillRect(x, y, width, height).strokeRect(x, y, width, height);
            for (let offset = 4; offset < height - 14; offset += 18) art.lineBetween(x, y + offset + 14, x + width, y + offset);
        } else {
            const { x, y } = attack.target;
            art.fillCircle(x, y, SHOCK_RADIUS).strokeCircle(x, y, SHOCK_RADIUS)
                .strokeCircle(x, y, SHOCK_RADIUS - 13).strokeCircle(x, y, SHOCK_RADIUS - 26);
        }
    }
}
