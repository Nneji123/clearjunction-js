import type { BaseClient } from '../http/base-client.js';
import type {
  ComplianceStatus,
  OrderReferenceType,
  PayoutCreateOrderStatus,
  PayoutOperStatus,
  PayoutOrderStatus,
  WalletAsyncReservationStatus,
} from '../types/common.js';
import type {
  AddressEntity,
  CustomInfo,
  DocumentEntity,
  IndividualNameSeparated,
  ProcessingMessage,
} from '../types/entities.js';

/* ---------------------------------------------------------------------------
 * Holders. Transcribed from docs/api-reference.md:
 * ReservateWalletCorporateAsyncRequestEntity, WalletHolderCorporateEntity
 * (WalletCorporateEntityExtended: CorporateEntityExtended with required
 * expectedTurnover, businessPartners and complianceEvaluation).
 * ------------------------------------------------------------------------- */

/** Individual wallet holder (IndividualNameSeparatedEntity + required birthDate). */
export interface WalletHolderIndividual extends IndividualNameSeparated {
  /** YYYY-MM-DD. At least 16 years old, not more than 85 years old. */
  birthDate: string;
}

/** UBO entry of the wallet corporate holder. */
export interface WalletHolderUltimateBeneficialOwner {
  lastName: string;
  firstName: string;
  /** YYYY-MM-DD. At least 16 years old, not more than 85 years old. */
  birthDate: string;
  ownership: number;
  document: DocumentEntity;
  beneficialOwnerPep: boolean;
  beneficialOwnerPepDetails: string;
  usaTaxResidency: boolean;
  giinNumber: string;
}

/** Corporate wallet holder (WalletHolderCorporateEntity). */
export interface WalletHolderCorporate {
  email?: string;
  phone?: string;
  name: string;
  registrationNumber: string;
  incorporationCountry: string;
  address: AddressEntity;
  /** YYYY-MM-DD. */
  incorporationDate: string;
  taxCountry?: string;
  taxNumber?: string;
  industryType?: string;
  publicallyTraded?: boolean;
  stockSymbol?: string;
  stockExchange?: string;
  ultimateBeneficialOwner: WalletHolderUltimateBeneficialOwner[];
  tradingWebsite: string;
  /** Expected payin turnover per month in EUR. */
  expectedTurnover: number;
  beneficialLegalEntity?: string;
  otherDetails: {
    businessActivity: string;
    relevantInformation?: string;
    negativeInformation?: string;
  };
  businessPartners: Array<{
    name: string;
    incorporationCountryCode: string;
    plannedTransfersQuantityMonth: number;
    plannedTransfersEurVolumeMonth: number;
    additionalInfo?: string;
    basisPartnership: string;
    website: string;
  }>;
  fundFlows: {
    plannedIncTransfersQuantity: number;
    plannedIncTransfersEurVolume: number;
    plannedOutTransfersQuantity: number;
    plannedOutTransfersEurVolume: number;
  };
  complianceEvaluation: {
    amlRiskLevel: 'Low' | 'Medium' | 'High';
    reviewPeriodicity: string;
    appliedLimits: string;
    additionalInfo?: string;
  };
  customOptions?: Record<string, unknown>;
  /** Fewer than 10 employees and turnover/balance sheet under €2M. */
  isMicroEnterprise: boolean;
}

/* ---------------------------------------------------------------------------
 * Request inputs.
 * ------------------------------------------------------------------------- */

/**
 * POST /v7/gate/wallets/corporate
 * (ReservateWalletCorporateAsyncRequestEntity).
 */
export interface ReserveCorporateWalletInput {
  clientOrder: string;
  postbackUrl?: string;
  /** ISO-4217 currency or a recognised cryptocurrency (USDT, USDC). */
  currency: string;
  ibansGroup?: string;
  ibanCountry?: string;
  holder: {
    clientCustomerId: string;
    corporate: WalletHolderCorporate;
  };
  customInfo?: CustomInfo;
}

/** Wallet requisite of WalletFundTransferEntity (payer / payee wallet UUID). */
export interface WalletTransferRequisite {
  walletUuid: string;
}

/**
 * POST /v7/gate/wallets/transfer — transfer funds between wallets
 * (WalletFundTransferEntity).
 */
export interface TransferWalletInput {
  payerRequisite: WalletTransferRequisite;
  payeeRequisite: WalletTransferRequisite;
  clientOrder: string;
  currency: 'EUR';
  amount: number;
  description: string;
  postbackUrl?: string;
  customInfo?: CustomInfo;
}

/* ---------------------------------------------------------------------------
 * Responses.
 * ------------------------------------------------------------------------- */

/**
 * POST /v7/gate/wallets/corporate response
 * (ReservateWalletCorporateAsyncResponseEntity). `uploadFilesLink` is a
 * pre-signed S3 URL for uploading the verification documents zip (<10MB).
 */
export interface ReserveWalletResponse {
  requestReference: string;
  clientOrder: string;
  orderReference: string;
  status: 'accepted';
  uploadFilesLink: string;
}

/**
 * Wallet reservation status (ReservateWalletAsyncGetStatusEntity).
 * `iban` is empty unless the reservation is **reserved**.
 */
export interface ReserveWalletStatusResponse {
  requestReference: string;
  clientOrder: string;
  orderReference: string;
  walletUuid: string;
  iban?: string;
  status: WalletAsyncReservationStatus;
  messages?: ProcessingMessage[];
}

/** Payment-method entry of the get-wallet response. */
export interface WalletPaymentMethod {
  type: string;
  channels?: string;
  currencies?: string[];
  bankCode?: string;
  bankCorrAccount?: string;
  accountNumber: string;
  name: string;
  purposeTag?: string;
}

/** Balance entry of the get-wallet response. */
export interface WalletAmount {
  currencyCode: string;
  availableFunds: string;
}

/** GET /v7/gate/wallets/{uuid} response. */
export interface WalletDetailsResponse {
  requestReference: string;
  ownerUuid: string;
  walletUuid: string;
  paymentMethods?: WalletPaymentMethod[];
  amounts: WalletAmount[];
}

/** POST /v7/gate/wallets/transfer response (WalletFundTransferResponseEntity). */
export interface TransferWalletResponse {
  requestReference: string;
  clientOrder: string;
  orderReference: string;
  createdAt: string;
  messages?: ProcessingMessage[];
  customFormat?: Record<string, unknown>;
  status: PayoutCreateOrderStatus;
}

/** subStatuses block of the wallet-transfer status. */
export interface WalletTransferStatusSubStatuses {
  operStatus: PayoutOperStatus;
  complianceStatus: ComplianceStatus;
}

/**
 * Wallet-transfer status (WalletFundTransferGetStatusResponseEntity).
 * Carries the three status fields: top-level `status` plus subStatuses.
 */
export interface WalletTransferStatusResponse {
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
  transactionType: 'TransferWallet';
  subStatuses: WalletTransferStatusSubStatuses;
  payer: WalletTransferRequisite;
  payee: WalletTransferRequisite;
}

/* ---------------------------------------------------------------------------
 * Resource.
 * ------------------------------------------------------------------------- */

export class WalletsResource {
  constructor(private readonly http: BaseClient) {}

  /** POST /v7/gate/wallets/corporate — reserve a corporate customer wallet. */
  async reserveCorporate(input: ReserveCorporateWalletInput): Promise<ReserveWalletResponse> {
    return this.http.request<ReserveWalletResponse>({
      method: 'POST',
      path: '/v7/gate/wallets/corporate',
      body: input,
    });
  }

  /**
   * GET /v7/gate/wallets/status/orderReference/{uuid} or
   * GET /v7/gate/wallets/status/clientOrder/{id}.
   */
  async getReservationStatus(
    referenceType: OrderReferenceType,
    reference: string,
  ): Promise<ReserveWalletStatusResponse> {
    return this.http.request<ReserveWalletStatusResponse>({
      method: 'GET',
      path: `/v7/gate/wallets/status/${referenceType}/${encodeURIComponent(reference)}`,
    });
  }

  /**
   * GET /v7/gate/wallets/{uuid} — wallet balances and payment methods.
   * `returnPaymentMethods` lists allowed payment methods (default false;
   * omitted from the response when IBAN count exceeds 500 regardless).
   */
  async getWallet(walletUuid: string, returnPaymentMethods?: boolean): Promise<WalletDetailsResponse> {
    return this.http.request<WalletDetailsResponse>({
      method: 'GET',
      path: `/v7/gate/wallets/${encodeURIComponent(walletUuid)}`,
      query: { returnPaymentMethods },
    });
  }

  /** POST /v7/gate/wallets/transfer — transfer funds between wallets. */
  async transfer(input: TransferWalletInput): Promise<TransferWalletResponse> {
    return this.http.request<TransferWalletResponse>({
      method: 'POST',
      path: '/v7/gate/wallets/transfer',
      body: input,
    });
  }

  /**
   * GET /v7/gate/status/walletTransfer/orderReference/{uuid} or
   * GET /v7/gate/status/walletTransfer/clientOrder/{id}.
   */
  async getTransferStatus(
    referenceType: OrderReferenceType,
    reference: string,
  ): Promise<WalletTransferStatusResponse> {
    return this.http.request<WalletTransferStatusResponse>({
      method: 'GET',
      path: `/v7/gate/status/walletTransfer/${referenceType}/${encodeURIComponent(reference)}`,
    });
  }
}
