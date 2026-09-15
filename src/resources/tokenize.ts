import type { BaseClient } from '../http/base-client.js';

/* ---------------------------------------------------------------------------
 * Request inputs. Transcribed from docs/api-reference.md:
 * pciCreateTokenRequestEntity.
 * ------------------------------------------------------------------------- */

/** POST /v7/pci/createToken (pciCreateTokenRequestEntity). */
export interface CreateTokenInput {
  storeType: string;
  data: {
    pan: string;
    card_expiration_date?: string;
    card_holder_name?: string;
    token_expiration_period_month?: number;
  };
}

/* ---------------------------------------------------------------------------
 * Responses. Transcribed from docs/api-reference.md:
 * pciCreateTokenResponseEntity.
 * ------------------------------------------------------------------------- */

/** POST /v7/pci/createToken response (pciCreateTokenResponseEntity). */
export interface CreateTokenResponse {
  stored_data: {
    pan: string;
    card_expiration_date?: string;
    card_holder_name?: string;
    token_expiration_period_month?: number;
  };
  requestReference: string;
  token: string;
  expire_term: number;
  created_at: string;
  expired_at: string;
  used_at: string;
}

/* ---------------------------------------------------------------------------
 * Resource.
 * ------------------------------------------------------------------------- */

/**
 * Tokenize resource. Handles raw card tokenization.
 * Note that this endpoint handles raw card numbers (PANs) and callers are
 * responsible for their own PCI scope.
 */
export class TokenizeResource {
  constructor(private readonly http: BaseClient) {}

  /**
   * POST /v7/pci/createToken — exchange a raw PAN for a reusable token.
   *
   * @remarks Marked "implementing" in the Clear Junction spec.
   */
  async createToken(input: CreateTokenInput): Promise<CreateTokenResponse> {
    return this.http.request<CreateTokenResponse>({
      method: 'POST',
      path: '/v7/pci/createToken',
      body: input,
    });
  }
}
