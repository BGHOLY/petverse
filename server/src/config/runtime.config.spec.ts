import { describe, expect, it } from '@jest/globals';

import {
  allowTestUserHeader,
  assertProductionRuntime,
  configuredCorsOrigins,
  shouldSynchronizeDatabase,
} from './runtime.config';

describe('runtime configuration', () => {
  it('keeps local development convenient', () => {
    const env = { NODE_ENV: 'development' };
    expect(shouldSynchronizeDatabase(env)).toBe(true);
    expect(configuredCorsOrigins(env)).toBe(true);
    expect(allowTestUserHeader(env)).toBe(true);
  });

  it('uses safe production defaults', () => {
    const env = { NODE_ENV: 'production' };
    expect(shouldSynchronizeDatabase(env)).toBe(false);
    expect(configuredCorsOrigins(env)).toEqual([]);
    expect(allowTestUserHeader(env)).toBe(false);
  });

  it('accepts an explicit production origin allowlist', () => {
    expect(configuredCorsOrigins({
      NODE_ENV: 'production',
      CORS_ORIGINS: 'https://game.example.com, https://admin.example.com',
    })).toEqual([
      'https://game.example.com',
      'https://admin.example.com',
    ]);
  });

  it('rejects unsafe production secrets and schema sync', () => {
    expect(() => assertProductionRuntime({
      NODE_ENV: 'production',
      JWT_SECRET: 'short',
      DB_SYNCHRONIZE: 'true',
    })).toThrow('Unsafe production configuration');
  });

  it('accepts a safe production configuration', () => {
    expect(() => assertProductionRuntime({
      NODE_ENV: 'production',
      JWT_SECRET: 'a-unique-production-secret-with-32-chars',
      DB_SYNCHRONIZE: 'false',
      ALLOW_TEST_USER_HEADER: 'false',
    })).not.toThrow();
  });
});
