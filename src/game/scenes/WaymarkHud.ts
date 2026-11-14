import { WAYMARK_TOTAL } from '../worlds/journey';

export class WaymarkHud {
    private readonly route = document.querySelector<HTMLElement>('#route')!;
    private readonly slots: HTMLLIElement[];
    private count = -1;

    constructor() {
        const list = document.querySelector<HTMLOListElement>('#waymarks')!;
        this.slots = Array.from({ length: WAYMARK_TOTAL }, (_, index) => {
            const slot = document.createElement('li');
            slot.textContent = String(index + 1);
            return slot;
        });
        list.replaceChildren(...this.slots);
    }

    render(count: number, detail?: string): void {
        if (count !== this.count) {
            this.slots.forEach((slot, index) => slot.classList.toggle('filled', index < count));
            this.count = count;
        }
        const progress = `${count} of ${WAYMARK_TOTAL} Waymarks collected`;
        const text = detail ? `${progress} · ${detail}` : progress;
        if (this.route.textContent !== text) this.route.textContent = text;
    }
}
