import assert from 'node:assert/strict';
import test from 'node:test';
import { VesperPreviewProgress } from '../src/game/worlds/vesper/progress.ts';
import { Drake, groundAttackHits } from '../src/game/worlds/vesper/drake.ts';
import {
    ABYSS_TICKS, AMPLIFIER, ARENAS, BOSS_FEET, FIRING_POSITION, GEAR, PORTAL, PORTAL_OPEN_TICKS, PORTAL_PULL_TICKS,
    TRANSMITTER, TUNING, WAYMARK, ZONES,
} from '../src/game/worlds/vesper/layout.ts';
import { CLAW_RANGE } from '../src/game/worlds/vesper/riftborn.ts';
import { VesperSimulation } from '../src/game/worlds/vesper/simulation.ts';
import { direction, distance, projectedCover, routeAroundCover, segmentHit } from '../src/game/worlds/vesper/space.ts';

function start(progress = new VesperPreviewProgress()) {
    return new VesperSimulation(progress);
}

function tick(game, input = {}) {
    game.step({ horizontal: 0, vertical: 0, ...input });
}

function until(game, condition, input = () => ({}), budget = 2500) {
    for (let frame = 0; frame < budget; frame++) {
        const state = game.state;
        if (condition(state)) return state;
        tick(game, input(state));
    }
    assert.fail('Timed out at ' + JSON.stringify(game.state).slice(0, 800));
}

function walk(game, to) {
    until(game, ({ player }) => distance(player, to) < 3, ({ player, area }) => {
        const waypoint = routeAroundCover(player, to, ARENAS[area].cover, TUNING.radius);
        const movement = direction(player, waypoint);
        return { horizontal: movement.x, vertical: movement.y };
    }, 380);
}

function street(game) {
    walk(game, GEAR);
    tick(game, { interact: true });
}

function fight(state) {
    const enemy = [...state.enemies].sort((a, b) => distance(a.feet, state.player) - distance(b.feet, state.player))[0];
    if (!enemy) return {};
    const toward = direction(state.player, enemy.feet);
    const horizontal = Math.abs(toward.x) >= Math.abs(toward.y) ? Math.sign(toward.x) : 0;
    const vertical = horizontal ? 0 : Math.sign(toward.y);
    return {
        horizontal: horizontal && state.player.facing !== (horizontal > 0 ? 'right' : 'left') ? horizontal : 0,
        vertical: vertical && state.player.facing !== (vertical > 0 ? 'down' : 'up') ? vertical : 0,
        shield: Boolean(enemy.windup && enemy.windup < 8 && state.shield > 28),
        shoot: true,
        melee: distance(enemy.feet, state.player) <= CLAW_RANGE,
        cannon: state.cannonAllowed,
    };
}

function avenue(game) {
    street(game);
    until(game, ({ mode }) => mode === 'exit', fight);
    walk(game, { x: 351, y: 306 });
    walk(game, { x: 534, y: 306 });
    until(game, ({ area }) => area === 'avenue', () => ({ horizontal: 1 }));
    walk(game, { x: 283, y: 240 });
    walk(game, AMPLIFIER);
    tick(game, { interact: true });
    assert.equal(game.state.mode, 'calibration');
}

function calibrate(game) {
    for (const [round, width] of ZONES.entries()) {
        until(game, ({ needle }) => Math.abs(needle - 0.5) < width / 4);
        tick(game, { interact: true });
        assert.equal(game.state.round, round + 1);
    }
    assert.equal(game.state.mode, 'barrier');
}

function breakBarrier(game) {
    walk(game, FIRING_POSITION);
    tick(game, { horizontal: 1, cannon: true });
    until(game, ({ barrier }) => barrier === 1);
    until(game, ({ cannonAllowed }) => cannonAllowed);
    tick(game, { cannon: true });
    until(game, ({ mode }) => mode === 'wave');
}

function crown(game) {
    avenue(game);
    calibrate(game);
    breakBarrier(game);
    until(game, ({ mode }) => mode === 'exit', fight);
    walk(game, { x: 542, y: 235 });
    walk(game, { x: 572, y: 181 });
    until(game, ({ area }) => area === 'crown', () => ({ horizontal: 1 }));
    until(game, ({ mode }) => mode === 'boss', () => ({ vertical: -1 }));
}

test('cover intercepts a whole shot segment and Riftborn can route around it', () => {
    const wall = ARENAS.street.cover[0];
    const from = { x: 100, y: 183 };
    const to = { x: 305, y: 183 };
    assert.ok(Number.isFinite(segmentHit(from, to, projectedCover(wall))));
    const next = routeAroundCover(from, to, [wall], 9);
    assert.notDeepEqual(next, to);
    assert.equal(segmentHit(from, next, wall), Infinity);
    assert.equal(segmentHit({ x: 100, y: 230 }, { x: 310, y: 230 }, projectedCover(wall)), Infinity);
});

test('K emits one forward pellet and two diagonal pellets only after pickup', () => {
    const game = start();
    tick(game, { shoot: true, melee: true });
    assert.equal(game.state.armed, false);
    assert.equal(game.state.shots.length, 0);
    assert.equal(game.state.shotgunShots, 0);
    assert.equal(game.state.effects.length, 0);

    street(game);
    until(game, ({ enemies }) => enemies.length === 1);
    for (let frame = 0; frame < 25; frame++) tick(game);
    assert.equal(game.state.enemies[0].hp, 3);
    assert.equal(game.state.shots.length, 0);
    tick(game, { horizontal: 1, shoot: true });
    assert.equal(game.state.shotgunShots, 1);
    tick(game, { shoot: true });
    assert.equal(game.state.shotgunShots, 1);
    const [forward, up, down] = game.state.shots;
    assert.equal(game.state.shots.length, 3);
    assert.deepEqual(forward.vector, { x: 1, y: 0 });
    assert.ok(up.vector.x > 0 && up.vector.y < 0);
    assert.equal(down.vector.y, -up.vector.y);
    assert.equal(down.vector.x, up.vector.x);
    until(game, ({ wave }) => wave === 1, fight);
});

test('a diagonal pellet hits an approaching Riftborn off the center line', () => {
    const game = start();
    street(game);
    walk(game, { x: 210, y: 310 });
    tick(game, { horizontal: 1 });
    until(game, ({ enemies }) => enemies.length === 1);
    assert.ok(game.state.player.y - game.state.enemies[0].feet.y > 65);
    tick(game, { shoot: true });
    until(game, ({ enemies }) => enemies[0]?.hp === 3 - TUNING.pelletDamage, () => ({}), 25);
});

test('L defeats a full-health Riftborn in one swing before its claw connects', () => {
    const game = start();
    street(game);
    until(game, ({ enemies }) => enemies[0]?.windup === 1);
    assert.equal(game.state.enemies[0].hp, 3);
    tick(game, { horizontal: 1, melee: true });
    assert.equal(game.state.integrity, 3);
    assert.ok(game.state.effects.some(({ kind }) => kind === 'melee'));
    assert.equal(game.state.enemies.length, 0);
    assert.equal(game.state.wave, 1);
});

test('an enemy spawns on schedule even when Kael is standing in its entry marker', () => {
    const game = start();
    street(game);
    walk(game, { x: 305, y: 226 });
    assert.equal(game.state.enemies.length, 0);
    const player = game.state.player;
    const spawn = until(game, ({ enemies }) => enemies.length === 1, () => ({}), 130);
    assert.equal(spawn.spawns.length, 0);
    assert.deepEqual(spawn.player, player);
    assert.ok(distance(spawn.enemies[0].feet, player) < 5);
    assert.equal(spawn.integrity, 3);
    tick(game, { melee: true });
    assert.equal(game.state.wave, 1);
    assert.equal(game.state.integrity, 3);
});

test('a shield blocks a warned claw, expires when held, and recharges on release', () => {
    const game = start();
    street(game);
    tick(game, { horizontal: -1 });
    until(game, ({ enemies }) => enemies.some(({ windup }) => windup === 1));
    tick(game, { shield: true });
    assert.equal(game.state.integrity, 3);
    assert.equal(game.state.shield, TUNING.shieldCapacity - TUNING.shieldBlock - 1);
    assert.ok(game.state.effects.some(({ kind }) => kind === 'block'));
    for (let frame = 0; frame < 100; frame++) tick(game, { shield: true });
    assert.equal(game.state.shield, 0);
    assert.equal(game.state.shielding, false);
    for (let frame = 0; frame < 16; frame++) tick(game);
    assert.ok(game.state.shield > 0);
});

test('defeat restores integrity and clears shots on the current encounter only', () => {
    const game = start();
    street(game);
    until(game, ({ wave }) => wave === 1, fight);
    tick(game, { horizontal: -1 });
    const hit = until(game, ({ integrity }) => integrity === 2);
    assert.ok(hit.invulnerable > 0);
    for (let frame = 0; frame < 15; frame++) tick(game);
    assert.equal(game.state.integrity, 2);
    until(game, ({ resetCount }) => resetCount === 1, () => ({}), 1700);
    assert.equal(game.state.wave, 1);
    assert.equal(game.state.integrity, 3);
    assert.equal(game.state.shots.length, 0);
    assert.equal(game.state.enemies.length, 0);
    assert.equal(game.state.remaining, 4);
});

test('calibration keeps successful rounds and the barrier ignores shotgun pellets and premature cannon requests', () => {
    const game = start();
    avenue(game);
    const position = game.state.player;
    tick(game, { cannon: true, horizontal: 1, interact: true });
    assert.equal(game.state.round, 0);
    assert.deepEqual(game.state.player, position);
    assert.match(game.state.feedback, /Missed/);
    until(game, ({ needle }) => needle >= 0.48);
    tick(game, { interact: true });
    tick(game, { interact: true });
    assert.equal(game.state.round, 1);
    for (const expected of [2, 3]) {
        until(game, ({ needle }) => needle >= 0.48);
        tick(game, { interact: true });
        assert.equal(game.state.round, expected);
    }
    walk(game, FIRING_POSITION);
    tick(game, { horizontal: -1, cannon: true });
    assert.equal(game.state.cannon, 0);
    tick(game, { horizontal: 1 });
    for (let frame = 0; frame < 60; frame++) tick(game);
    assert.equal(game.state.barrier, 2);
    tick(game, { cannon: true });
    until(game, ({ barrier }) => barrier === 1);
    for (let frame = 0; frame < 80; frame++) tick(game, { cannon: true });
    assert.equal(game.state.barrier, 1);
    until(game, ({ cannonAllowed }) => cannonAllowed);
    tick(game, { cannon: true });
    until(game, ({ mode }) => mode === 'wave');
    assert.equal(game.state.barrier, 0);
    assert.equal(game.state.remaining, 5);
    until(game, ({ wave }) => wave === 1, fight);
    assert.equal(game.state.remaining, 6);
    until(game, ({ remaining }) => remaining === 2, fight);
    assert.equal(game.state.mode, 'wave');
    until(game, ({ mode }) => mode === 'exit', fight);
});

test('Drake armor stays open and attack warnings lock their footprints', () => {
    const drake = new Drake();
    assert.equal(drake.hit(false, 1), 'armor');
    assert.equal(drake.hit(true), 'open');
    assert.equal(drake.hit(false, 1), 'hit');
    const player = { x: 318, y: 290 };
    for (let frame = 0; frame < 450; frame++) drake.step(player);
    assert.equal(drake.open, true);
    assert.equal(drake.hits, 1);
    for (let hit = 0; hit < 3; hit++) drake.hit(false, 1);
    assert.equal(drake.phase, 2);
    assert.equal(drake.open, true);
    for (let frame = 0; frame < 650 && drake.warning?.kind !== 'beam'; frame++) drake.step(player);
    assert.equal(drake.warning.kind, 'beam');
    const lane = drake.warning.lane;
    let attack;
    const dodge = { x: 318, y: 210 };
    for (let frame = 0; !attack && frame < 120; frame++) attack = drake.step(dodge);
    assert.deepEqual(attack.lane, lane);
    assert.equal(groundAttackHits(attack, dodge), false);
    assert.equal(groundAttackHits(attack, player), true);

    for (let hit = 0; hit < 4; hit++) drake.hit(false, 1);
    assert.equal(drake.phase, 3);
    for (let frame = 0; frame < 650 && drake.warning?.kind !== 'shockwave'; frame++) drake.step(player);
    assert.equal(drake.warning.kind, 'shockwave');
    assert.equal(groundAttackHits(drake.warning, player), true);
    assert.equal(groundAttackHits(drake.warning, dodge), false);
});

test('a full run breaks the armor once and uses four Waymarks to open the portal and play the cutscene', () => {
    let waymarkCount = 3;
    const game = start({
        get waymarkCount() { return waymarkCount; },
        collectVesperWaymark() { waymarkCount = 4; },
    });
    crown(game);
    assert.equal(game.state.waymarks, 3);
    assert.equal(game.state.player.facing, 'right');
    assert.ok(game.state.player.x < BOSS_FEET.x);
    tick(game, { cannon: true });
    until(game, ({ drake }) => drake.open);
    tick(game, { restart: true, cannon: true, melee: true });
    assert.equal(game.state.shots.length, 0);
    assert.equal(game.state.cannon, 0);
    assert.equal(game.state.drake.hits, 0);
    assert.equal(game.state.drake.open, true);
    assert.equal(game.state.integrity, 3);
    assert.equal(game.state.barrier, 0);
    tick(game, { vertical: 1 });
    until(game, ({ integrity }) => integrity === 2);
    tick(game, { horizontal: 1 });
    until(game, ({ drake }) => drake.phase === 2, () => ({ shoot: true }));
    assert.equal(game.state.remaining, 2);
    assert.equal(game.state.drake.open, true);
    assert.equal(game.state.shots.length, 0);
    assert.equal(game.state.integrity, 3);
    until(game, ({ remaining }) => remaining === 0, fight);
    tick(game, { horizontal: 1 });
    until(game, ({ mode }) => mode === 'waymark' || game.state.drake?.phase === 3, () => ({ shoot: true }));
    assert.equal(game.state.integrity, 3);
    until(game, ({ mode }) => mode === 'waymark', () => ({ shoot: true }));
    walk(game, WAYMARK);
    tick(game, { interact: true });
    tick(game, { interact: true });
    assert.equal(game.state.waymarks, 4);
    tick(game, { interact: true });
    assert.equal(game.state.mode, 'transmitter');
    walk(game, TRANSMITTER);
    waymarkCount = 3;
    tick(game, { interact: true });
    assert.equal(game.state.mode, 'transmitter');
    waymarkCount = 4;
    tick(game, { interact: true });
    assert.equal(game.state.mode, 'portal');
    const beforePull = game.state.player;
    for (let frame = 0; frame < PORTAL_OPEN_TICKS; frame++) tick(game, { horizontal: -1, restart: true });
    assert.deepEqual(game.state.player, beforePull);
    for (let frame = 0; frame < PORTAL_PULL_TICKS; frame++) tick(game, { horizontal: -1 });
    assert.equal(game.state.mode, 'abyss');
    assert.equal(distance(game.state.player, PORTAL), 0);
    for (let frame = 0; frame < ABYSS_TICKS - 1; frame++) tick(game, { interact: true });
    assert.equal(game.state.mode, 'abyss');
    tick(game);
    assert.equal(game.state.mode, 'arrival');
    assert.equal(game.state.waymarks, 4);
});
