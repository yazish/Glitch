import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Microphone } from '../src/game/input/microphone.ts';

function browserAudio(t, getUserMedia) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { mediaDevices: { getUserMedia } } });
    t.after(() => Object.defineProperty(globalThis, 'navigator', previous));

    const audio = { volume: 0.005, closed: 0 };
    globalThis.window = { AudioContext: true };
    globalThis.AudioContext = class {
        state = 'running';
        async resume() {}
        async close() { audio.closed++; }
        createAnalyser() {
            return { getFloatTimeDomainData: (samples) => samples.fill(audio.volume) };
        }
        createMediaStreamSource() { return { connect() {} }; }
    };
    t.after(() => {
        delete globalThis.window;
        delete globalThis.AudioContext;
    });
    return audio;
}

function audioStream() {
    const track = Object.assign(new EventTarget(), { stops: 0, stop() { this.stops++; } });
    return { track, getTracks: () => [track], getAudioTracks: () => [track] };
}

test('a microphone stream calibrates and emits a bridge signal without saving audio', async (t) => {
    const stream = audioStream();
    const audio = browserAudio(t, async () => stream);
    const mic = new Microphone();
    await mic.enable();
    assert.equal(mic.status, 'calibrating');
    for (let i = 0; i < 13; i++) assert.equal(mic.poll(50, true), false);
    assert.equal(mic.status, 'ready');

    audio.volume = 0.04;
    for (let i = 0; i < 5; i++) assert.equal(mic.poll(50, false), false);
    for (let i = 0; i < 4; i++) assert.equal(mic.poll(50, true), false);
    assert.equal(mic.poll(50, true), true);
    assert.ok(mic.level > 0.03);

    stream.track.dispatchEvent(new Event('ended'));
    assert.equal(mic.status, 'unavailable');
    assert.equal(stream.track.stops, 1);
    assert.equal(audio.closed, 1);
    assert.equal(mic.poll(50, true), false);
});

test('denied access and a missing device produce distinct statuses', async (t) => {
    let error = 'NotAllowedError';
    const audio = browserAudio(t, async () => { throw new DOMException('', error); });
    const mic = new Microphone();
    await mic.enable();
    assert.equal(mic.status, 'denied');
    error = 'NotFoundError';
    await mic.enable();
    assert.equal(mic.status, 'unavailable');
    assert.equal(audio.closed, 2);
});

test('a stream granted after leaving the room is stopped immediately', async (t) => {
    const stream = audioStream();
    let grant;
    const audio = browserAudio(t, () => new Promise((resolve) => { grant = resolve; }));
    const mic = new Microphone();
    const pending = mic.enable();
    assert.equal(mic.status, 'requesting');
    mic.disable();
    grant(stream);
    await pending;
    assert.equal(mic.status, 'off');
    assert.equal(stream.track.stops, 1);
    assert.equal(audio.closed, 1);
});

test('Viridia samples calibrated Web Audio as a pulse or a sustained signal', async (t) => {
    const stream = audioStream();
    const audio = browserAudio(t, async () => stream);
    const mic = new Microphone();
    await mic.enable();
    for (let i = 0; i < 13; i++) assert.equal(mic.pollViridia(50).sustained, false);
    assert.equal(mic.status, 'ready');

    audio.volume = 0.034;
    for (let i = 0; i < 3; i++) assert.equal(mic.pollViridia(50).sustained, true);
    audio.volume = 0.005;
    assert.equal(mic.pollViridia(50).pulse, 'soft');
    for (let i = 0; i < 2; i++) mic.pollViridia(50);

    audio.volume = 0.14;
    assert.deepEqual(mic.pollViridia(50), { pulse: 'loud', sustained: false });
    assert.deepEqual(mic.pollViridia(50), { pulse: undefined, sustained: false });
    mic.disable();
    assert.equal(stream.track.stops, 1);
    assert.deepEqual(mic.pollViridia(50), { sustained: false });
});
