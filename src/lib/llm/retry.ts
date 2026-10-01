// When a model request fails for a reason that usually passes (a timeout, an overloaded or rate-limited
// provider, a dropped connection), it is sent again after a short wait, until a time budget runs out.

// Statuses that mean "try again later": timeouts, rate limits, overload and gateway errors (Cloudflare's 52x).
const RETRY_STATUS = new Set([408, 425, 429, 500, 502, 503, 504, 520, 521, 522, 523, 524, 529]);

// How long a streamed request may take to start answering, and how long a stream may go quiet.
// Providers send keep-alive comments while a model thinks, so quiet for this long means it is stuck.
export const STREAM_START_MS = 60_000;
export const STREAM_IDLE_MS = 60_000;
// Non-streamed requests only answer once the whole reply is written.
export const COMPLETE_MS = 120_000;
// Total time for one request, retries included, when the caller sets no deadline.
export const DEFAULT_BUDGET_MS = 180_000;

// A failure worth another try. `retryAfter` is the provider's own requested wait, in ms.
export class RetryableError extends Error {
  constructor(
    message: string,
    readonly retryAfter?: number,
  ) {
    super(message);
    this.name = "RetryableError";
  }
}

export function isRetryableStatus(status: number): boolean {
  return RETRY_STATUS.has(status);
}

// Retry-After is either seconds or an HTTP date.
export function parseRetryAfter(value: string | null, now = Date.now()): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  return Number.isNaN(date) ? undefined : Math.max(0, date - now);
}

// 1 s, 2 s, 4 s, 8 s, then 15 s between tries, with a little jitter; the provider's Retry-After wins (up to 30 s).
export function retryDelay(attempt: number, retryAfter?: number, random = Math.random): number {
  if (retryAfter !== undefined) return Math.min(retryAfter, 30_000);
  const base = Math.min(1000 * 2 ** (attempt - 1), 15_000);
  return Math.round(base * (0.8 + 0.4 * random()));
}

// fetch throws TypeError for network failures (reset, DNS, refused). An abort is not one of them.
export function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError || (error instanceof Error && /ECONNRESET|ETIMEDOUT|EPIPE|socket hang up|other side closed/i.test(error.message));
}

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal!.reason);
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
