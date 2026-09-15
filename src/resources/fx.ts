import type { BaseClient } from '../http/base-client.js';
import type { FxTransferStatus, OrderReferenceType } from '../types/common.js';

/* ---------------------------------------------------------------------------
 * Request / response types. Transcribed from docs/api-reference.md, Group
 * Foreign Exchange (Instant FX: business hours, EUR/GBP/USD, quotes valid
 * 120 seconds, internal use only).
 * ------------------------------------------------------------------------- */

/** POST /v7/gate/fx/instant/rate request. */
export interface FxRateInput {
  /** Base currency (ISO-4217 or recognised cryptocurrency). */
  sellCurrency: string;
  /** Target currency (ISO-4217 or recognised cryptocurrency). */
  buyCurrency: string;
}

/** One FX quote of the get-rate response. */
export interface FxQuote {
  /** Unique rate uuid, submitted back on transfer. */
  rateUuid: string;
  quote: string;
  sellCurrency: string;
  buyCurrency: string;
  /** ISO-8601 timestamp when the rate expires. */
  expirationTimestamp: string;
}

/** POST /v7/gate/fx/instant/rate response. */
export interface FxRateResponse {
  requestReference: string;
  quotes: FxQuote[];
}

/** POST /v7/gate/fx/instant/transfer request. */
export interface FxTransferInput {
  clientOrder: string;
  postbackUrl?: string;
  /** Amount in base currency. */
  sellAmount: number;
  /** Amount in target currency. */
  buyAmount: number;
  sellCurrency: string;
  buyCurrency: string;
  /** Unique rate uuid from a get-rate quote (valid 120 seconds). */
  rateUuid: string;
}

/**
 * InstantFxTransferResponseEntity (+ requestReferenceAttr / createdAtAttr on
 * create). The status endpoints return the same entity + requestReference.
 */
export interface FxTransferResponse {
  requestReference: string;
  createdAt?: string;
  clientOrder: string;
  orderReference: string;
  operTimestamp: string;
  sellAmount: number;
  sellCurrency: string;
  buyAmount: number;
  buyCurrency: string;
  status: FxTransferStatus;
  rateUuid: string;
}

/* ---------------------------------------------------------------------------
 * Resource.
 * ------------------------------------------------------------------------- */

export class FxResource {
  constructor(private readonly http: BaseClient) {}

  /** POST /v7/gate/fx/instant/rate — get an instant FX quote (valid 120s). */
  async getRate(input: FxRateInput): Promise<FxRateResponse> {
    return this.http.request<FxRateResponse>({
      method: 'POST',
      path: '/v7/gate/fx/instant/rate',
      body: input,
    });
  }

  /** POST /v7/gate/fx/instant/transfer — create an instant FX transfer. */
  async transfer(input: FxTransferInput): Promise<FxTransferResponse> {
    return this.http.request<FxTransferResponse>({
      method: 'POST',
      path: '/v7/gate/fx/instant/transfer',
      body: input,
    });
  }

  /**
   * GET /v7/gate/fx/instant/status/orderReference/{uuid} or
   * GET /v7/gate/fx/instant/status/clientOrder/{id}.
   */
  async getStatus(
    referenceType: OrderReferenceType,
    reference: string,
  ): Promise<FxTransferResponse> {
    return this.http.request<FxTransferResponse>({
      method: 'GET',
      path: `/v7/gate/fx/instant/status/${referenceType}/${encodeURIComponent(reference)}`,
    });
  }
}
