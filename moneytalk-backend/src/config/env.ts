import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from 'dotenv';

/**
 * Nạp biến môi trường theo NODE_ENV (development | production).
 * (`test` được chấp nhận vì Jest tự set NODE_ENV=test — hành xử như development.)
 *
 * Thứ tự ưu tiên (cao → thấp):
 *   1. Biến môi trường thật của process (CI/CD, Docker, hosting…)
 *   2. .env.<NODE_ENV>.local
 *   3. .env.<NODE_ENV>
 *   4. .env  (fallback tương thích setup cũ — production KHÔNG đọc file này
 *      để tránh lỡ dùng DB/secret của dev)
 *
 * File này phải được import TRƯỚC mọi module đọc process.env.
 */
export const APP_ENVS = ['development', 'production', 'test'] as const;
export type AppEnv = (typeof APP_ENVS)[number];

const nodeEnv = (process.env.NODE_ENV ?? 'development') as AppEnv;

if (!APP_ENVS.includes(nodeEnv)) {
  throw new Error(
    `NODE_ENV="${process.env.NODE_ENV}" không hợp lệ. Chỉ chấp nhận: ${APP_ENVS.join(', ')}`,
  );
}

process.env.NODE_ENV = nodeEnv;

const candidates = [`.env.${nodeEnv}.local`, `.env.${nodeEnv}`];
if (nodeEnv !== 'production') candidates.push('.env');

const envFiles = candidates
  .map((file) => resolve(process.cwd(), file))
  .filter((file) => existsSync(file));

if (envFiles.length) {
  // dotenv không override: giá trị đầu tiên được set sẽ thắng
  config({ path: envFiles, quiet: true });
}

export const isProduction = nodeEnv === 'production';
export const loadedEnvFiles = envFiles;

const REQUIRED = ['DATABASE_URL', 'JWT_SECRET'] as const;
const REQUIRED_IN_PRODUCTION = [
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
  'R2_PUBLIC_URL',
] as const;
const PLACEHOLDER_SECRETS = [
  'change-me-to-a-long-random-string',
  'moneytalk-dev-secret',
];

/** Gọi khi bootstrap app — fail fast nếu thiếu cấu hình. */
export function validateEnv(): void {
  const required: readonly string[] = isProduction
    ? [...REQUIRED, ...REQUIRED_IN_PRODUCTION]
    : REQUIRED;
  const errors = required
    .filter((key) => !process.env[key])
    .map((key) => `Thiếu biến ${key}`);

  const jwtSecret = process.env.JWT_SECRET;
  if (isProduction && jwtSecret) {
    if (PLACEHOLDER_SECRETS.includes(jwtSecret) || jwtSecret.length < 32) {
      errors.push(
        'JWT_SECRET production phải là chuỗi ngẫu nhiên >= 32 ký tự (openssl rand -base64 32)',
      );
    }
  }

  if (errors.length) {
    throw new Error(
      `[env:${nodeEnv}] Cấu hình không hợp lệ:\n  - ${errors.join('\n  - ')}`,
    );
  }
}

/** Swagger mặc định bật ở development, tắt ở production (override bằng SWAGGER_ENABLED). */
export function isSwaggerEnabled(): boolean {
  const flag = process.env.SWAGGER_ENABLED;
  if (flag === undefined || flag === '') return !isProduction;
  return flag === 'true';
}
