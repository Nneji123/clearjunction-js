import { describe, expect, it, vi } from 'vitest';
import type { BaseClient, RequestOptions } from '../src/http/base-client.js';
import { TokenizeResource } from '../src/resources/tokenize.js';
import type {
  CreateTokenInput,
  CreateTokenResponse,
} from '../src/resources/tokenize.js';

function mockClient() {
  const requestSpy = vi.fn(async <T>(_opts: RequestOptions): Promise<T> => {
    return {
      stored_data: {
        pan: '411111**[masked card number]**1165',
        card_expiration_date: '02/18',
        card_holder_name: 'Lastname Firstname',
        token_expiration_period_month: 24,
      },
      requestReference: '12d603fa-4d0b-4fec-a9b0-cc3114da134e',
      token: '8ef31731-cf17-45cd-83ae-6716a1c8026c',
      expire_term: 24,
      created_at: '2019-10-22T12:26:13+00:00',
      expired_at: '2021-10-22T12:27:50+00:00',
      used_at: '2019-10-22T12:27:50+00:00',
    } as unknown as T;
  });
  const client = {
    request: requestSpy,
  } as unknown as BaseClient;
  return { client, requestSpy };
}

describe('TokenizeResource', () => {
  it('posts createToken to POST /v7/pci/createToken with the input forwarded unchanged', async () => {
    const { client, requestSpy } = mockClient();
    const tokenize = new TokenizeResource(client);

    const input: CreateTokenInput = {
      storeType: 'pan',
      data: {
        pan: '4111111111111165',
      },
    };

    const response = await tokenize.createToken(input);

    expect(requestSpy).toHaveBeenCalledTimes(1);
    const call = requestSpy.mock.calls[0][0];
    expect(call.method).toBe('POST');
    expect(call.path).toBe('/v7/pci/createToken');
    expect(call.body).toEqual(input);
    expect(response.token).toBe('8ef31731-cf17-45cd-83ae-6716a1c8026c');
  });

  it('preserves snake_case field names in the request body', async () => {
    const { client, requestSpy } = mockClient();
    const tokenize = new TokenizeResource(client);

    const input: CreateTokenInput = {
      storeType: 'pan',
      data: {
        pan: '4111111111111165',
        card_expiration_date: '02/18',
        card_holder_name: 'Lastname Firstname',
        token_expiration_period_month: 24,
      },
    };

    await tokenize.createToken(input);

    expect(requestSpy).toHaveBeenCalledTimes(1);
    const recordedBody = requestSpy.mock.calls[0][0].body as CreateTokenInput;
    expect(recordedBody).toEqual(input);
    expect(recordedBody.data.card_expiration_date).toBe('02/18');
    expect(recordedBody.data.card_holder_name).toBe('Lastname Firstname');
    expect(recordedBody.data.token_expiration_period_month).toBe(24);
    expect(recordedBody.data).toHaveProperty('card_expiration_date');
    expect(recordedBody.data).toHaveProperty('card_holder_name');
    expect(recordedBody.data).toHaveProperty('token_expiration_period_month');
    expect(Object.keys(recordedBody.data)).toEqual([
      'pan',
      'card_expiration_date',
      'card_holder_name',
      'token_expiration_period_month',
    ]);
  });
});
