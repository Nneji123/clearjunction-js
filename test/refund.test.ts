import { describe, expect, it } from 'vitest';
import { BaseClient } from '../src/http/base-client.js';
import { RefundResource } from '../src/resources/refund.js';
import type { ExecuteRefundInput } from '../src/resources/refund.js';

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

const refundBody: ExecuteRefundInput = {
  clientOrder: 'ref-1',
  relatedOrderReference: '8a934717-72ed-45a2-9730-393a3f04bdf7',
  description: 'Birthday present',
};

describe('RefundResource', () => {
  it('posts execute to POST /v7/gate/refund with the input as body', async () => {
    const { client, calls } = mockClient();
    const refund = new RefundResource(client);

    await refund.execute(refundBody);

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://sandbox.clearjunction.com/v7/gate/refund');
    expect(calls[0].init['method']).toBe('POST');
    expect(JSON.parse(String(calls[0].init['body']))).toEqual(refundBody);
  });

  it('getStatus builds orderReference and clientOrder paths', async () => {
    const { client, calls } = mockClient();
    const refund = new RefundResource(client);

    await refund.getStatus('orderReference', '12d603fa-4d0b-4fec-a9b0-cc3114da134e');
    await refund.getStatus('clientOrder', '999899-0005');

    expect(calls).toHaveLength(2);
    expect(calls[0].url).toBe(
      'https://sandbox.clearjunction.com/v7/gate/status/refund/orderReference/12d603fa-4d0b-4fec-a9b0-cc3114da134e',
    );
    expect(calls[1].url).toBe(
      'https://sandbox.clearjunction.com/v7/gate/status/refund/clientOrder/999899-0005',
    );
    for (const call of calls) {
      expect(call.init['method']).toBe('GET');
      expect(call.init['body']).toBeUndefined();
    }
  });
});
