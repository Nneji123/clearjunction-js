import { describe, expect, it } from 'vitest';
import { buildSignature, formatCjDate, sha512Hex } from '../src/signature.js';

const API_KEY = '730ee406-817e-11e7-bb31-be2e44b06b34';
const API_PASSWORD = 's3cr3t';
const DATE = '2017-08-18T07:34:47+00:00';

describe('sha512Hex', () => {
  it('hashes utf8 to lowercase hex', () => {
    // echo -n 's3cr3t' | sha512sum
    expect(sha512Hex('s3cr3t')).toBe(
      '482551228411e98ad8cb1f8b0a1443c9ffbafc10b630c7646c518ab19331ea7e2cf24ad383527da1071e2177af7e41b9e751c9c4fb2499aa22f69824f9657339',
    );
  });
});

describe('buildSignature', () => {
  it('1. GET-style call with empty-string body', () => {
    expect(
      buildSignature({ apiKey: API_KEY, date: DATE, apiPassword: API_PASSWORD, body: '' }),
    ).toBe(
      'ea54b6d0b4b4fa0de7d6d42b3b62a9e1118904541a184d550a95145bc31c632e9a25e2e02cd4d07e9a393493bd11adbcd9f93088443e53637a7577241c516bd8',
    );
  });

  it('2. POST with a JSON body containing mixed-case values', () => {
    const body =
      '{"clientOrder":"999899-0005","amount":210.55,"currency":"Eur","description":"Birthday Present"}';
    expect(buildSignature({ apiKey: API_KEY, date: DATE, apiPassword: API_PASSWORD, body })).toBe(
      'ce28d089d6d5fd2b2cf7d31a46dd595155101b56c5877dc1ef52912064deed151eb70aff6b5b7bc147dac342382e6628c3176734a89a04291ad2134149aebf42',
    );
  });

  it('3. date is not uppercased: case change in date changes the digest', () => {
    const lower = buildSignature({
      apiKey: API_KEY,
      date: '2017-08-18t07:34:47+00:00',
      apiPassword: API_PASSWORD,
      body: '',
    });
    const upper = buildSignature({
      apiKey: API_KEY,
      date: DATE,
      apiPassword: API_PASSWORD,
      body: '',
    });
    expect(lower).toBe(
      '7fea40a8e7385fd93e8d6fd1b640104f90665a834bbbf63abfa8201bf0b9bd9e0af967c969cd9f5b0be28bf345e589664929f4b87bf25b660015a7a0b95fab8c',
    );
    expect(upper).toBe(
      'ea54b6d0b4b4fa0de7d6d42b3b62a9e1118904541a184d550a95145bc31c632e9a25e2e02cd4d07e9a393493bd11adbcd9f93088443e53637a7577241c516bd8',
    );
    expect(lower).not.toBe(upper);
  });

  it('4. body is uppercased: bodies differing only in case produce the same digest', () => {
    const expected =
      '58d1f89315bd0b3ea90635eaea48eefb5807d03b08394f5f0bc6c380e2cbbc3538aeb87ec93b02b24ef87bb5ecbc9ef899cd66082c91a4254bd66b544cd1a74b';
    for (const body of [
      '{"a":"Hello World"}',
      '{"a":"hello world"}',
      '{"a":"HELLO WORLD"}',
    ]) {
      expect(
        buildSignature({ apiKey: API_KEY, date: DATE, apiPassword: API_PASSWORD, body }),
      ).toBe(expected);
    }
  });

  it('uppercases apiKey before signing', () => {
    const lower = buildSignature({
      apiKey: API_KEY.toLowerCase(),
      date: DATE,
      apiPassword: API_PASSWORD,
      body: '',
    });
    const upper = buildSignature({
      apiKey: API_KEY.toUpperCase(),
      date: DATE,
      apiPassword: API_PASSWORD,
      body: '',
    });
    expect(lower).toBe(upper);
  });
});

describe('formatCjDate', () => {
  it("5. emits exactly 'YYYY-MM-DDThh:mm:ss+00:00' in UTC", () => {
    expect(formatCjDate(new Date(Date.UTC(2017, 7, 18, 7, 34, 47)))).toBe(
      '2017-08-18T07:34:47+00:00',
    );
  });

  it('never emits Z or milliseconds', () => {
    const out = formatCjDate(new Date(Date.UTC(2024, 0, 2, 3, 4, 5, 678)));
    expect(out).toBe('2024-01-02T03:04:05+00:00');
    expect(out).not.toContain('Z');
    expect(out).not.toContain('.');
  });
});
