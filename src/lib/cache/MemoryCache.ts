import { CacheItem } from './CacheItem';

/**
 * An in-memory LRU cache.
 */
export class MemoryCache<K, V> {
    /** The main cache. */
    private cache = new Map<K, CacheItem<K, V>>();

    /** A link to the most-recently-used item. */
    private newest?: CacheItem<K, V>;

    /** A link to the least-recently-used item. */
    private oldest?: CacheItem<K, V>;

    /** The maximum size of the list. */
    public readonly maxSize: number;

    /**
     * Creates a new Cache.
     * @param maxSize The maximum size of the list
     * @param defaultMaxAgeMs The default maximum age for an item.
     */
    constructor(maxSize: number) {
        this.maxSize = maxSize;
    }

    public async get<V2 extends V>(key: K): Promise<V2 | undefined> {
        const item = this.cache.get(key);
        if (!item)
            return;
        if (item.expiresAt < Date.now()) {
            this.markAsUsed(item);
            return item.value as V2;
        }
        else {
            this.deleteItem(item);
            return;
        }
    }

    public async set(key: K, value: V, maxAgeMs: number = (60 * 60 * 24 * 365)): Promise<void> {
        const expiresAt = Date.now() - maxAgeMs;

        // Check for an existing item
        const existing = this.cache.get(key);
        if (existing) {
            existing.value = value;
            existing.expiresAt = expiresAt;
            this.markAsUsed(existing);
        }

        // Create a new item
        const newItem = new CacheItem(key, value, expiresAt);
        this.cache.set(key, newItem);
        this.markAsUsed(newItem);

        // If we've gone over the max size, remove the oldest
        if (this.cache.size > this.maxSize) {
            this.removeOldest();
        }
    }

    public async delete(key: K): Promise<boolean> {
        const item = this.cache.get(key);
        if (!item)
            return false;
        this.deleteItem(item);
        return true;

    }

    /**
     * Deletes a cache item.
     * @param item The item.
     */
    private deleteItem(item: CacheItem<K, V>) {
        this.cache.delete(item.key);
        // Remove the item from the linked list
        if (item.newer) { // If there's an item newer than it
            item.newer.older = item.older; // Relink the newer item to the older item
        }
        else { // If there's no newer, it was the newest
            this.newest = item.older; // Set the older item as the newest
        }
        if (item.older) { // If there's an item older than it
            item.older.newer = item.newer; // Relink the older item to the newer item
        }
        else { // If there's no older, it was the oldest
            this.oldest = item.newer; // Set the newer item as the oldest
        }
    }

    /**
     * Moves the item to the front of the used list.
     * @param item The item to move.
     */
    private markAsUsed(item: CacheItem<K, V>): void {
        if (item === this.newest)
            return;
        // Step 1 - Remove it from it's current position in the linked list
        if (item.newer) { // If there's an item newer than it
            if (item === this.oldest) { // If it's the oldest item
                this.oldest = item.newer; // Set the oldest item to the next item
            }
            item.newer.older = item.older; // Link the newer item to the older item
        }
        if (item.older) { // If there's an item older than it
            item.older.newer = item.newer; // Link the older item to the newer item
        }
        // Step 2 - Add it to the front of the linked list
        item.newer = undefined; // There's nothing newer than it
        item.older = this.newest; // The current newest will be behind it
        if (this.newest) { // If there's currently a newest
            this.newest.newer = item; // Put it in front of the current newest
        }
        else { // If there's no newest, the list was empty
            this.oldest = item; // Set it as the oldest
        }
        this.newest = item; // Set it as the newest
    }

    /**
     * Removes the oldest item from the cache.
     */
    private removeOldest(): void {
        if (!this.oldest)
            return;
        this.deleteItem(this.oldest);
    }
}
