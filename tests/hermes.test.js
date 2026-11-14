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

function solveCircularMachine(game) {
    move(game, 194, 1);
    assert.equal(game.state.controlHeld, true);
    assert.equal(game.state.echo, undefined);

    game.command('rewind');
    assert.equal(game.state.alignedSymbols, 0);

    move(game, 39, 0, -1);
    move(game, 60, 1, 0);
    while (game.state.alignedSymbols < 1) move(game, 1);
    assert.equal(game.state.constellations, 1);

    move(game, 28, 1, 0);
    move(game, 32, 0, 1);
    while (game.state.alignedSymbols < 2) move(game, 1);
    assert.equal(game.state.constellations, 2);

    move(game, 30, 0, 1);
    move(game, 28, -1, 0);
    while (game.state.alignedSymbols < 3) move(game, 1);
    assert.equal(game.state.constellations, 3);
    assert.equal(game.state.waymarks, 1);
    assert.equal(game.state.canDepart, true);
}

test('walk timing follows movement, stops at a wall, and resets on restart', () => {
    const game = new HermesSimulation(hermes);
    assert.equal(game.state.playerWalkTicks, 0);
    move(game, 12, 1);
    assert.equal(game.state.playerWalkTicks, 12);
    move(game, 1);
    assert.equal(game.state.playerWalkTicks, 0);

    move(game, 100, -1);
    const wallPosition = game.state.player.x;
    move(game, 1, -1);
    assert.equal(game.state.player.x, wallPosition);
    assert.equal(game.state.playerWalkTicks, 0);

    move(game, 2, 1, 1);
    assert.equal(game.state.playerWalkTicks, 2);
    game.command('restart');
    assert.equal(game.state.playerWalkTicks, 0);
});

test('the Echo replays walk phases and pauses, then idles at its last pose', () => {
    const game = inChamber();
    const recorded = [{ pose: game.state.player, walkTicks: game.state.playerWalkTicks }];
    for (const vertical of [-1, -1, 0, 0, -1, -1]) {
        move(game, 1, 0, vertical);
        recorded.push({ pose: game.state.player, walkTicks: game.state.playerWalkTicks });
    }

    game.command('rewind');
    assert.equal(game.state.playerWalkTicks, 0);
    for (const frame of recorded) {
        assert.deepEqual(game.state.echo, frame.pose);
        assert.equal(game.state.echoWalkTicks, frame.walkTicks);
        move(game, 1);
    }
    assert.deepEqual(game.state.echo, recorded.at(-1).pose);
    assert.equal(game.state.echoWalkTicks, 0);
});

test('the bridge requires proximity, enlarges the safe crossing box, and drops players who cross outside it', () => {
    const game = new HermesSimulation(hermes);
    game.command('activateBridge');
    assert.equal(game.state.bridgeOpen, false);
    move(game, 68, 1);
    assert.equal(game.state.hasMap, true);

    // Attempting to cross the rift without the bridge drops the player back to spawn.
    for (let tick = 0; tick < 25 && !game.state.fellInRift; tick++) move(game, 1, 1);
    assert.equal(game.state.fellInRift, true);
    assert.equal(game.state.fallCount, 1);
    assert.equal(game.state.playerWalkTicks, 0);
    assert.deepEqual(game.state.player, hermes.outpost.spawn);

    // Attempting to cross outside the enlarged bridge bounds (y: 168..280) also drops the player.
    move(game, 68, 1);
    game.command('activateBridge');
    move(game, 43, 0, -1);
    for (let tick = 0; tick < 25 && !game.state.fellInRift; tick++) move(game, 1, 1);
    assert.equal(game.state.fellInRift, true);
    assert.equal(game.state.fallCount, 2);
    assert.deepEqual(game.state.player, hermes.outpost.spawn);

    // Crossing inside the enlarged bridge box holds while occupied and secures the bridge.
    move(game, 68, 1);
    game.command('activateBridge');
    move(game, 359);
    assert.equal(game.state.bridgeOpen, true);
    move(game, 1);
    assert.equal(game.state.bridgeOpen, false);

    game.command('activateBridge');
    move(game, 24, 1);
    assert.ok(game.state.player.x > hermes.outpost.bridge.x);
    move(game, 360);
    assert.equal(game.state.bridgeOpen, true);
    move(game, 35, 1);
    assert.equal(game.state.bridgeOpen, true);
    assert.equal(game.state.bridgePermanent, true);
    assert.ok(game.state.player.x > 352);
});

test('rewind resets the chamber, an Echo holds the gate and pillar control, and aligning 3 symbols projects constellations', () => {
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

    solveCircularMachine(game);

    game.command('restart');
    assert.equal(game.state.echo, undefined);
    assert.equal(game.state.waymarks, 1);
    assert.equal(game.state.gateOpen, true);
    move(game, 300, 1);
    assert.equal(game.state.screen, 'complete');
    assert.equal(game.state.waymarks, 1);
});

test('illuminating a symbol out of order resets the circular machine alignment progress', () => {
    const game = inChamber();
    reachPlate(game);
    game.command('rewind');
    move(game, 194, 1);
    game.command('rewind');

    move(game, 39, 0, -1);
    move(game, 60, 1, 0);
    while (game.state.alignedSymbols < 1) move(game, 1);
    assert.equal(game.state.alignedSymbols, 1);

    move(game, 62, 0, 1);
    while (game.state.shadowSymbol !== 2) move(game, 1);
    move(game, 1);
    assert.equal(game.state.alignedSymbols, 0);
    assert.equal(game.state.constellations, 0);
});

test('a second rewind replaces the single Echo, zero-tick R spam is ignored, and restart clears it', () => {
    const game = inChamber();
    const checkpoint = game.state.player;
    reachPlate(game);
    game.command('rewind');

    // Immediate R spam on tick 0 is ignored and preserves the active Echo.
    game.command('rewind');
    game.command('rewind');
    move(game, 90);
    assert.equal(game.state.plateHeld, true);

    // Rewinding after moving replaces the single Echo with the new stationary run.
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
