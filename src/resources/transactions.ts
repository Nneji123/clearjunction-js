import type { BaseClient } from '../http/base-client.js';
import type { ProcessingMessage } from '../types/entities.js';

/* ---------------------------------------------------------------------------
 * Request / response types. Transcribed from docs/api-reference.md:
 * orderReferenceArrayAttr, actionProcessingStatusAttr, ActionResultEntity,
 * TransactionActionResponseEntity.
 * ------------------------------------------------------------------------- */

/** approve/cancel request body: list of order references for approval. */
export interface TransactionActionInput {
  orderReferenceArray: string[];
}

/** Per-order result of an approve/cancel action (ActionResultEntity). */
export interface TransactionActionResult {
  orderReference: string;
  actionProcessingStatus: 'success' | 'declined';
  messages?: ProcessingMessage[];
}

/** TransactionActionResponseEntity. */
export interface TransactionActionResponse {
  requestReference: string;
  actionResult: TransactionActionResult[];
}

/* ---------------------------------------------------------------------------
 * Resource.
 * ------------------------------------------------------------------------- */

export class TransactionsResource {
  constructor(private readonly http: BaseClient) {}

  /**
   * POST /v7/gate/transactionAction/approve — approve created payout orders.
   * Unapproved requests are declined after 30 days.
   */
  async approve(orderReferenceArray: string[]): Promise<TransactionActionResponse> {
    const body: TransactionActionInput = { orderReferenceArray };
    return this.http.request<TransactionActionResponse>({
      method: 'POST',
      path: '/v7/gate/transactionAction/approve',
      body,
    });
  }

  /** POST /v7/gate/transactionAction/cancel — cancel created payout orders. */
  async cancel(orderReferenceArray: string[]): Promise<TransactionActionResponse> {
    const body: TransactionActionInput = { orderReferenceArray };
    return this.http.request<TransactionActionResponse>({
      method: 'POST',
      path: '/v7/gate/transactionAction/cancel',
      body,
    });
  }
}
