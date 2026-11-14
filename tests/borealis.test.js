import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BorealisSimulation } from '../src/game/worlds/borealis/simulation.ts';
import { borealis } from '../src/game/worlds/borealis/layout.ts';
import { Journey } from '../src/game/worlds/journey.ts';

function startBorealis() {
    const journey = new Journey();
    journey.findMap();
    journey.collectWaymark('hermes');
    journey.collectWaymark('viridia');
    return new BorealisSimulation(borealis, journey);
}

function walk(game, axis, target, tolerance = 2.25) {
    const direction = Math.sign(target - game.player[axis]);
    for (let i = 0; i < 1200 && direction * (target - game.player[axis]) > tolerance; i++) {
        game.step(axis === 'x' ? direction : 0, axis === 'y' ? direction : 0);
    }
    assert.ok(Math.abs(game.player[axis] - target) <= tolerance, `Could not reach ${axis}=${target} from ${JSON.stringify(game.player)}`);
}

function wait(game, ticks) {
    for (let i = 0; i < ticks; i++) game.step(0, 0);
}

function toBasin(game) {
    walk(game, 'x', borealis.areas.pass.vane.x);
    game.reverseWind();
    wait(game, 120);
    assert.equal(game.state.drift, 1);
    walk(game, 'x', borealis.areas.basin.entry.x);
    assert.equal(game.state.area, 'basin');
}

function openGate(game) {
    walk(game, 'x', 4230);
    walk(game, 'y', 201);
    game.interact();
    wait(game, 30);
    assert.equal(game.state.block, 1);
    walk(game, 'y', 278);
    walk(game, 'x', borealis.areas.basin.vane.x);
    game.reverseWind();
    wait(game, 250);
    assert.equal(game.state.basinPlate, true);
    assert.equal(game.state.gate, 1);
}

test('Windward Pass teaches proximity, separate controls, and reversible clearing', () => {
    const game = startBorealis();
    game.reverseWind();
    assert.equal(game.state.wind.pass, 1);
    walk(game, 'x', borealis.areas.pass.vane.x);
    game.interact();
    wait(game, 30);
    assert.equal(game.state.drift, 0);
    game.reverseWind();
    wait(game, 30);
    const partial = game.state.drift;
    assert.ok(partial > 0 && partial < 1);
    game.reverseWind();
    wait(game, 90);
    assert.equal(game.state.drift, partial);
    game.rewind();
    assert.deepEqual(game.player, borealis.areas.pass.entry);
    assert.ok(game.state.echo);
    assert.equal(game.state.drift, partial);
    game.restart();
    assert.equal(game.state.echo, undefined);
    assert.equal(game.state.drift, 0);
    toBasin(game);
    walk(game, 'x', 3620);
    game.restart();
    assert.equal(game.state.drift, 1);
});

test('the optional ice etching accepts a local soft pulse and leaves the main route untouched', () => {
    const game = startBorealis();
    game.sound('soft');
    assert.equal(game.state.etching, false);
    walk(game, 'x', 3395);
    walk(game, 'y', 271);
    assert.equal(game.needsMicrophone, true);
    game.sound('loud');
    assert.equal(game.state.etching, false);
    game.sound('soft');
    assert.equal(game.state.etching, true);
    assert.equal(game.needsMicrophone, false);
    assert.equal(game.state.drift, 0);
    assert.equal(game.state.waymarks, 2);
});

test('the Frozen Basin sled stops at the block and the ice glide respects collision and wind independence', () => {
    const game = startBorealis();
    const other = startBorealis();
    for (const level of [game, other]) {
        toBasin(level);
        walk(level, 'x', borealis.areas.basin.vane.x);
        walk(level, 'y', 245);
    }
    game.reverseWind();
    for (const level of [game, other]) {
        for (let i = 0; i < 15; i++) level.step(1, 0);
    }
    assert.deepEqual(game.player, other.player);
    const glideStart = game.player.x;
    wait(game, 120);
    assert.ok(game.player.x > glideStart && game.player.x - glideStart < 10);
    assert.equal(game.state.basinSled, borealis.iceBlock.body.x - 18);
    assert.equal(game.state.gate, 0);
    walk(game, 'x', 4230);
    for (let i = 0; i < 70; i++) game.step(0, -1);
    assert.ok(game.player.y >= borealis.iceBlock.body.y + borealis.iceBlock.body.height + 7);
    const stopped = game.player;
    wait(game, 20);
    assert.deepEqual(game.player, stopped);
    game.restart();
    assert.deepEqual(game.player, borealis.areas.basin.entry);
    assert.equal(game.state.basinSled, borealis.basinTrack.start);
    openGate(game);
    game.restart();
    assert.equal(game.state.gate, 1);
    assert.equal(game.state.block, 1);
});

test('Twin Winds requires simultaneous occupancy and ends with one new Waymark', () => {
    const game = startBorealis();
    toBasin(game);
    openGate(game);
    walk(game, 'x', 5480);
    walk(game, 'y', 225);
    assert.equal(game.state.area, 'summit');
    assert.equal(game.state.leftSled, borealis.summitTracks[0].start);
    game.interact();
    assert.equal(game.state.finished, false);
    assert.equal(game.state.waymarks, 2);

    walk(game, 'y', 269);
    walk(game, 'x', 5010);
    game.reverseWind();
    wait(game, 180);
    assert.equal(game.state.leftPlate, true);
    assert.equal(game.state.rightPlate, false);
    game.reverseWind();
    wait(game, 180);
    assert.equal(game.state.leftPlate, false);
    assert.equal(game.state.rightPlate, true);
    assert.equal(game.state.monument, 0);
    game.restart();
    assert.equal(game.state.leftSled, borealis.summitTracks[0].start);
    assert.equal(game.state.rightSled, borealis.summitTracks[1].start);
    assert.equal(game.state.wind.summit, 1);

    walk(game, 'y', 269);
    walk(game, 'x', 5010);
    game.reverseWind();
    wait(game, 180);
    walk(game, 'y', 136);
    walk(game, 'x', 4880);
    game.interact();
    wait(game, 30);
    assert.equal(game.state.windbreak, 1);
    walk(game, 'x', 5010);
    walk(game, 'y', 269);
    game.reverseWind();
    wait(game, 160);
    assert.equal(game.state.leftPlate, true);
    assert.equal(game.state.rightPlate, true);
    assert.ok(game.state.monument > 0);
    wait(game, 90);
    assert.equal(game.state.monument, 1);

    walk(game, 'x', 5290);
    walk(game, 'y', 225);
    game.interact();
    game.interact();
    assert.equal(game.state.waymarks, 3);
    assert.equal(game.state.finished, false);
    game.restart();
    assert.equal(game.state.waymarks, 3);
    assert.equal(game.state.monument, 1);
    walk(game, 'y', 252);
    walk(game, 'x', 5470);
    walk(game, 'y', 225);
    game.interact();
    assert.equal(game.state.finished, true);
    assert.equal(game.state.echo, undefined);
    assert.equal(game.state.etching, false);
});
