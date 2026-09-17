# clearjunction-js

[![npm version](https://img.shields.io/npm/v/clearjunction-js.svg)](https://www.npmjs.com/package/clearjunction-js)
[![node](https://img.shields.io/node/v/clearjunction-js.svg)](https://www.npmjs.com/package/clearjunction-js)
[![license](https://img.shields.io/npm/l/clearjunction-js.svg)](./LICENSE)

Standalone TypeScript SDK for the [Clear Junction](https://api-docs.clearjunction.com/) REST API — virtual IBANs, crypto addresses, payouts (SEPA CT, SEPA Instant, FPS, CHAPS, SWIFT, internal), transaction actions, e-wallets, instant FX, payin, refunds, reports and requisite checks.

> **Disclaimer:** this is not an official Clear Junction product. It is an independent client library and is not affiliated with, endorsed, or supported by Clear Junction.

## Install

```bash
npm install clearjunction-js
```

Requires Node 20+ (native `fetch` only — no axios; works in Edge, Workers and Bun).

## Usage

```ts
import { ClearJunction } from 'clearjunction-js';

const cj = new ClearJunction({
  apiKey: '...',          // X-API-KEY (uuid)
  apiPassword: '...',     // plaintext; the SDK hashes it into the signature
  walletUuid: '...',      // default wallet for allocation/payout calls
  environment: 'sandbox', // 'sandbox' | 'production' (+ baseUrl, issued at onboarding)
  timeout: 30_000,
  maxRetries: 3,
  logger: console,
});

// Virtual accounts
await cj.virtualAccounts.allocateIban({ clientOrder: '...', registrant: { ... } });
await cj.virtualAccounts.getStatus('orderReference', uuid);
await cj.virtualAccounts.listByCustomer(clientCustomerId);
await cj.virtualAccounts.getIbanStatus({ iban });
await cj.virtualAccounts.close({ iban });
await cj.virtualAccounts.allocateCrypto({ accountType: 'CRYPTO_ADDRESS', ... });

// Payouts (created orders must be approved via transactions.approve)
await cj.payouts.sepaCreditTransfer({ ... });
await cj.payouts.sepaInstant({ ... });
await cj.payouts.fpsV2({ ... });
await cj.payouts.chapsV2({ ... });
await cj.payouts.swift({ ... });
await cj.payouts.internal({ ... });
await cj.payouts.getStatus('orderReference', uuid);

await cj.transactions.approve([orderReference]);
await cj.transactions.cancel([orderReference]);

await cj.wallets.reserveCorporate({ ... });
await cj.wallets.transfer({ ... });

const { quotes } = await cj.fx.getRate({ sellCurrency: 'EUR', buyCurrency: 'USD' });
await cj.fx.transfer({ rateUuid: quotes[0].rateUuid, ... });

await cj.payin.createCreditCardInvoice({ ... });
await cj.refund.execute({ relatedOrderReference, ... });
await cj.reports.transactions({ timestampFrom, timestampTo });
await cj.reports.walletStatement({ walletUuid, dateFrom, dateTo });
await cj.checkRequisite.confirmationOfPayee({ payee, payeeRequisite });
await cj.checkRequisite.checkSepaIban(iban);
```

## Authentication

Custom SHA-512 scheme. Three headers go on every request — `Date`, `X-API-KEY`, `Authorization` — and the SDK computes all three for you:

```
signature = sha512(UPPER(apiKey) + date + UPPER(sha512(apiPassword)) + UPPER(body))
```

- `date` is passed through as given; every other component is uppercased.
- The body is signed as the exact string that is sent, serialised once.
- `Date` is refreshed on every attempt, keeping requests inside Clear Junction's 5-minute skew window.
- `apiPassword` is hashed client-side and never transmitted.

Responses map onto a typed error hierarchy: `401` to `AuthenticationError`, `409` to `ValidationError` carrying `errors[]`, and a non-JSON `403` to a `ForbiddenError` naming the sandbox IP allowlist.

## Webhooks

```ts
import { verifyWebhookSignature, acknowledgeNotification } from 'clearjunction-js';

// Express-style handler:
app.post('/cj/hooks', (req, res) => {
  const rawBody = req.body; // raw bytes as received
  const ok = verifyWebhookSignature(rawBody, req.headers.authorization ?? '', {
    apiKey: process.env.CJ_API_KEY!,
    apiPassword: process.env.CJ_API_PASSWORD!,
    date: req.headers.date!,
  });
  if (!ok) return res.status(401).end();
  // ...dedupe on orderReference + status (+ operTimestamp for refunds)...
  const ack = acknowledgeNotification(orderReference);
  res.status(ack.statusCode).set(ack.headers).send(ack.body);
});
```

Reply HTTP 200, `Content-Type: text/plain`, body = the bare `orderReference`, within 10 seconds. `acknowledgeNotification` builds that response, and `notificationDedupeKey` builds the dedupe key Clear Junction deduplicates on. Unacknowledged notifications are retried with backoff for 7 days or 50 attempts.

## Testing

```ts
import { MockClearJunction } from 'clearjunction-js';

const mock = new MockClearJunction((call) => ({ orderReference: 'mock-order' }));
await mock.payouts.sepaCreditTransfer({ ... });
expect(mock.calls).toHaveLength(1);
```

## Errors

Typed hierarchy rooted at `ClearJunctionError`: `AuthenticationError` (401), `ValidationError` (409, carries `errors[]`), `ForbiddenError` (403), `NotFoundError` (404), `BadRequestError` (400), `RateLimitError` (429, carries `retryAfter`), `ServerError` (5xx), `NetworkError` / `TimeoutError`, `ConfigurationError` (thrown before any I/O).

## Author

Nneji Ifeanyi

## License

MIT (c) 2026 Nneji Ifeanyi
