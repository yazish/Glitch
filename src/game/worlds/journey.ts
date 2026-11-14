export type WorldId = 'hermes' | 'viridia';

export class Journey {
    private mapFound = false;
    private readonly waymarks = new Set<WorldId>();

    get hasMap(): boolean {
        return this.mapFound;
    }

    get waymarkCount(): number {
        return this.waymarks.size;
    }

    hasWaymark(world: WorldId): boolean {
        return this.waymarks.has(world);
    }

    findMap(): void {
        this.mapFound = true;
    }

    collectWaymark(world: WorldId): void {
        if (this.mapFound) this.waymarks.add(world);
    }
}
