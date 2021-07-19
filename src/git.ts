import { BitArray, BitReader, BitWriter } from './lib/BitBuffer';



enum PacketLineSpecials {
    FLUSH = 0,
    DELIMITER = 1,
    RESPONSE_END = 2,
}

export function makePackFileRequest(id: string): (string | PacketLineSpecials)[] {
    const pktLines = [
        `want ${id}\n`, // We want objects connected to this id
        'deepen 1\n', // We only want to go one commit deep
        PacketLineSpecials.FLUSH, // Flush
        'done\n', // Tell the server we're done
    ];
    return pktLines;
}

function parsePackFile(buffer: ArrayBuffer) {
    const decoder = new TextDecoder('ascii');
    const reader = new ByteReader(buffer);

    // Read and check the magic bytes ("PACK")
    const magic = reader.readBytes(4);
    if (decoder.decode(magic) !== 'PACK') {
        throw new Error('Missing \'PACK\' magic header.');
    }

    // Read the pack file version (4 byte int, big endian)
    const packFileVersion = reader.readUint32();

    // Read the entry count (4 byte int, big endian)
    const entryCount = reader.readUint32();

    // Read the entries
    for (let i = 0; i < entryCount; i++) {
        // > The object header is a series of one or more 1 byte (8 bit) hunks
        // > Each byte is really 7 bits of data, with the first bit being used to say if that hunk is the last one 
        // > The first 3 remaining bits in the first byte specifies the type of data
        // The uncompressed length is derived from all the remaining bits, put together in reverse hunk order
        const dataLengthHunks: BitArray[] = [];

        // Read the first header byte
        let bReader = new BitReader(reader.readBytes(1));

        // Read the continue bit
        let continueBit = bReader.readBit();

        // Read the data type (3 bits)
        const dataType: PackFileObjectTypes = bReader.readUint(3);

        // Read the remaining bits into the first hunk
        dataLengthHunks.push(bReader.readBits(4));

        // While the continue bit is set
        while (continueBit) {
            // Read the next header byte
            bReader = new BitReader(reader.readBytes(1));

            // Read the continue bit
            continueBit = bReader.readBit();

            // Read the remaining bits into the next hunk
            dataLengthHunks.push(bReader.readBits(7));
        }

        // Hunks get joined in reverse order
        dataLengthHunks.reverse();

        // Join the hunks and pull out the number
        const bitCount = dataLengthHunks.reduce((pv, cv) => pv + cv.bitLength, 0);
        const writer = new BitWriter(bitCount);
        for (const hunk of dataLengthHunks) {
            writer.writeBits(hunk);
        }
        const dataLength = new BitReader(writer.buffer).readUint(bitCount);

        switch (dataType) {
            case PackFileObjectTypes.OBJ_COMMIT:
            case PackFileObjectTypes.OBJ_TREE:
            case PackFileObjectTypes.OBJ_BLOB:
            case PackFileObjectTypes.OBJ_TAG:
                // Read ZLib data

                // 01111000  10011100

                // 1000 - Compression method (must be 8)
                // 0111 - Compression info
                // 11100 - FCHECK
                // 0 - FDICT
                // 10 - FLEVEL

                // TODO

                break;
            case PackFileObjectTypes.OBJ_OFS_DELTA:
            case PackFileObjectTypes.OBJ_REF_DELTA:
                throw new Error(`Unsupported pack file object type '${dataType}'`);
            default:
                throw new Error(`Unknown pack file object type '${dataType}'`);
        }

    }

}

/**
 * Like an iterator, but with `peek()`.
 */
class ArrayReader<T> {
    private index = 0;
    constructor(private array: Array<T>) { }
    get done() {
 return this.index >= this.array.length 
}
    public next() {
 return this.array[this.index++]; 
}
    public peek() {
 return this.array[this.index]; 
}
}

class ByteReader {
    private dataView: DataView;
    private byteView: Uint8Array;
    private index = 0;
    constructor(private buffer: ArrayBuffer) {
        this.dataView = new DataView(buffer);
        this.byteView = new Uint8Array(buffer);
    }
    get done() {
 return this.index >= this.buffer.byteLength; 
}
    private inc(amount: number): number {
        const rtn = this.index;
        this.index += amount;
        return rtn;
    }
    private incRange(amount: number): readonly [number, number] {
        const range = [this.index, this.index + amount] as const;
        this.index += amount;
        return range;
    }
    public readInt8(): number {
 return this.dataView.getInt8(this.inc(1)); 
}
    public readUint8(): number {
 return this.dataView.getUint8(this.inc(1)); 
}
    public readInt16(littleEndian?: boolean): number {
 return this.dataView.getInt16(this.inc(2), littleEndian); 
}
    public readUint16(littleEndian?: boolean): number {
 return this.dataView.getUint16(this.inc(2), littleEndian); 
}
    public readInt32(littleEndian?: boolean): number {
 return this.dataView.getInt32(this.inc(4), littleEndian); 
}
    public readUint32(littleEndian?: boolean): number {
 return this.dataView.getUint32(this.inc(4), littleEndian); 
}
    public readBytes(len: number) {
 return this.byteView.subarray(...this.incRange(len)); 
}
}

/**
 * SEE https://git-scm.com/docs/protocol-common
 *
 * Notes: 
 * The spec doesn't say much about null lines (0000) other than that the server must end the response with one
 * Version 2 of the protocol says it "indicates the end of a message"
 * The server implimentations I've seen also send one after the header lines - does that mean the header is considered a seperate message?
 * For our purposes, we will just gracefully ignore them
 * 
 * @param buffer The data buffer.
 */
function parsePktLines(buffer: ArrayBuffer): (Uint8Array | PacketLineSpecials)[] {
    const reader = new ByteReader(buffer);
    const decoder = new TextDecoder('ascii');
    const dataLines: (Uint8Array | PacketLineSpecials)[] = [];
    while (!reader.done) {
        // The first four bytes of the line, indicates the total length of the line, in hexadecimal.
        const lineLenHexBuffer = reader.readBytes(4);
        const lineLenHex = decoder.decode(lineLenHexBuffer);
        const lineLen = parseInt(lineLenHex, 16);
        // The length includes the 4 bytes used to contain the length’s hexadecimal representation.
        const dataLen = lineLen - 4;
        // A line with a length < 4 is a special packet
        if (lineLen < 0) {
            dataLines.push(lineLen);
        } else {
            const dataBuffer = reader.readBytes(dataLen);
            // Strip the LF if present.
            if (dataBuffer[dataLen - 1] == 10) {
                dataLines.push(dataBuffer.subarray(0, dataLen - 1));
            } else {
                dataLines.push(dataBuffer);
            }
        }
    }
    return dataLines;
}
