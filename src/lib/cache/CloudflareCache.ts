import { res } from '../../response';

/**
 * Cloudflare's Cache
 */

export class CloudflareCache<T> {
    private readonly rootUrl: URL;
    private readonly cache: Cache;
    constructor(rootUrl: URL, cache: Cache = caches.default) {
        this.rootUrl = rootUrl;
        this.cache = cache;
    }

    public async get<V2 extends T>(key: string): Promise<V2 | undefined> {
        const res = await this.cache.match(this.getRequestForKey(key));
        if (res && res.status === 200) {
            return res.json();
        }
        return;
    }

    public async set(key: string, value: T, maxAgeMs?: number): Promise<void> {
        return this.cache.put(
            this.getRequestForKey(key),
            res.ok.cache(`max-age=${maxAgeMs ? (maxAgeMs / 100) : (60 * 60 * 24 * 365)}`).json(value)
        );
    }

    public async delete(key: string): Promise<boolean> {
        return this.cache.delete(this.getRequestForKey(key));
    }

    private getRequestForKey(key: string): Request {
        const keyUrl = new URL(key, this.rootUrl).href;
        return new Request(keyUrl, { headers: { 'Cache-Control': 'only-if-cached' } });
    }
}
