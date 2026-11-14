import type { Scene } from 'phaser';
import { WIDTH, HEIGHT } from '../viewport';

export class FollowCamera {
    constructor(private readonly camera: Scene['cameras']['main'], worldEnd: number) {
        camera.setBounds(0, 0, worldEnd, HEIGHT);
    }

    follow(x: number, delta: number, snap: boolean): void {
        const target = this.camera.clampX(x - WIDTH * 0.45);
        const offset = this.camera.scrollX + (target - this.camera.scrollX) * (1 - Math.exp(-delta / 100));
        this.camera.setScroll(snap || Math.abs(offset - target) < 0.1 ? target : offset, 0);
    }
}
