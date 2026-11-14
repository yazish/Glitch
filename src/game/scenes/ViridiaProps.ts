import type { GameObjects, Scene } from 'phaser';
import type { Rect } from '../worlds/geometry';
import type { ViridiaLayout } from '../worlds/viridia/layout';
import type { ViridiaState } from '../worlds/viridia/simulation';
import { gatewayTexture, WAYMARK_SCROLL_TEXTURE } from './HermesView';
import type { RoomProjection } from './RoomProjection';
import { alienTexture } from './ViridiaPalette';

const names = ['whisper-flowers', 'reflector', 'receiver', 'seal-plate', 'grand-banyan', 'fallen-log-source'] as const;

export function preloadViridiaProps(scene: Scene): void {
    for (const name of names) scene.load.image(`viridia-prop-${name}`,
        `${import.meta.env.BASE_URL}assets/viridia/props/${name}.png`);
}

export class ViridiaProps {
    private readonly flowers: GameObjects.Image[] = [];
    private readonly log: GameObjects.Image;
    private readonly reflector: GameObjects.Image;
    private readonly receiver: GameObjects.Image;
    private readonly tree: GameObjects.Image;
    private readonly plate: GameObjects.Image;
    private readonly scroll: GameObjects.Image;
    private readonly portals: GameObjects.Image[];

    constructor(scene: Scene, private readonly layout: ViridiaLayout, private readonly projection: RoomProjection) {
        const add = (rect: Rect, name: string, width: number, height: number, lift = 0) => {
            const p = projection.center(rect, lift);
            return scene.add.image(p.x, p.y, name).setDisplaySize(width, height).setDepth(-0.8);
        };
        const flowerTexture = alienTexture(scene, 'viridia-alien-whisper-flowers', 'viridia-prop-whisper-flowers');
        for (let y = layout.floor.y + 12; y < layout.floor.y + layout.floor.height; y += 24) {
            this.flowers.push(add({ x: layout.flowerBarrier.x, y, width: 24, height: 1 }, flowerTexture, 40, 46, 13));
        }
        const prop = (id: string) => layout.soundProps.find((item) => item.id === id)!.art;
        this.reflector = add(prop('reflector'), 'viridia-prop-reflector', 54, 38, 5);
        this.receiver = add(prop('receiver'), 'viridia-prop-receiver', 50, 50, 8);
        const source = scene.textures.get('viridia-prop-fallen-log-source').getSourceImage();
        let logTexture = 'viridia-prop-fallen-log-source';
        if (source instanceof HTMLImageElement) {
            const texture = scene.textures.createCanvas('viridia-prop-fallen-log-cutout', source.width, source.height);
            if (texture) {
                const context = texture.getContext();
                context.drawImage(source, 0, 0);
                const pixels = context.getImageData(0, 0, source.width, source.height);
                for (let i = 0; i < pixels.data.length; i += 4) {
                    if (pixels.data[i] > 225 && pixels.data[i + 1] > 225 && pixels.data[i + 2] > 225) pixels.data[i + 3] = 0;
                }
                context.putImageData(pixels, 0, 0);
                texture.refresh();
                logTexture = 'viridia-prop-fallen-log-cutout';
            }
        }
        this.log = add(layout.log, logTexture, 88, 40, 7).setAngle(90);
        this.tree = add(layout.tree, alienTexture(scene, 'viridia-alien-banyan', 'viridia-prop-grand-banyan', undefined, true), 260, 240, 64);
        this.plate = add(layout.plate, 'viridia-prop-seal-plate', 54, 38);
        this.scroll = add(layout.pedestal, WAYMARK_SCROLL_TEXTURE, 32, 32, 25);
        const gateway = gatewayTexture(scene);
        this.portals = [layout.arrivalPortal, layout.exit].map((rect) => add(rect, gateway, 52, 52, 20));
    }

    render(state?: ViridiaState): void {
        const lean = state?.flowersOpen ? 28 : 0;
        this.flowers.forEach((image, index) => {
            const y = this.layout.floor.y + 12 + index * 24;
            image.setX(this.projection.center({ x: this.layout.flowerBarrier.x, y, width: 24, height: 1 }).x + lean);
        });
        this.reflector.setAngle(((state?.reflectorTurn ?? 0) - 1) * 90);
        this.log.setY(this.projection.center({ ...this.layout.log, y: this.layout.log.y + (state?.logDistance ?? 0) }, 7).y);
        this.receiver.setTint(state?.vinesOpen ? 0x9effdd : 0xffffff);
        this.tree.setTint(state?.treeAwake ? 0xf4d5ff : 0xffffff);
        this.plate.setTint(state?.plateHeld ? 0x87e5d6 : 0xffffff);
        this.scroll.setVisible(Boolean(state?.treeAwake && !state.collected));
        this.portals[1].setAlpha(state?.collected ? 1 : 0.6);
    }
}
