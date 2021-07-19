import chai, { expect } from 'chai';
import cap from 'chai-as-promised';
chai.use(cap);

import { PktLine, PktLineReader } from '../../../src/lib/streams/PktLineReader';
import { IterableSource } from '../../../src/lib/streams/IterableSource';

function split(buff: Uint8Array, len: number): Uint8Array[] {
    const chunks = new Array<Uint8Array>(Math.ceil(buff.length / len));
    for (let i = 0; i < chunks.length; i++) {
        chunks[i] = buff.subarray(i * len, (i + 1) * len);
    }
    return chunks;
}

// Test configuration
const chunkSizes = [8, 32, 128, 512, 2048, 9, 37, 46, 94, 173];
const testDataEncodedLocation = './test/data/git-upload-pack.bin';
const testDataDecodedLocation = './test/data/git-upload-pack.json';

// Get the test data
let testDataEncodedBuffer: Uint8Array;
let testDataDecodedRaw: (string | number)[];
let testDataDecoded: PktLine[];

before(async () => {
    testDataEncodedBuffer = new Uint8Array(await (await fetch(testDataEncodedLocation)).arrayBuffer());
    testDataDecodedRaw = await (await fetch(testDataDecodedLocation)).json();
    const encoder = new TextEncoder();
    testDataDecoded = testDataDecodedRaw.map(x => typeof x === 'string' ? encoder.encode(x) : x);
});

describe('PktLineReader', () => {
    for (const chunkSize of chunkSizes) {
        it(`Should decode the test file with chunk size ${chunkSize}`, async () => {
            // Create the file stream
            const fileReader = new IterableSource(split(testDataEncodedBuffer, chunkSize));

            // Pipe through the decoder
            const reader = new PktLineReader();
            const lineStream = fileReader.pipeThrough(reader).getReader();

            // Collect lines
            const values: unknown[] = [];
            let done: boolean, value: PktLine | undefined;
            ({ done, value } = await lineStream.read());
            while (!done) {
                values.push(value);
                ({ done, value } = await lineStream.read());
            }
            // expect(reader.bufferedLength).to.equal(0);

            // Check lines
            expect(values).to.deep.equal(testDataDecoded);
        });
    }
});
