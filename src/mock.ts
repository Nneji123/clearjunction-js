import { ClearJunction } from './client.js';
import { SANDBOX_BASE_URL } from './types/common.js';

/** One outbound call recorded by MockClearJunction. */
export interface MockCall {
  method: string;
  /** Path + query, without the host. */
  path: string;
  /** Parsed JSON body, or undefined for bodyless requests. */
  body: unknown;
}

/**
 * Handler producing a canned JSON response for a recorded call.
 * Return `undefined` to respond with an empty body.
 */
export type MockHandler = (call: MockCall) => unknown;

/**
 * In-memory mock mirroring the real {@link ClearJunction} client, for
 * consumers' tests. It signs nothing and performs no I/O: every resource
 * method is served by the injected fetch stub, calls are recorded in order,
 * and responses come from the handler (default: `{}`).
 *
 * ```ts
 * const mock = new MockClearJunction((call) => {
 *   if (call.path === '/v7/gate/payout/bankTransfer/eu') {
 *     return { orderReference: 'mock-order', status: 'created' };
 *   }
 *   return {};
 * });
 *
 * await mock.payouts.sepaCreditTransfer({ ... });
 * expect(mock.calls).toHaveLength(1);
 * mock.reset();
 * ```
 */
export class MockClearJunction extends ClearJunction {
  /** Calls recorded in order. Cleared by {@link MockClearJunction.reset}. */
  readonly calls: MockCall[];

  private readonly handlerHolder: { handler: MockHandler };

  constructor(handler: MockHandler = () => ({})) {
    const recorded: MockCall[] = [];
    const holder: { handler: MockHandler } = { handler };
    super({
      apiKey: 'mock-api-key',
      apiPassword: 'mock-api-password',
      environment: 'sandbox',
      maxRetries: 0,
      fetch: (async (url: unknown, init?: unknown) => {
        const request = (init ?? {}) as { method?: string; body?: string };
        const rawUrl = String(url);
        const call: MockCall = {
          method: request.method ?? 'GET',
          path: rawUrl.startsWith(SANDBOX_BASE_URL)
            ? rawUrl.slice(SANDBOX_BASE_URL.length)
            : rawUrl,
          body: request.body !== undefined ? (JSON.parse(request.body) as unknown) : undefined,
        };
        recorded.push(call);
        const payload = holder.handler(call);
        return new Response(payload === undefined ? '' : JSON.stringify(payload), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }) as typeof fetch,
    });
    this.calls = recorded;
    this.handlerHolder = holder;
  }

  /** Replace the response handler. */
  setHandler(handler: MockHandler): void {
    this.handlerHolder.handler = handler;
  }

  /** Clear recorded calls. */
  reset(): void {
    this.calls.length = 0;
  }
}
