import type { GameObjects, Scene } from 'phaser';
import { HEIGHT, TILE_SIZE, WIDTH } from '../worlds/hermes/room';
import type { HermesLayout, Pose, Rect } from '../worlds/hermes/room';
import type { HermesState } from '../worlds/hermes/simulation';

const INK = 0x171624;
const SAND = 0x87614d;
const WALL = 0x4b3645;
const TEAL = 0x87e0d0;
const GOLD = 0xffcc82;
const VIOLET = 0xa7a4ff;
const FACING_OFFSET = {
    up: { x: 0, y: -2 },
    down: { x: 0, y: 2 },
    left: { x: -4, y: 0 },
    right: { x: 4, y: 0 },
};

export class HermesView {
    private readonly art: GameObjects.Graphics;
    private readonly labels: Record<'outpost' | 'chamber', GameObjects.Text[]>;
    private readonly completion: GameObjects.Text;

    constructor(scene: Scene, private readonly layout: HermesLayout) {
        this.art = scene.add.graphics();
        const label = (x: number, y: number, text: string) => scene.add.text(x, y, text, {
            fontFamily: 'monospace',
            fontSize: '10px',
            color: '#fff2dc',
            backgroundColor: '#232031',
            padding: { x: 4, y: 3 },
        }).setOrigin(0.5);
        const { outpost, chamber } = layout;
        this.labels = {
            outpost: [
                label(160, 205, 'STAR MAP'),
                label(252, 177, 'RECEIVER'),
                label(558, 187, 'ANCHOR CHAMBER'),
            ],
            chamber: [
                label(96, 265, 'CHECKPOINT'),
                label(160, 119, 'PRESSURE PLATE'),
                label(chamber.gate.x + 12, 192, 'GATE'),
                label(500, 199, 'ANCHOR'),
                label(567, 282, 'GATEWAY'),
            ]
        };
        this.completion = scene.add.text(WIDTH / 2, HEIGHT / 2,
            'Hermes complete\n\nWaymark 1 of 6 recovered\nNext destination: Demeter', {
                fontFamily: 'monospace',
                fontSize: '20px',
                color: '#fff2dc',
                align: 'center',
            }).setOrigin(0.5);
        this.labels.outpost[0].setPosition(outpost.map.x + outpost.map.width / 2, 205);
    }

    render(state: HermesState): void {
        this.art.clear();
        this.labels.outpost.forEach((label) => label.setVisible(state.screen === 'outpost'));
        this.labels.chamber.forEach((label) => label.setVisible(state.screen === 'chamber'));
        this.completion.setVisible(state.screen === 'complete');

        this.sky();
        if (state.screen === 'complete') return;

        this.floor();
        if (state.screen === 'outpost') this.outpost(state);
        else this.chamber(state);

        const { player, echo } = state;
        if (echo && echo.y <= player.y) this.character(echo, VIOLET, 0.65);
        this.character(player, GOLD, 1);
        if (echo && echo.y > player.y) this.character(echo, VIOLET, 0.65);
    }

    private sky(): void {
        const g = this.art;
        g.fillStyle(INK).fillRect(0, 0, WIDTH, HEIGHT);
        g.fillStyle(0x2d2741).fillRect(0, 64, WIDTH, 32);
        g.fillStyle(0x59466c).fillCircle(494, 57, 41);
        g.fillStyle(0x9b7493, 0.65).fillEllipse(494, 59, 130, 12);
        g.fillStyle(0x716080).fillCircle(494, 48, 39);
        for (let i = 0; i < 33; i += 1) {
            g.fillStyle(i % 4 ? 0x9b91b6 : 0xf3d6ad, 0.75)
                .fillRect((i * 137 + 21) % WIDTH, (i * 29 + 12) % 86, i % 4 ? 1 : 2, 2);
        }
    }

    private floor(): void {
        const g = this.art;
        const { x, y, width, height } = this.layout.floor;
        g.fillStyle(WALL).fillRect(x, y - 19, width, height + 28);
        g.fillStyle(SAND).fillRect(x, y, width, height);
        g.lineStyle(1, GOLD, 0.13);
        for (let col = x; col <= x + width; col += TILE_SIZE) {
            g.lineBetween(col, y, col, y + height);
        }
        for (let row = y; row <= y + height; row += TILE_SIZE) {
            g.lineBetween(x, row, x + width, row);
        }
    }

    private outpost(state: HermesState): void {
        const { map, receiver, bridge, walls, entrance } = this.layout.outpost;
        for (const segment of walls) this.rect(segment, INK);
        this.rect(bridge, state.bridgeOpen ? 0x386d78 : INK);
        if (state.bridgeOpen) {
            const { x, y, width, height } = bridge;
            this.art.lineStyle(2, TEAL, 0.8)
                .lineBetween(x, y + 4, x + width, y + 4)
                .lineBetween(x, y + height - 4, x + width, y + height - 4);
        }
        this.art.lineStyle(1, TEAL, state.canActivateBridge ? 0.9 : 0.35)
            .strokeRect(receiver.x, receiver.y, receiver.width, receiver.height);
        if (!state.hasMap) this.marker(map, GOLD);
        this.marker(entrance, state.hasMap ? TEAL : WALL);
    }

    private chamber(state: HermesState): void {
        const { walls, plate, gate, anchor, gateway } = this.layout.chamber;
        for (const wall of walls) this.rect(wall, WALL);
        this.rect(plate, state.plateHeld ? TEAL : 0x574350);
        this.rect(gate, state.gateOpen ? TEAL : 0xb16757, state.gateOpen ? 0.32 : 1);
        this.marker(anchor, state.canDepart ? TEAL : GOLD);
        this.marker(gateway, state.canDepart ? VIOLET : WALL);
    }

    private marker(rect: Rect, color: number): void {
        this.rect(rect, color, 0.21);
        this.art.fillStyle(color).fillRect(rect.x + rect.width / 2 - 5, rect.y + rect.height / 2 - 5, 10, 10);
    }

    private rect(rect: Rect, color: number, alpha = 1): void {
        this.art.fillStyle(color, alpha).fillRect(rect.x, rect.y, rect.width, rect.height);
    }

    private character(pose: Pose, color: number, alpha: number): void {
        const { x, y, facing } = pose;
        const g = this.art;
        const offset = FACING_OFFSET[facing];
        g.fillStyle(INK, alpha * 0.7).fillEllipse(x, y, 20, 7);
        g.fillStyle(color, alpha).fillRoundedRect(x - 7, y - 13, 14, 14, 3).fillCircle(x, y - 17, 8);
        g.fillStyle(INK, alpha).fillRoundedRect(x - 4 + offset.x, y - 19 + offset.y, 8, 4, 2);
    }
}
