import type { GameObjects, Scene } from 'phaser';
import type { Riftborn } from '../worlds/vesper/riftborn';
import { project } from '../worlds/vesper/space';
import type { Point } from '../worlds/geometry';
import type { AreaId } from '../worlds/vesper/layout';

const ALIEN_FRAMES = ['00', '03', '06', '09', '12', '15', '18', '21'] as const;
const ZOMBIE_FRAMES = ['Idle', 'Walk1', 'Walk2', 'Walk3', 'Walk4', 'Attack1', 'Attack2', 'Damage1'] as const;

export function preloadVesperEnemies(scene: Scene): void {
    const base = `${import.meta.env.BASE_URL}assets/vesper/enemies/`;
    for (const frame of ZOMBIE_FRAMES) scene.load.image(`vesper-zombie-${frame}`, `${import.meta.env.BASE_URL}assets/vesper/cosmic/enemies/zombie/Zombie${frame}.png`);
    for (const frame of ZOMBIE_FRAMES) scene.load.image(`vesper-tank-${frame}`, `${import.meta.env.BASE_URL}assets/vesper/cosmic/enemies/tank/Tank${frame}.png`);
    for (const action of ['run', 'punch', 'idle']) {
        for (const frame of ALIEN_FRAMES) scene.load.image(`vesper-alien-${action}-${frame}`, `${base}alien/${action}_${frame}.png`);
    }
}

/** Animates supplied art in step with the existing enemy movement and attack state. */
export class VesperEnemyArt {
    private readonly sprites = new Map<number, GameObjects.Image>();

    constructor(private readonly scene: Scene) {}

    render(enemies: readonly Riftborn[], player: Point, area: AreaId): void {
        const active = new Set(enemies.map(({ id }) => id));
        for (const [id, sprite] of this.sprites) {
            if (!active.has(id)) { sprite.destroy(); this.sprites.delete(id); }
        }
        for (const enemy of enemies) {
            const alien = enemy.id % 2 === 0;
            let key: string;
            if (alien) {
                const action = enemy.windup ? 'punch' : enemy.recovery ? 'idle' : 'run';
                const index = enemy.windup ? Math.min(7, Math.floor((49 - Math.min(49, enemy.windup)) / 7))
                    : enemy.recovery ? Math.floor(this.scene.time.now / 160) % 8 : Math.floor(enemy.walk / 5) % 8;
                key = `vesper-alien-${action}-${ALIEN_FRAMES[index]}`;
            } else {
                const frame = enemy.flash ? 'Damage1' : enemy.windup ? (enemy.windup > 24 ? 'Attack1' : 'Attack2')
                    : enemy.recovery ? 'Idle' : `Walk${1 + Math.floor(enemy.walk / 7) % 4}`;
                key = `vesper-${area === 'avenue' ? 'tank' : 'zombie'}-${frame}`;
            }
            let sprite = this.sprites.get(enemy.id);
            if (!sprite) {
                sprite = this.scene.add.image(0, 0, key);
                this.sprites.set(enemy.id, sprite);
            }
            const at = project(enemy.feet);
            sprite.setTexture(key).setPosition(at.x, at.y).setDepth(at.y)
                .setOrigin(0.5, alien ? 0.97 : 1).setScale(alien ? 0.57 : 0.9)
                .setFlipX(alien && player.x < enemy.feet.x);
            if (alien && enemy.flash) sprite.setTint(0xffb5a5);
            else sprite.clearTint();
        }
    }
}
