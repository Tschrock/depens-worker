export abstract class WritableStreamExt<W> extends WritableStream<W> {
    constructor(strategy?: QueuingStrategy<W>) {
        super({
            abort: (...args) => abort(...args),
            close: (...args) => close(...args),
            start: (...args) => Promise.resolve().then(() => start(...args)),
            write: (...args) => write(...args),
        }, strategy);
        const abort = this.onAbort.bind(this);
        const close = this.onClose.bind(this);
        const start = this.onStart.bind(this);
        const write = this.onWrite.bind(this);
    }
    protected abstract onAbort(reason: unknown): void | PromiseLike<void>;
    protected abstract onClose(): void | PromiseLike<void>;
    protected abstract onStart(controller: WritableStreamDefaultController): void;
    protected abstract onWrite(chunk: W, controller: WritableStreamDefaultController): void;
}
