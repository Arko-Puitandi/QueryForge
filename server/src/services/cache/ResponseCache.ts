import crypto from 'crypto';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  hits: number;
  ttl: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  memoryUsage: number;
}

export class ResponseCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private stats: CacheStats = { hits: 0, misses: 0, size: 0, memoryUsage: 0 };
  private maxSize: number;
  private defaultTTL: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(options: { maxSize?: number; defaultTTL?: number; cleanupIntervalMs?: number } = {}) {
    this.maxSize = options.maxSize || 500;
    this.defaultTTL = options.defaultTTL || 5 * 60 * 1000; // 5 minutes default
    
    // Start cleanup interval
    const cleanupMs = options.cleanupIntervalMs || 60000; // 1 minute
    this.cleanupInterval = setInterval(() => this.cleanup(), cleanupMs);
    
    console.log(`[Cache] Initialized with maxSize=${this.maxSize}, defaultTTL=${this.defaultTTL}ms`);
  }

  /**
   * Generate a cache key from request parameters
   */
  generateKey(prefix: string, params: any): string {
    const normalized = JSON.stringify(params, Object.keys(params).sort());
    const hash = crypto.createHash('md5').update(normalized).digest('hex');
    return `${prefix}:${hash}`;
  }

  /**
   * Get value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    entry.hits++;
    this.stats.hits++;
    console.log(`[Cache] Hit for key: ${key.substring(0, 30)}... (hits: ${entry.hits})`);
    return entry.data as T;
  }

  /**
   * Set value in cache
   */
  set<T>(key: string, data: T, ttl?: number): void {
    // Evict if at capacity
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      hits: 0,
      ttl: ttl || this.defaultTTL,
    };

    this.cache.set(key, entry);
    this.stats.size = this.cache.size;
    console.log(`[Cache] Set key: ${key.substring(0, 30)}... (size: ${this.cache.size})`);
  }

  /**
   * Delete a specific key
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    this.stats.size = this.cache.size;
    return deleted;
  }

  /**
   * Clear all entries with a specific prefix
   */
  clearPrefix(prefix: string): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        count++;
      }
    }
    this.stats.size = this.cache.size;
    console.log(`[Cache] Cleared ${count} entries with prefix: ${prefix}`);
    return count;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.stats.size = 0;
    console.log('[Cache] Cleared all entries');
  }

  /**
   * Evict least recently used entries
   */
  private evictLRU(): void {
    // Find entry with lowest hits and oldest timestamp
    let oldestKey: string | null = null;
    let lowestScore = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      // Score based on recency and hit count
      const age = Date.now() - entry.timestamp;
      const score = entry.hits * 1000 - age; // Higher hits = higher score, older = lower score
      
      if (score < lowestScore) {
        lowestScore = score;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      console.log(`[Cache] Evicted LRU entry: ${oldestKey.substring(0, 30)}...`);
    }
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[Cache] Cleanup removed ${cleaned} expired entries`);
    }
    this.stats.size = this.cache.size;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & { hitRate: string } {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? ((this.stats.hits / total) * 100).toFixed(2) + '%' : '0%';
    
    return {
      ...this.stats,
      hitRate,
    };
  }

  /**
   * Wrapper for async functions with caching
   */
  async wrap<T>(
    key: string,
    fn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Try cache first
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Execute function and cache result
    const result = await fn();
    this.set(key, result, ttl);
    return result;
  }

  /**
   * Shutdown cache (clear cleanup interval)
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
    console.log('[Cache] Shutdown complete');
  }
}

// Singleton instance with optimized settings for LLM responses
export const responseCache = new ResponseCache({
  maxSize: 200,
  defaultTTL: 10 * 60 * 1000, // 10 minutes for LLM responses
  cleanupIntervalMs: 2 * 60 * 1000, // Cleanup every 2 minutes
});

// Specialized cache keys
export const CacheKeys = {
  schema: (databaseType: string, description: string) => 
    responseCache.generateKey('schema', { databaseType, description: description.toLowerCase().trim() }),
  
  query: (databaseType: string, naturalLanguage: string, schemaHash: string) =>
    responseCache.generateKey('query', { databaseType, nl: naturalLanguage.toLowerCase().trim(), schema: schemaHash }),
  
  analysis: (sql: string) =>
    responseCache.generateKey('analysis', { sql: sql.trim() }),
  
  code: (language: string, framework: string, schemaHash: string) =>
    responseCache.generateKey('code', { language, framework, schema: schemaHash }),
};

export default responseCache;
