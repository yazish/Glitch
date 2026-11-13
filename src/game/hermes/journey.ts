export class Journey {
    private mapFound = false;
    private waymarkFound = false;

    get hasMap(): boolean {
        return this.mapFound;
    }

    get hasWaymark(): boolean {
        return this.waymarkFound;
    }

    get canDepart(): boolean {
        return this.waymarkFound;
    }

    findMap(): void {
        this.mapFound = true;
    }

    restoreHermes(): void {
        this.waymarkFound = this.mapFound;
    }
}
