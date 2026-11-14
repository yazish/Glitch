export const VESPER_WAYMARK_TOTAL = 5;

/** A campaign adapter can read and update its journey through this interface. */
export interface VesperProgress {
    readonly waymarkCount: number;
    collectVesperWaymark(): void;
}

export class VesperPreviewProgress implements VesperProgress {
    private collected = false;

    get waymarkCount(): number { return this.collected ? 4 : 3; }

    collectVesperWaymark(): void { this.collected = true; }
}
