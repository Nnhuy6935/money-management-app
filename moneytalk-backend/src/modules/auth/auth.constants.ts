/** Hạn access token (định dạng của jsonwebtoken: 15m, 1h, 7d…). */
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

/** Hạn refresh token / session, tính bằng ngày. */
export const REFRESH_TOKEN_TTL_DAYS = Number(
  process.env.JWT_REFRESH_EXPIRES_IN_DAYS || 30,
);
