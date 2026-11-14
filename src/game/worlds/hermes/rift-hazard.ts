import { contains } from './room.ts';
import type { Point, Rect } from './room.ts';

export interface RiftHazardConfig {
    readonly rift: Rect;
    readonly bridge: Rect;
}

/**
 * Single Responsibility (SRP): Evaluates whether a character is safely supported
 * across the outpost rift or falls off the map when attempting to cross outside
 * the extended bridge.
 */
export class RiftHazard {
    constructor(private readonly config: RiftHazardConfig) {}

    isBridgeOccupied(player: Point, bridgeWasOpen: boolean, bodyRadius: number): boolean {
        return bridgeWasOpen && contains(player, this.config.bridge, bodyRadius);
    }

    hasCrossedBridge(player: Point, bridgeWasOpen: boolean, bodyRadius: number): boolean {
        const { bridge } = this.config;
        return bridgeWasOpen && player.x >= bridge.x + bridge.width + bodyRadius;
    }

    /**
     * Returns true if the player enters the rift bounds without an open bridge
     * beneath them (either because the bridge is closed or the player walked
     * above/below the bridge box into the chasm).
     */
    didFallOffMap(player: Point, bridgeOpen: boolean, bodyRadius: number): boolean {
        const { rift, bridge } = this.config;
        const inRiftX = player.x > rift.x + bodyRadius && player.x < rift.x + rift.width - bodyRadius;
        if (!inRiftX) return false;

        if (!bridgeOpen) return true;
        return !contains(player, bridge, 0);
    }
}
