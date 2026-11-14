import type { GameObjects, Scene } from 'phaser';
import type { VesperState } from '../worlds/vesper/simulation';

/** Visuals follow the existing projectiles and hit areas; they never affect collision. */
export class VesperFireEffects {
    private readonly art: GameObjects.Graphics;

    constructor(private readonly scene: Scene) {
        this.art = scene.add.graphics().setDepth(389);
    }

    render(state: VesperState): void {
        const art = this.art.clear();
        const tick = Math.floor(this.scene.time.now / 85);
        for (const shot of state.shots) {
            if (shot.kind !== 'orb') continue;
            const { x, y } = shot.at;
            for (let i = 3; i >= 0; i--) {
                const size = 3 + (3 - i) * 1.3;
                const px = x - shot.vector.x * i * 6;
                const py = y - shot.vector.y * i * 6;
                art.fillStyle(i === 0 ? 0xe0eeff : i === 1 ? 0x6cceff : 0x7254ed, 1 - i * 0.18)
                    .fillRect(Math.round(px - size), Math.round(py - size), size * 2, size * 2);
            }
        }
        if (state.impact?.kind === 'beam') {
            const { x, y, width, height } = state.impact.lane;
            art.fillStyle(0x34278a, 0.38).fillRect(x, y, width, height);
            for (let i = 0; i < Math.ceil(width / 12); i++) {
                const left = x + i * 12;
                const flameHeight = 14 + ((i * 13 + tick * 7) % 31);
                const base = y + height - 5 - ((i + tick) % 3) * 3;
                art.fillStyle(0x5543cc, 0.88).fillTriangle(left, base, left + 7, base - flameHeight, left + 15, base);
                art.fillStyle(0x438eff, 0.95).fillTriangle(left + 3, base, left + 8, base - flameHeight * 0.65, left + 12, base);
                art.fillStyle(0xd2f1ff, 0.9).fillRect(left + 6, base - 5, 4, 5);
            }
        } else if (state.impact?.kind === 'shockwave') {
            const { x, y } = state.impact.target;
            for (let i = 0; i < 12; i++) {
                const angle = i * Math.PI / 6;
                const radius = 14 + ((tick * 4 + i * 3) % 40);
                art.fillStyle(i % 2 ? 0x75c7ff : 0x8b63ef, 0.85)
                    .fillRect(Math.round(x + Math.cos(angle) * radius), Math.round(y + Math.sin(angle) * radius), 5, 5);
            }
        }
    }
}
