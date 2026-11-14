import { WAYMARK_TOTAL } from '../journey.ts';

/** A campaign adapter can read and update its journey through this interface. */
export interface VesperProgress {
    readonly waymarkCount: number;
    collectVesperWaymark(): void;
}

export class VesperPreviewProgress implements VesperProgress {
    private collected = false;

    get waymarkCount(): number { return this.collected ? WAYMARK_TOTAL : WAYMARK_TOTAL - 1; }

    collectVesperWaymark(): void { this.collected = true; }
}
