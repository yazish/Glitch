import assert from 'node:assert/strict';
import test from 'node:test';
import { VesperMicrophone } from '../src/game/worlds/vesper/microphone.ts';

test('Vesper detects a quiet snap and rearms only after silence', async (t) => {
    const navigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    const track = Object.assign(new EventTarget(), { stop: t.mock.fn() });
    const getTracks = () => [track];
    Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: { mediaDevices: { getUserMedia: async () => ({ getTracks, getAudioTracks: getTracks }) } },
    });
    let peak = 0.005;
    globalThis.AudioContext = class {
        state = 'running';
        async resume() {}
        async close() {}
        createAnalyser() {
            return { getFloatTimeDomainData(samples) { samples.fill(0.005); samples[0] = peak; } };
        }
        createMediaStreamSource() { return { connect() {} }; }
    };
    globalThis.window = { AudioContext: globalThis.AudioContext };
    t.after(() => {
        Object.defineProperty(globalThis, 'navigator', navigator);
        delete globalThis.window;
        delete globalThis.AudioContext;
    });

    const microphone = new VesperMicrophone();
    await microphone.enable();
    for (let frame = 0; frame < 13; frame++) assert.equal(microphone.pollCannon(50), false);
    assert.equal(microphone.status, 'ready');

    peak = 0.032;
    assert.equal(microphone.pollCannon(16), true);
    for (let frame = 0; frame < 20; frame++) assert.equal(microphone.pollCannon(16), false);
    peak = 0.005;
    for (let frame = 0; frame < 5; frame++) assert.equal(microphone.pollCannon(16), false);
    peak = 0.032;
    assert.equal(microphone.pollCannon(16), true);

    microphone.disable();
    assert.equal(track.stop.mock.callCount(), 1);
    assert.equal(microphone.pollCannon(16), false);
});
