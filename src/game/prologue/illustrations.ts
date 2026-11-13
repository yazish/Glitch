import type { GameObjects } from 'phaser';
import { HEIGHT, WIDTH } from '../viewport';

type Art = GameObjects.Graphics;

const INK = 0x171624;
const SAND = 0x87614d;
const WALL = 0x4b3645;
const GOLD = 0xffcc82;
const VIOLET = 0xa7a4ff;
const TEAL = 0x87e0d0;

function stars(art: Art): void {
    art.fillStyle(INK).fillRect(0, 0, WIDTH, HEIGHT);
    for (let i = 0; i < 52; i++) {
        art.fillStyle(i % 7 ? 0x9183ad : GOLD, i % 7 ? 0.6 : 0.9)
            .fillRect((i * 137 + 21) % WIDTH, (i * 59 + 12) % HEIGHT, i % 7 ? 1 : 2, 2);
    }
}

function planet(art: Art, x: number, y: number, radius: number): void {
    art.fillStyle(0x59466c).fillCircle(x, y, radius);
    art.fillStyle(0x9b7493, 0.7).fillEllipse(x, y + 7, radius * 3.1, radius * 0.3);
    art.fillStyle(0x716080).fillCircle(x, y - 4, radius * 0.93);
}

function kobe(art: Art, x: number, y: number, scale: number, seated = false): void {
    art.fillStyle(INK, 0.7).fillEllipse(x, y + 2, 34 * scale, 8 * scale);
    if (seated) {
        art.fillStyle(0x514258).fillRect(x - 16 * scale, y - 24 * scale, 23 * scale, 23 * scale);
    }
    art.fillStyle(0xad826e).fillRoundedRect(x - 13 * scale, y - 29 * scale, 21 * scale, 25 * scale, 4 * scale);
    art.fillStyle(GOLD).fillRoundedRect(x - 8 * scale, y - 31 * scale, 17 * scale, 27 * scale, 4 * scale);
    art.fillStyle(0xffe3af).fillCircle(x, y - 36 * scale, 11 * scale);
    art.fillStyle(0x35304b).fillRoundedRect(x - 3 * scale, y - 41 * scale, 13 * scale, 8 * scale, 3 * scale);
}

function terminal(art: Art, alert: boolean): void {
    const accent = alert ? 0xff9c80 : TEAL;
    art.fillStyle(0x302939).fillRect(292, 200, 126, 112);
    art.fillStyle(0x554459).fillRoundedRect(274, 133, 158, 93, 8);
    art.fillStyle(INK).fillRect(287, 146, 132, 66);
    art.fillStyle(accent).fillRect(303, 160, 96, 3).fillRect(303, 191, 73, 3);
    art.lineStyle(2, accent, 0.8);
    art.lineBetween(303, 179, 328, 179).lineBetween(328, 179, 342, alert ? 169 : 179)
        .lineBetween(342, alert ? 169 : 179, 368, alert ? 187 : 179)
        .lineBetween(368, alert ? 187 : 179, 401, 179);
}

function cabin(art: Art, alert: boolean): void {
    stars(art);
    planet(art, 491, 101, 54);
    art.fillStyle(0x332940).fillRect(0, 0, WIDTH, 39).fillRect(0, 0, 61, 222)
        .fillRect(581, 0, 59, 222).fillRect(0, 209, WIDTH, 26);
    art.fillStyle(0x483847).fillRect(0, 235, WIDTH, HEIGHT - 235);
    art.lineStyle(2, 0xa98686, 0.32).lineBetween(0, 304, WIDTH, 304);
    terminal(art, alert);
    kobe(art, alert ? 231 : 216, 306, 2, !alert);
}

export function crossing(art: Art): void {
    cabin(art, false);
}

export function signal(art: Art): void {
    cabin(art, true);
}

export function malfunction(art: Art): void {
    stars(art);
    art.fillStyle(0x352839).fillRect(0, 251, WIDTH, HEIGHT - 251);
    art.fillStyle(0x615073).fillEllipse(357, 266, 278, 46);
    art.fillStyle(VIOLET, 0.15).fillCircle(357, 158, 116);
    art.fillStyle(0x6b5d88).fillCircle(357, 158, 98);
    art.fillStyle(0x433879).fillCircle(357, 158, 83);
    art.fillStyle(VIOLET, 0.8).fillCircle(357, 158, 59);
    art.fillStyle(0xf1d6ff).fillEllipse(357, 158, 74, 108);
    kobe(art, 199, 290, 1.9);
}

export function arrival(art: Art): void {
    stars(art);
    planet(art, 494, 57, 41);
    art.fillStyle(WALL).fillRect(32, 205, 576, 113);
    art.fillStyle(SAND).fillRect(32, 205, 576, 80);
    art.fillStyle(0x2d2741).fillRect(421, 150, 144, 76);
    art.fillStyle(0x5a414b).fillRect(405, 139, 176, 14);
    art.fillStyle(GOLD, 0.3).fillEllipse(506, 226, 100, 28);
    art.fillStyle(GOLD).fillRect(489, 175, 30, 50).fillRect(435, 164, 28, 14);
    art.lineStyle(5, VIOLET, 0.35).strokeEllipse(100, 193, 65, 104);
    kobe(art, 183, 263, 1.55);
}
