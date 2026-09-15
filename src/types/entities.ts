/**
 * Shared entity types transcribed from docs/api-reference.md.
 *
 * Only genuinely cross-resource shapes live here. Each resource file declares
 * its own request/response interfaces inline. Field names match the wire
 * format exactly as the spec spells them.
 */

/** api-reference.md `AddressEntity` */
export interface AddressEntity {
  /** ISO 3166-1 alpha-2 country code. */
  country: string;
  state?: string;
  zip: string;
  city: string;
  street: string;
}

export type DocumentType = 'passport' | 'driverLicense' | 'idCard' | 'other';

/** api-reference.md `DocumentEntity` */
export interface DocumentEntity {
  type: DocumentType;
  number: string;
  issuedCountryCode: string;
  issuedBy?: string;
  issuedDate?: string;
  expirationDate?: string;
}

/** api-reference.md `CorporateDocumentEntity` */
export interface CorporateDocumentEntity {
  registrationNumber: string;
  registrationCountryCode: string;
  registrationDate: string;
}

/** Base individual fields shared by all Individual*Entity variants. */
export interface IndividualBase {
  phone?: string;
  email?: string;
  birthDate?: string;
  birthPlace?: string;
  address?: AddressEntity;
  document?: DocumentEntity;
}

export interface IndividualNameSeparated extends IndividualBase {
  lastName: string;
  firstName: string;
  middleName?: string;
}

export interface UltimateIndividual extends IndividualBase {
  lastName?: string;
  firstName?: string;
  middleName?: string;
}

/** api-reference.md `CorporateEntity` */
export interface CorporateEntity {
  email?: string;
  name: string;
  registrationNumber?: string;
  incorporationCountry?: string;
  address?: AddressEntity;
  incorporationDate?: string;
}

export interface CorporateGb extends CorporateEntity {
  legalEntityIdentifier?: string;
}

/** A party to a transfer: strictly one of individual / corporate. */
export interface PartnerParty<Individual = IndividualNameSeparated, Corporate = CorporateEntity> {
  clientCustomerId?: string;
  walletUuid?: string;
  individual?: Individual;
  corporate?: Corporate;
}

/** api-reference.md `paymentPurposeCodesEntity` */
export interface PaymentPurposeCodes {
  code: string;
  category: string;
}

/** Free-form additional values echoed back in notifications. */
export type CustomInfo = Record<string, unknown>;

/** api-reference.md `errorMessageEntity` and allocation/reservation variants. */
export interface ProcessingMessage {
  code: string;
  message: string;
  details: string;
}

/** Common base for create-order responses. */
export interface CreateOrderResponseBase {
  requestReference: string;
  clientOrder: string;
  orderReference: string;
  createdAt: string;
  messages?: ProcessingMessage[];
}

/** Payer/payee bank details common fields. */
export interface RequisiteIban {
  iban: string;
  bankSwiftCode?: string;
}

export interface RequisiteGbp {
  sortCode: string;
  accountNumber: string;
  iban?: string;
  bankSwiftCode?: string;
}

export interface BankInstitution {
  bankSwiftCode?: string;
  clearingSystemIdCode?: 'ABA' | 'CACPA';
  memberId?: string;
  name: string;
  address: AddressEntity;
}
