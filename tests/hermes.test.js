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
    while (game.state.player.x < hermes.chamber.startX) {
        const before = game.state.player;
        move(game, 1, 1);
        assert.ok(game.state.player.x > before.x && game.state.player.x - before.x <= 2.25);
        assert.equal(game.state.player.y, before.y);
    }
    assert.equal(game.state.screen, 'chamber');
    return game;
}

function reachPlate(game) {
    const { plate } = hermes.chamber;
    const targetX = plate.x + plate.width / 2;
    const targetY = plate.y + plate.height / 2;
    move(game, Math.round((targetX - game.state.player.x) / 2.25), 1);
    move(game, Math.round((game.state.player.y - targetY) / 2.25), 0, -1);
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
    assert.equal(game.state.bridgeOpen, true);
    assert.equal(game.state.bridgePermanent, true);
    assert.ok(game.state.player.x > 352);
});

test('rewind resets the chamber and an Echo holds the gate for the Waymark route', () => {
    const game = inChamber();
    const checkpoint = game.state.player;
    move(game, 170, 1);
    assert.ok(game.state.player.x <= hermes.chamber.gate.x - 7);
    game.command('restart');

    reachPlate(game);
    assert.equal(game.state.gateOpen, true);
    game.command('rewind');
    assert.deepEqual(game.state.player, checkpoint);
    assert.equal(game.state.gateOpen, false);
    move(game, 194, 1);
    assert.equal(game.state.echo?.facing, 'up');
    assert.equal(game.state.plateHeld, true);
    assert.equal(game.state.waymarks, 1);
    game.command('restart');
    assert.equal(game.state.echo, undefined);
    assert.equal(game.state.waymarks, 1);
    assert.equal(game.state.gateOpen, true);
    move(game, 220, 1);
    assert.equal(game.state.screen, 'complete');
    assert.equal(game.state.waymarks, 1);
});

test('a second rewind replaces the original Echo and restart clears it', () => {
    const game = inChamber();
    const checkpoint = game.state.player;
    reachPlate(game);
    game.command('rewind');
    move(game, 90);
    assert.equal(game.state.plateHeld, true);

    game.command('rewind');
    move(game, 90);
    assert.deepEqual(game.state.echo, checkpoint);
    assert.equal(game.state.gateOpen, false);
    game.command('restart');
    assert.equal(game.state.echo, undefined);
    assert.equal(game.state.hasMap, true);
});

test('the gate stays open until Kobe clears it when an Echo leaves the plate', () => {
    const game = inChamber();
    reachPlate(game);
    move(game, 76);
    move(game, 15, 0, -1);
    game.command('rewind');

    move(game, 159, 1);
    assert.ok(game.state.player.x > hermes.chamber.gate.x && game.state.player.x < hermes.chamber.gate.x + 24);
    move(game, 10);
    assert.equal(game.state.plateHeld, false);
    assert.equal(game.state.gateOpen, true);
    move(game, 14, 1);
    assert.ok(game.state.player.x > hermes.chamber.gate.x + 31);
    assert.equal(game.state.gateOpen, false);
});

test('backtracking crosses the secured bridge and starts a fresh Echo attempt on return', () => {
    const game = inChamber();
    reachPlate(game);
    game.command('rewind');
    assert.ok(game.state.echo);
    move(game, 400);
    move(game, 195, -1);
    assert.equal(game.state.screen, 'outpost');
    assert.equal(game.state.echo, undefined);
    assert.ok(game.state.player.x < hermes.outpost.bridge.x);
    assert.equal(game.state.hasMap, true);
    assert.equal(game.state.bridgePermanent, true);

    game.command('restart');
    assert.deepEqual(game.state.player, hermes.outpost.spawn);
    assert.equal(game.state.bridgeOpen, true);
    move(game, 235, 1);
    assert.equal(game.state.screen, 'chamber');
    assert.equal(game.state.echo, undefined);
    reachPlate(game);
    game.command('rewind');
    move(game, 90);
    assert.equal(game.state.plateHeld, true);
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
