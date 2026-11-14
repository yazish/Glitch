import type { GameCommand } from './commands';

const commands: Partial<Record<string, GameCommand>> = {
    Space: 'activateBridge',
    KeyR: 'rewind',
    KeyE: 'interact',
    KeyF: 'reverseWind',
    Escape: 'restart',
};
const movementKeys = new Set([
    'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyA', 'KeyS', 'KeyD',
]);

export class KeyboardControls {
    private readonly held = new Set<string>();
    private enabled = true;

    constructor(private readonly gameElement: HTMLElement, private readonly issue: (command: GameCommand) => void) {
        window.addEventListener('keydown', this.keyDown);
        window.addEventListener('keyup', this.keyUp);
        window.addEventListener('blur', this.clear);
    }

    get soundHeld(): boolean {
        return this.held.has('Space');
    }

    get movement() {
        const pressed = (arrow: string, letter: string) => Number(this.held.has(arrow) || this.held.has(letter));
        return {
            horizontal: pressed('ArrowRight', 'KeyD') - pressed('ArrowLeft', 'KeyA'),
            vertical: pressed('ArrowDown', 'KeyS') - pressed('ArrowUp', 'KeyW'),
        };
    }

    destroy(): void {
        window.removeEventListener('keydown', this.keyDown);
        window.removeEventListener('keyup', this.keyUp);
        window.removeEventListener('blur', this.clear);
        this.clear();
    }

    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        this.clear();
    }

    private readonly keyDown = (event: KeyboardEvent): void => {
        if (!this.enabled || event.metaKey || event.ctrlKey || event.altKey) return;
        const onControl = event.target instanceof HTMLElement && event.target.closest('button, summary, a');
        if (movementKeys.has(event.code)) {
            event.preventDefault();
            if (onControl) this.gameElement.focus({ preventScroll: true });
            this.held.add(event.code);
        }
        const command = commands[event.code];
        if (!command || (event.code === 'Space' && onControl)) return;
        event.preventDefault();
        if (event.code === 'Space') this.held.add(event.code);
        if (!event.repeat) this.issue(command);
    };

    private readonly keyUp = (event: KeyboardEvent): void => {
        this.held.delete(event.code);
    };

    private readonly clear = (): void => this.held.clear();
}
