import { Future } from '../async/Future';
import { TransformStreamExt } from './TransformStreamExt';

/**
 * Provides an easy async-reader interface for transforming a stream without worying about chunk boundries.
 */
export abstract class SimpleByteTransformer<Tout> extends TransformStreamExt<Uint8Array, Tout> {
    protected controller?: TransformStreamDefaultController<Tout>;
    private buffers: Uint8Array[] = [];
    public bufferedLength = 0;
    private readIndex = 0;
    private chunkFuture = new Future<void>();
    private endPromise?: Promise<void>;

    protected onStart(controller: TransformStreamDefaultController<Tout>): void {
        this.controller = controller;
        this.endPromise = this.transformAsync().then(
            () => { /* noop */ },
            error => this.controller?.error(error)
        );
    }

    protected onTransform(chunk: Uint8Array, controller: TransformStreamDefaultController<Tout>): void {
        this.controller = controller;
        this.buffers.push(chunk);
        this.bufferedLength += chunk.byteLength;
        this.chunkFuture.resolve();
        this.chunkFuture = new Future<void>();
        this.pruneStart();
    }

    protected async onFlush(controller: TransformStreamDefaultController<Tout>): Promise<void> {
        this.controller = controller;
        this.chunkFuture.reject(new Error('no more chunks'));
        await this.endPromise;
    }

    public async isDone(): Promise<boolean> {
        if (this.bufferedLength - this.readIndex > 0) return false;
        try {
 await this.chunkFuture; 
} catch {
            return this.bufferedLength - this.readIndex <= 0
        }
        return this.isDone();
    }

    /**
     * Prunes any buffers that have already been read.
     */
    public pruneStart(): void {
        while (this.buffers[0] && this.buffers[0].byteLength < this.readIndex) {
            this.readIndex -= this.buffers[0].byteLength;
            this.bufferedLength -= this.buffers[0].byteLength;
            this.buffers.shift();
        }
    }

    /**
     * Gets the byte at the specified index. Throws if the index is out of bounds.
     * @param index The index to get
     * @returns The byte
     */
    private getBufferedByte(index: number): number {
        if (index < 0) throw new RangeError('Index cannot be less than 0.');
        for (const buffer of this.buffers) {
            if (buffer.byteLength > index) return buffer[index] as number;
            index -= buffer.byteLength;
        }
        throw new RangeError('Index is outside the bounds of the array.');
    }

    /**
     * Gets the bytes at the specified index. Throws if the index is out of bounds.
     * @param index The index to get
     * @param count The number of bytes to get
     * @returns The bytes
     */
    private getBufferedBytes(index: number, count: number): Uint8Array {
        if (index < 0) throw new RangeError('Index cannot be less than 0.');
        if (count < 0) throw new RangeError('Count cannot be less than 0.');
        if (index + count > this.bufferedLength) throw new RangeError('Index is outside the bounds of the array.');
        let newBuff: Uint8Array | undefined;
        for (let i = 0; i < this.buffers.length; i++) {
            const buffer = this.buffers[i] as Uint8Array;
            // If we're reading into the new buffer
            if (newBuff) {
                // If this buffer has enough bytes to finish the request
                if (buffer.byteLength >= count) {
                    newBuff.set(buffer.subarray(0, count), newBuff.byteLength - count);
                    return newBuff;
                } else { // Keep copying
                    newBuff.set(buffer, newBuff.byteLength - count);
                    count -= buffer.byteLength;
                }
            } else { // We're searching for the start buffer
                // If the index is inside this buffer
                if (buffer.byteLength > index) {
                    // Shortcut if we can read the whole request from this buffer
                    if (buffer.byteLength >= index + count) {
                        return buffer.subarray(index, index + count);
                    }
                    // Otherwise we need to copy
                    newBuff = new Uint8Array(count);
                    newBuff.set(buffer.subarray(index), 0);
                    count -= buffer.byteLength - index;
                } else { // The index is past this buffer
                    index -= buffer.byteLength;
                }
            }
        }
        throw new RangeError('Index is outside the bounds of the array.');
    }

    /**
     * Reads a uint8 value from the stream.
     * @returns The uint8 value
     */
    public async readUint8(): Promise<number> {
        await this.ensureBytesAvailable(1);
        return this.getBufferedByte(this.readIndex++);
    }

    /**
     * Reads a uint16 value from the stream.
     * @returns The uint16 value
     */
    public async readUint16(): Promise<number> {
        await this.ensureBytesAvailable(2);
        return this.getBufferedByte(this.readIndex++) << 8
            | this.getBufferedByte(this.readIndex++);
    }

    /**
     * Reads a uint32 value from the stream.
     * @returns The uint32 value
     */
    public async readUint32(): Promise<number> {
        await this.ensureBytesAvailable(4);
        return this.getBufferedByte(this.readIndex++) << 24
            | this.getBufferedByte(this.readIndex++) << 16
            | this.getBufferedByte(this.readIndex++) << 8
            | this.getBufferedByte(this.readIndex++);
    }

    /**
     * Reads the specified number of bytes from the stream.
     * @param count The number of bytes to read
     * @returns The bytes
     */
    public async readBytes(count: number): Promise<Uint8Array> {
        await this.ensureBytesAvailable(count);
        const bytes = this.getBufferedBytes(this.readIndex, count);
        this.readIndex += count;
        this.pruneStart();
        return bytes;
    }

    /**
     * Ensures the specified number of bytes are be available.
     * @param count The number of bytes needed.
     */
    public async ensureBytesAvailable(count: number): Promise<void> {
        while (this.bufferedLength - this.readIndex < count) {
            await this.chunkFuture;
        }
    }

    /**
     * Reads all data that's been buffered for reading.
     * @returns All buffered data
     */
    public readAllBuffered(): Uint8Array {
        this.pruneStart();
        let rtn;
        // Shortcut if there's only one buffer
        if (this.buffers.length == 1 && this.buffers[0]) {
            rtn = this.buffers[0].subarray(this.readIndex);
        } else {
            rtn = new Uint8Array(this.bufferedLength - this.readIndex);
            let writeIndex = 0;
            for (const buffer of this.buffers) {
                rtn.set(buffer.subarray(this.readIndex), writeIndex)
                writeIndex += buffer.byteLength - this.readIndex;
                this.readIndex = 0;
            }
        }
        this.buffers = [];
        this.bufferedLength = 0;
        return rtn;
    }

    public abstract transformAsync(): Promise<void>;
}
