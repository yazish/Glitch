import type { Scene } from 'phaser';
import { WIDTH, HEIGHT } from '../viewport';

export class FollowCamera {
    constructor(private readonly camera: Scene['cameras']['main'], worldEnd: number) {
        this.setBounds(0, worldEnd);
    }

    setBounds(left: number, right: number): void {
        this.camera.setBounds(left, 0, right - left, HEIGHT);
    }

    follow(x: number, delta: number, snap: boolean, frame?: { left: number; right: number }): void {
        const followX = x - WIDTH * 0.45;
        const framedX = frame ? Math.min(frame.left, Math.max(frame.right - WIDTH, followX)) : followX;
        const target = this.camera.clampX(framedX);
        const offset = this.camera.scrollX + (target - this.camera.scrollX) * (1 - Math.exp(-delta / 100));
        this.camera.setScroll(snap || Math.abs(offset - target) < 0.1 ? target : offset, 0);
    }
}
