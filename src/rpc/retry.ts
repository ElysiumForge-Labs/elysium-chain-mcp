import { BaseError, HttpRequestError } from 'viem';
import { isRetryableTransportError } from '../core/errors.js';
import { realSleep, type Sleep } from './rateLimit.js';

export interface RetryOptions {
  retries: number;
  baseDelayMs: number;
  maxDelayMs?: number;
  isRetryable?: (err: unknown) => boolean;
  sleep?: Sleep;
  random?: () => number;
  onRetry?: (info: { attempt: number; delayMs: number; error: unknown }) => void;
  /** Server-requested delay (e.g. from a Retry-After header). Defaults to reading viem's HttpRequestError. */
  retryAfterMs?: (err: unknown) => number | undefined;
}

/** Retry-After header in milliseconds, if the error carries one. */
function viemRetryAfterMs(err: unknown): number | undefined {
  const http =
    err instanceof BaseError ? (err.walk((e) => e instanceof HttpRequestError) as HttpRequestError | null) : null;
  return parseRetryAfter(http?.headers?.get('retry-after'));
}

/** Parses a Retry-After header (seconds or HTTP date) into milliseconds. */
export function parseRetryAfter(value: string | null | undefined): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const date = Date.parse(value);
  return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now());
}

/**
 * Runs `fn`, retrying retryable failures with exponential backoff and full
 * jitter: delay = random(0, min(maxDelay, base * 2^attempt)). A Retry-After
 * header from the server takes precedence (capped at maxDelay).
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> {
  const {
    retries,
    baseDelayMs,
    maxDelayMs = 10_000,
    isRetryable = isRetryableTransportError,
    sleep = realSleep,
    random = Math.random,
    onRetry,
    retryAfterMs = viemRetryAfterMs,
  } = options;

  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= retries || !isRetryable(err)) throw err;
      const backoff = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
      const delayMs = Math.min(maxDelayMs, retryAfterMs(err) ?? Math.round(random() * backoff));
      onRetry?.({ attempt: attempt + 1, delayMs, error: err });
      await sleep(delayMs);
    }
  }
}
