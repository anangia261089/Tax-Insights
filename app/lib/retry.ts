/**
 * Retries an async operation with exponential backoff and jitter.
 * Only retries on HTTP 429 (rate limit) and 5xx (server errors).
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;
      const status =
        (err as { response?: { statusCode?: number }; statusCode?: number })
          ?.response?.statusCode ??
        (err as { statusCode?: number })?.statusCode;

      // Only retry on rate-limit or server errors
      if (!status || (status !== 429 && status < 500)) throw err;

      const baseDelay = 1000 * Math.pow(2, attempt);
      const jitter = Math.random() * 500;
      const delay = Math.min(baseDelay + jitter, 10_000);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}
