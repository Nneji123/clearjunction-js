# clearjunction-js

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

Custom SHA-512 scheme (not HMAC, not bearer). Three headers go on every request — `Date`, `X-API-KEY`, `Authorization` — and the SDK computes them for you. Notes from the spec that bite:

- `Date` is the only signature component **not** uppercased.
- Requests are rejected on **>5 minutes of clock skew** before the signature is checked.
- `401` = signature mismatch; body-validation errors are **`409`**, not `400`.
- The sandbox **IP-allowlists at its load balancer**: an unlisted egress IP gets a plain `403` for everything. `ForbiddenError` says so explicitly.

## Webhooks

```ts
import { verifyWebhookSignature, acknowledgeNotification } from 'clearjunction-js';

// Express-style handler:
app.post('/cj/hooks', (req, res) => {
  const rawBody = req.body; // raw bytes as received — do not re-serialise
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

Reply HTTP 200, `Content-Type: text/plain`, body = the bare `orderReference`, within 10 seconds — otherwise retries with backoff for 7 days / 50 attempts. Always verify; never fail open.

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
