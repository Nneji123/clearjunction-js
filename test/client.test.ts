import { describe, expect, it, vi } from 'vitest';
import { ClearJunction } from '../src/client.js';
import { MockClearJunction } from '../src/mock.js';
import { BaseClient } from '../src/http/base-client.js';
import { PayoutsResource } from '../src/resources/payouts.js';
import { VirtualAccountsResource } from '../src/resources/virtual-accounts.js';
import { TransactionsResource } from '../src/resources/transactions.js';
import { WalletsResource } from '../src/resources/wallets.js';
import { FxResource } from '../src/resources/fx.js';
import { PayinResource } from '../src/resources/payin.js';
import { RefundResource } from '../src/resources/refund.js';
import { ReportsResource } from '../src/resources/reports.js';
import { CheckRequisiteResource } from '../src/resources/check-requisite.js';
import { TokenizeResource } from '../src/resources/tokenize.js';

describe('ClearJunction client', () => {
  it('exposes every resource sub-client sharing one BaseClient', () => {
    const cj = new ClearJunction({ apiKey: 'k', apiPassword: 'p' });
    expect(cj.http).toBeInstanceOf(BaseClient);
    expect(cj.payouts).toBeInstanceOf(PayoutsResource);
    expect(cj.virtualAccounts).toBeInstanceOf(VirtualAccountsResource);
    expect(cj.transactions).toBeInstanceOf(TransactionsResource);
    expect(cj.wallets).toBeInstanceOf(WalletsResource);
    expect(cj.fx).toBeInstanceOf(FxResource);
    expect(cj.payin).toBeInstanceOf(PayinResource);
    expect(cj.refund).toBeInstanceOf(RefundResource);
    expect(cj.reports).toBeInstanceOf(ReportsResource);
    expect(cj.checkRequisite).toBeInstanceOf(CheckRequisiteResource);
    expect(cj.tokenize).toBeInstanceOf(TokenizeResource);
  });

  it('passes config through and routes a call with signed headers', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const cj = new ClearJunction({
      apiKey: 'k',
      apiPassword: 'p',
      fetch: fetchMock as unknown as typeof fetch,
    });
    await cj.payouts.getStatus('clientOrder', '999899-0005');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      { headers: Record<string, string> },
    ];
    expect(url).toBe(
      'https://sandbox.clearjunction.com/v7/gate/status/payout/clientOrder/999899-0005',
    );
    expect(init.headers['X-API-KEY']).toBe('k');
    expect(init.headers['Authorization']).toHaveLength(128);
  });
});

describe('MockClearJunction', () => {
  it('mirrors the real client shape', () => {
    const mock = new MockClearJunction();
    expect(mock).toBeInstanceOf(ClearJunction);
    expect(mock.payouts).toBeInstanceOf(PayoutsResource);
    expect(mock.virtualAccounts).toBeInstanceOf(VirtualAccountsResource);
    expect(mock.checkRequisite).toBeInstanceOf(CheckRequisiteResource);
  });

  it('records calls and serves canned handler responses', async () => {
    const mock = new MockClearJunction((call) => {
      if (call.path === '/v7/gate/payout/bankTransfer/eu') {
        return { orderReference: 'mock-order', status: 'created' };
      }
      return {};
    });

    const created = await mock.payouts.sepaCreditTransfer({
      clientOrder: 'o-1',
      currency: 'EUR',
      amount: 10,
      description: 'Test',
      payee: { individual: { lastName: 'Smith', firstName: 'Jane' } },
      payeeRequisite: { iban: 'DE89370400440532013000' },
    });
    expect(created).toEqual({ orderReference: 'mock-order', status: 'created' });

    await mock.virtualAccounts.listByCustomer('cust-1');

    expect(mock.calls).toHaveLength(2);
    expect(mock.calls[0]).toMatchObject({
      method: 'POST',
      path: '/v7/gate/payout/bankTransfer/eu',
    });
    expect(mock.calls[0].body).toMatchObject({ clientOrder: 'o-1' });
    expect(mock.calls[1]).toMatchObject({
      method: 'GET',
      path: '/v7/gate/allocate/v2/list/iban/cust-1',
      body: undefined,
    });

    mock.reset();
    expect(mock.calls).toHaveLength(0);
  });

  it('setHandler swaps the response handler', async () => {
    const mock = new MockClearJunction();
    await mock.fx.getRate({ sellCurrency: 'EUR', buyCurrency: 'USD' });
    mock.setHandler(() => ({ quotes: [] }));
    const out = await mock.fx.getRate({ sellCurrency: 'EUR', buyCurrency: 'USD' });
    expect(out).toEqual({ quotes: [] });
    expect(mock.calls).toHaveLength(2);
  });
});
