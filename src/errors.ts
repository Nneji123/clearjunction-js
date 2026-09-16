export interface ClearJunctionApiError {
  code: string;
  message: string;
  details?: string;
}

export interface ClearJunctionErrorOptions {
  status?: number;
  errors?: ClearJunctionApiError[];
  requestId?: string;
  responseBody?: string;
  cause?: unknown;
  retryAfter?: number;
}

export class ClearJunctionError extends Error {
  override readonly name: string;
  readonly status?: number;
  readonly errors: ClearJunctionApiError[];
  readonly requestId?: string;
  readonly responseBody?: string;

  constructor(message: string, opts: ClearJunctionErrorOptions = {}) {
    super(message, opts.cause !== undefined ? { cause: opts.cause } : undefined);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = new.target.name;
    this.status = opts.status;
    this.errors = opts.errors ?? [];
    this.requestId = opts.requestId;
    this.responseBody = opts.responseBody;
  }
}

/** Thrown before any I/O (bad config). */
export class ConfigurationError extends ClearJunctionError {}

/** 401 — signature mismatch. */
export class AuthenticationError extends ClearJunctionError {}

/** 403 — see note in errorFromResponse about sandbox IP allowlisting. */
export class ForbiddenError extends ClearJunctionError {}

/** 404 */
export class NotFoundError extends ClearJunctionError {}

/** 409 — body-validation status, carries errors[]. */
export class ValidationError extends ClearJunctionError {}

/** 400 */
export class BadRequestError extends ClearJunctionError {}

/** 429 */
export class RateLimitError extends ClearJunctionError {
  readonly retryAfter?: number;

  constructor(message: string, opts: ClearJunctionErrorOptions = {}) {
    super(message, opts);
    Object.setPrototypeOf(this, new.target.prototype);
    this.retryAfter = opts.retryAfter;
  }
}

/** 5xx */
export class ServerError extends ClearJunctionError {}

/** fetch threw / aborted */
export class NetworkError extends ClearJunctionError {}

export class TimeoutError extends NetworkError {}

function normaliseApiErrors(parsed: unknown): ClearJunctionApiError[] {
  if (typeof parsed !== 'object' || parsed === null) return [];
  const record = parsed as Record<string, unknown>;
  const raw = record['errors'];
  if (!Array.isArray(raw)) return [];
  const out: ClearJunctionApiError[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const entry = item as Record<string, unknown>;
    out.push({
      code: String(entry['code'] ?? ''),
      message: String(entry['message'] ?? ''),
      details: entry['details'] !== undefined ? String(entry['details']) : undefined,
    });
  }
  return out;
}

function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds;
  const when = Date.parse(header);
  if (!Number.isNaN(when)) {
    return Math.max(0, Math.round((when - Date.now()) / 1000));
  }
  return undefined;
}

/**
 * Map an HTTP status and raw body to the typed error hierarchy. Bodies are
 * parsed as JSON when possible and passed through as text otherwise.
 */
export function errorFromResponse(
  status: number,
  body: string,
  requestId?: string,
  retryAfterHeader?: string | null,
): ClearJunctionError {
  let parsed: unknown;
  let errors: ClearJunctionApiError[] = [];
  let isJson = false;
  try {
    parsed = body ? JSON.parse(body) : undefined;
    isJson = true;
    errors = normaliseApiErrors(parsed);
  } catch {
    parsed = undefined;
    errors = [];
  }

  const first = errors[0];
  const suffix = first ? `: ${first.message}${first.details ? ` — ${first.details}` : ''}` : '';

  if (status === 401) {
    return new AuthenticationError(`Authentication failed (401 signature mismatch)${suffix}`, {
      status,
      errors,
      requestId,
      responseBody: body,
    });
  }

  if (status === 403) {
    const message = isJson
      ? `Forbidden (403)${suffix}`
      : 'Forbidden (403) with a non-JSON body, which the Clear Junction sandbox returns ' +
        'at its load balancer for every path when the caller egress IP is not on the ' +
        'allowlist. Contact Clear Junction support to allowlist the egress IP.';
    return new ForbiddenError(message, {
      status,
      errors,
      requestId,
      responseBody: body,
    });
  }

  if (status === 404) {
    return new NotFoundError(`Not found (404)${suffix}`, {
      status,
      errors,
      requestId,
      responseBody: body,
    });
  }

  if (status === 409) {
    return new ValidationError(`Request body validation failed (409)${suffix}`, {
      status,
      errors,
      requestId,
      responseBody: body,
    });
  }

  if (status === 400) {
    return new BadRequestError(`Bad request (400)${suffix}`, {
      status,
      errors,
      requestId,
      responseBody: body,
    });
  }

  if (status === 429) {
    return new RateLimitError(`Rate limited (429)${suffix}`, {
      status,
      errors,
      requestId,
      responseBody: body,
      retryAfter: parseRetryAfter(retryAfterHeader ?? null),
    });
  }

  if (status >= 500) {
    return new ServerError(`Clear Junction server error (${status})${suffix}`, {
      status,
      errors,
      requestId,
      responseBody: body,
    });
  }

  return new ClearJunctionError(`Clear Junction request failed (${status})${suffix}`, {
    status,
    errors,
    requestId,
    responseBody: body,
  });
}
