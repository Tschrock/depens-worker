export abstract class TransformStreamExt<I = unknown, O = unknown> extends TransformStream<I, O> {
    constructor(writableStrategy?: QueuingStrategy<I>, readableStrategy?: QueuingStrategy<O>) {
        super({
            flush: (...args) => flush(...args),
            start: (...args) => Promise.resolve().then(() => start(...args)),
            transform: (...args) => transform(...args),
        }, writableStrategy, readableStrategy);
        const flush = this.onFlush.bind(this);
        const start = this.onStart.bind(this);
        const transform = this.onTransform.bind(this);
    }
    protected abstract onFlush(controller: TransformStreamDefaultController<O>): void | PromiseLike<void>;
    protected abstract onStart(controller: TransformStreamDefaultController<O>): void | PromiseLike<void>;
    protected abstract onTransform(chunk: I, controller: TransformStreamDefaultController<O>): void | PromiseLike<void>;
}
