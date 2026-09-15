export type Environment = 'sandbox' | 'production';

export interface Logger {
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

export interface ClearJunctionConfig {
  /** X-API-KEY account UUID. */
  apiKey: string;
  /** Plaintext password; the SDK hashes it into the signature. Never a pre-hashed value. */
  apiPassword: string;
  /** Default wallet for calls that take one. */
  walletUuid?: string;
  /** Default 'sandbox'. */
  environment?: Environment;
  /** Overrides the environment host. Required when environment === 'production'. */
  baseUrl?: string;
  /** Per-attempt timeout in ms, default 30_000. */
  timeout?: number;
  /** Max retry attempts, default 3. */
  maxRetries?: number;
  logger?: Logger;
  /** Injectable fetch — callers proxy sandbox traffic through it. */
  fetch?: typeof globalThis.fetch;
}

export const SANDBOX_BASE_URL = 'https://sandbox.clearjunction.com';

/** api-reference.md `PayoutCreateOrderStatusAttr` (~line 1920): created | pending | declined | settled */
export type PayoutCreateOrderStatus = 'created' | 'pending' | 'declined' | 'settled';

/** api-reference.md `PayoutOrderStatusAttr` (~line 1928) */
export type PayoutOrderStatus = 'created' | 'canceled' | 'pending' | 'settled' | 'declined';

/** api-reference.md `PayoutOperStatusAttr` (~line 1937) */
export type PayoutOperStatus = 'created' | 'canceled' | 'pending' | 'settled' | 'declined';

/** api-reference.md `PayoutReturnOrderStatusAttr` (~line 1946) */
export type PayoutReturnOrderStatus = 'captured' | 'settled';

/** api-reference.md `PayoutReturnOperStatusAttr` (~line 1952) */
export type PayoutReturnOperStatus = 'captured' | 'settled';

/** api-reference.md `PayinCreateOrderStatusAttr` (~line 1958) */
export type PayinCreateOrderStatus = 'created' | 'declined';

/** api-reference.md `PayinOrderStatusAttr` (~line 1964) */
export type PayinOrderStatus =
  | 'created'
  | 'expired'
  | 'canceled'
  | 'rejected'
  | 'returned'
  | 'pending'
  | 'authorized'
  | 'captured'
  | 'settled'
  | 'declined';

/** api-reference.md `PayinOperStatusAttr` (~line 1978) */
export type PayinOperStatus =
  | 'created'
  | 'expired'
  | 'canceled'
  | 'rejected'
  | 'returned'
  | 'pending'
  | 'authorized'
  | 'captured'
  | 'settled'
  | 'declined';

/** api-reference.md `complianceStatusAttr` (~line 1992) */
export type ComplianceStatus = 'created' | 'clean' | 'pending' | 'approved' | 'blocked';

/** api-reference.md `allocateAsyncStatusAttr` (~line 2001): accepted → pending → allocated | declined */
export type AllocateAsyncStatus = 'accepted' | 'pending' | 'allocated' | 'declined';

/** api-reference.md `walletAsyncReservationStatusAttr` (~line 2009) */
export type WalletAsyncReservationStatus = 'accepted' | 'pending' | 'reserved' | 'declined';

/** api-reference.md `VirtualAccountStatusAttr` (~line 3421) */
export type VirtualAccountStatus = 'pending' | 'active' | 'disabled' | 'closed';

/** api-reference.md `RefundStatusAttr` (~line 3616) */
export type RefundStatus = 'created' | 'pending' | 'declined' | 'captured';

/** api-reference.md `RefundOperStatusAttr` (~line 3625) */
export type RefundOperStatus = 'created' | 'pending' | 'declined' | 'captured';

/** FX instant transfer status (~line 3693) */
export type FxTransferStatus = 'created' | 'pending' | 'captured' | 'declined';

/**
 * Every transaction status response carries three status fields: a top-level
 * `status` plus `subStatuses.operStatus` / `subStatuses.complianceStatus`.
 * A payout can be settled while compliance is blocked.
 */
export type OperStatus =
  | PayoutOperStatus
  | PayoutReturnOperStatus
  | PayinOperStatus
  | RefundOperStatus
  | FxTransferStatus;

export interface SubStatuses {
  operStatus?: OperStatus;
  complianceStatus?: ComplianceStatus;
}

/** Discriminated lookup used by every status-by-reference endpoint. */
export type OrderReferenceType = 'orderReference' | 'clientOrder';
