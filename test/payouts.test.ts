import { describe, expect, it } from 'vitest';
import { BaseClient } from '../src/http/base-client.js';
import { PayoutsResource } from '../src/resources/payouts.js';
import type {
  ChapsCrossSchemeInput,
  ChapsInput,
  ChapsV2Input,
  CreditCardNonPciInput,
  FpsInput,
  FpsV2Input,
  InternalPaymentInput,
  SepaCreditTransferInput,
  SepaInstantInput,
  SwiftInput,
} from '../src/resources/payouts.js';

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

const sepaBody: SepaCreditTransferInput = {
  clientOrder: 'order-1',
  currency: 'EUR',
  amount: 100,
  description: 'Test payout',
  payer: { individual: { lastName: 'Doe', firstName: 'John' } },
  payee: { individual: { lastName: 'Smith', firstName: 'Jane' } },
  payeeRequisite: { iban: 'DE89370400440532013000' },
};

const sepaInstantBody: SepaInstantInput = { ...sepaBody, clientOrder: 'order-2' };

const internalBody: InternalPaymentInput = {
  clientOrder: 'order-3',
  currency: 'EUR',
  amount: 50,
  description: 'Internal',
  payee: { walletUuid: 'wallet-1' },
  payeeRequisite: { iban: 'GB00CLJU00000011111111' },
};

const fpsBody: FpsInput = {
  clientOrder: 'order-4',
  currency: 'GBP',
  amount: 75,
  description: 'FPS',
  payee: { individual: { lastName: 'Smith', firstName: 'Jane' } },
  payeeRequisite: { sortCode: '000000', accountNumber: '12345678' },
};

const fpsV2Body: FpsV2Input = {
  clientOrder: 'order-5',
  currency: 'GBP',
  amount: 75,
  description: 'FPS',
  payee: { individual: { lastName: 'Smith', firstName: 'Jane' } },
  payeeRequisite: { sortCode: '000000', accountNumber: '12345678' },
};

const chapsBody: ChapsInput = {
  clientOrder: 'order-6',
  currency: 'GBP',
  amount: 1000,
  description: 'CHAPS',
  paymentPurposeCodes: { code: 'INTP', category: 'GP2P' },
  payee: { individual: { lastName: 'Smith', firstName: 'Jane' } },
  payeeRequisite: { sortCode: '000000', accountNumber: '12345678', bankSwiftCode: 'UBSWCHZH80A' },
};

const chapsV2Body: ChapsV2Input = {
  clientOrder: 'order-7',
  currency: 'GBP',
  amount: 1000,
  description: 'CHAPS',
  paymentPurposeCodes: { code: 'INTP', category: 'GP2P' },
  payee: {
    individual: {
      lastName: 'Smith',
      firstName: 'Jane',
      address: { country: 'GB', zip: 'EC1A 1BB', city: 'London', street: '1 Main St' },
    },
  },
  payeeRequisite: { sortCode: '000000', accountNumber: '12345678', bankSwiftCode: 'UBSWCHZH80A' },
};

const crossSchemeBody: ChapsCrossSchemeInput = {
  clientOrder: 'order-8',
  currency: 'GBP',
  amount: 500,
  description: 'Cross scheme',
  paymentPurposeCodes: { code: 'INTP', category: 'GP2P' },
  payee: {
    corporate: {
      name: 'Acme Ltd',
      address: { country: 'GB', zip: 'EC1A 1BB', city: 'London', street: '1 Main St' },
    },
  },
  payeeRequisite: { iban: 'GB00CLJU00000011111111' },
};

const swiftBody: SwiftInput = {
  clientOrder: 'order-9',
  currency: 'USD',
  amount: 250,
  description: 'SWIFT',
  payee: {
    corporate: {
      name: 'Acme Corp',
      address: { country: 'US', zip: '10001', city: 'New York', street: '1 Wall St' },
    },
  },
  payeeRequisite: {
    iban: 'DE89370400440532013000',
    institution: {
      name: 'Bank of America',
      address: { country: 'US', zip: '10001', city: 'New York', street: '1 Wall St' },
    },
  },
};

const cardBody: CreditCardNonPciInput = {
  clientOrder: 'order-10',
  currency: 'EUR',
  amount: 10,
  description: 'Card',
  payee: { individual: { lastName: 'Smith', firstName: 'Jane' } },
  payeeRequisite: {},
};

describe('PayoutsResource', () => {
  it('posts each create method to its spec path with the input as body', async () => {
    const { client, calls } = mockClient();
    const payouts = new PayoutsResource(client);

    const cases: Array<[Promise<unknown>, string, unknown]> = [
      [payouts.internal(internalBody), '/v7/gate/payout/internalPayment', internalBody],
      [payouts.sepaCreditTransfer(sepaBody), '/v7/gate/payout/bankTransfer/eu', sepaBody],
      [payouts.sepaInstant(sepaInstantBody), '/v7/gate/payout/bankTransfer/sepaInst', sepaInstantBody],
      [payouts.fps(fpsBody), '/v7/gate/payout/bankTransfer/fps', fpsBody],
      [payouts.fpsV2(fpsV2Body), '/v7/gate/payout/v2/bankTransfer/fps', fpsV2Body],
      [payouts.chaps(chapsBody), '/v7/gate/payout/bankTransfer/chaps', chapsBody],
      [payouts.chapsV2(chapsV2Body), '/v7/gate/payout/v2/bankTransfer/chaps', chapsV2Body],
      [
        payouts.chapsCrossScheme(crossSchemeBody),
        '/v7/gate/payout/bankTransfer/chapsCrossScheme',
        crossSchemeBody,
      ],
      [payouts.swift(swiftBody), '/v7/gate/payout/bankTransfer/swift', swiftBody],
      [payouts.creditCardNonPci(cardBody), '/v7/gate/payout/creditCardNonPci', cardBody],
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

  it('getStatus builds orderReference and clientOrder paths with encoding', async () => {
    const { client, calls } = mockClient();
    const payouts = new PayoutsResource(client);

    await payouts.getStatus('orderReference', '12d603fa-4d0b-4fec-a9b0-cc3114da134e');
    await payouts.getStatus('clientOrder', '999899-0005');
    await payouts.getStatus('clientOrder', 'order with spaces/slash');

    expect(calls).toHaveLength(3);
    expect(calls[0].url).toBe(
      'https://sandbox.clearjunction.com/v7/gate/status/payout/orderReference/12d603fa-4d0b-4fec-a9b0-cc3114da134e',
    );
    expect(calls[1].url).toBe(
      'https://sandbox.clearjunction.com/v7/gate/status/payout/clientOrder/999899-0005',
    );
    expect(calls[2].url).toBe(
      'https://sandbox.clearjunction.com/v7/gate/status/payout/clientOrder/order%20with%20spaces%2Fslash',
    );
    for (const call of calls) {
      expect(call.init['method']).toBe('GET');
      expect(call.init['body']).toBeUndefined();
    }
  });
});
