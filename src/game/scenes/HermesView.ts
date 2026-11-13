import type { GameObjects, Scene } from 'phaser';
import { Math as PhaserMath } from 'phaser';
import { TILE_SIZE } from '../worlds/hermes/room';
import { HEIGHT, WIDTH } from '../viewport';
import type { HermesLayout, Rect } from '../worlds/hermes/room';
import type { HermesState } from '../worlds/hermes/simulation';
import { CharacterView } from './CharacterView';
import { RoomProjection } from './RoomProjection';
import { OutpostBackground } from './OutpostBackground';
import { drawOutpostTerrain } from './OutpostTerrain';

export const DEPARTURE_GATEWAY_TEXTURE = 'hermes-departure-gateway';
const GATEWAY_CUTOUT_TEXTURE = 'hermes-departure-gateway-cutout';
const INK = 0x171624;
const CHAMBER_STONE = 0x615366;
const WALL_STONE = { top: 0xa68b99, left: 0x59485f, right: 0x726075 };
const GATE_METAL = { top: 0xbe7c72, left: 0x64414e, right: 0x955966 };
const WALL = 0x4b3645;
const TEAL = 0x87e0d0;
const GOLD = 0xffcc82;
const VIOLET = 0xa7a4ff;

function gatewayTexture(scene: Scene): string {
    const { textures } = scene;
    if (!textures.exists(DEPARTURE_GATEWAY_TEXTURE)) return '__MISSING';
    if (textures.exists(GATEWAY_CUTOUT_TEXTURE)) return GATEWAY_CUTOUT_TEXTURE;

    const source = textures.get(DEPARTURE_GATEWAY_TEXTURE).getSourceImage();
    if (!(source instanceof HTMLImageElement)) return DEPARTURE_GATEWAY_TEXTURE;
    const cutout = textures.createCanvas(GATEWAY_CUTOUT_TEXTURE, source.width, source.height);
    if (!cutout) return DEPARTURE_GATEWAY_TEXTURE;

    const context = cutout.getContext();
    context.drawImage(source, 0, 0);
    const pixels = context.getImageData(0, 0, source.width, source.height);
    const rgba = pixels.data;
    // The supplied sprite is on a white matte. Preserve any alpha in a replacement PNG.
    if (rgba.some((value, index) => index % 4 === 3 && value < 255)) {
        textures.remove(GATEWAY_CUTOUT_TEXTURE);
        return DEPARTURE_GATEWAY_TEXTURE;
    }
    for (let index = 0; index < rgba.length; index += 4) {
        const brightness = Math.min(rgba[index], rgba[index + 1], rgba[index + 2]);
        rgba[index + 3] = 255 * Math.max(0, Math.min(1, (248 - brightness) / 26));
    }
    context.putImageData(pixels, 0, 0);
    cutout.refresh();
    return GATEWAY_CUTOUT_TEXTURE;
}

export class HermesView {
    private readonly projection: RoomProjection;
    private readonly outpostBackground: OutpostBackground;
    private readonly floors: Record<'outpost' | 'chamber', GameObjects.Graphics>;
    private readonly art: GameObjects.Graphics;
    private readonly player: CharacterView;
    private readonly echo: CharacterView;
    private readonly gateway: GameObjects.Image;
    private readonly gate: GameObjects.Graphics;
    private readonly walls: GameObjects.Graphics[];
    private readonly labels: Record<'outpost' | 'chamber', GameObjects.Text[]>;
    private readonly completion: GameObjects.Text;

    constructor(scene: Scene, private readonly layout: HermesLayout) {
        this.projection = new RoomProjection(layout.floor);
        this.drawSky(scene.add.graphics().setDepth(-3));
        this.outpostBackground = new OutpostBackground(scene);
        this.floors = {
            outpost: scene.add.graphics().setDepth(-2),
            chamber: scene.add.graphics().setDepth(-2),
        };
        this.drawFloors();
        this.art = scene.add.graphics().setDepth(-1);
        const { outpost, chamber } = layout;
        const gateway = this.projection.center(chamber.gateway);
        this.gateway = scene.add.image(gateway.x, gateway.y, gatewayTexture(scene))
            .setOrigin(0.5, 1).setDisplaySize(52, 52).setDepth(gateway.y);

        // Split the wall into short sections so characters can pass behind its far end.
        this.walls = chamber.walls.flatMap((wall) => {
            const sections = [];
            const end = wall.y + wall.height;
            for (let y = wall.y; y < end; y += TILE_SIZE) {
                const section = { ...wall, y, height: Math.min(TILE_SIZE, end - y) };
                const wallArt = scene.add.graphics().setDepth(this.projection.center(section).y);
                this.projection.block(wallArt, section, 29, WALL_STONE);
                this.projection.outline(wallArt, section, 0xe5c1ad, 0.33, 29);
                sections.push(wallArt);
            }
            return sections;
        });
        this.gate = scene.add.graphics().setDepth(this.projection.center(chamber.gate).y);
        this.projection.block(this.gate, chamber.gate, 21, GATE_METAL);
        this.projection.outline(this.gate, chamber.gate, GOLD, 0.65, 21);

        this.player = new CharacterView(scene, GOLD, 0xffffff, 1);
        this.echo = new CharacterView(scene, VIOLET, VIOLET, 0.65);

        const label = (target: Rect, text: string, dx: number, dy: number) => {
            const point = this.projection.center(target);
            return scene.add.text(point.x + dx, point.y + dy, text, {
                fontFamily: 'monospace',
                fontSize: '10px',
                color: '#fff2dc',
                backgroundColor: '#232031',
                padding: { x: 4, y: 3 },
            }).setOrigin(0.5).setDepth(HEIGHT);
        };
        this.labels = {
            outpost: [
                label(outpost.map, 'STAR MAP', 0, 21),
                label(outpost.receiver, 'RECEIVER', 0, 46),
                label(outpost.entrance, 'ANCHOR CHAMBER', -8, -29),
            ],
            chamber: [
                label(chamber.plate, 'PRESSURE PLATE', 0, -43),
                label(chamber.anchor, 'ANCHOR', 0, 34),
                label(chamber.gateway, 'GATEWAY', 0, 34),
            ],
        };
        this.completion = scene.add.text(WIDTH / 2, HEIGHT / 2,
            'Hermes complete\n\nWaymark 1 of 6 recovered\nNext destination: Demeter', {
                fontFamily: 'monospace',
                fontSize: '20px',
                color: '#fff2dc',
                align: 'center',
            }).setOrigin(0.5).setDepth(HEIGHT);
    }

    render(state: HermesState, time: number): void {
        const outpost = state.screen === 'outpost';
        const chamber = state.screen === 'chamber';
        const playing = outpost || chamber;

        this.art.clear();
        this.outpostBackground.render(outpost, time);
        this.floors.outpost.setVisible(outpost);
        this.floors.chamber.setVisible(chamber);
        this.walls.forEach((wall) => wall.setVisible(chamber));
        this.gate.setVisible(chamber && !state.gateOpen);
        this.gateway.setVisible(chamber && this.gateway.texture.key !== '__MISSING');
        this.labels.outpost.forEach((label) => label.setVisible(outpost));
        this.labels.outpost[0].setVisible(outpost && !state.hasMap);
        this.labels.chamber.forEach((label) => label.setVisible(chamber));
        this.completion.setVisible(!playing);

        const { player, echo } = state;
        const playerOnScreen = { ...this.projection.project(player), facing: player.facing };
        const echoOnScreen = echo && { ...this.projection.project(echo), facing: echo.facing };
        this.player.render(playing ? playerOnScreen : undefined, playerOnScreen.y + 0.01);
        this.echo.render(echoOnScreen, echoOnScreen?.y ?? 0);

        if (outpost) this.outpost(state);
        if (chamber) this.chamber(state);
    }

    private drawSky(art: GameObjects.Graphics): void {
        art.fillStyle(INK).fillRect(0, 0, WIDTH, HEIGHT);
        art.fillStyle(0x302841, 0.56).fillEllipse(494, 64, 240, 121);
        for (let i = 0; i < 82; i++) {
            art.fillStyle(i % 7 ? 0x9b91b6 : 0xf3d6ad, i % 7 ? 0.48 : 0.8)
                .fillRect((i * 137 + 21) % WIDTH, (i * 59 + 12) % HEIGHT, i % 7 ? 1 : 2, 1);
        }
        art.fillStyle(0x59466c).fillCircle(531, 65, 34);
        art.fillStyle(0x9b7493, 0.7).fillEllipse(531, 69, 113, 12);
        art.fillStyle(0x716080).fillCircle(531, 61, 32);
        art.fillStyle(0xab85a6, 0.62).fillEllipse(531, 74, 65, 4);
    }

    private drawFloors(): void {
        const { floor, outpost } = this.layout;
        const { bridge } = outpost;
        const rightX = bridge.x + bridge.width;
        drawOutpostTerrain(this.floors.outpost, this.projection, floor, bridge.x, rightX);
        this.projection.ground(this.floors.chamber, floor, CHAMBER_STONE);
    }

    private outpost(state: HermesState): void {
        const { map, receiver, bridge, entrance } = this.layout.outpost;
        if (state.bridgeOpen) {
            this.projection.block(this.art, bridge, 6, { top: 0x457b81, left: 0x2c4a62, right: 0x365a6a }, -6);
            this.projection.outline(this.art, bridge, TEAL, 0.92);
            const end = bridge.x + bridge.width;
            for (let x = bridge.x + 8; x < end; x += 16) {
                const light = this.projection.project({ x, y: bridge.y + bridge.height / 2 });
                this.art.fillStyle(TEAL).fillCircle(light.x, light.y, 2);
            }
        } else {
            this.projection.outline(this.art, bridge, TEAL, 0.37);
        }
        this.projection.surface(this.art, receiver, TEAL, state.canActivateBridge ? 0.23 : 0.08);
        this.projection.outline(this.art, receiver, TEAL, state.canActivateBridge ? 1 : 0.4);
        if (!state.hasMap) this.marker(map, GOLD);
        this.marker(entrance, state.hasMap ? TEAL : WALL);
    }

    private chamber(state: HermesState): void {
        const { plate, gate, anchor, gateway } = this.layout.chamber;
        const plateColor = state.plateHeld ? TEAL : 0xc29ab6;
        this.projection.block(this.art, plate, state.plateHeld ? 1 : 4, {
            top: state.plateHeld ? 0x4d8d89 : 0x7c637c, left: 0x473953, right: 0x5b4762,
        });
        this.projection.outline(this.art, plate, plateColor, 0.9, state.plateHeld ? 1 : 4);
        if (state.gateOpen) this.projection.surface(this.art, gate, TEAL, 0.24);
        this.marker(anchor, state.canDepart ? TEAL : GOLD);
        this.projection.surface(this.art, gateway, state.canDepart ? VIOLET : WALL, 0.28);
        if (!this.gateway.visible) {
            this.marker(gateway, state.canDepart ? VIOLET : WALL);
            return;
        }

        this.gateway.setAlpha(state.canDepart ? 1 : 0.78);
        if (state.canDepart) {
            const x = this.gateway.x;
            const y = this.gateway.y - 19;
            this.art.fillStyle(VIOLET, 0.19).fillEllipse(x, y, 36, 39)
                .fillStyle(VIOLET, 0.56).fillEllipse(x, y, 24, 31)
                .fillStyle(0xe0dcff, 0.48).fillEllipse(x, y, 15, 24);
        }
    }

    private marker(rect: Rect, color: number): void {
        this.projection.surface(this.art, rect, color, 0.18);
        this.projection.outline(this.art, rect, color, 0.52);
        const center = this.projection.center(rect);
        this.art.fillStyle(color, 0.16).fillEllipse(center.x, center.y, 23, 12);
        this.art.fillStyle(color).fillPoints([
            new PhaserMath.Vector2(center.x, center.y - 7),
            new PhaserMath.Vector2(center.x + 5, center.y),
            new PhaserMath.Vector2(center.x, center.y + 4),
            new PhaserMath.Vector2(center.x - 5, center.y),
        ], true);
    }
}
