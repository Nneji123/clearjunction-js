import type { BaseClient } from '../http/base-client.js';
import type { ProcessingMessage } from '../types/entities.js';

/* ---------------------------------------------------------------------------
 * Request inputs. Transcribed from docs/api-reference.md:
 * WalletTransactionReportRequestEntity, WalletReportRequestBaseEntity.
 * ------------------------------------------------------------------------- */

/**
 * POST /v7/gate/reports/transactionReport
 * (WalletTransactionReportRequestEntity). Max report period is 7 days.
 */
export interface TransactionReportInput {
  walletUuid?: string;
  /** Start timestamp of the report period, ISO-8601. */
  timestampFrom: string;
  /** End timestamp of the report period, ISO-8601. */
  timestampTo: string;
}

/**
 * POST /v7/gate/wallets/statement (WalletReportRequestBaseEntity).
 * Dates are "YYYY-MM-DD" formatted.
 */
export interface WalletStatementInput {
  /** Payee client wallet UUID. */
  walletUuid: string;
  /** First day of the report period. */
  dateFrom: string;
  /** Last day of the report period. */
  dateTo: string;
}

/* ---------------------------------------------------------------------------
 * Responses. Transcribed from docs/api-reference.md:
 * WalletTransactionReportResponseEntity, CommonTransactionStatusForReport,
 * WalletStatementResponseEnity, WalletStatementEntity,
 * StatementTransactionEntity.
 * ------------------------------------------------------------------------- */

/** Transaction types reported by the transaction report. */
export type ReportTransactionType =
  | 'Payin'
  | 'PayinReturn'
  | 'Refund'
  | 'Payout'
  | 'PayoutReturn'
  | 'Fee'
  | 'Chargback'
  | 'Representment'
  | 'Transfer'
  | 'TransferWallet'
  | 'RollingReserve';

/** Operation statuses reported by the transaction report. */
export type ReportOperStatus =
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

/** One entry of the transaction report (CommonTransactionStatusForReport). */
export interface TransactionReportEntry {
  clientOrder: string;
  orderReference: string;
  operTimestamp: string;
  messages?: ProcessingMessage[];
  currency: string;
  amount: number;
  operationCurrency: string;
  operationAmount: number;
  walletUuid: string;
  transactionType: ReportTransactionType;
  operStatus?: ReportOperStatus;
}

/** POST /v7/gate/reports/transactionReport response. */
export interface TransactionReportResponse {
  requestReference: string;
  report: TransactionReportEntry[];
}

/** One statement transaction (StatementTransactionEntity). */
export interface StatementTransaction {
  clientOrder: string;
  orderReference: string;
  /** Timestamp the funds became usable / were charged; null if unfinished. */
  valuedAt: string | null;
  amount: number;
  feeAmount: number;
  /** Structure depends on the payment method. */
  paymentDetails: Record<string, unknown>;
}

/** One wallet statement (WalletStatementEntity). */
export interface WalletStatement {
  currency: string;
  balanceIn: number;
  countIn: number;
  turnIn: number;
  countOut: number;
  turnOut: number;
  balanceOut: number;
  /** Absent when the total exceeds 5000 transactions. */
  transactions?: StatementTransaction[];
}

/** POST /v7/gate/wallets/statement response. */
export interface WalletStatementResponse {
  requestReference: string;
  statements?: WalletStatement[];
}

/* ---------------------------------------------------------------------------
 * Resource.
 * ------------------------------------------------------------------------- */

export class ReportsResource {
  constructor(private readonly http: BaseClient) {}

  /** POST /v7/gate/reports/transactionReport — wallet transaction report. */
  async transactions(input: TransactionReportInput): Promise<TransactionReportResponse> {
    return this.http.request<TransactionReportResponse>({
      method: 'POST',
      path: '/v7/gate/reports/transactionReport',
      body: input,
    });
  }

  /** POST /v7/gate/wallets/statement — wallet statement for a date range. */
  async walletStatement(input: WalletStatementInput): Promise<WalletStatementResponse> {
    return this.http.request<WalletStatementResponse>({
      method: 'POST',
      path: '/v7/gate/wallets/statement',
      body: input,
    });
  }
}
