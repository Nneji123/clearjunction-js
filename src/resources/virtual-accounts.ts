import type { BaseClient } from '../http/base-client.js';
import type {
  AllocateAsyncStatus,
  OrderReferenceType,
  VirtualAccountStatus,
} from '../types/common.js';
import type {
  AddressEntity,
  CustomInfo,
  DocumentEntity,
  IndividualNameSeparated,
  ProcessingMessage,
} from '../types/entities.js';

/* ---------------------------------------------------------------------------
 * Registrants. Transcribed from docs/api-reference.md:
 * AllocateIbanV3IndividualEntity, CorporateEntityExtended
 * (aka AllocateIbanCorporateEntity), IndividualNameSeparatedEntity.
 * ------------------------------------------------------------------------- */

/** AllocateIbanV3IndividualEntity: V3 IBAN individual registrant. */
export interface AllocateIbanV3Individual extends IndividualNameSeparated {
  /** YYYY-MM-DD. At least 16 years old, not more than 85 years old. */
  birthDate: string;
  birthCountry?: string;
  /** Required if taxCountry is US. */
  taxNumber?: string;
  taxCountry?: string;
  address: AddressEntity;
  document: DocumentEntity;
}

/** Ultimate beneficial owner entry of CorporateEntityExtended. */
export interface AllocateUltimateBeneficialOwner {
  lastName: string;
  firstName: string;
  /** YYYY-MM-DD. At least 16 years old, not more than 85 years old. */
  birthDate: string;
  /** BO ownership in the corporate customer. */
  ownership: number;
  document: DocumentEntity;
  beneficialOwnerPep: boolean;
  beneficialOwnerPepDetails: string;
  usaTaxResidency: boolean;
  giinNumber: string;
}

/** otherDetails block of CorporateEntityExtended. */
export interface AllocateCorporateOtherDetails {
  businessActivity: string;
  relevantInformation?: string;
  negativeInformation?: string;
}

/** fundFlows block of CorporateEntityExtended. */
export interface AllocateCorporateFundFlows {
  plannedIncTransfersQuantity: number;
  plannedIncTransfersEurVolume: number;
  plannedOutTransfersQuantity: number;
  plannedOutTransfersEurVolume: number;
}

/** Business-partner entry of CorporateEntityExtended (all fields optional). */
export interface AllocateCorporateBusinessPartner {
  name?: string;
  incorporationCountryCode?: string;
  plannedTransfersQuantityMonth?: number;
  plannedTransfersEurVolumeMonth?: number;
  additionalInfo?: string;
  basisPartnership?: string;
  website?: string;
}

/** complianceEvaluation block of CorporateEntityExtended. */
export interface AllocateCorporateComplianceEvaluation {
  amlRiskLevel?: 'Low' | 'Medium' | 'High';
  reviewPeriodicity?: string;
  appliedLimits?: string;
  additionalInfo?: string;
}

/**
 * CorporateEntityExtended (aka AllocateIbanCorporateEntity): corporate
 * registrant shared by the V3 IBAN and V4 allocation requests.
 */
export interface AllocateCorporateRegistrant {
  email?: string;
  phone?: string;
  name: string;
  registrationNumber: string;
  incorporationCountry: string;
  address: AddressEntity;
  /** YYYY-MM-DD. */
  incorporationDate: string;
  taxCountry?: string;
  /** Required if taxCountry is US. */
  taxNumber?: string;
  industryType?: string;
  publicallyTraded?: boolean;
  stockSymbol?: string;
  stockExchange?: string;
  ultimateBeneficialOwner: AllocateUltimateBeneficialOwner[];
  tradingWebsite: string;
  expectedTurnover?: number;
  beneficialLegalEntity?: string;
  otherDetails: AllocateCorporateOtherDetails;
  businessPartners?: AllocateCorporateBusinessPartner[];
  fundFlows: AllocateCorporateFundFlows;
  complianceEvaluation?: AllocateCorporateComplianceEvaluation;
  customOptions?: Record<string, unknown>;
}

/** Registrant block of the V3 IBAN allocation request. */
export interface AllocateIbanRegistrant {
  clientCustomerId: string;
  individual?: AllocateIbanV3Individual;
  corporate?: AllocateCorporateRegistrant;
}

/** Registrant block of the V4 allocation requests. */
export interface AllocateV4Registrant {
  clientCustomerId: string;
  individual?: IndividualNameSeparated;
  corporate?: AllocateCorporateRegistrant;
}

/* ---------------------------------------------------------------------------
 * Request inputs. Field names match the wire format exactly as
 * docs/api-reference.md spells them.
 * ------------------------------------------------------------------------- */

/** POST /v7/gate/allocate/v3/create/iban (AllocateIbanV3AsyncRequestEntity). */
export interface AllocateIbanInput {
  clientOrder: string;
  postbackUrl?: string;
  /** Client wallet UUID. */
  walletUuid?: string;
  ibansGroup?: string;
  ibanCountry?: string;
  registrant: AllocateIbanRegistrant;
  customInfo?: CustomInfo;
}

/** Crypto account categories for POST /v7/gate/allocate/v4/create. */
export type CryptoAccountCategory = 'ethereum_erc20' | 'tron_trc20' | 'bsc_bep20';

/** IBAN account categories for POST /v7/gate/allocate/v4/create. */
export type V4IbanAccountCategory = '041307' | '041308' | '042811' | '009971';

/** Shared V4 base (AllocateV4VirtualAccountRequestEntity). */
export interface AllocateV4BaseInput {
  clientOrder: string;
  postbackUrl?: string;
  /** Client wallet UUID. */
  walletUuid?: string;
  registrant: AllocateV4Registrant;
  customInfo?: CustomInfo;
}

/**
 * POST /v7/gate/allocate/v4/create — crypto/stablecoin address allocation
 * (AllocateV4CryptoAddressRequestEntity). Endpoint marked **implementing**.
 */
export interface AllocateCryptoInput extends AllocateV4BaseInput {
  accountType: 'CRYPTO_ADDRESS';
  accountCategory: CryptoAccountCategory;
}

/**
 * POST /v7/gate/allocate/v4/create — IBAN allocation
 * (AllocateV4IbanRequestEntity). Endpoint marked **implementing**.
 */
export interface AllocateV4IbanInput extends AllocateV4BaseInput {
  accountType: 'IBAN';
  accountCategory: V4IbanAccountCategory;
}

/** POST /v7/gate/virtualAccounts/v1/close/iban (VirtualAccountActionByIbanRequest). */
export interface CloseIbanInput {
  iban: string;
  postbackUrl?: string;
}

/** POST /v7/gate/virtualAccounts/v1/status/iban (VirtualAccountActionByIbanRequest). */
export interface IbanStatusInput {
  iban: string;
  postbackUrl?: string;
}

/** Source account block of the link-accounts request. */
export interface LinkAccountsSourceAccount {
  accountType: 'CRYPTO_ADDRESS';
  accountCategory: CryptoAccountCategory;
}

/** Target account block of the link-accounts request. */
export interface LinkAccountsTargetAccount {
  accountType: 'IBAN';
  accountNumber: string;
}

/**
 * POST /v7/gate/linkAccounts (endpoint marked **implementing**).
 * Links a crypto source account to an IBAN target account.
 */
export interface LinkAccountsInput {
  clientOrder: string;
  postbackUrl?: string;
  sourceAccount: LinkAccountsSourceAccount;
  targetAccount: LinkAccountsTargetAccount;
  /** ISO-8601 timestamp of T&C acceptance; expires 7 days after signing. */
  tcTimestamp: string;
  tcAgreed: boolean;
  registrant: {
    individual: {
      taxNumber: string;
      taxCountry: string;
    };
  };
}

/* ---------------------------------------------------------------------------
 * Responses. Transcribed from docs/api-reference.md: AllocateResponseEntity,
 * AllocateIbanAsyncGetStatusEntity, AllocateV4StatusEntity,
 * VirtualAccountActionResponseBase, VirtualAccountStatusEntityBase.
 * ------------------------------------------------------------------------- */

/** AllocateResponseEntity: allocation accepted for processing. */
export interface AllocateResponse {
  requestReference: string;
  clientOrder: string;
  orderReference: string;
  status: 'accepted';
}

/**
 * AllocateIbanAsyncGetStatusEntity. Allocation is async:
 * accepted → pending → allocated | declined. `iban` is empty unless allocated.
 */
export interface AllocateIbanStatusResponse {
  requestReference: string;
  clientOrder: string;
  orderReference: string;
  status: AllocateAsyncStatus;
  messages?: ProcessingMessage[];
  iban?: string;
}

/** virtualAccount block of AllocateV4StatusEntity. */
export interface AllocateV4VirtualAccount {
  accountUuid: string;
  accountCategory: string;
  accountType: string;
  details: {
    accountNumber: string;
    institutionCode?: string;
  };
}

/** AllocateV4StatusEntity + requestReferenceAttr. Endpoint marked **implementing**. */
export interface AllocateV4StatusResponse {
  requestReference: string;
  clientOrder: string;
  orderReference: string;
  status: AllocateAsyncStatus;
  messages?: ProcessingMessage[];
  virtualAccount?: AllocateV4VirtualAccount;
}

/** IBANs listed for a customer. */
export interface ListIbansResponse {
  requestReference: string;
  clientCustomerId: string;
  ibans: string[];
}

/** Deprecated GET IBAN info response. */
export interface IbanInfoResponse {
  requestReference: string;
  walletUuid: string;
  registrant: {
    clientCustomerId: string;
    name: string;
  };
  ibanCreatedAt: string;
}

/** Action message of VirtualAccountActionResponseBase. */
export interface VirtualAccountActionMessage {
  code: string;
  message: string;
  details: string;
}

/** VirtualAccountActionResponseBase. */
export interface VirtualAccountActionResponse {
  requestReference: string;
  actionStatus: 'success' | 'declined';
  virtualAccountStatus: VirtualAccountStatus;
  messages?: VirtualAccountActionMessage[];
}

/** VirtualAccount action values. */
export type VirtualAccountAction = 'allocate' | 'activate' | 'close' | 'disable';

/** VirtualAccountStatusEntityBase: one entry of actual/history. */
export interface VirtualAccountStatusEntry {
  virtualAccountStatus: VirtualAccountStatus;
  action: VirtualAccountAction;
  actionTimestamp: string;
  reason: string;
  reasonCode: string;
}

/** POST /v7/gate/virtualAccounts/v1/status/iban response. */
export interface IbanStatusResponse {
  requestReference: string;
  actual: VirtualAccountStatusEntry;
  history: VirtualAccountStatusEntry[];
  walletUuid: string;
  registrant: {
    clientCustomerId: string;
    name: string;
  };
}

/** POST /v7/gate/linkAccounts response. Endpoint marked **implementing**. */
export interface LinkAccountsResponse {
  requestReference: string;
  clientOrder: string;
  orderReference: string;
  redirectUrl: string;
  status: 'accepted';
}

/** Source account block of the link-accounts status. */
export interface LinkAccountsStatusSourceAccount extends LinkAccountsSourceAccount {
  /** Null while linking is in progress or declined. */
  accountNumber: string;
}

/** Link-accounts status. Endpoint marked **implementing**. */
export interface LinkAccountsStatusResponse {
  requestReference: string;
  clientOrder: string;
  orderReference: string;
  status: string;
  messages?: ProcessingMessage[];
  sourceAccount: LinkAccountsStatusSourceAccount;
  targetAccount: LinkAccountsTargetAccount;
}

/* ---------------------------------------------------------------------------
 * Resource.
 * ------------------------------------------------------------------------- */

export class VirtualAccountsResource {
  constructor(private readonly http: BaseClient) {}

  /** POST /v7/gate/allocate/v3/create/iban — allocate a virtual IBAN. */
  async allocateIban(input: AllocateIbanInput): Promise<AllocateResponse> {
    return this.http.request<AllocateResponse>({
      method: 'POST',
      path: '/v7/gate/allocate/v3/create/iban',
      body: input,
    });
  }

  /**
   * GET /v7/gate/allocate/v2/status/iban/orderReference/{uuid} or
   * GET /v7/gate/allocate/v2/status/iban/clientOrder/{id}.
   */
  async getStatus(
    referenceType: OrderReferenceType,
    reference: string,
  ): Promise<AllocateIbanStatusResponse> {
    return this.http.request<AllocateIbanStatusResponse>({
      method: 'GET',
      path: `/v7/gate/allocate/v2/status/iban/${referenceType}/${encodeURIComponent(reference)}`,
    });
  }

  /** GET /v7/gate/allocate/v2/list/iban/{clientCustomerId} — IBANs of a customer. */
  async listByCustomer(clientCustomerId: string): Promise<ListIbansResponse> {
    return this.http.request<ListIbansResponse>({
      method: 'GET',
      path: `/v7/gate/allocate/v2/list/iban/${encodeURIComponent(clientCustomerId)}`,
    });
  }

  /**
   * GET /v7/gate/allocate/v2/info/iban/{iban}.
   * @deprecated — use {@link VirtualAccountsResource.getIbanStatus}
   * (POST /v7/gate/virtualAccounts/v1/status/iban).
   */
  async getIbanInfo(iban: string): Promise<IbanInfoResponse> {
    return this.http.request<IbanInfoResponse>({
      method: 'GET',
      path: `/v7/gate/allocate/v2/info/iban/${encodeURIComponent(iban)}`,
    });
  }

  /** POST /v7/gate/virtualAccounts/v1/status/iban — IBAN info, status and history. */
  async getIbanStatus(input: IbanStatusInput): Promise<IbanStatusResponse> {
    return this.http.request<IbanStatusResponse>({
      method: 'POST',
      path: '/v7/gate/virtualAccounts/v1/status/iban',
      body: input,
    });
  }

  /** POST /v7/gate/virtualAccounts/v1/close/iban — close a virtual IBAN. */
  async close(input: CloseIbanInput): Promise<VirtualAccountActionResponse> {
    return this.http.request<VirtualAccountActionResponse>({
      method: 'POST',
      path: '/v7/gate/virtualAccounts/v1/close/iban',
      body: input,
    });
  }

  /**
   * POST /v7/gate/allocate/v4/create — allocate a crypto/stablecoin address.
   * Endpoint marked **implementing**; this is the path for crypto addresses.
   */
  async allocateCrypto(input: AllocateCryptoInput): Promise<AllocateResponse> {
    return this.http.request<AllocateResponse>({
      method: 'POST',
      path: '/v7/gate/allocate/v4/create',
      body: input,
    });
  }

  /**
   * POST /v7/gate/allocate/v4/create — allocate a virtual IBAN.
   * Endpoint marked **implementing**; prefer {@link VirtualAccountsResource.allocateIban} (v3).
   */
  async allocateV4Iban(input: AllocateV4IbanInput): Promise<AllocateResponse> {
    return this.http.request<AllocateResponse>({
      method: 'POST',
      path: '/v7/gate/allocate/v4/create',
      body: input,
    });
  }

  /**
   * GET /v7/gate/allocate/v4/status/orderReference/{uuid} or
   * GET /v7/gate/allocate/v4/status/clientOrder/{id}.
   * Endpoint marked **implementing**.
   */
  async getV4Status(
    referenceType: OrderReferenceType,
    reference: string,
  ): Promise<AllocateV4StatusResponse> {
    return this.http.request<AllocateV4StatusResponse>({
      method: 'GET',
      path: `/v7/gate/allocate/v4/status/${referenceType}/${encodeURIComponent(reference)}`,
    });
  }

  /**
   * POST /v7/gate/linkAccounts — link a crypto source account to an IBAN.
   * Endpoint marked **implementing**.
   */
  async linkAccounts(input: LinkAccountsInput): Promise<LinkAccountsResponse> {
    return this.http.request<LinkAccountsResponse>({
      method: 'POST',
      path: '/v7/gate/linkAccounts',
      body: input,
    });
  }

  /**
   * GET /v7/gate/linkAccounts/status/orderReference/{uuid} or
   * GET /v7/gate/linkAccounts/status/clientOrder/{id}.
   * Endpoint marked **implementing**.
   */
  async getLinkAccountsStatus(
    referenceType: OrderReferenceType,
    reference: string,
  ): Promise<LinkAccountsStatusResponse> {
    return this.http.request<LinkAccountsStatusResponse>({
      method: 'GET',
      path: `/v7/gate/linkAccounts/status/${referenceType}/${encodeURIComponent(reference)}`,
    });
  }
}
