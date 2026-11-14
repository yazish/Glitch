import type { GameObjects, Scene } from 'phaser';
import type { BorealisLayout } from '../worlds/borealis/layout';
import type { BorealisState } from '../worlds/borealis/simulation';
import { propBody, sledBody } from '../worlds/borealis/track';
import { gatewayTexture, WAYMARK_SCROLL_TEXTURE } from './HermesView';
import type { RoomProjection } from './RoomProjection';

const props = ['wind-vane', 'wind-sled', 'ice-stopper', 'windbreak', 'sled-rails', 'fence'] as const;
export function preloadBorealisProps(scene: Scene): void {
    for (const name of props) scene.load.image(`borealis-prop-${name}`,
        `${import.meta.env.BASE_URL}assets/borealis/props/${name}.png`);
}

export class BorealisProps {
    private readonly vanes: GameObjects.Image[];
    private readonly sleds: GameObjects.Image[];
    private readonly ice: GameObjects.Image;
    private readonly windbreak: GameObjects.Image;
    private readonly gates: GameObjects.Image[];
    private readonly portalGlow: GameObjects.Graphics;
    private readonly waymark: GameObjects.Image;
    private readonly fence: GameObjects.Graphics;
    private readonly snowCoveredTrees: GameObjects.Image[] = [];

    constructor(scene: Scene, private readonly layout: BorealisLayout, private readonly projection: RoomProjection) {
        const make = (key: string, size: number) => scene.add.image(0, 0, key).setDisplaySize(size, size).setDepth(-0.8);
        this.vanes = Object.values(layout.areas).map(() => make('borealis-prop-wind-vane', 56));
        this.sleds = Array.from({ length: 3 }, () => make('borealis-prop-wind-sled', 60));
        this.ice = make('borealis-prop-ice-stopper', 45);
        this.windbreak = make('borealis-prop-windbreak', 50);
        this.gates = [make(gatewayTexture(scene), 60), make(gatewayTexture(scene), 60)];
        this.portalGlow = scene.add.graphics().setDepth(-0.7);
        this.waymark = make(WAYMARK_SCROLL_TEXTURE, 32);
        this.fence = scene.add.graphics().setDepth(-0.7);
        const treeImage = scene.textures.get('borealis-small').getSourceImage();
        let clearTree = 'borealis-small';
        if (scene.textures.exists('borealis-cleared-tree')) {
            clearTree = 'borealis-cleared-tree';
        } else if (treeImage instanceof HTMLImageElement) {
            const texture = scene.textures.createCanvas('borealis-cleared-tree', treeImage.width, treeImage.height);
            if (texture) {
                const ctx = texture.getContext();
                ctx.drawImage(treeImage, 0, 0);
                const pixels = ctx.getImageData(0, 0, treeImage.width, treeImage.height);
                for (let i = 0; i < pixels.data.length; i += 4) {
                    if (pixels.data[i] > 145 && pixels.data[i + 1] > 155 && pixels.data[i + 2] > 165) {
                        const value = pixels.data[i + 1];
                        pixels.data[i] = value * 0.17;
                        pixels.data[i + 1] = value * 0.32;
                        pixels.data[i + 2] = value * 0.4;
                    }
                }
                ctx.putImageData(pixels, 0, 0);
                texture.refresh();
                clearTree = 'borealis-cleared-tree';
            }
        }
        for (const y of [layout.floor.y + 12, layout.floor.y + 44,
            layout.floor.y + layout.floor.height - 44, layout.floor.y + layout.floor.height - 12]) {
            const point = projection.project({ x: layout.drift.x + layout.drift.width / 2, y });
            scene.add.image(point.x, point.y, clearTree).setOrigin(0.5, 1)
                .setScale(0.45).setDepth(-1.1);
            this.snowCoveredTrees.push(scene.add.image(point.x, point.y, 'borealis-small').setOrigin(0.5, 1)
                .setScale(0.45).setDepth(-1.09));
        }
    }

    render(state: BorealisState, time: number): void {
        const set = (image: GameObjects.Image, x: number, y: number) => image.setPosition(x, y);
        Object.values(this.layout.areas).forEach((area, index) => {
            const p = this.projection.project(area.vane);
            set(this.vanes[index], p.x, p.y - 17);
            this.vanes[index].setFlipX(state.wind[area.id] < 0);
            this.vanes[index].setAngle(Math.sin(time / 700 + index) * 1.2);
        });
        const tracks = [this.layout.basinTrack, ...this.layout.summitTracks];
        const positions = [state.basinSled, state.leftSled, state.rightSled];
        tracks.forEach((track, i) => {
            const p = this.projection.center(sledBody(track, positions[i]));
            set(this.sleds[i], p.x, p.y - 15);
            this.sleds[i].setFlipX((i === 0 ? state.wind.basin : state.wind.summit) < 0);
        });
        const ice = this.projection.center(propBody(this.layout.iceBlock, state.block));
        set(this.ice, ice.x, ice.y - 10);
        const windbreak = this.projection.center(propBody(this.layout.windbreak, state.windbreak));
        set(this.windbreak, windbreak.x, windbreak.y - 13);
        const portalPositions = [this.projection.project({ x: this.layout.areas.pass.entry.x - 21, y: this.layout.areas.pass.entry.y }),
            this.projection.center(this.layout.exit)];
        this.portalGlow.clear();
        portalPositions.forEach((p, i) => {
            set(this.gates[i], p.x, p.y - 22);
            const lit = i === 0 || state.collected;
            this.gates[i].setAlpha(lit ? 1 : 0.65);
            if (lit) {
                const glow = 0.22 + 0.07 * Math.sin(time / 350);
                this.portalGlow.fillStyle(0xb8dfff, glow).fillEllipse(p.x, p.y - 22, 22, 35);
            }
        });
        const mark = this.projection.center(this.layout.monument, 40);
        this.waymark.setPosition(mark.x, mark.y).setVisible(state.monument >= 1 && !state.collected);
        this.drawFence(state.gate, time);
        this.snowCoveredTrees.forEach((tree) => tree.setAlpha(1 - state.drift));
    }

    private drawFence(open: number, time: number): void {
        const g = this.fence.clear();
        const alpha = Math.max(0, Math.min(1, (1 - open) * 2));
        if (alpha === 0) return;
        const top = this.projection.project(this.layout.gate);
        const bottom = this.projection.project({ x: this.layout.gate.x, y: this.layout.gate.y + this.layout.gate.height });
        const left = top.x - 5;
        const right = top.x + this.layout.gate.width + 5;
        const rise = open * 50;
        const y1 = top.y - rise;
        const y2 = bottom.y - rise;

        // A broad frame and repeated crossbars mark the whole collision boundary.
        g.fillStyle(0x172839, alpha).fillRect(left - 3, y1 - 5, 9, y2 - y1 + 10)
            .fillRect(right - 6, y1 - 5, 9, y2 - y1 + 10);
        g.fillStyle(0x7a9ab0, alpha).fillRect(left, y1, 3, y2 - y1)
            .fillRect(right - 3, y1, 3, y2 - y1);
        g.fillStyle(0x344e63, alpha).fillRect(left - 5, y1 - 5, right - left + 10, 8)
            .fillRect(left - 5, y2 - 4, right - left + 10, 8);
        g.lineStyle(3, 0x506f82, alpha);
        for (let y = y1 + 12; y < y2; y += 24) g.lineBetween(left + 4, y, right - 4, y);

        // Cyan conductors and a travelling spark make the powered fence readable.
        const pulse = 0.65 + 0.18 * Math.sin(time / 260);
        g.lineStyle(7, 0x39cde7, alpha * 0.18).lineBetween(left + 10, y1 + 4, left + 10, y2 - 4)
            .lineBetween(right - 10, y1 + 4, right - 10, y2 - 4);
        g.lineStyle(2, 0xa6f8ff, alpha * pulse).lineBetween(left + 10, y1 + 4, left + 10, y2 - 4)
            .lineBetween(right - 10, y1 + 4, right - 10, y2 - 4);
        for (let y = y1 + 18; y < y2 - 8; y += 48) {
            const shift = Math.sin(time / 220 + y * 0.1) * 3;
            g.lineStyle(2, 0xc8ffff, alpha * pulse).beginPath().moveTo(left + 10, y)
                .lineTo(left + 19 + shift, y - 5).lineTo(right - 19 - shift, y + 5)
                .lineTo(right - 10, y).strokePath();
        }
        const sparkY = y1 + 8 + (time * 0.055 % Math.max(1, y2 - y1 - 16));
        g.fillStyle(0xe6ffff, alpha).fillCircle(left + 10, sparkY, 3);
    }
}
