import type { GameObjects, Scene } from 'phaser';
import { BOSS_FEET } from '../worlds/vesper/layout';
import { project } from '../worlds/vesper/space';
import type { VesperState } from '../worlds/vesper/simulation';

export function preloadVesperDragon(scene: Scene): void {
    const base = `${import.meta.env.BASE_URL}assets/vesper/cosmic/ember-dragon/`;
    for (const name of ['idle', 'breath', 'death', 'fly']) {
        scene.load.spritesheet(`vesper-dragon-${name}`, `${base}${name}.png`, { frameWidth: 213, frameHeight: 120 });
    }
}

/** Dragon artwork follows the simulation; damage and hitboxes remain authoritative there. */
export class VesperDragonArt {
    private readonly dragon: GameObjects.Image;

    constructor(private readonly scene: Scene) {
        this.dragon = scene.add.image(0, 0, 'vesper-dragon-idle', 0)
            .setOrigin(0.534, 0.844).setScale(1.4).setDepth(BOSS_FEET.y).setVisible(false);
    }

    render(state: VesperState): void {
        const boss = state.drake;
        const defeat = state.effects.find(({ kind }) => kind === 'drakeDefeat');
        this.dragon.setVisible(Boolean(boss || defeat));
        if (boss || defeat) {
            const flying = boss?.warning?.kind === 'shockwave';
            const attacking = Boolean(boss?.warning && boss.warning.ticks < 35) || Boolean(state.impact);
            const key = defeat ? 'death' : flying ? 'fly' : attacking ? 'breath' : 'idle';
            const frame = defeat ? Math.min(65, Math.floor((105 - defeat.ticks) * 66 / 105))
                : flying ? Math.floor(this.scene.time.now / 83) % 10
                    : attacking ? Math.floor(this.scene.time.now / 83) % 48
                        : Math.floor(this.scene.time.now / 83) % 29;
            const anchor = key === 'death' ? [0.537, 0.867] : key === 'fly' ? [0.552, 0.733]
                : key === 'breath' ? [0.681, 0.836] : [0.534, 0.844];
            const at = project(BOSS_FEET, boss?.lift ?? 0);
            this.dragon.setTexture(`vesper-dragon-${key}`, frame).setPosition(at.x, at.y)
                .setOrigin(anchor[0], anchor[1]).setAlpha(defeat ? Math.min(1, defeat.ticks / 25) : 1);
        }
    }
}
