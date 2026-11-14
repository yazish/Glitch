import type { GameObjects, Scene } from 'phaser';
import { HEIGHT, WIDTH } from '../viewport';
import { KOBI_FOOT_ANCHOR, preloadKobi } from '../scenes/KobiSprites';

const images = {
    'hermes-background-sky': 'hermes/background/sky.png',
    'hermes-background-planets': 'hermes/background/planets.png',
    'hermes-background-distant-mountains': 'hermes/background/distant-mountains.png',
    'hermes-background-rocky-mountains': 'hermes/background/rocky-mountains.png',
    'cutscene-viridia': 'viridia/cosmos/waterfall-moon.png',
    'cutscene-banyan': 'viridia/props/grand-banyan.png',
    'borealis-aurora': 'borealis/winterwake/04_the_aurora.png',
    'cutscene-campus': 'cutscenes/university-of-manitoba.png',
} as const;

const INK = 0x101021;
const TEAL = 0x87e0d0;
const GOLD = 0xffcc82;
const VIOLET = 0xb9a2ff;

export function preloadCutsceneArt(scene: Scene): void {
    preloadKobi(scene);
    for (const [key, path] of Object.entries(images)) {
        if (!scene.textures.exists(key)) scene.load.image(key, `${import.meta.env.BASE_URL}assets/${path}`);
    }
}

export function animateOpening(scene: Scene, panel: string): void {
    if (panel === 'before-crossing' || panel === 'hermes') {
        scene.cameras.main.zoomTo(1.035, 4200, 'Sine.easeOut');
        return;
    }
    const signal = scene.add.graphics();
    if (panel === 'signal-changes') {
        signal.fillStyle(0xff9c80, 0.28).fillRect(348, 144, 128, 60);
        signal.fillStyle(GOLD, 0.75).fillRect(220, 38, 8, 16).fillRect(256, 68, 8, 4);
    } else {
        signal.fillStyle(VIOLET, 0.34).fillRect(280, 115, 80, 111);
        signal.fillStyle(TEAL, 0.76).fillRect(420, 112, 52, 8).fillRect(172, 152, 32, 8);
    }
    scene.tweens.add({ targets: signal, alpha: 0.12, duration: 850, yoyo: true, repeat: -1 });
}

function stars(scene: Scene, animate: boolean, sky = INK): void {
    const art = scene.add.graphics().fillStyle(sky).fillRect(0, 0, WIDTH, HEIGHT);
    const bright = scene.add.graphics();
    for (let index = 0; index < 145; index++) {
        const x = (index * 137 + 23) % WIDTH;
        const y = (index * 89 + 43) % HEIGHT;
        art.fillStyle(index % 3 ? 0x897db1 : 0xc4b4ed, 0.27 + (index % 5) * 0.11).fillRect(x, y, 1, 1);
        if (index % 13 === 0) {
            bright.fillStyle(index % 2 ? VIOLET : TEAL, 0.7).fillRect(x - 2, y, 5, 1).fillRect(x, y - 2, 1, 5);
        }
    }
    if (animate) scene.tweens.add({ targets: bright, alpha: 0.32, duration: 2400, yoyo: true, repeat: -1 });
}

function traveler(scene: Scene, x: number, y: number, scale = 2, direction = 'rear'): GameObjects.Image {
    scene.add.ellipse(x, y + 2, 26 * scale, 6 * scale, INK, 0.55);
    return scene.add.image(x, y, direction === 'rear' ? 'kobi-idle-up' : 'kobi-idle-right')
        .setDisplayOrigin(KOBI_FOOT_ANCHOR.x, KOBI_FOOT_ANCHOR.y).setScale(scale);
}

function portal(scene: Scene, animate: boolean, x: number, y: number, color: number, size = 1): void {
    const ring = scene.add.graphics().setPosition(x, y).setScale(size);
    ring.fillStyle(INK, 0.83).fillEllipse(0, 0, 102, 149);
    for (let index = 0; index < 4; index++) {
        ring.lineStyle(index === 0 ? 4 : 2, index % 2 ? VIOLET : color, 0.92 - index * 0.18)
            .strokeEllipse(0, 0, 103 + index * 13, 150 + index * 10);
    }
    const sparks = scene.add.graphics().setPosition(x, y).setScale(size);
    for (let index = 0; index < 22; index++) {
        const angle = index * 2.39996;
        const radius = 58 + (index % 4) * 8;
        sparks.fillStyle(index % 3 ? color : 0xffffff, 0.5 + (index % 3) * 0.18)
            .fillRect(Math.round(Math.cos(angle) * radius), Math.round(Math.sin(angle) * radius * 1.45), 2, 2);
    }
    sparks.lineStyle(1, color, 0.72).strokeEllipse(0, 0, 48, 95).strokeEllipse(0, 0, 26, 53);
    if (animate) scene.tweens.add({ targets: sparks, alpha: 0.34, duration: 1150, yoyo: true, repeat: -1 });
}

function bars(scene: Scene): void {
    scene.add.graphics().fillStyle(INK).fillRect(0, 0, WIDTH, 7).fillRect(0, HEIGHT - 7, WIDTH, 7);
}

export function hermes(scene: Scene, animate: boolean): void {
    scene.add.rectangle(0, 0, WIDTH, HEIGHT, 0x65454b).setOrigin(0);
    const layers = ['sky', 'planets', 'distant-mountains', 'rocky-mountains'];
    layers.forEach((name, index) => {
        const layer = scene.add.tileSprite(0, index < 2 ? 0 : 40, WIDTH, 320, `hermes-background-${name}`)
            .setOrigin(0).setTileScale(2);
        if (animate) scene.tweens.add({ targets: layer, tilePositionX: 3 + index * 4, duration: 6000, ease: 'Sine.easeOut' });
    });
    scene.add.rectangle(0, 0, WIDTH, HEIGHT, INK, 0.2).setOrigin(0);
    const ground = scene.add.graphics().fillStyle(0x312537).fillEllipse(319, 337, 760, 68);
    ground.fillStyle(0x795862).fillEllipse(426, 315, 164, 21).fillStyle(0x392b46).fillEllipse(426, 312, 142, 15);
    portal(scene, animate, 426, 229, GOLD);
    traveler(scene, 244, 316, 2, 'right');
    bars(scene);
}

export function viridia(scene: Scene, animate: boolean): void {
    scene.add.image(WIDTH / 2, HEIGHT / 2, 'cutscene-viridia');
    scene.add.rectangle(0, 0, WIDTH, HEIGHT, INK, 0.12).setOrigin(0);
    traveler(scene, 481, 307);
    if (animate) scene.cameras.main.zoomTo(1.035, 4600, 'Sine.easeOut');
    bars(scene);
}

export function aurora(scene: Scene, animate: boolean): void {
    scene.add.image(WIDTH / 2, 187, 'borealis-aurora').setScale(3);
    const glow = scene.add.rectangle(0, 0, WIDTH, HEIGHT, 0x263251, 0.13).setOrigin(0);
    if (animate) scene.tweens.add({ targets: glow, alpha: 0.03, duration: 2100, yoyo: true, repeat: -1 });
    traveler(scene, 434, 316);
    bars(scene);
}

export function gate(scene: Scene, animate: boolean, world: 'viridia' | 'borealis'): void {
    const jungle = world === 'viridia';
    if (jungle) {
        scene.add.image(WIDTH / 2, HEIGHT / 2, 'cutscene-viridia').setFlipX(true);
        scene.add.rectangle(0, 0, WIDTH, HEIGHT, 0x241638, 0.44).setOrigin(0);
        scene.add.image(165, 320, 'cutscene-banyan').setOrigin(0.5, 1).setScale(6);
    } else {
        scene.add.image(WIDTH / 2, 187, 'borealis-aurora').setScale(3);
        scene.add.rectangle(0, 0, WIDTH, HEIGHT, 0x13152f, 0.3).setOrigin(0);
    }
    portal(scene, animate, 470, 225, jungle ? VIOLET : TEAL);
    traveler(scene, jungle ? 296 : 218, 316, 2, 'right');
    bars(scene);
}

export function vesper(scene: Scene, animate: boolean): void {
    stars(scene, animate, 0x241534);
    const art = scene.add.graphics();
    art.fillStyle(0x77446f).fillCircle(422, 121, 89).fillStyle(0xa16186).fillCircle(409, 112, 74);
    art.lineStyle(2, 0xb58bb9, 0.48).strokeEllipse(422, 137, 286, 38);
    for (let row = 0; row < 2; row++) {
        for (let index = 0; index < 18; index++) {
            const x = index * 42 - row * 17;
            const top = 250 - (index * 43 + row * 13) % 109 + row * 32;
            const width = 28 + (index * 17) % 21;
            art.fillStyle(row ? 0x1e172e : 0x3a234b).fillRect(x, top, width, HEIGHT - top);
            art.fillRect(x + 6, top - 9, width - 14, 9);
            if (index % 3 === 1) art.fillStyle(0x659094, 0.55).fillRect(x + 9, top + 13, 3, 10);
        }
    }
    art.fillStyle(0x151322).fillRect(0, 306, WIDTH, 54);
    art.lineStyle(2, 0x67446b, 0.75).lineBetween(0, 335, WIDTH, 312);
    art.fillStyle(0x2a223d).fillRect(515, 105, 12, 172).fillRect(509, 150, 24, 4);
    const beacon = scene.add.graphics().fillStyle(TEAL, 0.22).fillCircle(521, 105, 18)
        .fillStyle(TEAL).fillRect(517, 102, 8, 5);
    if (animate) scene.tweens.add({ targets: beacon, alpha: 0.3, duration: 1250, yoyo: true, repeat: -1 });
    traveler(scene, 182, 324);
    bars(scene);
}

export function earth(scene: Scene, animate: boolean): void {
    stars(scene, animate, 0x090e1d);
    const planet = scene.add.graphics();
    planet.fillStyle(0x365e9a, 0.25).fillCircle(347, 235, 160)
        .fillStyle(0x6099c8).fillCircle(347, 235, 151)
        .fillStyle(0x2f5b91).fillCircle(347, 235, 146);
    const continents = [
        [245, 150, 63, 18], [267, 167, 79, 20], [281, 185, 79, 18], [298, 202, 53, 16],
        [311, 218, 25, 15], [335, 229, 23, 12], [349, 242, 36, 20], [361, 261, 32, 21],
        [371, 281, 20, 25], [366, 304, 13, 16], [360, 125, 28, 17], [354, 142, 24, 15],
        [465, 194, 24, 28], [471, 217, 22, 35], [475, 251, 15, 27],
    ];
    continents.forEach(([x, y, w, h]) => planet.fillStyle(0x84a884).fillRect(x, y, w, h));
    planet.fillStyle(0xe0ebed, 0.46).fillRect(250, 162, 45, 3).fillRect(360, 263, 51, 3)
        .fillRect(403, 143, 41, 3).fillRect(223, 218, 33, 4).fillRect(405, 314, 50, 3);
    planet.lineStyle(1, TEAL, 0.72).lineBetween(316, 186, 292, 130).lineBetween(292, 130, 225, 130);
    const signal = scene.add.graphics().lineStyle(2, TEAL, 0.9).strokeCircle(316, 186, 11)
        .fillStyle(0xffe9b1).fillRect(314, 184, 4, 4);
    if (animate) scene.tweens.add({ targets: signal, alpha: 0.28, duration: 1000, yoyo: true, repeat: -1 });
    bars(scene);
}

export function campus(scene: Scene, animate: boolean): void {
    stars(scene, animate);
    const frame = scene.add.graphics().lineStyle(1, 0x5a597b, 0.85).strokeRect(77, 4, 486, 352);
    frame.lineStyle(2, TEAL, 0.65);
    for (const x of [76, 564]) {
        frame.lineBetween(x, 12, x, 31).lineBetween(x, 329, x, 348);
    }
    scene.add.image(WIDTH / 2, HEIGHT / 2, 'cutscene-campus').setScale(6);
    portal(scene, animate, 210, 283, TEAL, 0.34);
    const kobi = traveler(scene, 262, 334, 1, 'right');
    if (animate) {
        kobi.setPosition(235, 300);
        scene.tweens.add({ targets: kobi, x: 262, y: 334, duration: 740, ease: 'Sine.easeOut' });
    }
    bars(scene);
}
