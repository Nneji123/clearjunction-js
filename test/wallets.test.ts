import { describe, expect, it } from 'vitest';
import { BaseClient } from '../src/http/base-client.js';
import { WalletsResource } from '../src/resources/wallets.js';
import type { ReserveCorporateWalletInput, TransferWalletInput } from '../src/resources/wallets.js';

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

const reserveBody: ReserveCorporateWalletInput = {
  clientOrder: 'res-1',
  currency: 'EUR',
  holder: {
    clientCustomerId: 'cust-1',
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
      expectedTurnover: 1000000,
      otherDetails: { businessActivity: 'Software' },
      businessPartners: [
        {
          name: 'Partner Ltd',
          incorporationCountryCode: 'GB',
          plannedTransfersQuantityMonth: 5,
          plannedTransfersEurVolumeMonth: 50000,
          basisPartnership: 'Services',
          website: 'https://partner.example.com',
        },
      ],
      fundFlows: {
        plannedIncTransfersQuantity: 10,
        plannedIncTransfersEurVolume: 100000,
        plannedOutTransfersQuantity: 10,
        plannedOutTransfersEurVolume: 100000,
      },
      complianceEvaluation: {
        amlRiskLevel: 'Low',
        reviewPeriodicity: '1 per year',
        appliedLimits: 'none',
      },
      isMicroEnterprise: false,
    },
  },
};

const transferBody: TransferWalletInput = {
  payerRequisite: { walletUuid: '348e11ab-dbfb-4ae8-99e7-349b00868f6f' },
  payeeRequisite: { walletUuid: '020d2c85-c3bf-4a69-9795-37a49b1f9dd9' },
  clientOrder: 'xfer-1',
  currency: 'EUR',
  amount: 210.55,
  description: 'Wallet transfer',
};

describe('WalletsResource', () => {
  it('posts reserve/transfer to their spec paths with the input as body', async () => {
    const { client, calls } = mockClient();
    const wallets = new WalletsResource(client);

    await wallets.reserveCorporate(reserveBody);
    await wallets.transfer(transferBody);

    expect(calls).toHaveLength(2);
    expect(calls[0].url).toBe('https://sandbox.clearjunction.com/v7/gate/wallets/corporate');
    expect(calls[0].init['method']).toBe('POST');
    expect(JSON.parse(String(calls[0].init['body']))).toEqual(reserveBody);
    expect(calls[1].url).toBe('https://sandbox.clearjunction.com/v7/gate/wallets/transfer');
    expect(calls[1].init['method']).toBe('POST');
    expect(JSON.parse(String(calls[1].init['body']))).toEqual(transferBody);
  });

  it('builds reservation/transfer-status paths and getWallet query', async () => {
    const { client, calls } = mockClient();
    const wallets = new WalletsResource(client);

    await wallets.getReservationStatus('orderReference', '12d603fa-4d0b-4fec-a9b0-cc3114da134e');
    await wallets.getReservationStatus('clientOrder', '999899-0005');
    await wallets.getWallet('348e11ab-dbfb-4ae8-99e7-349b00868f6f');
    await wallets.getWallet('348e11ab-dbfb-4ae8-99e7-349b00868f6f', true);
    await wallets.getTransferStatus('orderReference', '12d603fa-4d0b-4fec-a9b0-cc3114da134e');
    await wallets.getTransferStatus('clientOrder', '999899-0005');

    expect(calls).toHaveLength(6);
    const urls = calls.map((c) => c.url);
    expect(urls[0]).toBe(
      'https://sandbox.clearjunction.com/v7/gate/wallets/status/orderReference/12d603fa-4d0b-4fec-a9b0-cc3114da134e',
    );
    expect(urls[1]).toBe(
      'https://sandbox.clearjunction.com/v7/gate/wallets/status/clientOrder/999899-0005',
    );
    expect(urls[2]).toBe(
      'https://sandbox.clearjunction.com/v7/gate/wallets/348e11ab-dbfb-4ae8-99e7-349b00868f6f',
    );
    expect(urls[3]).toBe(
      'https://sandbox.clearjunction.com/v7/gate/wallets/348e11ab-dbfb-4ae8-99e7-349b00868f6f?returnPaymentMethods=true',
    );
    expect(urls[4]).toBe(
      'https://sandbox.clearjunction.com/v7/gate/status/walletTransfer/orderReference/12d603fa-4d0b-4fec-a9b0-cc3114da134e',
    );
    expect(urls[5]).toBe(
      'https://sandbox.clearjunction.com/v7/gate/status/walletTransfer/clientOrder/999899-0005',
    );
    for (const call of calls) {
      expect(call.init['method']).toBe('GET');
      expect(call.init['body']).toBeUndefined();
    }
  });
});
