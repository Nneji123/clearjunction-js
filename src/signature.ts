import { createHash } from 'node:crypto';

/**
 * SHA-512 hex digest of a UTF-8 string. Lowercase hex out.
 */
export function sha512Hex(input: string): string {
  return createHash('sha512').update(input, 'utf8').digest('hex');
}

export interface BuildSignatureParams {
  apiKey: string;
  date: string;
  apiPassword: string;
  /** Exact serialised bytes being sent; '' for GET/DELETE. */
  body: string;
}

/**
 * Clear Junction request signature (verified against docs/signature-formula.png).
 *
 * sha512Hex(apiKey.toUpperCase() + date + sha512Hex(apiPassword).toUpperCase() + body.toUpperCase())
 *
 * `date` is the ONLY component not uppercased. `body` must be the exact string
 * being sent over the wire (uppercased as a string, after serialisation).
 */
export function buildSignature(params: BuildSignatureParams): string {
  const { apiKey, date, apiPassword, body } = params;
  return sha512Hex(
    apiKey.toUpperCase() +
      date +
      sha512Hex(apiPassword).toUpperCase() +
      body.toUpperCase(),
  );
}

/**
 * Format a Date as 'YYYY-MM-DDThh:mm:ss+00:00' in UTC.
 * Literal `+00:00`, never `Z`, never milliseconds.
 */
export function formatCjDate(d: Date = new Date()): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  const year = d.getUTCFullYear();
  const month = pad(d.getUTCMonth() + 1);
  const day = pad(d.getUTCDate());
  const hours = pad(d.getUTCHours());
  const minutes = pad(d.getUTCMinutes());
  const seconds = pad(d.getUTCSeconds());
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+00:00`;
}
