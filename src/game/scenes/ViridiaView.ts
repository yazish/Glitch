import type { GameObjects, Scene } from 'phaser';
import { CharacterView } from './CharacterView';
import { RoomProjection } from './RoomProjection';
import { drawViridiaScenery } from './ViridiaScenery';
import { ViridiaProps } from './ViridiaProps';
import { ViridiaEffects } from './ViridiaEffects';
import { ViridiaMagic } from './ViridiaMagic';
import type { Rect } from '../worlds/geometry';
import { STONE_SEQUENCE } from '../worlds/viridia/layout';
import type { SoundTarget, ViridiaLayout } from '../worlds/viridia/layout';
import type { ViridiaState } from '../worlds/viridia/simulation';

const CYAN = 0x81eee1;
const AMBER = 0xffbb75;
const LILAC = 0xc2a0ff;
const WOOD = { top: 0x49414e, left: 0x17141c, right: 0x302a36 };
const STONE = { top: 0x83938b, left: 0x394b47, right: 0x63796d };

export class ViridiaView {
    private readonly projection: RoomProjection;
    private readonly art: GameObjects.Graphics;
    private readonly rootLabel: GameObjects.Text;
    private readonly prompt: GameObjects.Text;
    private readonly player: CharacterView;
    private readonly echo: CharacterView;
    private readonly props: ViridiaProps;
    private readonly effects: ViridiaEffects;
    private readonly magic: ViridiaMagic;
    private time = 0;
    private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    constructor(scene: Scene, private readonly layout: ViridiaLayout) {
        this.projection = new RoomProjection(layout.floor);
        drawViridiaScenery(scene, layout, this.projection);
        this.props = new ViridiaProps(scene, layout, this.projection);
        this.effects = new ViridiaEffects(scene, layout, this.projection);
        this.magic = new ViridiaMagic(scene, layout, this.projection);
        this.art = scene.add.graphics().setDepth(-1);
        this.prompt = scene.add.text(0, 0, '', {
            fontFamily: 'monospace', fontSize: '10px', color: '#fff2dc', backgroundColor: '#132724',
            padding: { x: 5, y: 4 },
        }).setOrigin(0.5, 1).setDepth(365).setVisible(false);
        this.player = new CharacterView(scene, AMBER, 0xffffff, 1);
        this.echo = new CharacterView(scene, LILAC, LILAC, 0.65);

        const labels = [
            [layout.log, 'FALLEN LOG'], [layout.vines, 'VINES'],
            [layout.tree, 'HEART TREE'], [layout.plate, 'SEAL PLATE'], [layout.pedestal, 'WAYMARK'],
            [layout.exit, 'EXIT PORTAL'],
            ...layout.soundProps.map(({ id, art }) => [art, {
                flowers: 'WHISPER FLOWERS', reflector: 'REFLECTOR', receiver: 'RECEIVER',
                bloom: 'BLOOM', fracture: 'FRACTURE', resonance: 'RESONANCE',
            }[id]] as const),
        ] as readonly (readonly [Rect, string])[];
        for (const [rect, name] of labels) this.label(scene, rect, name);
        this.rootLabel = this.label(scene, layout.roots, 'HARDENED ROOTS');
        this.render();
    }

    private label(scene: Scene, rect: Rect, name: string): GameObjects.Text {
        const pos = this.projection.center(rect);
        return scene.add.text(pos.x, pos.y + 29, name, {
            fontFamily: 'monospace', fontSize: '8px', color: '#fff0cc', backgroundColor: '#182d26',
            padding: { x: 3, y: 2 },
        }).setOrigin(0.5).setDepth(361);
    }

    render(state?: ViridiaState, delta = 0): void {
        if (!this.reducedMotion.matches) this.time += delta;
        this.art.clear();
        this.drawArrival(state);
        this.drawHeart(state);
        this.drawSoundFeedback(state);
        this.rootLabel.setVisible(!state?.rootsBroken);
        this.props.render(state);
        this.effects.render(state, this.time);
        this.magic.render(state, delta);
        if (!state) return;

        const { player, echo, braced } = state;
        const pos = this.projection.project(player);
        const echoPos = echo && this.projection.project(echo);
        this.player.render({ x: pos.x + (braced ? 3 : 0), y: pos.y - (braced ? 2 : 0), facing: player.facing },
            pos.y + 0.01, state.walkTicks, braced ? 0 : delta);
        this.echo.render(echo && echoPos ? { x: echoPos.x, y: echoPos.y, facing: echo.facing } : undefined,
            echoPos?.y ?? 0, state.echoWalkTicks, delta);
        this.prompt.setVisible(Boolean(state.hint));
        if (state.hint) this.prompt.setText(state.hint).setPosition(pos.x, pos.y - 48);
        if (braced) {
            const log = this.projection.center({ ...this.layout.log, y: this.layout.log.y + state.logDistance });
            this.art.lineStyle(2, AMBER, 0.75).lineBetween(pos.x + 7, pos.y - 13, log.x - 8, pos.y - 13);
        }
    }

    private drawArrival(state?: ViridiaState): void {
        const { log, flowerBarrier } = this.layout;
        const x = log.x + log.width / 2;
        for (const wall of this.layout.logTrackWalls) {
            this.projection.surface(this.art, wall, 0x405846, 0.9);
            for (let y = wall.y + 10; y < wall.y + wall.height; y += 16) {
                const at = this.projection.project({ x, y });
                this.art.fillStyle(0x586d58).fillEllipse(at.x, at.y, 40, 17);
            }
        }
        this.projection.surface(this.art, { ...log, y: log.y + this.layout.logTravel }, 0x293d34, 0.6);
        if (state && !state.logMoved) {
            const cue = this.projection.center(this.layout.logBrace, 4);
            this.art.lineStyle(2, AMBER, 0.8).lineBetween(cue.x - 10, cue.y, cue.x + 10, cue.y);
            this.art.fillStyle(AMBER).fillTriangle(cue.x + 15, cue.y, cue.x + 8, cue.y - 4, cue.x + 8, cue.y + 4);
        }
        if (state?.target?.id === 'flowers') {
            const glow = this.projection.center(flowerBarrier, 16);
            this.art.fillStyle(LILAC, 0.18 + Math.sin(this.time / 370) * 0.07).fillEllipse(glow.x, glow.y, 46, 82);
        }
        if (state?.flowersOpen) {
            for (let i = 0; i < 14; i++) {
                const px = flowerBarrier.x + 36 + i * 13 + (this.time * 0.012 % 13);
                const p = this.projection.project({ x: px, y: 224 + Math.sin(i + this.time / 620) * 18 }, 11);
                this.art.fillStyle(0xc989e8, 0.8).fillCircle(p.x, p.y, 2);
            }
        }
    }

    private drawHeart(state?: ViridiaState): void {
        const { tree, pedestal } = this.layout;
        const trunk = this.projection.center(tree, 17);
        this.art.fillStyle(0x332642, 0.74).fillEllipse(trunk.x, trunk.y + 16, 248, 127);
        this.art.lineStyle(2, 0x9d7eb4, 0.52).strokeEllipse(trunk.x, trunk.y + 16, 249, 126);
        const colors = [CYAN, AMBER, LILAC];
        for (const [index, id] of STONE_SEQUENCE.entries()) {
            const rect = this.prop(id);
            const active = index < (state?.stoneIndex ?? 0);
            if (active) {
                const pos = this.projection.center(rect);
                this.art.lineStyle(3, colors[index], 0.78).lineBetween(pos.x, pos.y, trunk.x, trunk.y + 15);
            }
            this.stone(rect, colors[index], active, id === 'resonance' ? state?.resonanceCharge ?? 0 : 0);
        }
        const bloom = this.projection.center(this.prop('bloom'));
        const blooming = (state?.stoneIndex ?? 0) >= 1;
        for (const side of [-1, 1]) {
            this.art.fillStyle(blooming ? 0xd590ef : 0x65446f).fillEllipse(bloom.x + side * 12, bloom.y - 10, blooming ? 11 : 5, 7);
        }
        const fracture = this.prop('fracture');
        this.rootBarrier({ x: fracture.x + 12, y: fracture.y + 15, width: 11, height: 22 }, state?.fractureHits ?? 0);
        this.projection.block(this.art, pedestal, 5, STONE);
        const mark = this.projection.center(pedestal, 25);
        if (!state?.collected) {
            if (!state?.sealOpen) this.art.fillStyle(LILAC, 0.31).fillEllipse(mark.x, mark.y, 32, 48);
        }
    }

    private drawSoundFeedback(state?: ViridiaState): void {
        if (!state?.feedback) return;
        const { target, kind } = state.feedback;
        const point = this.projection.center(this.prop(target), 10);
        const color = kind === 'loud' ? AMBER : kind === 'soft' ? CYAN : 0x9daba2;
        this.art.lineStyle(2, color, 0.63).strokeCircle(point.x, point.y, 24 + Math.sin(this.time / 110) * 4);
        if (target === 'reflector' && kind === 'loud' && !state.rootsBroken) {
            const roots = this.projection.center(this.layout.roots, 11);
            this.art.lineStyle(3, AMBER, 0.88).lineBetween(point.x, point.y, roots.x, roots.y);
        }
    }

    private prop(id: SoundTarget): Rect {
        return this.layout.soundProps.find((prop) => prop.id === id)!.art;
    }

    private stone(rect: Rect, color: number, active: boolean, charge: number): void {
        const p = this.projection.center(rect);
        this.art.fillStyle(0x263d39).fillEllipse(p.x, p.y + 5, 38, 23);
        this.art.fillStyle(active ? color : 0x829687).fillEllipse(p.x, p.y - 4, 29, 20);
        this.art.lineStyle(2, color, 0.35).strokeCircle(p.x, p.y - 4, 18);
        if (charge > 0) {
            this.art.lineStyle(3, color).beginPath()
                .arc(p.x, p.y - 4, 18, -Math.PI / 2, -Math.PI / 2 + charge * Math.PI * 2).strokePath();
        }
    }

    private rootBarrier(rect: Rect, hits: number): void {
        const top = this.projection.project(rect);
        const bottom = this.projection.project({ x: rect.x, y: rect.y + rect.height });
        if (hits === 2) {
            this.art.fillStyle(WOOD.top, 0.65).fillEllipse(top.x + 8, top.y + 8, 26, 13)
                .fillEllipse(top.x + 10, bottom.y - 8, 29, 12);
            return;
        }
        this.projection.block(this.art, rect, 8, WOOD);
        this.art.lineStyle(hits ? 2 : 1, hits ? AMBER : WOOD.left, 0.87);
        for (let y = top.y - 3; y < bottom.y - 10; y += 13) {
            this.art.lineBetween(top.x + 1, y, top.x + rect.width - 2, y + 6);
        }
    }

}
