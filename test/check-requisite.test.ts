import { describe, expect, it } from 'vitest';
import { BaseClient } from '../src/http/base-client.js';
import { CheckRequisiteResource } from '../src/resources/check-requisite.js';
import type { ConfirmationOfPayeeInput } from '../src/resources/check-requisite.js';

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

const copBody: ConfirmationOfPayeeInput = {
  payee: { individual: { lastName: 'Smith', firstName: 'Jane' } },
  payeeRequisite: { sortCode: '000000', accountNumber: '12345678' },
};

describe('CheckRequisiteResource', () => {
  it('posts confirmationOfPayee to its spec path with the input as body', async () => {
    const { client, calls } = mockClient();
    const check = new CheckRequisiteResource(client);

    await check.confirmationOfPayee(copBody);

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://sandbox.clearjunction.com/v7/gate/checkRequisite/cop');
    expect(calls[0].init['method']).toBe('POST');
    expect(JSON.parse(String(calls[0].init['body']))).toEqual(copBody);
  });

  it('checkSepaIban builds the encoded IBAN path', async () => {
    const { client, calls } = mockClient();
    const check = new CheckRequisiteResource(client);

    await check.checkSepaIban('GBXXCLJU04130729900988');

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(
      'https://sandbox.clearjunction.com/v7/gate/checkRequisite/bankTransfer/eu/iban/GBXXCLJU04130729900988',
    );
    expect(calls[0].init['method']).toBe('GET');
    expect(calls[0].init['body']).toBeUndefined();
  });
});
