/** Retry an async function with exponential backoff. Throws the last error. */
export async function withRetry<T>(
  fn: () => Promise<T>,
  attempts: number,
  baseDelayMs = 200,
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < attempts) {
        await new Promise((resolve) => setTimeout(resolve, baseDelayMs * 2 ** i));
      }
    }
  }
  throw lastError;
}
