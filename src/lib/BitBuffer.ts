/**
 * Reads a bit from the given byte.
 * @param byte The byte.
 * @param i The bit index from the left.
 * @returns The bit value.
 */
export function getBitFromByte(byte: number, i: number): boolean {
    return getBitFromNumber(byte, 7 - i);
}

/**
 * Reads a bit from the given number.
 * @param byte The byte.
 * @param i The bit index from the right.
 * @returns The bit value.
 */
export function getBitFromNumber(byte: number, i: number): boolean {
    return ((byte >>> i) & 1) === 1;
}

/**
 * A typed array for bits.
 */
export class BitArray {
    private readonly _offset: number;
    private readonly _bitLength: number;
    private readonly _buffer: ArrayBuffer;
    private readonly _view: Uint8Array;

    public get bitLength(): number {
        return this._bitLength;
    }

    public get buffer(): ArrayBuffer {
        return this._buffer;
    }

    public get offset(): number {
        return this._offset;
    }

    constructor(size: number);
    constructor(buffer: BitArray | ArrayBuffer | Uint8Array);
    constructor(buffer: BitArray | ArrayBuffer | Uint8Array, bitOffset: number);
    constructor(buffer: BitArray | ArrayBuffer | Uint8Array, bitOffset: number, length: number);
    constructor(init: number | BitArray | ArrayBuffer | Uint8Array, bitOffset?: number, length?: number);
    constructor(init: number | BitArray | ArrayBuffer | Uint8Array, bitOffset?: number, length?: number) {
        if (typeof init === 'number') {
            this._offset = 0;
            this._bitLength = init;
            this._buffer = new ArrayBuffer(Math.ceil(this._bitLength / 8));
        } else if (init instanceof BitArray) {
            this._offset = (bitOffset || 0) + init.offset;
            const max = init.bitLength;
            this._bitLength = Math.min(length || max, max);
            this._buffer = init._buffer.slice(0);
        } else if (init instanceof ArrayBuffer) {
            this._offset = bitOffset || 0;
            const max = init.byteLength * 8;
            this._bitLength = Math.min(length || max, max);
            this._buffer = init;
        } else {
            this._offset = (bitOffset || 0) + (init.byteOffset * 8);
            const max = init.byteLength * 8;
            this._bitLength = Math.min(length || max, max);
            this._buffer = init.buffer.slice(0);
        }
        this._view = new Uint8Array(this._buffer);
    }

    public getBit(offset: number): boolean {
        if (offset < 0 || offset >= this._bitLength) throw new RangeError('Offset is outside the bounds of the BitArray');
        offset += this._offset;
        const byteIndex = Math.floor(offset / 8);
        const bitIndex = offset % 8;
        return getBitFromByte(this._view[byteIndex] || 0, bitIndex);
    }

    public getBits(offset: number, count: number): BitArray {
        if (offset < 0 || count < 0 || offset + count >= this._bitLength) throw new RangeError('Offset is outside the bounds of the BitArray');
        return new BitArray(this._buffer, this._offset + offset, count);
    }

    public getUint8(offset: number): number {
        return this.getUint(offset, 8);
    }

    public getUint16(offset: number): number {
        return this.getUint(offset, 16);
    }

    public getUint32(offset: number): number {
        return this.getUint(offset, 32);
    }

    public getUint(offset: number, count: number): number {
        const trimmedCount = Math.max(Math.min(count, 32), 0);
        if (offset + trimmedCount > this._bitLength) throw new RangeError('Offset is outside the bounds of the BitArray');
        let num = 0;
        for (let i = trimmedCount; i >= 0; i--) {
            num |= +!!this.getBit(offset + i) << i;
        }
        return num;
    }

    public setBit(offset: number, value: boolean): void {
        if (offset < 0 || offset >= this._bitLength) throw new RangeError('Offset is outside the bounds of the BitArray');
        offset += this._offset;
        const byteIndex = Math.floor(offset / 8);
        const bitIndex = offset % 8;
        if (value) {
            this._view[byteIndex] |= 0b10000000 >>> bitIndex;
        } else {
            this._view[byteIndex] &= ~(0b10000000 >>> bitIndex);
        }
    }

    public setBits(offset: number, buffer: BitArray | ArrayBuffer | Uint8Array): void {
        const bitBuffer = buffer instanceof BitArray ? buffer : new BitArray(buffer);
        for (let i = 0; i < bitBuffer.bitLength; i++) {
            this.setBit(offset + i, bitBuffer.getBit(i));
        }
    }

    public setUint8(offset: number, value: number): void {
        return this.setUint(offset, value, 8);
    }

    public setUint16(offset: number, value: number): void {
        return this.setUint(offset, value, 16);
    }

    public setUint32(offset: number, value: number): void {
        return this.setUint(offset, value, 32);
    }

    public setUint(offset: number, value: number, count: number): void {
        const trimmedCount = Math.max(Math.min(count, 32), 0);
        if (offset + trimmedCount > this._bitLength) throw new RangeError('Offset is outside the bounds of the BitArray');
        for (let i = trimmedCount; i >= 0; i--) {
            this.setBit(offset + (trimmedCount - i), getBitFromNumber(value, i));
        }
    }
}

export class BitReader {
    public readIndex = 0;
    public readonly bitArray: BitArray;
    constructor(bitArray: BitArray);
    constructor(arrayBuffer: ArrayBuffer);
    constructor(typedArray: Uint8Array);
    constructor(init: BitArray | ArrayBuffer | Uint8Array) {
        this.bitArray = init instanceof BitArray ? init : new BitArray(init);
    }

    public readBit(): boolean {
        if (this.readIndex >= this.bitArray.bitLength) throw new RangeError('Offset is outside the bounds of the BitArray');
        return this.bitArray.getBit(this.readIndex++);
    }

    public readBits(count: number): BitArray {
        const bits = this.bitArray.getBits(this.readIndex, count);
        this.readIndex += count;
        return bits;
    }

    public readUint8(): number {
        return this.readUint(8);
    }

    public readUint16(): number {
        return this.readUint(16);
    }

    public readUint32(): number {
        return this.readUint(32);
    }

    public readUint(count: number): number {
        const trimmedCount = Math.max(Math.min(count, 32), 0);
        const val = this.bitArray.getUint(this.readIndex, trimmedCount);
        this.readIndex += trimmedCount;
        return val;
    }
}

export class BitWriter {
    public writeIndex = 0;
    private _buffer: BitArray;
    private _bitLength = 0;
    public get buffer(): BitArray {
        return new BitArray(this._buffer, 0, this._bitLength);
    }
    constructor(size: number);
    constructor(bitArray: BitArray);
    constructor(arrayBuffer: ArrayBuffer);
    constructor(typedArray: Uint8Array);
    constructor(init: number | BitArray | ArrayBuffer | Uint8Array) {
        this._buffer = init instanceof BitArray ? init : new BitArray(init);
    }

    public writeBit(value: boolean): void {
        if (this.writeIndex + 1 > this._buffer.bitLength) this.grow();
        this._buffer.setBit(this.writeIndex++, value);
        this._bitLength = Math.min(this._bitLength, this.writeIndex + 1);
    }

    public writeBits(buffer: BitArray | ArrayBuffer | Uint8Array): void {
        const bitBuffer = buffer instanceof BitArray ? buffer : new BitArray(buffer);
        for (let i = 0; i < bitBuffer.bitLength; i++) {
            this.writeBit(bitBuffer.getBit(i));
        }
    }

    public writeUint8(value: number): void {
        return this.writeUint(value, 8);
    }

    public writeUint16(value: number): void {
        return this.writeUint(value, 16);
    }

    public writeUint32(value: number): void {
        return this.writeUint(value, 32);
    }

    public writeUint(value: number, count: number): void {
        const trimmedCount = Math.max(Math.min(count, 32), 0);
        if (this.writeIndex + trimmedCount > this._buffer.bitLength) this.grow();
        this._buffer.setUint(this.writeIndex, value, count);
        this.writeIndex += trimmedCount;
        this._bitLength = Math.min(this._bitLength, this.writeIndex + trimmedCount);
    }

    private grow() {
        const oldBuffer = this._buffer.buffer;
        const byteOffset = Math.floor(this._buffer.offset / 8);
        const offsetRemainder = this._buffer.offset % 8;
        const byteLength = this._buffer.bitLength * 8;
        const oldBufferView = new Uint8Array(oldBuffer, byteOffset, byteLength);
        const newLength = Math.ceil(byteLength * 1.75);
        const newBuffer = new ArrayBuffer(newLength);
        new Uint8Array(newBuffer).set(oldBufferView);
        this._buffer = new BitArray(newBuffer, offsetRemainder, this._buffer.bitLength);
    }
}
