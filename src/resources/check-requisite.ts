import type { BaseClient } from '../http/base-client.js';
import type {
  CorporateEntity,
  IndividualNameSeparated,
} from '../types/entities.js';

/* ---------------------------------------------------------------------------
 * Request inputs. Transcribed from docs/api-reference.md:
 * checkRequisitesCopEntity, PartnerCheckRequisitesCopEntity,
 * RequisiteBankGbpEntity.
 * ------------------------------------------------------------------------- */

/** Payee of the Confirmation-of-Payee check (strictly one section defined). */
export interface ConfirmationOfPayeePayee {
  individual?: IndividualNameSeparated;
  corporate?: CorporateEntity;
}

/** Payee requisite of the CoP check (RequisiteBankGbpEntity + extras). */
export interface ConfirmationOfPayeeRequisite {
  sortCode: string;
  accountNumber: string;
  iban?: string;
  /** Additional identification details, if required by the beneficiary. */
  secondaryReferenceData?: string;
}

/**
 * POST /v7/gate/checkRequisite/cop (checkRequisitesCopEntity).
 * Mandatory before GBP (FPS/CHAPS) payouts: a missing valid CoP result
 * rejects payout creation. Sandbox is mocked (any value except the
 * 000000/00000000 fixtures returns a full match); real CoP is
 * production-only.
 */
export interface ConfirmationOfPayeeInput {
  payee: ConfirmationOfPayeePayee;
  payeeRequisite: ConfirmationOfPayeeRequisite;
}

/* ---------------------------------------------------------------------------
 * Responses. Transcribed from docs/api-reference.md:
 * CheckRequisitesCopResponseEntity, CheckRequisiteBanktransferEu.
 * ------------------------------------------------------------------------- */

/** False/partial-match details of the CoP response. */
export interface ConfirmationOfPayeeMismatch {
  /** e.g. ANNM, MBAM, BANM, PANM, AC01, CASS, TECH_ERROR, C429. */
  code: string;
  description: string;
  /** Beneficiary-bank name suggestion on close matches. */
  name: string;
}

/** POST /v7/gate/checkRequisite/cop response. */
export interface ConfirmationOfPayeeResponse {
  requestReference: string;
  /** True on a full match, false on no/partial match. */
  matched: boolean;
  /** ISO-8601 timestamp until which the result stays valid (cache until then). */
  expirationTimestamp: string;
  falseMatchDetails?: ConfirmationOfPayeeMismatch;
}

/** GET /v7/gate/checkRequisite/bankTransfer/eu/iban/{iban} response. */
export interface CheckSepaIbanResponse {
  requestReference: string;
  bankSwiftCode?: string;
  bankName?: string;
  sepaReachable: boolean;
  sepaInstReachable: boolean;
}

/* ---------------------------------------------------------------------------
 * Resource.
 * ------------------------------------------------------------------------- */

export class CheckRequisiteResource {
  constructor(private readonly http: BaseClient) {}

  /** POST /v7/gate/checkRequisite/cop — Confirmation of Payee check. */
  async confirmationOfPayee(
    input: ConfirmationOfPayeeInput,
  ): Promise<ConfirmationOfPayeeResponse> {
    return this.http.request<ConfirmationOfPayeeResponse>({
      method: 'POST',
      path: '/v7/gate/checkRequisite/cop',
      body: input,
    });
  }

  /**
   * GET /v7/gate/checkRequisite/bankTransfer/eu/iban/{iban} — SEPA
   * SCT/Inst reachability of an IBAN.
   */
  async checkSepaIban(iban: string): Promise<CheckSepaIbanResponse> {
    return this.http.request<CheckSepaIbanResponse>({
      method: 'GET',
      path: `/v7/gate/checkRequisite/bankTransfer/eu/iban/${encodeURIComponent(iban)}`,
    });
  }
}
