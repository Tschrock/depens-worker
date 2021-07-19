import { SimpleByteTransformer } from './SimpleByteTransformer';
import { PktLineSpecials } from '../PktLineSpecials';
import { BitArray, BitReader } from '../BitBuffer';

export type PktLine = PktLineSpecials | Uint8Array;

enum PackFileObjectTypes {
    OBJ_COMMIT = 0b001,
    OBJ_TREE = 0b010,
    OBJ_BLOB = 0b011,
    OBJ_TAG = 0b100,
    OBJ_OFS_DELTA = 0b110,
    OBJ_REF_DELTA = 0b111,
}

export class PackfileDecoder extends SimpleByteTransformer<PktLine> {
    private decoder = new TextDecoder('ascii');

    public async transformAsync(): Promise<void> {
        // Read and check the magic bytes ("PACK")
        const magic = await this.readBytes(4);
        if (this.decoder.decode(magic) !== 'PACK') {
            throw new Error('Missing \'PACK\' magic header.');
        }

        // Read the pack file version (4 byte int, big endian)
        await this.readUint32();

        // Read the entry count (4 byte int, big endian)
        const entryCount = await this.readUint32();

        // Read the entries
        for (let i = 0; i < entryCount; i++) {
            // > The object header is a series of one or more 1 byte (8 bit) hunks
            // > Each byte is really 7 bits of data, with the first bit being used to say if that hunk is the last one 
            // > The first 3 remaining bits in the first byte specifies the type of data
            // The uncompressed length is derived from all the remaining bits, put together in reverse hunk order
            const dataLengthHunks: BitArray[] = [];

            // Read the first header byte
            let bReader = new BitReader(await this.readBytes(1));

            // Read the continue bit
            let continueBit = bReader.readBit();

            // Read the data type (3 bits)
            const dataType: PackFileObjectTypes = bReader.readUint(3);

            // Read the remaining bits into the first hunk
            dataLengthHunks.push(bReader.readBits(4));

            // While the continue bit is set
            while (continueBit) {
                // Read the next header byte
                bReader = new BitReader(await this.readBytes(1));

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
}
