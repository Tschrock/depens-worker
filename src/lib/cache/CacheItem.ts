/**
 * A cached item.
 */
export class CacheItem<K, V> {
    public key: K;
    public value: V;
    public expiresAt: number;
    public newer?: CacheItem<K, V>;
    public older?: CacheItem<K, V>;
    constructor(key: K, value: V, expiresAt: number) {
        this.key = key;
        this.value = value;
        this.expiresAt = expiresAt;
    }
}
