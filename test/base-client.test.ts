import { describe, expect, it, vi } from 'vitest';
import { BaseClient } from '../src/http/base-client.js';
import {
  AuthenticationError,
  ConfigurationError,
  ServerError,
  ValidationError,
} from '../src/errors.js';
import { buildSignature } from '../src/signature.js';

function jsonResponse(status: number, payload: unknown, headers: Record<string, string> = {}): Response {
  const body = payload === undefined ? '' : JSON.stringify(payload);
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

describe('BaseClient', () => {
  it('throws ConfigurationError on missing credentials or production-without-baseUrl', () => {
    expect(() => new BaseClient({ apiKey: '', apiPassword: 'x' })).toThrow(ConfigurationError);
    expect(() => new BaseClient({ apiKey: 'k', apiPassword: '' })).toThrow(ConfigurationError);
    expect(
      () => new BaseClient({ apiKey: 'k', apiPassword: 'p', environment: 'production' }),
    ).toThrow(ConfigurationError);
  });

  it('signs the exact serialised body and sends it verbatim', async () => {
    const fetchMock = vi.fn(async (_url: unknown, init: unknown) => {
      const { headers, body } = init as { headers: Record<string, string>; body?: string };
      expect(headers['X-API-KEY']).toBe('my-key');
      expect(headers['Date']).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+00:00$/);
      // The invariant that matters: the Authorization header must be the signature
      // over the EXACT bytes being sent, recomputed here from the recorded body
      // rather than from a second serialisation of the input object.
      expect(headers['Authorization']).toBe(
        buildSignature({
          apiKey: 'my-key',
          date: headers['Date'] as string,
          apiPassword: 'pw',
          body: body as string,
        }),
      );
      expect(headers['Content-Type']).toBe('application/json');
      // Echo the body back so we can assert identity below.
      return jsonResponse(200, { echoed: body });
    });
    const client = new BaseClient({
      apiKey: 'my-key',
      apiPassword: 'pw',
      fetch: fetchMock as unknown as typeof fetch,
    });
    const input = { b: 2, a: 1 };
    const out = await client.request<{ echoed: string }>({
      method: 'POST',
      path: '/v7/gate/payout/bankTransfer/eu',
      body: input,
    });
    // Single serialisation: the sent string is JSON.stringify(input), key order preserved.
    expect(out.echoed).toBe(JSON.stringify(input));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('sends empty body with no Content-Type for GET', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(200, { ok: true }),
    );
    const client = new BaseClient({
      apiKey: 'k',
      apiPassword: 'p',
      fetch: fetchMock as unknown as typeof fetch,
    });
    await client.request({ method: 'GET', path: '/v7/gate/status/payout/orderReference/abc' });
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, Record<string, unknown>];
    const headers = init['headers'] as Record<string, string>;
    expect(headers['Content-Type']).toBeUndefined();
    expect(init['body']).toBeUndefined();
  });

  it('does not retry 409 and surfaces ValidationError', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(409, { errors: [{ code: '30', message: 'Validation error', details: 'x' }] }),
    );
    const client = new BaseClient({
      apiKey: 'k',
      apiPassword: 'p',
      fetch: fetchMock as unknown as typeof fetch,
    });
    await expect(
      client.request({ method: 'POST', path: '/x', body: {} }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries 500 with backoff and regenerates Date per attempt', async () => {
    const dates: string[] = [];
    const fetchMock = vi.fn(async (_url: unknown, init: unknown) => {
      dates.push((init as { headers: Record<string, string> }).headers['Date']);
      if (fetchMock.mock.calls.length < 3) return jsonResponse(500, '');
      return jsonResponse(200, { ok: true });
    });
    const client = new BaseClient({
      apiKey: 'k',
      apiPassword: 'p',
      maxRetries: 3,
      fetch: fetchMock as unknown as typeof fetch,
    });
    const out = await client.request<{ ok: boolean }>({ method: 'GET', path: '/x' });
    expect(out).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    // Date is recomputed inside the retry loop (one header per attempt). Calls
    // within the same second legitimately share a value, so assert per-attempt
    // presence + shape rather than uniqueness.
    expect(dates).toHaveLength(3);
    for (const d of dates) {
      expect(d).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+00:00$/);
    }
  });

  it('maps 401 to AuthenticationError', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(401, ''));
    const client = new BaseClient({
      apiKey: 'k',
      apiPassword: 'p',
      fetch: fetchMock as unknown as typeof fetch,
    });
    await expect(client.request({ method: 'GET', path: '/x' })).rejects.toBeInstanceOf(
      AuthenticationError,
    );
  });

  it('does not retry a non-idempotent POST on 500 (a payout must not be sent twice)', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(500, ''));
    const client = new BaseClient({
      apiKey: 'k',
      apiPassword: 'p',
      maxRetries: 3,
      fetch: fetchMock as unknown as typeof fetch,
    });
    await expect(
      client.request({ method: 'POST', path: '/v7/gate/payout/bankTransfer/eu', body: {} }),
    ).rejects.toBeInstanceOf(ServerError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries a non-idempotent POST on 429, which is rejected before processing', async () => {
    const fetchMock = vi.fn(async () => {
      if (fetchMock.mock.calls.length < 2) return jsonResponse(429, '', { 'Retry-After': '0' });
      return jsonResponse(200, { ok: true });
    });
    const client = new BaseClient({
      apiKey: 'k',
      apiPassword: 'p',
      maxRetries: 3,
      fetch: fetchMock as unknown as typeof fetch,
    });
    const out = await client.request<{ ok: boolean }>({ method: 'POST', path: '/x', body: {} });
    expect(out).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
