import assert from 'node:assert/strict';
import test from 'node:test';
import { AdventureAudio } from '../src/game/audio/AdventureAudio.ts';

test('audio switches tracks, confines wind to requested scenes, and pauses footsteps when movement stops', () => {
    const originalDocument = globalThis.document;
    const events = {};
    const button = { addEventListener: (name, fn) => { events[name] = fn; }, removeEventListener() {},
        setAttribute() {}, remove() {} };
    globalThis.document = { createElement: () => button, querySelector: () => ({ append() {} }) };
    const sounds = [];
    const scene = {
        cache: { audio: { exists: () => true } },
        sound: { mute: false, add(key) {
            const sound = { key, isPlaying: false, isPaused: false, destroyed: false,
                play(config) { this.isPlaying = true; this.volume = config.volume; },
                stop() { this.isPlaying = false; this.isPaused = false; },
                setVolume(value) { this.volume = value; }, pause() { this.isPlaying = false; this.isPaused = true; },
                resume() { this.isPlaying = true; this.isPaused = false; }, destroy() { this.destroyed = true; } };
            sounds.push(sound); return sound;
        } },
    };
    try {
        const audio = new AdventureAudio(scene);
        audio.sync({ music: 'hermes', wind: false, surface: 'pavement', moving: true });
        assert.deepEqual(sounds.map(s => s.key), ['adventure-hermes', 'adventure-pavement']);
        audio.sync({ music: 'hermes', wind: false, surface: 'pavement', moving: true, quietMusic: true });
        assert.equal(sounds[0].volume, 0.015);
        assert.equal(sounds[1].volume, 0.28);
        audio.sync({ music: 'hermes', wind: false, surface: 'pavement', moving: true });
        assert.equal(sounds[0].volume, 0.22);
        audio.sync({ music: 'hermes', wind: false, surface: 'pavement', moving: false });
        assert.equal(sounds[1].isPaused, true);
        audio.sync({ music: 'borealis', wind: true, surface: 'snow', moving: true });
        assert.equal(sounds[0].destroyed, true);
        assert.equal(sounds[1].destroyed, true);
        const wind = sounds.find(s => s.key === 'adventure-wind');
        assert.ok(wind && !wind.destroyed);
        audio.sync({ music: 'boss', wind: false, surface: 'pavement', moving: false });
        assert.equal(wind.destroyed, true);
        audio.playShot();
        audio.playShot();
        assert.equal(sounds.filter(s => s.key === 'vesper-laser-shot').length, 1);
        events.click();
        assert.equal(scene.sound.mute, true);
        audio.destroy();
        assert.ok(sounds.every(s => s.destroyed));
    } finally {
        globalThis.document = originalDocument;
    }
});
