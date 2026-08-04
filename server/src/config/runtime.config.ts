type RuntimeEnvironment = Record<string, string | undefined>;

export function isProductionRuntime(env: RuntimeEnvironment = process.env) {
  return String(env.NODE_ENV || '').toLowerCase() === 'production';
}

export function envFlag(value: string | undefined, fallback = false) {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

export function shouldSynchronizeDatabase(
  env: RuntimeEnvironment = process.env,
) {
  if (env.DB_SYNCHRONIZE !== undefined) {
    return envFlag(env.DB_SYNCHRONIZE);
  }
  return !isProductionRuntime(env);
}

export function configuredCorsOrigins(
  env: RuntimeEnvironment = process.env,
): true | string[] {
  const origins = String(env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (origins.length > 0) return origins;
  return isProductionRuntime(env) ? [] : true;
}

export function allowTestUserHeader(
  env: RuntimeEnvironment = process.env,
) {
  if (!isProductionRuntime(env)) return true;
  return envFlag(env.ALLOW_TEST_USER_HEADER, false);
}

export function assertProductionRuntime(
  env: RuntimeEnvironment = process.env,
) {
  if (!isProductionRuntime(env)) return;

  const errors: string[] = [];
  const jwtSecret = String(env.JWT_SECRET || '');
  if (jwtSecret.length < 32 || jwtSecret === 'petverse_dev_secret') {
    errors.push('JWT_SECRET must be a unique secret of at least 32 characters');
  }
  if (shouldSynchronizeDatabase(env)) {
    errors.push('DB_SYNCHRONIZE must be false in production');
  }
  if (envFlag(env.ALLOW_TEST_USER_HEADER, false)) {
    errors.push('ALLOW_TEST_USER_HEADER must remain false in production');
  }
  if (!String(env.WX_APPID || '').trim()) {
    errors.push('WX_APPID is required in production');
  }
  if (!String(env.WX_SECRET || '').trim()) {
    errors.push('WX_SECRET is required in production');
  }

  if (errors.length > 0) {
    throw new Error(`Unsafe production configuration: ${errors.join('; ')}`);
  }
}
