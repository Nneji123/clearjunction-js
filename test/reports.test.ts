import { describe, expect, it } from 'vitest';
import { BaseClient } from '../src/http/base-client.js';
import { ReportsResource } from '../src/resources/reports.js';

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

describe('ReportsResource', () => {
  it('posts transactions and walletStatement to their spec paths', async () => {
    const { client, calls } = mockClient();
    const reports = new ReportsResource(client);

    const txInput = {
      walletUuid: '348e11ab-dbfb-4ae8-99e7-349b00868f6f',
      timestampFrom: '2017-09-05T00:00:00+00:00',
      timestampTo: '2017-09-12T00:00:00+00:00',
    };
    const stmtInput = {
      walletUuid: '348e11ab-dbfb-4ae8-99e7-349b00868f6f',
      dateFrom: '2018-08-22',
      dateTo: '2018-08-29',
    };

    await reports.transactions(txInput);
    await reports.walletStatement(stmtInput);

    expect(calls).toHaveLength(2);
    expect(calls[0].url).toBe(
      'https://sandbox.clearjunction.com/v7/gate/reports/transactionReport',
    );
    expect(calls[0].init['method']).toBe('POST');
    expect(JSON.parse(String(calls[0].init['body']))).toEqual(txInput);
    expect(calls[1].url).toBe('https://sandbox.clearjunction.com/v7/gate/wallets/statement');
    expect(calls[1].init['method']).toBe('POST');
    expect(JSON.parse(String(calls[1].init['body']))).toEqual(stmtInput);
  });
});
