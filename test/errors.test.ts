import { describe, expect, it } from 'vitest';
import {
  AuthenticationError,
  BadRequestError,
  ClearJunctionError,
  ConfigurationError,
  ForbiddenError,
  NotFoundError,
  RateLimitError,
  ServerError,
  ValidationError,
  errorFromResponse,
} from '../src/errors.js';

describe('error hierarchy', () => {
  it('subclasses satisfy instanceof ClearJunctionError and carry .name', () => {
    const cases: ClearJunctionError[] = [
      new AuthenticationError('a', { status: 401 }),
      new ForbiddenError('f', { status: 403 }),
      new NotFoundError('n', { status: 404 }),
      new ValidationError('v', { status: 409 }),
      new BadRequestError('b', { status: 400 }),
      new RateLimitError('r', { status: 429 }),
      new ServerError('s', { status: 500 }),
      new ConfigurationError('c'),
    ];
    for (const err of cases) {
      expect(err).toBeInstanceOf(ClearJunctionError);
      expect(err).toBeInstanceOf(Error);
      expect(err.name).toBe(err.constructor.name);
    }
    expect(new ValidationError('v').errors).toEqual([]);
  });

  it('409 maps to ValidationError with errors[]; 400 stays BadRequestError', () => {
    const body = JSON.stringify({
      errors: [{ code: '30', message: 'Validation error', details: 'Wrong period dates' }],
    });
    const v = errorFromResponse(409, body, 'req-1');
    expect(v).toBeInstanceOf(ValidationError);
    expect(v.errors).toEqual([{ code: '30', message: 'Validation error', details: 'Wrong period dates' }]);
    expect(v.requestId).toBe('req-1');
    expect(v.responseBody).toBe(body);

    const b = errorFromResponse(400, body);
    expect(b).toBeInstanceOf(BadRequestError);
    expect(b).not.toBeInstanceOf(ValidationError);
  });

  it('401 maps to AuthenticationError', () => {
    expect(errorFromResponse(401, '')).toBeInstanceOf(AuthenticationError);
  });

  it('403 with HTML body does not throw and mentions IP allowlisting', () => {
    const html = '<html><body><h1>403 Forbidden</h1></body></html>';
    const err = errorFromResponse(403, html);
    expect(err).toBeInstanceOf(ForbiddenError);
    expect(err.message).toMatch(/allowlist/i);
    expect(err.errors).toEqual([]);
    expect(err.responseBody).toBe(html);
  });

  it('429 carries retryAfter from Retry-After header', () => {
    const err = errorFromResponse(429, '', undefined, '120');
    expect(err).toBeInstanceOf(RateLimitError);
    expect((err as RateLimitError).retryAfter).toBe(120);
  });

  it('5xx maps to ServerError and never throws on empty body', () => {
    expect(errorFromResponse(500, '')).toBeInstanceOf(ServerError);
  });
});
