import type { Scene } from 'phaser';
import type { Facing } from '../worlds/hermes/room';
import { drawKobiWalkFrame } from './KobiWalkArt';

export const KOBI_FOOT_ANCHOR = { x: 24, y: 44 };
const FRAME_SIZE = 48;
const WALK_FRAMES = [0, 1, 2, 3] as const;
const TICKS_PER_FRAME = 8;
const DIRECTIONS = ['up', 'down', 'left', 'right'] as const;

export function preloadKobi(scene: Scene): void {
    const base = `${import.meta.env.BASE_URL}assets/characters/kobi/`;
    for (const direction of DIRECTIONS) {
        const key = `kobi-idle-${direction}`;
        if (!scene.textures.exists(key)) scene.load.image(key, `${base}idle-${direction}.png`);
    }
}

export function prepareKobiWalkFrames(scene: Scene): void {
    for (const direction of DIRECTIONS) {
        const key = `kobi-walk-${direction}`;
        const idleKey = `kobi-idle-${direction}`;
        if (scene.textures.exists(key) || !scene.textures.exists(idleKey)) continue;
        const source = scene.textures.get(idleKey).getSourceImage();
        if (!(source instanceof HTMLImageElement) || source.width !== FRAME_SIZE || source.height !== FRAME_SIZE) continue;

        const strip = scene.textures.createCanvas(key, FRAME_SIZE * WALK_FRAMES.length, FRAME_SIZE);
        if (!strip) continue;
        const ctx = strip.getContext();
        ctx.imageSmoothingEnabled = false;
        for (const frame of WALK_FRAMES) {
            const x = frame * FRAME_SIZE;
            ctx.save();
            ctx.translate(x, 0);
            ctx.beginPath();
            ctx.rect(0, 0, FRAME_SIZE, FRAME_SIZE);
            ctx.clip();
            drawKobiWalkFrame(ctx, source, direction, frame);
            ctx.restore();
            strip.add(frame, 0, x, 0, FRAME_SIZE, FRAME_SIZE);
        }
        strip.refresh();
    }
}

export function kobiFrame(textures: Scene['textures'], facing: Facing, walkTicks: number) {
    if (walkTicks > 0) {
        const frame = WALK_FRAMES[Math.floor((walkTicks - 1) / TICKS_PER_FRAME) % WALK_FRAMES.length];
        const walk = textures.getFrame(`kobi-walk-${facing}`, frame);
        if (walk) return walk;
    }
    return textures.getFrame(`kobi-idle-${facing}`);
}
