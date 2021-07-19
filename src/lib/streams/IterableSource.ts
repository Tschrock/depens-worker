import { ReadableStreamExt } from './ReadableStreamExt';

/**
 * Checks if an iterable is async. Used for type narrowing since typescript
 * doesn't like mixing symbols and unions.
 * 
 * See https://github.com/microsoft/TypeScript/issues/36463
 * and https://github.com/microsoft/TypeScript/issues/36230
 * 
 * @param value The value
 * @returns A boolean indicating if the iterable is async
 */
function isAsync<T>(value: Iterable<T> | AsyncIterable<T>): value is AsyncIterable<T> {
    return Symbol.asyncIterator in value;
}

/**
 * A stream backed by an iterable.
 */
export class IterableSource<W> extends ReadableStreamExt<W> {
    private iterable: Iterable<W> | AsyncIterable<W>;
    private iterator!: Iterator<W> | AsyncIterator<W>;

    constructor(iterable: Iterable<W> | AsyncIterable<W>) {
        super();
        this.iterable = iterable;
    }

    protected onStart(): void {
        this.iterator = isAsync(this.iterable)
            ? this.iterable[Symbol.asyncIterator]()
            : this.iterable[Symbol.iterator]();
    }

    protected async onPull(controller: ReadableStreamController<W>): Promise<void> {
        const next = await this.iterator.next();
        if (next.done) controller.close();
        else controller.enqueue(next.value);
    }
    
    protected onCancel(): void { /* noop */ }
}
