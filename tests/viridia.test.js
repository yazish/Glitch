import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Adventure } from '../src/game/worlds/adventure.ts';
import { Journey } from '../src/game/worlds/journey.ts';
import { ViridiaSimulation } from '../src/game/worlds/viridia/simulation.ts';
import { viridia } from '../src/game/worlds/viridia/layout.ts';
import { ViridiaSoundDetector } from '../src/game/input/viridia-sound.ts';

const silent = { sustained: false };

function walkthrough(game) {
    const step = (x = 0, y = 0, sound = silent) => game.step(x, y, sound);
    const go = (axis, target) => {
        const direction = Math.sign(target - game.state.player[axis]);
        for (let i = 0; i < 900 && direction * (target - game.state.player[axis]) > 2; i++) {
            step(axis === 'x' ? direction : 0, axis === 'y' ? direction : 0);
        }
        assert.ok(Math.abs(game.state.player[axis] - target) <= 2.25, `Could not reach ${axis}=${target} from ${JSON.stringify(game.state.player)}`);
    };
    const hold = (ticks) => {
        for (let i = 0; i < ticks; i++) step(0, 0, { sustained: true });
    };
    const pulse = (kind) => step(0, 0, { ...silent, pulse: kind });
    return { step, go, hold, pulse };
}

test('Hermes hands off to Viridia on the portal tick and keeps the first Waymark', () => {
    const adventure = new Adventure();
    const move = (count, x = 0, y = 0) => {
        for (let i = 0; i < count; i++) adventure.step(x, y, silent, false);
    };
    const hermes = adventure.hermes;
    move(68, 1);
    adventure.command('activateBridge');
    while (hermes.state.player.x < 608) move(1, 1);
    move(43, 1);
    move(41, 0, -1);
    adventure.command('rewind');
    move(194, 1);
    adventure.command('rewind');
    move(39, 0, -1);
    move(60, 1);
    for (let i = 0; i < 300 && hermes.state.alignedSymbols < 1; i++) move(1);
    assert.equal(hermes.state.alignedSymbols, 1);
    move(28, 1);
    move(32, 0, 1);
    for (let i = 0; i < 300 && hermes.state.alignedSymbols < 2; i++) move(1);
    assert.equal(hermes.state.alignedSymbols, 2);
    move(30, 0, 1);
    move(28, -1);
    for (let i = 0; i < 300 && hermes.state.alignedSymbols < 3; i++) move(1);
    assert.equal(hermes.state.waymarks, 1);
    move(27, 0, -1);
    for (let i = 0; i < 100 && !adventure.viridia; i++) move(1, 1);
    assert.ok(adventure.viridia);
    const arrival = adventure.viridia.state;
    assert.deepEqual(arrival.player, hermes.state.player);
    assert.equal(arrival.waymarks, 1);
    move(1, 1);
    assert.ok(adventure.viridia.state.player.x > arrival.player.x);
    move(20, -1);
    assert.equal(adventure.viridia.state.player.x, arrival.player.x);

    // Walk the input coordinator through the first two sound props.
    move(135, 1);
    adventure.command('interact');
    move(37, 0, 1);
    move(26, 0, -1);
    move(106, 1);
    adventure.command('activateBridge');
    adventure.step(0, 0, { pulse: 'soft', sustained: false }, false);
    assert.equal(adventure.viridia.state.flowersOpen, true);
    move(171, 1);
    adventure.command('interact');
    assert.equal(adventure.viridia.state.aligned, true);
    adventure.command('activateBridge');
    adventure.step(0, 0, { pulse: 'loud', sustained: false }, false);
    assert.equal(adventure.viridia.state.rootHits, 1);
    for (let i = 0; i < 20; i++) adventure.step(0, 0, silent, true);
    assert.equal(adventure.viridia.state.rootHits, 1);
});

test('the entire Viridia route needs the correct sounds and an Echo, and survives resets', () => {
    const journey = new Journey();
    journey.findMap();
    journey.collectWaymark('hermes');
    const game = new ViridiaSimulation(viridia, journey, { x: 1240, y: 224, facing: 'right' });
    const { step, go, hold, pulse } = walkthrough(game);

    go('x', 1530);
    for (let i = 0; i < 45; i++) step(1);
    assert.ok(game.state.player.x < viridia.log.x);
    game.interact();
    for (let i = 0; i < 40; i++) step(0, 1);
    assert.equal(game.state.logMoved, true);
    go('y', 224);
    go('x', 1750);
    pulse('loud');
    assert.equal(game.state.flowersOpen, false);
    pulse('soft');
    assert.equal(game.state.flowersOpen, true);

    go('x', 2125);
    pulse('loud');
    assert.equal(game.state.rootHits, 0);
    game.interact();
    assert.equal(game.state.aligned, true);
    pulse('loud');
    hold(190);
    assert.equal(game.state.rootHits, 1);
    pulse('loud');
    assert.equal(game.state.rootHits, 2);
    go('x', 2355);
    hold(179);
    assert.equal(game.state.vinesOpen, false);
    hold(1);
    assert.equal(game.state.vinesOpen, true);
    go('x', 2570);
    assert.equal(game.state.area, 'heart');
    go('x', 2365);
    assert.equal(game.state.area, 'trail');

    go('y', 155);
    go('x', 2890);
    pulse('loud');
    assert.equal(game.state.fractureHits, 0);
    go('x', 2720);
    pulse('soft');
    go('x', 2890);
    pulse('loud');
    pulse('loud');
    go('y', 275);
    go('x', 2815);
    hold(60);
    step();
    assert.ok(game.state.resonanceCharge > 0 && game.state.resonanceCharge < 1 / 3);
    hold(121);
    assert.equal(game.state.treeAwake, true);
    assert.equal(game.state.waymarks, 1);

    go('x', 3015);
    go('y', 225);
    game.interact();
    assert.equal(game.state.collected, false);

    game.restart();
    assert.equal(game.state.treeAwake, true);
    assert.equal(game.state.resonanceCharge, 1);
    assert.equal(game.state.vinesOpen, true);
    go('y', 265);
    go('x', 2690);
    assert.equal(game.state.sealOpen, false);
    game.rewind();
    for (let i = 0; i < 200; i++) step();
    assert.equal(game.state.sealOpen, true);
    go('y', 240);
    go('x', 3015);
    game.interact();
    game.interact();
    assert.equal(game.state.waymarks, 2);
    game.restart();
    assert.equal(game.state.waymarks, 2);
    go('x', 2550);
    game.interact();
    assert.equal(game.state.finished, true);
    const before = game.state.player.x;
    step(1);
    assert.ok(game.state.player.x > before);
});

test('sound detection distinguishes short quiet sounds, loud onsets and a held hum', () => {
    const detector = new ViridiaSoundDetector();
    const sample = (volume) => detector.update(volume, 0.004, 50);
    sample(0.035);
    sample(0.036);
    assert.equal(sample(0).pulse, 'soft');
    sample(0);
    sample(0);
    sample(0.025);
    assert.equal(sample(0.14).pulse, 'loud');
    for (let i = 0; i < 20; i++) assert.equal(sample(0.14).pulse, undefined);
    for (let i = 0; i < 3; i++) sample(0);
    for (let i = 0; i < 60; i++) assert.equal(sample(0.035).sustained, true);
    assert.deepEqual(sample(0), { pulse: undefined, sustained: false });
});
