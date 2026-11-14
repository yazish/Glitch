import type { GameObjects, Scene } from 'phaser';
import { ABYSS_TICKS, PORTAL, PORTAL_OPEN_TICKS, PORTAL_PULL_TICKS } from '../worlds/vesper/layout';
import type { VesperState } from '../worlds/vesper/simulation';
import { HEIGHT, WIDTH } from '../viewport';
import { kobeFrame, KOBE_FOOT_ANCHOR } from './KobeSprites';

const TEAL = 0x88ffee;
const VIOLET = 0xae79ff;

export class VesperCinematic {
    private readonly rift: GameObjects.Graphics;
    private readonly overlay: GameObjects.Graphics;
    private readonly traveler: GameObjects.Image;
    private readonly assetLabel: GameObjects.Text;
    private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    constructor(private readonly scene: Scene) {
        this.rift = scene.add.graphics().setDepth(388);
        this.overlay = scene.add.graphics().setDepth(500);
        this.traveler = scene.add.image(0, 0, '__MISSING').setDepth(499).setVisible(false);
        this.assetLabel = scene.add.text(18, 16, '', {
            fontFamily: 'system-ui', fontSize: '11px', color: '#e4eaff', backgroundColor: '#202239',
            padding: { x: 5, y: 3 },
        }).setDepth(499).setVisible(false);
    }

    render(state: VesperState, showAssetLabels: boolean): void {
        this.rift.clear();
        this.overlay.clear();
        this.traveler.setVisible(false);
        const label = state.mode === 'portal' ? 'Earth portal · wind · transmission hologram'
            : state.mode === 'abyss' ? 'Abyss tunnel · Kael flight pose · rift streaks' : '';
        this.assetLabel.setVisible(showAssetLabels && Boolean(label));
        if (this.assetLabel.text !== label) this.assetLabel.setText(label);
        if (state.mode === 'portal') this.drawPortal(state.sequenceTick);
        if (state.mode === 'abyss') this.drawAbyss(state.sequenceTick);
        if (state.mode === 'arrival') this.overlay.fillStyle(0x080812).fillRect(0, 0, WIDTH, HEIGHT);
    }

    private drawPortal(tick: number): void {
        const size = Math.min(1, Math.max(0, tick - 24) / 65);
        if (size === 0) return;
        const motion = this.reducedMotion.matches ? 0 : tick;
        const art = this.rift;
        const x = PORTAL.x;
        const y = PORTAL.y - 69;
        art.fillStyle(VIOLET, 0.16).fillEllipse(x, y, 224 * size, 236 * size)
            .fillStyle(0x110d2a, 0.94).fillEllipse(x, y, 167 * size, 207 * size);
        for (let ring = 0; ring < 4; ring++) {
            const width = (165 + ring * 15 + 7 * Math.sin(motion / 12 + ring)) * size;
            art.lineStyle(ring === 0 ? 5 : 2, ring % 2 ? VIOLET : TEAL, 0.86 - ring * 0.15)
                .strokeEllipse(x, y, width, (207 + ring * 10) * size);
        }
        if (!this.reducedMotion.matches) {
            for (let index = 0; index < 26; index++) {
                const windX = 32 + (motion * (4 + index % 4) + 91 * index) % (x - 32);
                const windY = 29 + (index * 47) % 300;
                const lift = (y - windY) * 0.085;
                art.lineStyle(1 + index % 2, index % 3 ? TEAL : VIOLET, 0.4 * size)
                    .lineBetween(windX, windY, windX + 16 + index % 34, windY + lift);
            }
        }
        const progress = Math.max(0, (tick - PORTAL_OPEN_TICKS) / PORTAL_PULL_TICKS);
        const fade = Math.max(0, (progress - 0.65) / 0.35);
        this.overlay.fillStyle(0x000000, fade).fillRect(0, 0, WIDTH, HEIGHT);
    }

    private drawAbyss(tick: number): void {
        const progress = tick / ABYSS_TICKS;
        const motion = this.reducedMotion.matches ? 0 : tick;
        const art = this.rift;
        const center = { x: 430, y: 176 };
        art.fillStyle(0x0b081c).fillRect(0, 0, WIDTH, HEIGHT);
        for (let loop = 0; loop < 9; loop++) {
            const radius = (motion * 2 + loop * 46) % 420 + 8;
            art.lineStyle(2, loop % 2 ? VIOLET : TEAL, 0.36 * (1 - radius / 450))
                .strokeEllipse(center.x, center.y, radius * 2, radius * 1.19);
        }
        if (!this.reducedMotion.matches) {
            for (let index = 0; index < 32; index++) {
                const angle = index * 2.4;
                const radius = (motion * 4 + index * 53) % 460;
                const x = Math.cos(angle);
                const y = Math.sin(angle) * 0.65;
                art.lineStyle(1, TEAL, 0.48).lineBetween(
                    center.x + x * radius, center.y + y * radius,
                    center.x + x * (radius + 23), center.y + y * (radius + 23),
                );
            }
        }
        const frame = kobeFrame(this.scene.textures, 'right', 0);
        if (frame) {
            this.traveler.setFrame(frame).setDisplayOrigin(KOBE_FOOT_ANCHOR.x, KOBE_FOOT_ANCHOR.y)
                .setPosition(150 + 280 * progress, center.y + 46 * (1 - progress) + Math.sin(motion / 13) * 6)
                .setScale(1.65 * (1 - progress) + 0.14).setRotation(motion * 0.032).setVisible(true);
        } else {
            art.fillStyle(TEAL).fillEllipse(150 + 280 * progress, center.y + 20 * (1 - progress),
                20 * (1 - progress) + 2, 32 * (1 - progress) + 2);
        }
        const fade = Math.max(1 - tick / 28, (progress - 0.78) / 0.22, 0);
        this.overlay.fillStyle(0x000000, fade).fillRect(0, 0, WIDTH, HEIGHT);
    }
}
