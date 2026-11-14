import type { Scene } from 'phaser';

/** Softens the meeting point of backdrop and floor without changing either asset. */
export function addHorizonFade(scene: Scene, x: number, width: number, horizon: number,
    color: number, depth: number): void {
    if (width <= 0) return;
    const fade = scene.add.graphics().setDepth(depth);
    const above = 24;
    const below = 18;
    for (let y = -above; y < below; y += 2) {
        const distance = y < 0 ? -y / above : y / below;
        const opacity = 0.68 * Math.max(0, 1 - distance);
        fade.fillStyle(color, opacity).fillRect(x, horizon + y, width, 2);
    }
}
