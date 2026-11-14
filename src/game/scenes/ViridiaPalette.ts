import type { Scene } from 'phaser';

/** Creates a themed copy while preserving the original art and its transparency. */
export function alienTexture(scene: Scene, key: string, sourceKey: string,
    crop?: readonly [number, number, number, number], tree = false): string {
    if (scene.textures.exists(key)) return key;
    const image = scene.textures.get(sourceKey).getSourceImage();
    if (!(image instanceof HTMLImageElement)) return sourceKey;
    const [x, y, width, height] = crop ?? [0, 0, image.width, image.height];
    const canvas = scene.textures.createCanvas(key, width, height);
    if (!canvas) return sourceKey;
    const ctx = canvas.getContext();
    ctx.drawImage(image, x, y, width, height, 0, 0, width, height);
    const pixels = ctx.getImageData(0, 0, width, height);
    for (let i = 0; i < pixels.data.length; i += 4) {
        const r = pixels.data[i], g = pixels.data[i + 1], b = pixels.data[i + 2];
        const value = 0.299 * r + 0.587 * g + 0.114 * b;
        const wood = tree && r >= g * 1.03 && r > b * 1.08;
        const glow = tree && b > r * 1.08 && g > r * 1.08;
        if (glow) continue;
        pixels.data[i] = value * (wood ? 0.64 : 0.91);
        pixels.data[i + 1] = value * (wood ? 0.63 : 0.53);
        pixels.data[i + 2] = value * (wood ? 0.72 : 1.12);
    }
    ctx.putImageData(pixels, 0, 0);
    canvas.refresh();
    return key;
}
