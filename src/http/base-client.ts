import { buildSignature, formatCjDate } from '../signature.js';
import {
  ClearJunctionError,
  ConfigurationError,
  NetworkError,
  TimeoutError,
  errorFromResponse,
} from '../errors.js';
import { SANDBOX_BASE_URL, type ClearJunctionConfig } from '../types/common.js';

export interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /** e.g. '/v7/gate/payout/bankTransfer/eu' */
  path: string;
  /** Serialised by BaseClient, once. */
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  timeout?: number;
  /** Default: true only for GET. */
  idempotent?: boolean;
  signal?: AbortSignal;
}

export type ResolvedConfig = Readonly<
  Required<Pick<ClearJunctionConfig, 'environment' | 'timeout' | 'maxRetries'>> & ClearJunctionConfig
>;

const RETRY_BASE_MS = 500;
const RETRY_CAP_MS = 8000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffWithJitter(attempt: number, retryAfterMs?: number): number {
  if (retryAfterMs !== undefined) return retryAfterMs;
  const exp = Math.min(RETRY_CAP_MS, RETRY_BASE_MS * 2 ** attempt);
  return Math.random() * exp;
}

function parseRetryAfterMs(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const when = Date.parse(header);
  if (!Number.isNaN(when)) return Math.max(0, when - Date.now());
  return undefined;
}

export class BaseClient {
  readonly config: ResolvedConfig;

  constructor(config: ClearJunctionConfig) {
    if (!config.apiKey) {
      throw new ConfigurationError('Missing ClearJunctionConfig.apiKey (X-API-KEY uuid).');
    }
    if (!config.apiPassword) {
      throw new ConfigurationError(
        'Missing ClearJunctionConfig.apiPassword (plaintext; the SDK hashes it).',
      );
    }
    const environment = config.environment ?? 'sandbox';
    if (environment === 'production' && !config.baseUrl) {
      throw new ConfigurationError(
        'Production environment requires `baseUrl`: the published spec declares no ' +
          'production host, so pass the `baseUrl` Clear Junction issued during onboarding.',
      );
    }
    this.config = {
      ...config,
      environment,
      timeout: config.timeout ?? 30_000,
      maxRetries: config.maxRetries ?? 3,
    };
  }

  protected get resolvedBaseUrl(): string {
    if (this.config.baseUrl) return this.config.baseUrl.replace(/\/+$/, '');
    if (this.config.environment === 'production') {
      throw new ConfigurationError(
        'Production environment requires `baseUrl`: the published spec declares no ' +
          'production host, so pass the `baseUrl` Clear Junction issued during onboarding.',
      );
    }
    return SANDBOX_BASE_URL;
  }

  async request<T>(opts: RequestOptions): Promise<T> {
    const { method, path, query, signal } = opts;
    const timeout = opts.timeout ?? this.config.timeout;
    const maxRetries = this.config.maxRetries;
    const idempotent = opts.idempotent ?? method === 'GET';

    // Serialise exactly once. Sign bodyString, send bodyString.
    const bodyString = opts.body === undefined ? '' : JSON.stringify(opts.body);

    let url = `${this.resolvedBaseUrl}${path}`;
    if (query) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) params.append(key, String(value));
      }
      const qs = params.toString();
      if (qs) url += `?${qs}`;
    }

    const fetchImpl = this.config.fetch ?? globalThis.fetch.bind(globalThis);
    let lastError: ClearJunctionError | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      // Regenerate Date + signature on every attempt (5-min skew rejection).
      const date = formatCjDate();
      const signature = buildSignature({
        apiKey: this.config.apiKey,
        date,
        apiPassword: this.config.apiPassword,
        body: bodyString,
      });

      const headers: Record<string, string> = {
        Date: date,
        'X-API-KEY': this.config.apiKey,
        Authorization: signature,
        Accept: 'application/json',
      };
      if (bodyString !== '') {
        headers['Content-Type'] = 'application/json';
      }

      const controller = new AbortController();
      const onCallerAbort = (): void => controller.abort(signal?.reason);
      if (signal) {
        if (signal.aborted) controller.abort(signal.reason);
        else signal.addEventListener('abort', onCallerAbort, { once: true });
      }
      const timer = setTimeout(() => {
        controller.abort(new Error(`Clear Junction request timed out after ${timeout}ms`));
      }, timeout);

      this.config.logger?.debug(`[clearjunction] ${method} ${path} (attempt ${attempt + 1})`);

      let response: Response;
      try {
        response = await fetchImpl(url, {
          method,
          headers,
          body: bodyString !== '' ? bodyString : undefined,
          signal: controller.signal,
        });
      } catch (err) {
        if (signal) signal.removeEventListener('abort', onCallerAbort);
        clearTimeout(timer);
        const aborted =
          err instanceof DOMException
            ? err.name === 'AbortError' || err.name === 'TimeoutError'
            : err instanceof Error && controller.signal.aborted;
        if (aborted && signal?.aborted) {
          throw new NetworkError('Clear Junction request aborted by caller signal.', {
            cause: err,
          });
        }
        const timeoutError =
          aborted ||
          (err instanceof Error && /timed out after/i.test(err.message));
        const networkError = timeoutError
          ? new TimeoutError(`Clear Junction request timed out after ${timeout}ms.`, {
              cause: err,
            })
          : new NetworkError(
              `Clear Junction network error: ${err instanceof Error ? err.message : String(err)}`,
              { cause: err },
            );
        lastError = networkError;
        if (idempotent && attempt < maxRetries) {
          await sleep(backoffWithJitter(attempt));
          continue;
        }
        throw networkError;
      } finally {
        if (signal) signal.removeEventListener('abort', onCallerAbort);
        clearTimeout(timer);
      }

      const responseText = await response.text().catch(() => '');
      const requestId = response.headers.get('x-request-id') ?? undefined;

      if (response.ok) {
        if (!responseText) return undefined as T;
        try {
          return JSON.parse(responseText) as T;
        } catch (err) {
          throw new ClearJunctionError('Failed to parse Clear Junction JSON response.', {
            status: response.status,
            requestId,
            responseBody: responseText,
            cause: err,
          });
        }
      }

      const retryAfterMs = parseRetryAfterMs(response.headers.get('Retry-After'));
      const typed = errorFromResponse(
        response.status,
        responseText,
        requestId,
        response.headers.get('Retry-After'),
      );
      lastError = typed;

      // A 429 means the request was rejected before processing, so it is safe to
      // repeat for any method. A 5xx may well have been processed server-side, so
      // only repeat it when the call is idempotent — replaying a payout POST here
      // would risk sending the same payment twice. This matches the conservative
      // rule already applied to network/timeout failures above.
      const shouldRetry =
        attempt < maxRetries &&
        (response.status === 429 || (response.status >= 500 && idempotent));
      // Never retry a non-GET on a 4xx; 429 is the sole retryable 4xx.
      const isNonRetryable4xx =
        response.status !== 429 && response.status >= 400 && response.status < 500;
      if (isNonRetryable4xx) throw typed;
      if (shouldRetry) {
        await sleep(backoffWithJitter(attempt, retryAfterMs));
        continue;
      }
      throw typed;
    }

    // Unreachable in practice; keeps TS happy.
    throw lastError ?? new ClearJunctionError('Clear Junction request failed.');
  }
}
