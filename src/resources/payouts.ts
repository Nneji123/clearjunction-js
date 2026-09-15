import type { BaseClient } from '../http/base-client.js';
import type {
  ComplianceStatus,
  OrderReferenceType,
  PayoutCreateOrderStatus,
  PayoutOperStatus,
  PayoutOrderStatus,
} from '../types/common.js';
import type {
  AddressEntity,
  CorporateEntity,
  CorporateGb,
  CustomInfo,
  IndividualNameSeparated,
  PaymentPurposeCodes,
  ProcessingMessage,
  UltimateIndividual,
} from '../types/entities.js';

/* ---------------------------------------------------------------------------
 * Parties (payer / payee / ultimate). Transcribed from docs/api-reference.md:
 * PartnerInternalPaymentEntity, PartnerEuEntity, PartnerGbpEntity,
 * PartnerChapsEntity, PartnerSwiftOnlyCorporateEntity, UltimatePartnerEntity.
 * ------------------------------------------------------------------------- */

/** Individual with an optional registration address (EU / GBP / internal rails). */
export interface PayoutEuIndividual extends IndividualNameSeparated {}

/** Individual with a required registration address (CHAPS / SWIFT rails). */
export interface PayoutChapsIndividual extends IndividualNameSeparated {
  address: AddressEntity;
}

/** Corporate party on the SWIFT rail (PartnerSwiftOnlyCorporateEntity: corporate only). */
export interface PayoutSwiftCorporate extends CorporateGb {
  address: AddressEntity;
}

/** Corporate party with a required registration address (CHAPS rail). */
export interface PayoutChapsCorporate extends CorporateGb {
  address: AddressEntity;
}

/** Payer/payee on the internal-payment rail. */
export interface PayoutInternalParty {
  clientCustomerId?: string;
  walletUuid?: string;
  individual?: IndividualNameSeparated;
  corporate?: CorporateEntity;
}

/** Payer/payee on the SEPA rails (PartnerEuEntity). */
export interface PayoutEuParty {
  clientCustomerId?: string;
  walletUuid?: string;
  individual?: PayoutEuIndividual;
  corporate?: CorporateEntity;
}

/** Payer/payee on the GBP rails (PartnerGbpEntity). */
export interface PayoutGbpParty {
  clientCustomerId?: string;
  walletUuid?: string;
  individual?: PayoutEuIndividual;
  corporate?: CorporateGb;
}

/** Payee on the CHAPS V2 / cross-scheme rails (PartnerChapsEntity). */
export interface PayoutChapsParty {
  clientCustomerId?: string;
  walletUuid?: string;
  individual?: PayoutChapsIndividual;
  corporate?: PayoutChapsCorporate;
}

/** Payer/payee on the SWIFT rail (PartnerSwiftOnlyCorporateEntity: corporate only). */
export interface PayoutSwiftParty {
  clientCustomerId?: string;
  walletUuid?: string;
  corporate?: PayoutSwiftCorporate;
}

/** Ultimate payer/payee corporate (UltimateCorporateEntity: every field optional). */
export interface PayoutUltimateCorporate {
  email?: string;
  name?: string;
  registrationNumber?: string;
  incorporationCountry?: string;
  address?: AddressEntity;
  incorporationDate?: string;
}

/** Ultimate payer/payee (UltimatePartnerEntity: strictly one section defined). */
export interface PayoutUltimateParty {
  individual?: UltimateIndividual;
  corporate?: PayoutUltimateCorporate;
}

/* ---------------------------------------------------------------------------
 * Requisites. Transcribed from docs/api-reference.md: Requisite*Entity group.
 * ------------------------------------------------------------------------- */

/** RequisiteInternalPaymentEntity: IBAN only. */
export interface PayoutInternalRequisite {
  iban: string;
}

/** RequisiteBankEuEntity. */
export interface PayoutEuRequisite {
  iban: string;
  bankSwiftCode?: string;
}

/** RequisiteBankGbpEntity base: sort code + account number. */
export interface PayoutGbpRequisite {
  sortCode: string;
  accountNumber: string;
  iban?: string;
}

/** RequisiteBankFpsEntity. */
export interface PayoutFpsRequisite extends PayoutGbpRequisite {
  bankSwiftCode?: string;
}

/** RequisiteBankChapsEntity: bankSwiftCode required. */
export interface PayoutChapsRequisite extends PayoutGbpRequisite {
  bankSwiftCode: string;
}

/** Payer requisite on the FPS V2 / CHAPS V2 rails (RequisiteInternalPaymentEntity). */
export interface PayoutV2PayerRequisite {
  iban: string;
}

/** Payer requisite on the cross-scheme rail: plain IBAN object. */
export interface PayoutCrossSchemePayerRequisite {
  iban: string;
}

/** Cross-scheme payee requisite, IBAN variant. */
export interface PayoutCrossSchemeIbanRequisite {
  iban: string;
  bankSwiftCode?: string;
}

/** Cross-scheme payee requisite, account-number variant. */
export interface PayoutCrossSchemeAccountRequisite {
  accountNumber: string;
  bankSwiftCode: string;
}

/** Cross-scheme payee requisite: exactly one variant. */
export type PayoutCrossSchemePayeeRequisite =
  | PayoutCrossSchemeIbanRequisite
  | PayoutCrossSchemeAccountRequisite;

/** SWIFT payer requisite: plain IBAN object. */
export interface PayoutSwiftPayerRequisite {
  iban: string;
}

/** SWIFT institution block (ReceiverRequisiteBankSwiftEntity.institution). */
export interface PayoutSwiftInstitution {
  bankSwiftCode?: string;
  clearingSystemIdCode?: 'ABA' | 'CACPA';
  memberId?: string;
  name: string;
  address: AddressEntity;
}

/** SWIFT intermediary institution block. */
export interface PayoutSwiftIntermediaryInstitution {
  bankSwiftCode?: string;
  clearingSystemIdCode?: 'ABA' | 'CACPA';
  memberId?: string;
  name?: string;
  address: AddressEntity;
}

/** SWIFT payee requisite (ReceiverRequisiteBankSwiftEntity). */
export interface PayoutSwiftPayeeRequisite {
  /** IBAN. Supported for all currencies. */
  iban?: string;
  /** Account number. Supported for USD and CAD only. */
  accountNumber?: string;
  institution: PayoutSwiftInstitution;
  intermediaryInstitution?: PayoutSwiftIntermediaryInstitution;
}

/** RequisiteCreditCardNonPci: no wire fields; structure depends on the scenario. */
export interface PayoutCreditCardNonPciRequisite {
  [key: string]: unknown;
}

/* ---------------------------------------------------------------------------
 * Request inputs. Field names match the wire format exactly as
 * docs/api-reference.md spells them. A field is optional (?) only where the
 * spec does not mark it required.
 * ------------------------------------------------------------------------- */

/** POST /v7/gate/payout/internalPayment (PayoutInternalPaymentEntity). */
export interface InternalPaymentInput {
  clientOrder: string;
  currency: 'EUR';
  /** Amount sent to the recipient's account. */
  amount: number;
  description: string;
  paymentPurposeCodes?: PaymentPurposeCodes;
  ultimatePayer?: PayoutUltimateParty;
  ultimatePayee?: PayoutUltimateParty;
  postbackUrl?: string;
  customInfo?: CustomInfo;
  payer?: PayoutInternalParty;
  payee: PayoutInternalParty;
  payeeRequisite: PayoutInternalRequisite;
  payerRequisite?: PayoutInternalRequisite;
}

/** Shared EUR-rail base (PayoutBaseEntity). */
export interface PayoutEuBaseInput {
  clientOrder: string;
  currency: 'EUR';
  /** Amount sent to the recipient's account. */
  amount: number;
  description: string;
  paymentPurposeCodes?: PaymentPurposeCodes;
  ultimatePayer?: PayoutUltimateParty;
  ultimatePayee?: PayoutUltimateParty;
  postbackUrl?: string;
  customInfo?: CustomInfo;
}

/** POST /v7/gate/payout/bankTransfer/eu (PayoutBankTransferEuEntity). */
export interface SepaCreditTransferInput extends PayoutEuBaseInput {
  payer?: PayoutEuParty;
  payee: PayoutEuParty;
  payeeRequisite: PayoutEuRequisite;
  payerRequisite?: PayoutEuRequisite;
}

/** POST /v7/gate/payout/bankTransfer/sepaInst (PayoutBankTransferEuEntity). */
export interface SepaInstantInput extends PayoutEuBaseInput {
  payer?: PayoutEuParty;
  payee: PayoutEuParty;
  payeeRequisite: PayoutEuRequisite;
  payerRequisite?: PayoutEuRequisite;
}

/** Shared GBP-rail base (PayoutGbpBaseEntity). */
export interface PayoutGbpBaseInput {
  clientOrder: string;
  currency: 'GBP';
  /** Amount sent to the recipient's account. */
  amount: number;
  description: string;
  paymentPurposeCodes?: PaymentPurposeCodes;
  ultimatePayer?: PayoutUltimateParty;
  ultimatePayee?: PayoutUltimateParty;
  postbackUrl?: string;
  customInfo?: CustomInfo;
}

/** POST /v7/gate/payout/bankTransfer/fps (PayoutBankTransferFpsEntity). */
export interface FpsInput extends PayoutGbpBaseInput {
  payer?: PayoutGbpParty;
  payee: PayoutGbpParty;
  payeeRequisite: PayoutFpsRequisite;
  payerRequisite?: PayoutFpsRequisite;
}

/** POST /v7/gate/payout/v2/bankTransfer/fps (PayoutBankTransferFpsV2Entity). */
export interface FpsV2Input extends PayoutGbpBaseInput {
  payer?: PayoutGbpParty;
  payee: PayoutGbpParty;
  payeeRequisite: PayoutFpsRequisite;
  payerRequisite?: PayoutV2PayerRequisite;
}

/** POST /v7/gate/payout/bankTransfer/chaps (PayoutBankTransferChapsEntity). */
export interface ChapsInput extends PayoutGbpBaseInput {
  paymentPurposeCodes: PaymentPurposeCodes;
  payer?: PayoutGbpParty;
  payee: PayoutGbpParty;
  payeeRequisite: PayoutChapsRequisite;
  payerRequisite?: PayoutChapsRequisite;
}

/** POST /v7/gate/payout/v2/bankTransfer/chaps (PayoutBankTransferChapsV2Entity). */
export interface ChapsV2Input extends PayoutGbpBaseInput {
  paymentPurposeCodes: PaymentPurposeCodes;
  payee: PayoutChapsParty;
  payeeRequisite: PayoutChapsRequisite;
  payerRequisite?: PayoutV2PayerRequisite;
}

/**
 * POST /v7/gate/payout/bankTransfer/chapsCrossScheme
 * (PayoutBankTransferChapsCrossSchemeEntity).
 */
export interface ChapsCrossSchemeInput extends PayoutGbpBaseInput {
  paymentPurposeCodes: PaymentPurposeCodes;
  payer?: PayoutGbpParty;
  payee: PayoutChapsParty;
  payerRequisite?: PayoutCrossSchemePayerRequisite;
  payeeRequisite: PayoutCrossSchemePayeeRequisite;
}

/** Currency union for POST /v7/gate/payout/bankTransfer/swift. */
export type SwiftPayoutCurrency =
  | 'EUR'
  | 'USD'
  | 'CAD'
  | 'CHF'
  | 'CZK'
  | 'DKK'
  | 'HUF'
  | 'NOK'
  | 'PLN'
  | 'RON'
  | 'SEK';

/** POST /v7/gate/payout/bankTransfer/swift (PayoutBankTransferSwiftEntity). */
export interface SwiftInput {
  clientOrder: string;
  currency: SwiftPayoutCurrency;
  /** Amount sent to the recipient's account. HUF is zero-decimal: whole numbers only. */
  amount: number;
  description: string;
  paymentPurposeCodes?: PaymentPurposeCodes;
  ultimatePayer?: PayoutUltimateParty;
  ultimatePayee?: PayoutUltimateParty;
  postbackUrl?: string;
  customInfo?: CustomInfo;
  payer?: PayoutSwiftParty;
  payerRequisite?: PayoutSwiftPayerRequisite;
  payee: PayoutSwiftParty;
  payeeRequisite: PayoutSwiftPayeeRequisite;
}

/**
 * POST /v7/gate/payout/creditCardNonPci (PayoutCreditCardNonPciEntity).
 * Spec marks this endpoint ***Temporary unavailable***; kept for completeness.
 */
export interface CreditCardNonPciInput extends PayoutEuBaseInput {
  payer?: PayoutEuParty;
  payee: PayoutEuParty;
  payeeRequisite: PayoutCreditCardNonPciRequisite;
}

/* ---------------------------------------------------------------------------
 * Responses. Transcribed from docs/api-reference.md:
 * PayoutCreateOrderResponseEntity, PayoutStatusEntity,
 * PayoutGetStatusResponseEntity.
 * ------------------------------------------------------------------------- */

/** subStatuses block of PayoutCreateOrderResponseEntity. */
export interface PayoutCreateSubStatuses {
  operStatus: PayoutOperStatus;
  complianceStatus: ComplianceStatus;
}

/** PayoutCreateOrderResponseEntity. */
export interface PayoutCreateOrderResponse {
  requestReference: string;
  clientOrder: string;
  orderReference: string;
  createdAt: string;
  messages?: ProcessingMessage[];
  customFormat?: Record<string, unknown>;
  status: PayoutCreateOrderStatus;
  subStatuses: PayoutCreateSubStatuses;
}

/** subStatuses block of PayoutStatusEntity. */
export interface PayoutStatusSubStatuses {
  operStatus: PayoutOperStatus;
  complianceStatus: ComplianceStatus;
}

/** Payer reference block of PayoutStatusEntity. */
export interface PayoutStatusPayer {
  walletUuid?: string;
  clientCustomerId?: string;
}

/**
 * PayoutGetStatusResponseEntity (PayoutStatusEntity + requestReference).
 * paymentDetails structure depends on the payment method; see the
 * BankTransfer*PaymentDetailEntity group in docs/api-reference.md.
 */
export interface PayoutStatusResponse {
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
  status: PayoutOrderStatus;
  transactionType: 'Payout';
  subStatuses: PayoutStatusSubStatuses;
  payer?: PayoutStatusPayer;
  paymentDetails: Record<string, unknown>;
}

/* ---------------------------------------------------------------------------
 * Resource.
 * ------------------------------------------------------------------------- */

export class PayoutsResource {
  constructor(private readonly http: BaseClient) {}

  /** POST /v7/gate/payout/internalPayment */
  async internal(input: InternalPaymentInput): Promise<PayoutCreateOrderResponse> {
    return this.http.request<PayoutCreateOrderResponse>({
      method: 'POST',
      path: '/v7/gate/payout/internalPayment',
      body: input,
    });
  }

  /** POST /v7/gate/payout/bankTransfer/eu — EUR SEPA Credit Transfer */
  async sepaCreditTransfer(input: SepaCreditTransferInput): Promise<PayoutCreateOrderResponse> {
    return this.http.request<PayoutCreateOrderResponse>({
      method: 'POST',
      path: '/v7/gate/payout/bankTransfer/eu',
      body: input,
    });
  }

  /** POST /v7/gate/payout/bankTransfer/sepaInst — EUR SEPA Instant */
  async sepaInstant(input: SepaInstantInput): Promise<PayoutCreateOrderResponse> {
    return this.http.request<PayoutCreateOrderResponse>({
      method: 'POST',
      path: '/v7/gate/payout/bankTransfer/sepaInst',
      body: input,
    });
  }

  /**
   * POST /v7/gate/payout/bankTransfer/fps — GBP Faster Payments (V1).
   * @deprecated — use {@link PayoutsResource.fpsV2} (POST /v7/gate/payout/v2/bankTransfer/fps).
   */
  async fps(input: FpsInput): Promise<PayoutCreateOrderResponse> {
    return this.http.request<PayoutCreateOrderResponse>({
      method: 'POST',
      path: '/v7/gate/payout/bankTransfer/fps',
      body: input,
    });
  }

  /** POST /v7/gate/payout/v2/bankTransfer/fps — GBP Faster Payments (V2). */
  async fpsV2(input: FpsV2Input): Promise<PayoutCreateOrderResponse> {
    return this.http.request<PayoutCreateOrderResponse>({
      method: 'POST',
      path: '/v7/gate/payout/v2/bankTransfer/fps',
      body: input,
    });
  }

  /**
   * POST /v7/gate/payout/bankTransfer/chaps — GBP CHAPS (V1).
   * @deprecated — use {@link PayoutsResource.chapsV2} (POST /v7/gate/payout/v2/bankTransfer/chaps).
   */
  async chaps(input: ChapsInput): Promise<PayoutCreateOrderResponse> {
    return this.http.request<PayoutCreateOrderResponse>({
      method: 'POST',
      path: '/v7/gate/payout/bankTransfer/chaps',
      body: input,
    });
  }

  /** POST /v7/gate/payout/v2/bankTransfer/chaps — GBP CHAPS (V2). */
  async chapsV2(input: ChapsV2Input): Promise<PayoutCreateOrderResponse> {
    return this.http.request<PayoutCreateOrderResponse>({
      method: 'POST',
      path: '/v7/gate/payout/v2/bankTransfer/chaps',
      body: input,
    });
  }

  /** POST /v7/gate/payout/bankTransfer/chapsCrossScheme — GBP CHAPS cross-scheme. */
  async chapsCrossScheme(input: ChapsCrossSchemeInput): Promise<PayoutCreateOrderResponse> {
    return this.http.request<PayoutCreateOrderResponse>({
      method: 'POST',
      path: '/v7/gate/payout/bankTransfer/chapsCrossScheme',
      body: input,
    });
  }

  /** POST /v7/gate/payout/bankTransfer/swift — multi-currency SWIFT. */
  async swift(input: SwiftInput): Promise<PayoutCreateOrderResponse> {
    return this.http.request<PayoutCreateOrderResponse>({
      method: 'POST',
      path: '/v7/gate/payout/bankTransfer/swift',
      body: input,
    });
  }

  /**
   * POST /v7/gate/payout/creditCardNonPci — card payout (non-PCI).
   * Spec marks this endpoint ***Temporary unavailable***; kept for completeness.
   */
  async creditCardNonPci(input: CreditCardNonPciInput): Promise<PayoutCreateOrderResponse> {
    return this.http.request<PayoutCreateOrderResponse>({
      method: 'POST',
      path: '/v7/gate/payout/creditCardNonPci',
      body: input,
    });
  }

  /**
   * GET /v7/gate/status/payout/orderReference/{uuid} or
   * GET /v7/gate/status/payout/clientOrder/{id}.
   */
  async getStatus(
    referenceType: OrderReferenceType,
    reference: string,
  ): Promise<PayoutStatusResponse> {
    return this.http.request<PayoutStatusResponse>({
      method: 'GET',
      path: `/v7/gate/status/payout/${referenceType}/${encodeURIComponent(reference)}`,
    });
  }
}
