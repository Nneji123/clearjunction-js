import { BaseClient } from './http/base-client.js';
import type { ClearJunctionConfig } from './types/common.js';
import { CheckRequisiteResource } from './resources/check-requisite.js';
import { FxResource } from './resources/fx.js';
import { PayinResource } from './resources/payin.js';
import { PayoutsResource } from './resources/payouts.js';
import { RefundResource } from './resources/refund.js';
import { ReportsResource } from './resources/reports.js';
import { TransactionsResource } from './resources/transactions.js';
import { VirtualAccountsResource } from './resources/virtual-accounts.js';
import { WalletsResource } from './resources/wallets.js';
import { TokenizeResource } from './resources/tokenize.js';

/**
 * Top-level SDK client. Construct with credentials once, then use the
 * resource sub-clients grouped by domain: `sdk.<resource>.<method>()`.
 *
 * ```ts
 * import { ClearJunction } from 'clearjunction-js';
 *
 * const cj = new ClearJunction({
 *   apiKey: '...',
 *   apiPassword: '...', // plaintext; the SDK hashes it into the signature
 *   environment: 'sandbox',
 * });
 *
 * await cj.payouts.sepaCreditTransfer({ ... });
 * ```
 */
export class ClearJunction {
  /** Shared HTTP + signing + retry layer. */
  readonly http: BaseClient;
  readonly payouts: PayoutsResource;
  readonly virtualAccounts: VirtualAccountsResource;
  readonly transactions: TransactionsResource;
  readonly wallets: WalletsResource;
  readonly fx: FxResource;
  readonly payin: PayinResource;
  readonly refund: RefundResource;
  readonly reports: ReportsResource;
  readonly checkRequisite: CheckRequisiteResource;
  readonly tokenize: TokenizeResource;

  constructor(config: ClearJunctionConfig) {
    this.http = new BaseClient(config);
    this.payouts = new PayoutsResource(this.http);
    this.virtualAccounts = new VirtualAccountsResource(this.http);
    this.transactions = new TransactionsResource(this.http);
    this.wallets = new WalletsResource(this.http);
    this.fx = new FxResource(this.http);
    this.payin = new PayinResource(this.http);
    this.refund = new RefundResource(this.http);
    this.reports = new ReportsResource(this.http);
    this.checkRequisite = new CheckRequisiteResource(this.http);
    this.tokenize = new TokenizeResource(this.http);
  }
}
