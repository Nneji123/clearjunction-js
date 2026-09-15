import type { BaseClient } from '../http/base-client.js';
import type {
  ComplianceStatus,
  OrderReferenceType,
  PayinCreateOrderStatus,
  PayinOperStatus,
  PayinOrderStatus,
} from '../types/common.js';
import type {
  AddressEntity,
  CorporateEntity,
  CustomInfo,
  DocumentEntity,
  IndividualNameSeparated,
  ProcessingMessage,
} from '../types/entities.js';

/* ---------------------------------------------------------------------------
 * Parties. Transcribed from docs/api-reference.md: IndividualRuEntity,
 * PartnerRuInvoiceEntity (payer / payee of CreateInvoiceRuBaseEntity).
 * ------------------------------------------------------------------------- */

/** IndividualRuEntity: inn optional, address and document required. */
export interface PayinRuIndividual extends IndividualNameSeparated {
  inn?: string;
  address: AddressEntity;
  document: DocumentEntity;
}

/** Payer/payee of the card-invoice request (PartnerRuInvoiceEntity). */
export interface PayinInvoiceParty {
  clientCustomerId: string;
  walletUuid?: string;
  individual?: PayinRuIndividual;
  corporate?: CorporateEntity;
}

/* ---------------------------------------------------------------------------
 * Request inputs.
 * ------------------------------------------------------------------------- */

/**
 * POST /v7/gate/invoice/creditCard (CreateInvoiceRuBaseEntity).
 * Amount is applied to the client's account balance in the account currency.
 */
export interface CreateCreditCardInvoiceInput {
  clientOrder: string;
  currency: 'EUR';
  amount: number;
  description: string;
  productName?: string;
  siteAddress?: string;
  label?: string;
  postbackUrl?: string;
  successUrl?: string;
  failUrl?: string;
  customInfo?: CustomInfo;
  payer: PayinInvoiceParty;
  payee?: PayinInvoiceParty;
}

/* ---------------------------------------------------------------------------
 * Responses. Transcribed from docs/api-reference.md:
 * PayinCreateOrderResponseEntity, PayinStatusEntity,
 * PayinGetStatusResponseEntity.
 * ------------------------------------------------------------------------- */

/** subStatuses block of PayinCreateOrderResponseEntity. */
export interface PayinCreateSubStatuses {
  operStatus: PayinOperStatus;
  complianceStatus: ComplianceStatus;
}

/** PayinCreateOrderResponseEntity. */
export interface PayinCreateOrderResponse {
  requestReference: string;
  clientOrder: string;
  orderReference: string;
  createdAt: string;
  messages?: ProcessingMessage[];
  customFormat?: Record<string, unknown>;
  status: PayinCreateOrderStatus;
  subStatuses: PayinCreateSubStatuses;
}

/** subStatuses block of PayinStatusEntity. */
export interface PayinStatusSubStatuses {
  operStatus: PayinOperStatus;
  complianceStatus: ComplianceStatus;
}

/** Payer address block of PayinStatusEntity. */
export interface PayinStatusPayer {
  address?: {
    addressOneString?: string;
    country?: string;
  };
}

/** Payee reference block of PayinStatusEntity. */
export interface PayinStatusPayee {
  walletUuid?: string;
  clientCustomerId?: string;
}

/**
 * PayinGetStatusResponseEntity (PayinStatusEntity + requestReference).
 * paymentDetails structure depends on the payment method.
 */
export interface PayinStatusResponse {
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
  status: PayinOrderStatus;
  transactionType: 'Payin';
  subStatuses: PayinStatusSubStatuses;
  payer?: PayinStatusPayer;
  payee?: PayinStatusPayee;
  paymentDetails: Record<string, unknown>;
}

/* ---------------------------------------------------------------------------
 * Resource.
 * ------------------------------------------------------------------------- */

export class PayinResource {
  constructor(private readonly http: BaseClient) {}

  /** POST /v7/gate/invoice/creditCard — create a card invoice. */
  async createCreditCardInvoice(
    input: CreateCreditCardInvoiceInput,
  ): Promise<PayinCreateOrderResponse> {
    return this.http.request<PayinCreateOrderResponse>({
      method: 'POST',
      path: '/v7/gate/invoice/creditCard',
      body: input,
    });
  }

  /**
   * GET /v7/gate/status/invoice/orderReference/{uuid} or
   * GET /v7/gate/status/invoice/clientOrder/{id}.
   */
  async getStatus(
    referenceType: OrderReferenceType,
    reference: string,
  ): Promise<PayinStatusResponse> {
    return this.http.request<PayinStatusResponse>({
      method: 'GET',
      path: `/v7/gate/status/invoice/${referenceType}/${encodeURIComponent(reference)}`,
    });
  }
}
