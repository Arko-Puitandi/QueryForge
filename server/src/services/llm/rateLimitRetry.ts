/**
 * Retry wrapper for handling rate limit errors from LLM APIs
 */

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

/**
 * Wraps an async function with retry logic for rate limit errors
 */
export async function withRateLimitRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;
  let delay = opts.initialDelay;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Check if it's a rate limit error
      const isRateLimit =
        error.message?.includes('429') ||
        error.message?.includes('rate limit') ||
        error.message?.includes('quota exceeded') ||
        error.status === 429 ||
        error.statusCode === 429;

      // If it's not a rate limit error or we've exhausted retries, throw immediately
      if (!isRateLimit || attempt === opts.maxRetries) {
        throw error;
      }

      // Wait before retrying
      console.warn(
        `Rate limit hit (attempt ${attempt + 1}/${opts.maxRetries + 1}). Retrying in ${delay}ms...`
      );
      await sleep(delay);

      // Exponential backoff
      delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelay);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError || new Error('Max retries exceeded');
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
