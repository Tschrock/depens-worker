import { SimpleByteTransformer } from './SimpleByteTransformer';
import { PktLineSpecials } from '../PktLineSpecials';

export type PktLine = PktLineSpecials | Uint8Array;

export class PktLineDecoder extends SimpleByteTransformer<PktLine> {
    private decoder = new TextDecoder('ascii');
    public async transformAsync(): Promise<void> {
        while (!await this.isDone()) {
            // The first four bytes of the line, indicates the total length of the line, in hexadecimal.
            const lineLenHexBuffer = await this.readBytes(4);
            const lineLenHex = this.decoder.decode(lineLenHexBuffer);
            const lineLen = parseInt(lineLenHex, 16);
            // A line with a length < 4 is a special packet
            if (lineLen < 4) {
                this.controller?.enqueue(lineLen);
            } else {
                // The length includes the 4 bytes used to contain the length’s hexadecimal representation.
                const dataLen = lineLen - 4;
                const dataBuffer = await this.readBytes(dataLen);
                // Strip the LF if present.
                if (dataBuffer[dataLen - 1] == 10) {
                    this.controller?.enqueue(dataBuffer.subarray(0, dataLen - 1));
                } else {
                    this.controller?.enqueue(dataBuffer);
                }
            }
        }
    }
}
