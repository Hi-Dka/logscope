export class StagingArea {
    private readonly buffer: Uint8Array;
    private readonly view: DataView;
    private writePtr: number = 0;
    private readPtr: number = 0;

    constructor(size: number) {
        this.buffer = new Uint8Array(size);
        this.view = new DataView(
            this.buffer.buffer,
            this.buffer.byteOffset,
            this.buffer.byteLength,
        );
    }

    public write(data: Uint8Array): boolean {
        if (data.length > this.freeSpace) {
            return false;
        }

        this.buffer.set(data, this.writePtr);
        this.writePtr += data.length;
        return true;
    }

    public writeUint32(value: number): boolean {
        if (4 > this.freeSpace) {
            return false;
        }

        this.view.setUint32(this.writePtr, value, true);

        this.writePtr += 4;
        return true;
    }

    public writeUint16(value: number): boolean {
        if (2 > this.freeSpace) {
            return false;
        }

        this.view.setUint16(this.writePtr, value, true);

        this.writePtr += 2;
        return true;
    }

    public writeUint8(value: number): boolean {
        if (1 > this.freeSpace) {
            return false;
        }

        this.view.setUint8(this.writePtr, value);

        this.writePtr += 1;
        return true;
    }

    public writeUint64(value: bigint): boolean {
        if (8 > this.freeSpace) {
            return false;
        }

        this.view.setBigUint64(this.writePtr, value, true);

        this.writePtr += 8;
        return true;
    }

    public alignTo4(): void {
        this.writePtr = (this.writePtr + 3) & ~3;
    }

    public get freeSpace(): number {
        return this.buffer.length - this.writePtr;
    }
    public get capacity(): number {
        return this.buffer.length;
    }
    public get size(): number {
        return this.writePtr;
    }
}
