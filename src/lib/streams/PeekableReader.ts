export class PeekableReader<R> implements ReadableStreamDefaultReader<R> {
    private peeked: ReadableStreamDefaultReadResult<R> | null = null;
    constructor(private reader: ReadableStreamDefaultReader<R>) { }
    /**
     * Peeks the next value without consuming it.
     * @returns The read result.
     */
    public async peek(): Promise<ReadableStreamDefaultReadResult<R>> {
        return this.peeked = this.peeked || await this.reader.read();
    }
    /**
     * Reads the next value.
     * @returns The read result.
     */
    public async read(): Promise<ReadableStreamDefaultReadResult<R>> {
        if (this.peeked) {
            const peeked = this.peeked;
            this.peeked = null;
            return peeked;
        } else {
            return await this.reader.read();
        }
    }
    releaseLock(): void {
 this.reader.releaseLock(); 
}
    get closed(): Promise<undefined> {
 return this.reader.closed; 
}
    cancel<T>(reason?: T): Promise<void> {
 return this.reader.cancel(reason); 
}
}
