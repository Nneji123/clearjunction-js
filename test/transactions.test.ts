import { describe, expect, it } from 'vitest';
import { BaseClient } from '../src/http/base-client.js';
import { TransactionsResource } from '../src/resources/transactions.js';

function mockClient() {
  const calls: Array<{ url: string; init: Record<string, unknown> }> = [];
  const client = new BaseClient({
    apiKey: 'test-key',
    apiPassword: 'test-password',
    fetch: (async (url: unknown, init?: unknown) => {
      calls.push({ url: String(url), init: init as Record<string, unknown> });
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch,
  });
  return { client, calls };
}

describe('TransactionsResource', () => {
  it('approve posts the reference array to the approve path', async () => {
    const { client, calls } = mockClient();
    const tx = new TransactionsResource(client);

    await tx.approve(['12d603fa-4d0b-4fec-a9b0-cc3114da134e', '8a7214dd-91e7-469c-b02c-e4a665d08723']);

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://sandbox.clearjunction.com/v7/gate/transactionAction/approve');
    expect(calls[0].init['method']).toBe('POST');
    expect(JSON.parse(String(calls[0].init['body']))).toEqual({
      orderReferenceArray: [
        '12d603fa-4d0b-4fec-a9b0-cc3114da134e',
        '8a7214dd-91e7-469c-b02c-e4a665d08723',
      ],
    });
  });

  it('cancel posts the reference array to the cancel path', async () => {
    const { client, calls } = mockClient();
    const tx = new TransactionsResource(client);

    await tx.cancel(['12d603fa-4d0b-4fec-a9b0-cc3114da134e']);

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://sandbox.clearjunction.com/v7/gate/transactionAction/cancel');
    expect(calls[0].init['method']).toBe('POST');
    expect(JSON.parse(String(calls[0].init['body']))).toEqual({
      orderReferenceArray: ['12d603fa-4d0b-4fec-a9b0-cc3114da134e'],
    });
  });
});
