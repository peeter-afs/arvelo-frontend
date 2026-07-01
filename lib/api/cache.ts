/**
 * Tiny in-memory cache for read-mostly GETs (the chart of accounts, the partner
 * picker list) that were previously re-downloaded on every screen that mounts.
 *
 * - Time-to-live: serve the cached value for `ttlMs`, then refetch on next call.
 * - In-flight de-duplication: concurrent callers share one request instead of
 *   each firing their own (the shell mounts several account/partner consumers at
 *   once).
 * - Explicit invalidation: mutations call `invalidate()` so the next read is
 *   fresh.
 *
 * This is deliberately small and dependency-free. If we later adopt the already
 * installed @tanstack/react-query, these fetchers can be replaced by queries
 * with the same staleTime semantics.
 */
export type CachedFetcher<T> = {
  /** Return the cached value if fresh, an in-flight request if one exists, else fetch. */
  load: (force?: boolean) => Promise<T>;
  /** Drop the cached value so the next load() refetches. */
  invalidate: () => void;
};

export function createCachedFetcher<T>(fetcher: () => Promise<T>, ttlMs: number): CachedFetcher<T> {
  let cache: { data: T; at: number } | null = null;
  let inflight: Promise<T> | null = null;

  const load = (force = false): Promise<T> => {
    if (!force && cache && Date.now() - cache.at < ttlMs) {
      return Promise.resolve(cache.data);
    }
    if (inflight) return inflight;

    inflight = fetcher()
      .then((data) => {
        cache = { data, at: Date.now() };
        return data;
      })
      .finally(() => {
        inflight = null;
      });
    return inflight;
  };

  const invalidate = () => {
    cache = null;
  };

  return { load, invalidate };
}
