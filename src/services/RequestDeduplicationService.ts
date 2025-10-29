/**
 * Request deduplication service to prevent duplicate API calls
 * 
 * This service helps optimize network usage by:
 * - Preventing duplicate requests with the same key
 * - Caching in-flight requests
 * - Automatic cleanup after completion
 * - Performance monitoring and metrics
 */
class RequestDeduplicationService {
  private static instance: RequestDeduplicationService;
  private requestCache = new Map<string, Promise<any>>();
  private cacheTimeout = 5000; // 5 seconds default timeout
  private metrics = {
    totalRequests: 0,
    deduplicatedRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
  };

  public static getInstance(): RequestDeduplicationService {
    if (!RequestDeduplicationService.instance) {
      RequestDeduplicationService.instance = new RequestDeduplicationService();
    }
    return RequestDeduplicationService.instance;
  }

  /**
   * Deduplicate requests with the same key
   * @param key - Unique identifier for the request
   * @param requestFn - Function that performs the actual request
   * @param timeout - Optional timeout override (default: 5 seconds)
   * @returns Promise that resolves to the request result
   */
  public async deduplicateRequest<T>(
    key: string,
    requestFn: () => Promise<T>,
    timeout: number = this.cacheTimeout
  ): Promise<T> {
    this.metrics.totalRequests++;
    
    // Check if request is already in progress
    if (this.requestCache.has(key)) {
      this.metrics.deduplicatedRequests++;
      this.metrics.cacheHits++;
      console.log(`🔄 Deduplicating request: ${key}`);
      return this.requestCache.get(key)!;
    }

    this.metrics.cacheMisses++;
    console.log(`🆕 New request: ${key}`);

    // Create new request
    const promise = requestFn()
      .then((result) => {
        // Clean up cache after successful request
        setTimeout(() => {
          this.requestCache.delete(key);
          console.log(`✅ Request completed and cache cleared: ${key}`);
        }, timeout);
        return result;
      })
      .catch((error) => {
        // Clean up cache on error
        this.requestCache.delete(key);
        console.error(`❌ Request failed and cache cleared: ${key}`, error);
        throw error;
      });

    this.requestCache.set(key, promise);
    return promise;
  }

  /**
   * Create a deduplicated request with automatic key generation
   * @param requestFn - Function that performs the actual request
   * @param keyGenerator - Function that generates a unique key
   * @param timeout - Optional timeout override
   */
  public async deduplicateWithKeyGenerator<T>(
    requestFn: () => Promise<T>,
    keyGenerator: () => string,
    timeout: number = this.cacheTimeout
  ): Promise<T> {
    const key = keyGenerator();
    return this.deduplicateRequest(key, requestFn, timeout);
  }

  /**
   * Create a deduplicated request for API calls
   * @param url - API endpoint URL
   * @param options - Fetch options
   * @param timeout - Optional timeout override
   */
  public async deduplicateApiCall(
    url: string,
    options: RequestInit = {},
    timeout: number = this.cacheTimeout
  ): Promise<Response> {
    const key = `api-${url}-${JSON.stringify(options)}`;
    
    return this.deduplicateRequest(key, async () => {
      console.log(`🌐 Making API call: ${url}`);
      return fetch(url, options);
    }, timeout);
  }

  /**
   * Create a deduplicated request for Supabase operations
   * @param operation - Supabase operation description
   * @param operationFn - Function that performs the Supabase operation
   * @param timeout - Optional timeout override
   */
  public async deduplicateSupabaseOperation<T>(
    operation: string,
    operationFn: () => Promise<T>,
    timeout: number = this.cacheTimeout
  ): Promise<T> {
    const key = `supabase-${operation}`;
    
    return this.deduplicateRequest(key, async () => {
      console.log(`🗄️ Making Supabase operation: ${operation}`);
      return operationFn();
    }, timeout);
  }

  /**
   * Clear cache for specific key
   * @param key - Key to clear from cache
   */
  public clearCache(key: string): void {
    if (this.requestCache.has(key)) {
      this.requestCache.delete(key);
      console.log(`🗑️ Cache cleared for key: ${key}`);
    }
  }

  /**
   * Clear all cache
   */
  public clearAllCache(): void {
    const size = this.requestCache.size;
    this.requestCache.clear();
    console.log(`🗑️ All cache cleared (${size} entries removed)`);
  }

  /**
   * Get cache size for monitoring
   */
  public getCacheSize(): number {
    return this.requestCache.size;
  }

  /**
   * Get performance metrics
   */
  public getMetrics() {
    return {
      ...this.metrics,
      cacheSize: this.requestCache.size,
      deduplicationRate: this.metrics.totalRequests > 0 
        ? (this.metrics.deduplicatedRequests / this.metrics.totalRequests) * 100 
        : 0,
      cacheHitRate: this.metrics.cacheHits + this.metrics.cacheMisses > 0
        ? (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)) * 100
        : 0,
    };
  }

  /**
   * Reset metrics
   */
  public resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      deduplicatedRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
    };
    console.log('📊 Metrics reset');
  }

  /**
   * Set cache timeout
   * @param timeout - New timeout in milliseconds
   */
  public setCacheTimeout(timeout: number): void {
    this.cacheTimeout = timeout;
    console.log(`⏱️ Cache timeout set to ${timeout}ms`);
  }

  /**
   * Get all cached keys (for debugging)
   */
  public getCachedKeys(): string[] {
    return Array.from(this.requestCache.keys());
  }
}

export const requestDeduplicationService = RequestDeduplicationService.getInstance();
