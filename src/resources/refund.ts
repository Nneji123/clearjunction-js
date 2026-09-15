import type { BaseClient } from '../http/base-client.js';
import type {
  ComplianceStatus,
  OrderReferenceType,
  RefundOperStatus,
  RefundStatus,
} from '../types/common.js';
import type { CustomInfo, ProcessingMessage } from '../types/entities.js';

/* ---------------------------------------------------------------------------
 * Request inputs. Transcribed from docs/api-reference.md: RefundRequestEntity.
 * ------------------------------------------------------------------------- */

/** POST /v7/gate/refund (RefundRequestEntity). */
export interface ExecuteRefundInput {
  clientOrder: string;
  postbackUrl?: string;
  /** Reference to the original order being refunded. */
  relatedOrderReference: string;
  /** Payment description, max 120 characters (may be empty in some cases). */
  description: string;
}

/* ---------------------------------------------------------------------------
 * Responses. Transcribed from docs/api-reference.md: RefundResponseEntity,
 * RefundStatusEntity (RefundGetStatusResponseEntity).
 * ------------------------------------------------------------------------- */

/** subStatuses block of the refund responses. */
export interface RefundSubStatuses {
  operStatus: RefundOperStatus;
  complianceStatus: ComplianceStatus;
}

/** RefundResponseEntity. */
export interface RefundResponse {
  requestReference: string;
  clientOrder: string;
  orderReference: string;
  createdAt: string;
  messages?: ProcessingMessage[];
  customFormat?: Record<string, unknown>;
  relatedOrderReference: string;
  status: RefundStatus;
  subStatuses: RefundSubStatuses;
}

/** Additional payment details of the refund status. */
export interface RefundPaymentDetails {
  description: string;
}

/**
 * RefundGetStatusResponseEntity (RefundStatusEntity + requestReference).
 * Dedupe notifications on orderReference + status + operTimestamp.
 */
export interface RefundStatusResponse {
  requestReference: string;
  clientOrder: string;
  orderReference: string;
  operTimestamp: string;
  messages?: ProcessingMessage[];
  currency: string;
  amount: number;
  operationCurrency: string;
  operationAmount: number;
  productName?: string;
  siteAddress?: string;
  label?: string;
  customInfo?: CustomInfo;
  customFormat?: Record<string, unknown>;
  valuedAt?: string | null;
  relatedOrderReference: string;
  status: RefundStatus;
  subStatuses: RefundSubStatuses;
  transactionType: 'Refund';
  paymentDetails: RefundPaymentDetails;
}

/* ---------------------------------------------------------------------------
 * Resource.
 * ------------------------------------------------------------------------- */

export class RefundResource {
  constructor(private readonly http: BaseClient) {}

  /**
   * POST /v7/gate/refund — return an inbound transaction. Available for
   * internal payments, SEPA CT, SEPA Instant, FPS and CHAPS; the availability
   * period varies by payment method.
   */
  async execute(input: ExecuteRefundInput): Promise<RefundResponse> {
    return this.http.request<RefundResponse>({
      method: 'POST',
      path: '/v7/gate/refund',
      body: input,
    });
  }

  /**
   * GET /v7/gate/status/refund/orderReference/{uuid} or
   * GET /v7/gate/status/refund/clientOrder/{id}.
   */
  async getStatus(
    referenceType: OrderReferenceType,
    reference: string,
  ): Promise<RefundStatusResponse> {
    return this.http.request<RefundStatusResponse>({
      method: 'GET',
      path: `/v7/gate/status/refund/${referenceType}/${encodeURIComponent(reference)}`,
    });
  }
}
