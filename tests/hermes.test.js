import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hermes } from '../src/game/worlds/hermes/room.ts';
import { HermesSimulation } from '../src/game/worlds/hermes/simulation.ts';
import { HumDetector } from '../src/game/input/hum-detector.ts';

function move(game, ticks, horizontal = 0, vertical = 0) {
    for (let tick = 0; tick < ticks; tick++) game.step(horizontal, vertical);
}

function atReceiver() {
    const game = new HermesSimulation(hermes);
    move(game, 68, 1);
    return game;
}

function inChamber() {
    const game = atReceiver();
    game.command('activateBridge');
    while (game.state.screen === 'outpost' && game.state.player.x < 542) move(game, 1, 1);
    assert.equal(game.state.screen, 'chamber');
    game.command('restart');
    return game;
}

test('the bridge requires proximity, closes after six seconds, and holds while occupied', () => {
    const game = new HermesSimulation(hermes);
    game.command('activateBridge');
    assert.equal(game.state.bridgeOpen, false);
    move(game, 68, 1);
    assert.equal(game.state.hasMap, true);

    move(game, 55, 1);
    assert.ok(game.state.player.x <= 281, 'the gap blocks movement');
    game.command('activateBridge');
    move(game, 359);
    assert.equal(game.state.bridgeOpen, true);
    move(game, 1);
    assert.equal(game.state.bridgeOpen, false);

    game.command('activateBridge');
    move(game, 10, 1);
    assert.ok(game.state.player.x > 288);
    move(game, 360);
    assert.equal(game.state.bridgeOpen, true);
    move(game, 35, 1);
    assert.equal(game.state.bridgeOpen, false);
    assert.ok(game.state.player.x > 352);
});

test('rewind resets the chamber and an Echo holds the gate for the Waymark route', () => {
    const game = inChamber();
    move(game, 170, 1);
    assert.ok(game.state.player.x <= 409);
    game.command('restart');

    move(game, 28, 1);
    move(game, 41, 0, -1);
    assert.equal(game.state.gateOpen, true);
    game.command('rewind');
    assert.deepEqual(game.state.player, hermes.chamber.spawn);
    assert.equal(game.state.gateOpen, false);
    move(game, 177, 1);
    assert.equal(game.state.echo?.facing, 'up');
    assert.equal(game.state.plateHeld, true);
    assert.equal(game.state.waymarks, 1);
    game.command('restart');
    assert.equal(game.state.echo, undefined);
    assert.equal(game.state.waymarks, 1);
    assert.equal(game.state.gateOpen, true);
    move(game, 205, 1);
    assert.equal(game.state.screen, 'complete');
    assert.equal(game.state.waymarks, 1);
});

test('a second rewind replaces the original Echo and restart clears it', () => {
    const game = inChamber();
    move(game, 28, 1);
    move(game, 41, 0, -1);
    game.command('rewind');
    move(game, 70);
    assert.equal(game.state.plateHeld, true);

    game.command('rewind');
    move(game, 70);
    assert.deepEqual(game.state.echo, hermes.chamber.spawn);
    assert.equal(game.state.gateOpen, false);
    game.command('restart');
    assert.equal(game.state.echo, undefined);
    assert.equal(game.state.hasMap, true);
});

test('the gate stays open until Kael clears it when an Echo leaves the plate', () => {
    const game = inChamber();
    move(game, 28, 1);
    move(game, 41, 0, -1);
    move(game, 74);
    move(game, 15, 0, -1);
    game.command('rewind');

    move(game, 145, 1);
    assert.ok(game.state.player.x > 416 && game.state.player.x < 440);
    move(game, 10);
    assert.equal(game.state.plateHeld, false);
    assert.equal(game.state.gateOpen, true);
    move(game, 13, 1);
    assert.ok(game.state.player.x > 447);
    assert.equal(game.state.gateOpen, false);
});

test('hum detection calibrates, requires proximity and duration, and rearms after quiet', () => {
    const detector = new HumDetector();
    for (let i = 0; i < 13; i++) assert.equal(detector.update(0.005, 50, true), false);
    assert.equal(detector.calibrating, false);
    assert.equal(detector.update(0.009, 500, true), false);
    assert.equal(detector.update(0.04, 500, false), false);
    for (let i = 0; i < 4; i++) assert.equal(detector.update(0.04, 50, true), false);
    assert.equal(detector.update(0.04, 50, true), true);
    assert.equal(detector.update(0.04, 50, true), false);
    assert.equal(detector.update(0.005, 150, true), false);
    for (let i = 0; i < 4; i++) assert.equal(detector.update(0.04, 50, true), false);
    assert.equal(detector.update(0.04, 50, true), true);
});
