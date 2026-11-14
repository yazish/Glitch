import type { GameObjects, Scene } from 'phaser';
import type { Point } from '../worlds/geometry';
import { AMPLIFIER, ARENAS, BARRIER, BARRIER_CORE, BARRIER_FACE, BOSS_FEET, FLOOR, GEAR,
    PORTAL_OPEN_TICKS, REQUIRED_WAYMARKS, TRANSMITTER, WAYMARK, ZONES } from '../worlds/vesper/layout';
import { vesperGuidance } from '../worlds/vesper/guidance';
import { SHOCK_RADIUS } from '../worlds/vesper/drake';
import type { DrakeAttack } from '../worlds/vesper/drake';
import { CLAW_RANGE } from '../worlds/vesper/riftborn';
import { FACING_VECTOR, project } from '../worlds/vesper/space';
import type { VesperState } from '../worlds/vesper/simulation';
import { CharacterView } from './CharacterView';
import { RoomProjection } from './RoomProjection';
import { VesperCinematic } from './VesperCinematic';
import { VesperCityArt } from './VesperCityArt';
import { VesperDragonArt } from './VesperDragonArt';
import { VesperFireEffects } from './VesperFireEffects';
import { VesperEnemyArt } from './VesperEnemyArt';

const CYAN = 0x81f9ee;
const VIOLET = 0xb976ff;
const WARNING = 0xb8a1ff;
const STONE = { top: 0x766783, left: 0x332a44, right: 0x45374f };
const PALETTES = {
    street: { sky: 0x30204e, haze: 0x815480, ground: 0x3b3049, skyline: 0x392844 },
    avenue: { sky: 0x172c43, haze: 0x3a8388, ground: 0x283c49, skyline: 0x223943 },
    crown: { sky: 0x271735, haze: 0x894668, ground: 0x453345, skyline: 0x3d2648 },
};

export class VesperView {
    private readonly room = new RoomProjection(FLOOR);
    private readonly city: VesperCityArt;
    private readonly backdrop: GameObjects.Graphics;
    private readonly ground: GameObjects.Graphics;
    private readonly fixtures: GameObjects.Graphics;
    private readonly fx: GameObjects.Graphics;
    private readonly kael: CharacterView;
    private readonly double: CharacterView;
    private readonly drake: VesperDragonArt;
    private readonly fire: VesperFireEffects;
    private readonly pickupGun: GameObjects.Image;
    private readonly pickupBlade: GameObjects.Image;
    private readonly districtGate: GameObjects.Image;
    private readonly marker: GameObjects.Text;
    private readonly calibration: GameObjects.Text;
    private readonly calibrationFeedback: GameObjects.Text;
    private readonly calibrationArt: GameObjects.Graphics;
    private readonly cinematic: VesperCinematic;
    private readonly shotgun: GameObjects.Image;
    private readonly monsters: VesperEnemyArt;
    private area?: VesperState['area'];

    constructor(scene: Scene) {
        this.city = new VesperCityArt(scene);
        this.backdrop = scene.add.graphics().setDepth(-20);
        this.ground = scene.add.graphics().setDepth(-10);
        this.fixtures = scene.add.graphics().setDepth(-5);
        this.fx = scene.add.graphics().setDepth(390);
        this.drake = new VesperDragonArt(scene);
        this.fire = new VesperFireEffects(scene);
        this.monsters = new VesperEnemyArt(scene);
        const pickup = project(GEAR);
        this.pickupGun = scene.add.image(pickup.x - 7, pickup.y - 3, 'vesper-shotgun').setScale(0.8).setDepth(pickup.y);
        this.pickupBlade = scene.add.image(pickup.x + 12, pickup.y + 3, 'vesper-blade').setScale(0.8).setDepth(pickup.y);
        this.districtGate = scene.add.image(0, 0, 'vesper-city-bld_garage2_door_sw_closed')
            .setOrigin(0.5, 1).setScale(0.5).setVisible(false);
        this.shotgun = scene.add.image(0, 0, 'vesper-shotgun').setScale(0.48).setDepth(390).setVisible(false);
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

    render(state: VesperState, delta: number): void {
        if (this.area !== state.area) {
            this.area = state.area;
            this.drawBackdrop(state.area);
            this.city.setArea(state.area);
        }
        this.ground.clear();
        this.fixtures.clear();
        this.fx.clear();
        this.drawFixtures(state);
        const feet = project(state.player);
        this.kael.render({ ...feet, facing: state.player.facing }, feet.y, state.walk, delta);
        this.shotgun.setVisible(state.armed);
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
        this.fire.render(state);
        this.drawCombat(state);
        this.drawGuidance(state);
        this.cinematic.render(state);
    }

    private drawShotgun(feet: Point, facing: VesperState['player']['facing']): void {
        const { x, y } = FACING_VECTOR[facing];
        this.shotgun.setPosition(feet.x + x * 9, feet.y - 21 + y * 6)
            .setRotation(Math.atan2(y, x));
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

    private drawBackdrop(area: VesperState['area']): void {
        const art = this.backdrop.clear();
        const colors = PALETTES[area];
        // A dark base sits behind the layered city skyline.
        art.fillStyle(0x100b1b).fillRect(0, 0, 640, 142);
        for (let band = 0; band < 18; band++) {
            art.fillStyle(0x273675, 0.018 + band * 0.003).fillRect(0, band * 8, 640, 8);
        }
        art.fillStyle(0x514b9e, 0.16).fillEllipse(321, 90, 390, 75)
            .fillStyle(0x101535, 0.38).fillEllipse(320, 105, 640, 54);
        this.room.ground(art, FLOOR, colors.ground);
        if (area === 'crown') {
            art.fillStyle(0x383467).fillEllipse(320, 250, 603, 190)
                .lineStyle(2, VIOLET, 0.56).strokeEllipse(320, 250, 603, 190)
                .strokeEllipse(320, 250, 540, 165).strokeEllipse(320, 250, 479, 141);
        } else {
            for (const y of [213, 267]) art.lineStyle(area === 'avenue' ? 3 : 1, area === 'avenue' ? CYAN : 0x99a6d9, 0.28)
                .lineBetween(0, y, 640, y);
        }
    }

    private drawFixtures(state: VesperState): void {
        const art = this.fixtures;
        const showPickup = state.area === 'street' && !state.armed;
        this.pickupGun.setVisible(showPickup);
        this.pickupBlade.setVisible(showPickup);
        const gate = ARENAS[state.area].exit;
        this.districtGate.setVisible(Boolean(gate));
        if (gate) {
            const at = project({ x: gate.x + gate.width / 2, y: gate.y + gate.height });
            this.districtGate.setPosition(at.x, at.y).setDepth(at.y)
                .setTexture(`vesper-city-bld_garage2_door_sw_${state.mode === 'exit' ? 'open' : 'closed'}`);
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
            if (state.mode === 'waymark') art.fillStyle(0xc0dbff)
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
        this.monsters.render(state.enemies, state.player, state.area);
        for (const enemy of state.enemies) {
            const { x, y } = project(enemy.feet);
            this.ground.fillStyle(0x251a34, 0.55).fillEllipse(x, y, 28, 7);
            if (enemy.windup) {
                this.ground.fillStyle(WARNING, 0.17).fillCircle(x, y, CLAW_RANGE)
                    .lineStyle(2, WARNING).strokeCircle(x, y, CLAW_RANGE);
                this.fx.fillStyle(WARNING).fillRect(x - 1, y - 55, 2, 7).fillRect(x - 1, y - 46, 2, 2);
            }
        }
    }

    private drawDrake(state: VesperState): void {
        this.drake.render(state);
        if (!state.drake) return;
        const boss = state.drake;
        const at = project(BOSS_FEET, boss.lift);
        this.ground.fillStyle(0x171226, 0.64).fillEllipse(at.x, BOSS_FEET.y, 130, 21);
        // Keep the vulnerable point visible and aligned with the simulation hitbox.
        const chest = boss.chest;
        this.fx.fillStyle(boss.open ? CYAN : VIOLET, boss.open ? 0.9 : 0.5)
            .fillCircle(chest.x + chest.width / 2, chest.y + chest.height / 2, boss.open ? 5 : 3);
    }

    private drawCombat(state: VesperState): void {
        for (const { x, y } of state.spawns) this.ground.lineStyle(2, WARNING).strokeCircle(x, y, 18)
            .lineBetween(x - 9, y - 9, x + 9, y + 9).lineBetween(x + 9, y - 9, x - 9, y + 9);
        if (state.drake?.warning) this.drawWarning(state.drake.warning, false, state.drake.muzzle);

        for (const { at, kind, vector } of state.shots) {
            if (kind === 'orb') continue;
            const color = CYAN;
            const radius = kind === 'cannon' ? 8 : 3;
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
            if (muzzle) this.fx.lineStyle(1, 0xa6b8ff, 0.72)
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
