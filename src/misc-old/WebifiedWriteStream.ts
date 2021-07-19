import { Readable as NodeReadable } from 'stream';
import { ReadableStreamExt } from '../lib/streams/ReadableStreamExt';

export class WebifiedWriteStream<W> extends ReadableStreamExt<W> {
    private controller?: ReadableStreamDefaultController<W>;
    private readonly nodeStream: NodeReadable;
    private closed = false;
    constructor(nodeStream: NodeReadable) {
        super();
        this.nodeStream = nodeStream;
        nodeStream.on('close', this.onNodeClose.bind(this));
        nodeStream.on('data', this.onNodeData.bind(this));
        nodeStream.on('end', this.onNodeEnd.bind(this));
        nodeStream.on('error', this.onNodeError.bind(this));
    }

    private onNodeClose(): void {
        this.tryclose();
    }

    private onNodeData(chunk: W): void {
        this.controller?.enqueue(chunk);
    }

    private onNodeEnd(): void {
        this.tryclose();
    }

    private onNodeError(err: Error): void {
        this.controller?.error(err);
    }

    protected onCancel(): void | PromiseLike<void> {
        this.nodeStream.removeAllListeners();
        this.nodeStream.destroy();
    }

    protected onPull(controller: ReadableStreamController<W>): void | PromiseLike<void> {
        this.controller = controller;
        this.nodeStream.resume();
    }

    protected onStart(controller: ReadableStreamController<W>): void | PromiseLike<void> {
        this.controller = controller;
        this.nodeStream.resume();
    }

    private tryclose() {
        if(!this.closed) {
            this.closed = true;
            this.controller?.close();
        }
    }
}
