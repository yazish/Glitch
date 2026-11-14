export type WorldId = 'hermes' | 'viridia' | 'borealis';

export class Journey {
    private mapFound = false;
    private readonly waymarks = new Set<WorldId | 'vesper'>();

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

    collectVesperWaymark(): void {
        if (this.mapFound) this.waymarks.add('vesper');
    }
}
