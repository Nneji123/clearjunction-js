import { describe, expect, it } from 'vitest';
import { BaseClient } from '../src/http/base-client.js';
import { FxResource } from '../src/resources/fx.js';

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

describe('FxResource', () => {
  it('posts getRate/transfer to their spec paths with the input as body', async () => {
    const { client, calls } = mockClient();
    const fx = new FxResource(client);

    const rateInput = { sellCurrency: 'EUR', buyCurrency: 'USD' };
    const transferInput = {
      clientOrder: 'fx-1',
      sellAmount: 100,
      buyAmount: 118.1,
      sellCurrency: 'EUR',
      buyCurrency: 'USD',
      rateUuid: '8a7214dc-b89d-4836-ade3-9a4a50b686e4',
    };

    await fx.getRate(rateInput);
    await fx.transfer(transferInput);

    expect(calls).toHaveLength(2);
    expect(calls[0].url).toBe('https://sandbox.clearjunction.com/v7/gate/fx/instant/rate');
    expect(calls[0].init['method']).toBe('POST');
    expect(JSON.parse(String(calls[0].init['body']))).toEqual(rateInput);
    expect(calls[1].url).toBe('https://sandbox.clearjunction.com/v7/gate/fx/instant/transfer');
    expect(calls[1].init['method']).toBe('POST');
    expect(JSON.parse(String(calls[1].init['body']))).toEqual(transferInput);
  });

  it('getStatus builds orderReference and clientOrder paths', async () => {
    const { client, calls } = mockClient();
    const fx = new FxResource(client);

    await fx.getStatus('orderReference', '12d603fa-4d0b-4fec-a9b0-cc3114da134e');
    await fx.getStatus('clientOrder', '999899-0005');

    expect(calls).toHaveLength(2);
    expect(calls[0].url).toBe(
      'https://sandbox.clearjunction.com/v7/gate/fx/instant/status/orderReference/12d603fa-4d0b-4fec-a9b0-cc3114da134e',
    );
    expect(calls[1].url).toBe(
      'https://sandbox.clearjunction.com/v7/gate/fx/instant/status/clientOrder/999899-0005',
    );
    for (const call of calls) {
      expect(call.init['method']).toBe('GET');
      expect(call.init['body']).toBeUndefined();
    }
  });
});
