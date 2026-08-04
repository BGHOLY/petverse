import { UnauthorizedException } from '@nestjs/common';

import { isProductionRuntime } from '../../config/runtime.config';
import type { LoginDto } from './dto/login.dto';

type RuntimeEnvironment = Record<string, string | undefined>;
type FetchResponse = {
  ok: boolean;
  status: number;
  json(): Promise<any>;
};
type FetchLike = (url: string) => Promise<FetchResponse>;

export type LoginIdentity = {
  openid: string;
  unionid: string;
};

export async function resolveLoginIdentity(
  loginDto: LoginDto,
  env: RuntimeEnvironment = process.env,
  fetcher: FetchLike = globalThis.fetch as any,
): Promise<LoginIdentity> {
  const code = String(loginDto?.code || '').trim();
  const directOpenId = String(loginDto?.openid || '').trim();
  const appId = String(env.WX_APPID || '').trim();
  const appSecret = String(env.WX_SECRET || '').trim();

  if (code && appId && appSecret) {
    return exchangeWeChatCode(code, appId, appSecret, fetcher);
  }

  if (isProductionRuntime(env)) {
    throw new UnauthorizedException('WeChat login code is required');
  }

  if (!directOpenId) {
    throw new UnauthorizedException('Development openid is required');
  }

  return { openid: directOpenId, unionid: '' };
}

export async function exchangeWeChatCode(
  code: string,
  appId: string,
  appSecret: string,
  fetcher: FetchLike = globalThis.fetch as any,
): Promise<LoginIdentity> {
  if (typeof fetcher !== 'function') {
    throw new UnauthorizedException('WeChat login service is unavailable');
  }

  const query = new URLSearchParams({
    appid: appId,
    secret: appSecret,
    js_code: code,
    grant_type: 'authorization_code',
  });
  let response: FetchResponse;
  try {
    response = await fetcher(
      `https://api.weixin.qq.com/sns/jscode2session?${query.toString()}`,
    );
  } catch {
    throw new UnauthorizedException('Unable to reach WeChat login service');
  }

  if (!response?.ok) {
    throw new UnauthorizedException(
      `WeChat login service returned HTTP ${response?.status || 0}`,
    );
  }

  const payload = await response.json();
  const openid = String(payload?.openid || '').trim();
  if (!openid || Number(payload?.errcode || 0) !== 0) {
    throw new UnauthorizedException(
      String(payload?.errmsg || 'WeChat login code is invalid or expired'),
    );
  }

  return {
    openid,
    unionid: String(payload?.unionid || '').trim(),
  };
}
