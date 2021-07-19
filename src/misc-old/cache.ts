
export interface WorkerCache<K, V> {
    /**
     * Gets an item from the cache.
     * @param key The key for the item.
     * @returns The item, or undefined if it is expired or doesn't exist.
     */
    get<V2 extends V>(key: K): Promise<V2 | undefined>;
    /**
     * Stores a value in the cache.
     * @param key The key for the item.
     * @param value The item.
     * @param maxAgeMs Optional. The max age if the item.
     * @returns This item cache.
     */
    set(key: K, value: V, maxAgeMs?: number): Promise<void>;
    /**
     * Removes the specified item from the cache.
     * @param key The key to delete.
     * @returns The value of the deleted key, or undefined if it didn't exist.
     */
    delete(key: K): Promise<boolean>;
}

export class MergedCache<K, V> implements WorkerCache<K, V> {
    constructor(private caches: WorkerCache<K, V>[]) { }
    async get<V2 extends V>(key: K): Promise<V2 | undefined> {
        let i = 0;
        let item = undefined;
        for (; i < this.caches.length; i++) {
            const cache = this.caches[i];
            item = await cache?.get(key);
            if (item) break;
        }
        for (i--; i >= 0; i--) {
            const cache = this.caches[i];
            if(cache && item) await cache.set(key, item);
        }
        return item as V2;
    }
    async set(key: K, value: V, maxAgeMs?: number): Promise<void> {
        for (const cache of this.caches) {
            await cache.set(key, value, maxAgeMs);
        }
    }
    async delete(key: K): Promise<boolean> {
        let rtn = false;
        for (const cache of this.caches) {
            rtn = rtn || await cache.delete(key);
        }
        return rtn;
    }
}
