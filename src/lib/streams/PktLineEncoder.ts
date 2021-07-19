import { TransformStreamExt } from './TransformStreamExt';
import { PktLineSpecials } from '../PktLineSpecials';

export type PktLineInput = PktLineSpecials | Uint8Array | string;

export class PktLineEncoder extends TransformStreamExt<PktLineInput, Uint8Array> {
    private encoder = new TextEncoder();
    protected onStart(): void { /* */ }
    protected onFlush(): void { /* */ }
    protected onTransform(chunk: PktLineInput, controller: TransformStreamDefaultController<Uint8Array>): void | PromiseLike<void> {
        if (typeof chunk === 'number') {
            const valueHex = chunk.toString(16).padStart(4, '0');
            const valueHexBin = this.encoder.encode(valueHex);
            controller.enqueue(valueHexBin);
        } else if (typeof chunk === 'string') {
            const valueBin = this.encoder.encode(chunk);
            const lineLength = valueBin.byteLength + 4;
            const lineLengthHex = lineLength.toString(16).padStart(4, '0');
            const lineLengthHexBin = this.encoder.encode(lineLengthHex);
            controller.enqueue(lineLengthHexBin);
            controller.enqueue(valueBin);
        } else {
            const lineLength = chunk.byteLength + 4;
            const lineLengthHex = lineLength.toString(16).padStart(4, '0');
            const lineLengthHexBin = this.encoder.encode(lineLengthHex);
            controller.enqueue(lineLengthHexBin);
            controller.enqueue(chunk);
        }
    }
}
