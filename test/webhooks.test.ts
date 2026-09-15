import { describe, expect, it } from 'vitest';
import {
  acknowledgeNotification,
  notificationDedupeKey,
  verifyWebhookSignature,
} from '../src/webhooks.js';

const API_KEY = '730ee406-817e-11e7-bb31-be2e44b06b34';
const API_PASSWORD = 's3cr3t';
const DATE = '2017-08-18T07:34:47+00:00';
const RAW = '{"orderReference":"12d603fa-4d0b-4fec-a9b0-cc3114da134e","status":"settled"}';
// Computed with node:crypto per the Task A signature algorithm; hard-coded.
const EXPECTED =
  '8acb967ad74b5cd0d9f45cb33e33d906850305d46acac36b94090b47e551125f2c8dd8aa88d80a313085e3d451bc926850f078ff2d650b59fcf4449bd83a3155';

describe('verifyWebhookSignature', () => {
  it('returns true for a valid signature over the raw body', () => {
    expect(
      verifyWebhookSignature(RAW, EXPECTED, {
        apiKey: API_KEY,
        apiPassword: API_PASSWORD,
        date: DATE,
      }),
    ).toBe(true);
  });

  it('returns false on tampered body, wrong secret, or wrong header', () => {
    const creds = { apiKey: API_KEY, apiPassword: API_PASSWORD, date: DATE };
    expect(verifyWebhookSignature(`${RAW} `, EXPECTED, creds)).toBe(false);
    expect(
      verifyWebhookSignature(RAW, EXPECTED, { ...creds, apiPassword: 'wrong' }),
    ).toBe(false);
    expect(verifyWebhookSignature(RAW, '0'.repeat(EXPECTED.length), creds)).toBe(false);
    expect(verifyWebhookSignature(RAW, 'short', creds)).toBe(false);
  });

  it('never fails open on missing inputs', () => {
    const creds = { apiKey: API_KEY, apiPassword: API_PASSWORD, date: DATE };
    expect(verifyWebhookSignature('', EXPECTED, creds)).toBe(false);
    expect(verifyWebhookSignature(RAW, '', creds)).toBe(false);
    expect(verifyWebhookSignature(RAW, EXPECTED, { ...creds, apiKey: '' })).toBe(false);
    expect(verifyWebhookSignature(RAW, EXPECTED, { ...creds, date: '' })).toBe(false);
  });

  it('is sensitive to the date: same body with a different date fails', () => {
    expect(
      verifyWebhookSignature(RAW, EXPECTED, {
        apiKey: API_KEY,
        apiPassword: API_PASSWORD,
        date: '2017-08-18T07:34:48+00:00',
      }),
    ).toBe(false);
  });
});

describe('webhook handler contract helpers', () => {
  it('acknowledgeNotification returns 200 text/plain with the bare orderReference', () => {
    expect(acknowledgeNotification('12d603fa-4d0b-4fec-a9b0-cc3114da134e')).toEqual({
      statusCode: 200,
      headers: { 'Content-Type': 'text/plain' },
      body: '12d603fa-4d0b-4fec-a9b0-cc3114da134e',
    });
  });

  it('notificationDedupeKey covers orderReference + status + operTimestamp', () => {
    expect(
      notificationDedupeKey({ orderReference: 'a', status: 'settled' }),
    ).toBe('a|settled|');
    expect(
      notificationDedupeKey({ orderReference: 'a', status: 'captured', operTimestamp: 't' }),
    ).toBe('a|captured|t');
    expect(
      notificationDedupeKey({ orderReference: 'a', status: 'captured', operTimestamp: 't2' }),
    ).not.toBe('a|captured|t');
  });
});
