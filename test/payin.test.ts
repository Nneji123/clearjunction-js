import { describe, expect, it } from 'vitest';
import { BaseClient } from '../src/http/base-client.js';
import { PayinResource } from '../src/resources/payin.js';
import type { CreateCreditCardInvoiceInput } from '../src/resources/payin.js';

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

const invoiceBody: CreateCreditCardInvoiceInput = {
  clientOrder: 'inv-1',
  currency: 'EUR',
  amount: 100,
  description: 'Invoice',
  payer: {
    clientCustomerId: 'cust-1',
    individual: {
      lastName: 'Peterson',
      firstName: 'Julie',
      address: { country: 'IT', zip: '12345', city: 'Rome', street: '12 Tourin' },
      document: {
        type: 'passport',
        number: 'AB1000222',
        issuedCountryCode: 'IT',
        expirationDate: '2026-12-20',
      },
    },
  },
};

describe('PayinResource', () => {
  it('posts createCreditCardInvoice to its spec path with the input as body', async () => {
    const { client, calls } = mockClient();
    const payin = new PayinResource(client);

    await payin.createCreditCardInvoice(invoiceBody);

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://sandbox.clearjunction.com/v7/gate/invoice/creditCard');
    expect(calls[0].init['method']).toBe('POST');
    expect(JSON.parse(String(calls[0].init['body']))).toEqual(invoiceBody);
  });

  it('getStatus builds orderReference and clientOrder paths', async () => {
    const { client, calls } = mockClient();
    const payin = new PayinResource(client);

    await payin.getStatus('orderReference', '12d603fa-4d0b-4fec-a9b0-cc3114da134e');
    await payin.getStatus('clientOrder', '999899-0005');

    expect(calls).toHaveLength(2);
    expect(calls[0].url).toBe(
      'https://sandbox.clearjunction.com/v7/gate/status/invoice/orderReference/12d603fa-4d0b-4fec-a9b0-cc3114da134e',
    );
    expect(calls[1].url).toBe(
      'https://sandbox.clearjunction.com/v7/gate/status/invoice/clientOrder/999899-0005',
    );
    for (const call of calls) {
      expect(call.init['method']).toBe('GET');
      expect(call.init['body']).toBeUndefined();
    }
  });
});
