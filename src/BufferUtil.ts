
/**
 * Creates a copy of an ArrayBuffer with the given size.
 * @param oldBuffer The old buffer.
 * @param newSize The size of the new buffer.
 */
export function resizeBuffer(oldBuffer: ArrayBuffer, newSize: number): ArrayBuffer {
    const newBuffer = new ArrayBuffer(newSize);
    new Uint8Array(newBuffer).set(new Uint8Array(oldBuffer, 0, Math.min(oldBuffer.byteLength, newSize)));
    return newBuffer;
}

/**
 * Merges the given ArrayBuffers.
 * @param buffers The buffers to merge.
 */
export function concatBuffers(...buffers: ArrayBuffer[]): ArrayBuffer {
    const totalLength = buffers.reduce((total, buffer) => total + buffer.byteLength, 0);
    const newBuffer = new Uint8Array(totalLength);
    let currentOffset = 0;
    for (const buffer of buffers) {
        newBuffer.set(new Uint8Array(buffer), currentOffset);
        currentOffset += buffer.byteLength;
    }
    return newBuffer.buffer;
}

/**
 * Compares two iterables.
 * @param a Iterable A
 * @param b Iterable B
 * @returns `true` if both iterables produce the same values, `false` otherwise.
 */
export function compareIterable<T>(a: Iterable<T>, b: Iterable<T>): boolean {
    const ai = a[Symbol.iterator]();
    const bi = b[Symbol.iterator]();
    let ar = ai.next();
    let br = bi.next();
    while (!ar.done || !br.done) {
        if(ar.done != br.done) return false;
        if(ar.value != br.value) return false;
        ar = ai.next();
        br = bi.next();
    }
    return true;
}
