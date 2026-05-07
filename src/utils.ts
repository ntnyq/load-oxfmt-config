/**
 * Return a cached promise by key, creating and storing it on miss.
 *
 * If the promise rejects, the cache entry is removed so future calls can retry.
 *
 * @param cache - Map used to store inflight/resolved promises.
 * @param key - Cache key.
 * @param factory - Factory to create the promise when missing.
 * @returns Cached or newly created promise.
 */
export function cachePromise<T>(
  cache: Map<string, Promise<T>>,
  key: string,
  factory: () => Promise<T>,
): Promise<T> {
  const cached = cache.get(key)
  if (cached) {
    return cached
  }

  const task = factory().catch(error => {
    cache.delete(key)
    throw error
  })

  cache.set(key, task)
  return task
}

/**
 * Normalize a filesystem path to POSIX-style separators.
 *
 * @param path - Original path.
 * @returns Path using `/` as separator.
 */
export function toPosixPath(path: string): string {
  return path.replaceAll('\\', '/')
}

/**
 * Split a path into non-empty segments.
 *
 * @param path - Original path.
 * @returns Path segments.
 */
export function splitPathSegments(path: string): string[] {
  return path.split(/[\\/]+/u).filter(Boolean)
}
