import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';

import { resolveLoginIdentity } from './wechat-login';

describe('resolveLoginIdentity', () => {
  it('keeps explicit test accounts available in development', async () => {
    await expect(resolveLoginIdentity(
      { openid: 'wx_test_004' },
      { NODE_ENV: 'development' },
    )).resolves.toEqual({ openid: 'wx_test_004', unionid: '' });
  });

  it('rejects direct openid impersonation in production', async () => {
    await expect(resolveLoginIdentity(
      { openid: 'victim-openid' },
      {
        NODE_ENV: 'production',
        WX_APPID: 'app-id',
        WX_SECRET: 'app-secret',
      },
    )).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('exchanges a WeChat code without exposing the secret to the client', async () => {
    const fetcher = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ openid: 'openid-42', unionid: 'union-42' }),
    }));
    const identity = await resolveLoginIdentity(
      { code: 'temporary-code' },
      {
        NODE_ENV: 'production',
        WX_APPID: 'app-id',
        WX_SECRET: 'app-secret',
      },
      fetcher as any,
    );

    expect(identity).toEqual({ openid: 'openid-42', unionid: 'union-42' });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
