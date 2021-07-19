export abstract class ReadableStreamExt<R> extends ReadableStream<R> {
    constructor(strategy?: QueuingStrategy<R>) {
        super({ 
            cancel: (...args) => cancel(...args),
            pull: (...args) => pull(...args),
            start: (...args) => Promise.resolve().then(() => start(...args)),
        }, strategy);
        const cancel = this.onCancel.bind(this);
        const pull = this.onPull.bind(this);
        const start = this.onStart.bind(this);
    }
    protected abstract onCancel(reason: unknown): void | PromiseLike<void>
    protected abstract onPull(controller: ReadableStreamController<R>): void | PromiseLike<void>
    protected abstract onStart(controller: ReadableStreamController<R>): void | PromiseLike<void>
}
