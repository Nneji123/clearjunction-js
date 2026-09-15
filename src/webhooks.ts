import { timingSafeEqual } from 'node:crypto';
import { buildSignature } from './signature.js';
import type {
  AllocateAsyncStatus,
  ComplianceStatus,
  FxTransferStatus,
  OperStatus,
  PayinOperStatus,
  PayinOrderStatus,
  PayoutOperStatus,
  PayoutOrderStatus,
  PayoutReturnOperStatus,
  PayoutReturnOrderStatus,
  RefundOperStatus,
  RefundStatus,
  VirtualAccountStatus,
  WalletAsyncReservationStatus,
} from './types/common.js';
import type { ProcessingMessage } from './types/entities.js';

/* ---------------------------------------------------------------------------
 * Signature verification. Inbound notifications carry the same Authorization
 * scheme as requests, computed over the RAW body bytes. Verify every time;
 * never fail open when unconfigured. CJ's terms put the financial loss for an
 * unverified (or duplicate-as-unique) notification on the client.
 * ------------------------------------------------------------------------- */

/** Credentials needed to verify one inbound notification. */
export interface WebhookCredentials {
  /** X-API-KEY account UUID. */
  apiKey: string;
  /** Plaintext password; hashed client-side, never transmitted. */
  apiPassword: string;
  /** The inbound `Date` header value, verbatim. */
  date: string;
}

/**
 * Verify an inbound notification's `Authorization` header against the raw body.
 * Returns true only on an exact signature match; false otherwise (including
 * missing/empty inputs). Compare over the raw bytes as received — do not
 * re-serialise a parsed object.
 */
export function verifyWebhookSignature(
  rawBody: string,
  authHeader: string,
  creds: WebhookCredentials,
): boolean {
  if (!rawBody || !authHeader || !creds.apiKey || !creds.apiPassword || !creds.date) {
    return false;
  }
  const expected = buildSignature({
    apiKey: creds.apiKey,
    date: creds.date,
    apiPassword: creds.apiPassword,
    body: rawBody,
  });
  if (expected.length !== authHeader.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(authHeader, 'utf8'));
  } catch {
    return false;
  }
}

/* ---------------------------------------------------------------------------
 * Handler contract helpers. Every notification group shares the same rules:
 * reply HTTP 200, Content-Type text/plain, body = the bare orderReference,
 * within 10 seconds. A miss means 30 minutes of silence, then retries with
 * backoff for 7 days / 50 attempts.
 * ------------------------------------------------------------------------- */

/** HTTP acknowledgement for a received notification. */
export interface WebhookAcknowledgement {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

/**
 * Build the acknowledgement response for a notification: HTTP 200,
 * `Content-Type: text/plain`, body = the bare `orderReference`.
 */
export function acknowledgeNotification(orderReference: string): WebhookAcknowledgement {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/plain' },
    body: orderReference,
  };
}

/**
 * Dedupe key for a notification: orderReference + status (+ operTimestamp for
 * refunds). Never process a duplicate as unique.
 */
export function notificationDedupeKey(input: {
  orderReference: string;
  status: string;
  operTimestamp?: string;
}): string {
  return [input.orderReference, input.status, input.operTimestamp ?? ''].join('|');
}

/* ---------------------------------------------------------------------------
 * Notification payload types. Field names match the wire format exactly as
 * docs/api-reference.md spells them.
 * ------------------------------------------------------------------------- */

/** Common sub-status block carried by transaction notifications. */
export interface NotificationSubStatuses {
  operStatus: OperStatus;
  complianceStatus: ComplianceStatus;
}

/** Payout notification (type payoutNotification). */
export interface PayoutNotification {
  messageUuid: string;
  type: 'payoutNotification';
  clientOrder: string;
  orderReference: string;
  operTimestamp: string;
  status: PayoutOrderStatus;
  transactionType: 'Payout';
  subStatuses: { operStatus: PayoutOperStatus; complianceStatus: ComplianceStatus };
  messages?: ProcessingMessage[];
  paymentDetails?: Record<string, unknown>;
}

/** Payout-return notification (type payoutReturnNotification). */
export interface PayoutReturnNotification {
  messageUuid: string;
  type: 'payoutReturnNotification';
  clientOrder: string;
  orderReference: string;
  relatedOrderReference: string;
  operTimestamp: string;
  status: PayoutReturnOrderStatus;
  transactionType: 'PayoutReturn';
  subStatuses: { operStatus: PayoutReturnOperStatus; complianceStatus: ComplianceStatus };
  messages?: ProcessingMessage[];
}

/** Payin notification (type payinNotification). */
export interface PayinNotification {
  messageUuid: string;
  type: 'payinNotification';
  clientOrder: string;
  orderReference: string;
  operTimestamp: string;
  status: PayinOrderStatus;
  transactionType: 'Payin';
  subStatuses: { operStatus: PayinOperStatus; complianceStatus: ComplianceStatus };
  messages?: ProcessingMessage[];
  paymentDetails?: Record<string, unknown>;
}

/** Refund notification (type refundNotification). Dedupe includes operTimestamp. */
export interface RefundNotification {
  messageUuid: string;
  type: 'refundNotification';
  clientOrder: string;
  orderReference: string;
  relatedOrderReference: string;
  operTimestamp: string;
  status: RefundStatus;
  transactionType: 'Refund';
  subStatuses: { operStatus: RefundOperStatus; complianceStatus: ComplianceStatus };
  messages?: ProcessingMessage[];
}

/** Instant-FX transfer notification (type fxNotification). */
export interface FxNotification {
  messageUuid: string;
  type: 'fxNotification';
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

/** IBAN allocation notification (type ibanAllocationNotification). */
export interface IbanAllocationNotification {
  messageUuid: string;
  type: 'ibanAllocationNotification';
  clientOrder: string;
  orderReference: string;
  status: AllocateAsyncStatus;
  messages?: ProcessingMessage[];
  /** Empty unless allocated. */
  iban?: string;
}

/** V4 allocation notification (type virtualAccountAllocationNotification). */
export interface VirtualAccountAllocationNotification {
  messageUuid: string;
  type: 'virtualAccountAllocationNotification';
  clientOrder: string;
  orderReference: string;
  status: AllocateAsyncStatus;
  messages?: ProcessingMessage[];
  virtualAccount?: {
    accountUuid: string;
    accountCategory: string;
    accountType: string;
    details: { accountNumber: string; institutionCode?: string };
  };
}

/** Virtual-account action notification (type virtualAccountActionNotification). */
export interface VirtualAccountActionNotification {
  messageUuid: string;
  type: 'virtualAccountActionNotification';
  walletUuid: string;
  orderReference: string;
  virtualAccount: {
    virtualAccountStatus: VirtualAccountStatus;
    type: 'iban';
    bankCode: string;
    bankAccountNumber: string;
    registrant: { clientCustomerId: string; name: string };
  };
  action: 'activate' | 'close' | 'disable';
  actionTimestamp: string;
  reasonCode: string;
}

/** Wallet reservation notification (type walletReservationNotification). */
export interface WalletReservationNotification {
  messageUuid: string;
  type: 'walletReservationNotification';
  clientOrder: string;
  orderReference: string;
  walletUuid: string;
  /** Empty unless reserved. */
  iban?: string;
  status: WalletAsyncReservationStatus;
  messages?: ProcessingMessage[];
}

/**
 * Wallet fund-transfer notification. Note: the spec spells the fixed value
 * `walletTransferNoification` (typo) in one place; accept both spellings.
 */
export interface WalletFundTransferNotification {
  messageUuid: string;
  type: 'walletFundTransferNotification' | 'walletTransferNoification';
  clientOrder: string;
  orderReference: string;
  operTimestamp: string;
  status: string;
  subStatuses?: NotificationSubStatuses;
}

/** Link-accounts notification (type linkAccountsNotification). */
export interface LinkAccountsNotification {
  messageUuid: string;
  type: 'linkAccountsNotification';
  clientOrder: string;
  orderReference: string;
  status: string;
  messages?: ProcessingMessage[];
}

/** Union of every notification payload. */
export type ClearJunctionNotification =
  | PayoutNotification
  | PayoutReturnNotification
  | PayinNotification
  | RefundNotification
  | FxNotification
  | IbanAllocationNotification
  | VirtualAccountAllocationNotification
  | VirtualAccountActionNotification
  | WalletReservationNotification
  | WalletFundTransferNotification
  | LinkAccountsNotification;
