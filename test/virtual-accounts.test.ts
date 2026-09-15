import { describe, expect, it } from 'vitest';
import { BaseClient } from '../src/http/base-client.js';
import { VirtualAccountsResource } from '../src/resources/virtual-accounts.js';
import type {
  AllocateCryptoInput,
  AllocateIbanInput,
  AllocateV4IbanInput,
  LinkAccountsInput,
} from '../src/resources/virtual-accounts.js';

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

const allocateIbanBody: AllocateIbanInput = {
  clientOrder: 'alloc-1',
  registrant: {
    clientCustomerId: 'cust-1',
    individual: {
      lastName: 'Peterson',
      firstName: 'Julie',
      birthDate: '1999-09-29',
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

const allocateCryptoBody: AllocateCryptoInput = {
  clientOrder: 'alloc-2',
  accountType: 'CRYPTO_ADDRESS',
  accountCategory: 'ethereum_erc20',
  registrant: {
    clientCustomerId: 'cust-2',
    corporate: {
      name: 'SuperBubble Limited',
      registrationNumber: 'AAB2827377-837',
      incorporationCountry: 'IT',
      address: { country: 'IT', zip: '12345', city: 'Rome', street: '12 Tourin' },
      incorporationDate: '2016-12-21',
      ultimateBeneficialOwner: [
        {
          lastName: 'Ivanov',
          firstName: 'Ioan',
          birthDate: '1990-01-12',
          ownership: 100,
          document: {
            type: 'passport',
            number: 'AB1000222',
            issuedCountryCode: 'IT',
            expirationDate: '2026-12-20',
          },
          beneficialOwnerPep: false,
          beneficialOwnerPepDetails: 'none',
          usaTaxResidency: false,
          giinNumber: 'none',
        },
      ],
      tradingWebsite: 'https://www.example.com',
      otherDetails: { businessActivity: 'Software' },
      fundFlows: {
        plannedIncTransfersQuantity: 10,
        plannedIncTransfersEurVolume: 100000,
        plannedOutTransfersQuantity: 10,
        plannedOutTransfersEurVolume: 100000,
      },
    },
  },
};

const allocateV4IbanBody: AllocateV4IbanInput = {
  clientOrder: 'alloc-3',
  accountType: 'IBAN',
  accountCategory: '041307',
  registrant: { clientCustomerId: 'cust-3' },
};

const linkAccountsBody: LinkAccountsInput = {
  clientOrder: 'link-1',
  sourceAccount: { accountType: 'CRYPTO_ADDRESS', accountCategory: 'ethereum_erc20' },
  targetAccount: { accountType: 'IBAN', accountNumber: 'GB00CLJU00000011111111' },
  tcTimestamp: '2017-09-05T10:37:15+00:00',
  tcAgreed: true,
  registrant: { individual: { taxNumber: '7728168971', taxCountry: 'IT' } },
};

describe('VirtualAccountsResource', () => {
  it('posts each write method to its spec path with the input as body', async () => {
    const { client, calls } = mockClient();
    const va = new VirtualAccountsResource(client);

    const cases: Array<[Promise<unknown>, string, unknown]> = [
      [va.allocateIban(allocateIbanBody), '/v7/gate/allocate/v3/create/iban', allocateIbanBody],
      [
        va.getIbanStatus({ iban: 'GB00CLJU00000011111111' }),
        '/v7/gate/virtualAccounts/v1/status/iban',
        { iban: 'GB00CLJU00000011111111' },
      ],
      [
        va.close({ iban: 'GB00CLJU00000011111111' }),
        '/v7/gate/virtualAccounts/v1/close/iban',
        { iban: 'GB00CLJU00000011111111' },
      ],
      [va.allocateCrypto(allocateCryptoBody), '/v7/gate/allocate/v4/create', allocateCryptoBody],
      [va.allocateV4Iban(allocateV4IbanBody), '/v7/gate/allocate/v4/create', allocateV4IbanBody],
      [va.linkAccounts(linkAccountsBody), '/v7/gate/linkAccounts', linkAccountsBody],
    ];

    for (const [promise] of cases) await promise;

    expect(calls).toHaveLength(cases.length);
    cases.forEach(([, expectedPath, expectedBody], i) => {
      const call = calls[i];
      expect(call.url).toBe(`https://sandbox.clearjunction.com${expectedPath}`);
      expect(call.init['method']).toBe('POST');
      expect(JSON.parse(String(call.init['body']))).toEqual(expectedBody);
    });
  });

  it('builds status/list/info paths with encoding', async () => {
    const { client, calls } = mockClient();
    const va = new VirtualAccountsResource(client);

    await va.getStatus('orderReference', '12d603fa-4d0b-4fec-a9b0-cc3114da134e');
    await va.getStatus('clientOrder', '999899-0005');
    await va.listByCustomer('2983ght938');
    await va.getIbanInfo('GB00CLJU00000011111111');
    await va.getV4Status('orderReference', '12d603fa-4d0b-4fec-a9b0-cc3114da134e');
    await va.getLinkAccountsStatus('clientOrder', '999899-0005');

    expect(calls).toHaveLength(6);
    const urls = calls.map((c) => c.url);
    expect(urls[0]).toBe(
      'https://sandbox.clearjunction.com/v7/gate/allocate/v2/status/iban/orderReference/12d603fa-4d0b-4fec-a9b0-cc3114da134e',
    );
    expect(urls[1]).toBe(
      'https://sandbox.clearjunction.com/v7/gate/allocate/v2/status/iban/clientOrder/999899-0005',
    );
    expect(urls[2]).toBe(
      'https://sandbox.clearjunction.com/v7/gate/allocate/v2/list/iban/2983ght938',
    );
    expect(urls[3]).toBe(
      'https://sandbox.clearjunction.com/v7/gate/allocate/v2/info/iban/GB00CLJU00000011111111',
    );
    expect(urls[4]).toBe(
      'https://sandbox.clearjunction.com/v7/gate/allocate/v4/status/orderReference/12d603fa-4d0b-4fec-a9b0-cc3114da134e',
    );
    expect(urls[5]).toBe(
      'https://sandbox.clearjunction.com/v7/gate/linkAccounts/status/clientOrder/999899-0005',
    );
    for (const call of calls) {
      expect(call.init['method']).toBe('GET');
      expect(call.init['body']).toBeUndefined();
    }
  });
});
