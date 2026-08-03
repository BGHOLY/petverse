import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { afterEach, describe, expect, it, jest } from '@jest/globals';

import {
  isDevelopmentOnlyPath,
  RequestIdentityMiddleware,
} from './request-identity.middleware';

describe('RequestIdentityMiddleware', () => {
  const originalEnvironment = process.env.NODE_ENV;
  const originalSecret = process.env.JWT_SECRET;

  afterEach(() => {
    process.env.NODE_ENV = originalEnvironment;
    process.env.JWT_SECRET = originalSecret;
    delete process.env.ALLOW_TEST_USER_HEADER;
  });

  it('classifies development-only routes', () => {
    expect(isDevelopmentOnlyPath('/api/dev/seed-all')).toBe(true);
    expect(isDevelopmentOnlyPath('/api/pet/level-up')).toBe(true);
    expect(isDevelopmentOnlyPath('/api/backend/status')).toBe(true);
    expect(isDevelopmentOnlyPath('/api/maintenance/run')).toBe(true);
    expect(isDevelopmentOnlyPath('/api/mail/admin/send')).toBe(true);
    expect(isDevelopmentOnlyPath('/api/season/settle')).toBe(true);
    expect(isDevelopmentOnlyPath('/api/trade/expire')).toBe(true);
    expect(isDevelopmentOnlyPath('/api/pet/my')).toBe(false);
    expect(isDevelopmentOnlyPath('/api/season/me')).toBe(false);
    expect(isDevelopmentOnlyPath('/api/trade/listings')).toBe(false);
  });

  it('uses the verified token identity instead of a spoofed header', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'a-unique-production-secret-with-32-chars';
    const jwtService = {
      verify: jest.fn(() => ({ sub: 42 })),
    } as any;
    const middleware = new RequestIdentityMiddleware(jwtService);
    const request = {
      originalUrl: '/api/pet/my',
      url: '/api/pet/my',
      headers: {
        authorization: 'Bearer good-token',
        'x-user-id': '999',
      },
    } as any;
    const next = jest.fn();

    middleware.use(request, {} as any, next);

    expect(request.headers['x-user-id']).toBe('42');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('blocks private routes without a token in production', () => {
    process.env.NODE_ENV = 'production';
    const middleware = new RequestIdentityMiddleware({ verify: jest.fn() } as any);
    expect(() => middleware.use({
      originalUrl: '/api/pet/my',
      headers: {},
    } as any, {} as any, jest.fn())).toThrow(UnauthorizedException);
  });

  it('keeps login public in production', () => {
    process.env.NODE_ENV = 'production';
    const middleware = new RequestIdentityMiddleware({ verify: jest.fn() } as any);
    const next = jest.fn();
    middleware.use({
      originalUrl: '/api/auth/login',
      headers: {},
    } as any, {} as any, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('hides development routes in production', () => {
    process.env.NODE_ENV = 'production';
    const middleware = new RequestIdentityMiddleware({ verify: jest.fn() } as any);
    expect(() => middleware.use({
      originalUrl: '/api/dev/seed-all',
      headers: {},
    } as any, {} as any, jest.fn())).toThrow(NotFoundException);
  });
});
