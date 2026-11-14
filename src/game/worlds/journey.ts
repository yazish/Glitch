const WAYMARK_WORLDS = ['hermes', 'viridia', 'borealis', 'vesper'] as const;
type WaymarkWorld = (typeof WAYMARK_WORLDS)[number];
export type WorldId = Exclude<WaymarkWorld, 'vesper'>;
export const WAYMARK_TOTAL = WAYMARK_WORLDS.length;

export class Journey {
    private mapFound = false;
    private readonly waymarks = new Set<WaymarkWorld>();

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

    collectWaymark(world: WaymarkWorld): void {
        if (this.mapFound) this.waymarks.add(world);
    }

    collectVesperWaymark(): void {
        this.collectWaymark('vesper');
    }
}
