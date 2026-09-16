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
  /** The serialised request string as sent; '' for GET/DELETE. */
  body: string;
}

/**
 * Clear Junction request signature.
 *
 * sha512Hex(apiKey.toUpperCase() + date + sha512Hex(apiPassword).toUpperCase() + body.toUpperCase())
 *
 * `date` is passed through as given; every other component is uppercased.
 * `body` is the serialised request string, uppercased as a string.
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
 * Format a Date as 'YYYY-MM-DDThh:mm:ss+00:00' in UTC, the format Clear
 * Junction's ISO-8601 timestamps use: literal `+00:00`, second precision.
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
