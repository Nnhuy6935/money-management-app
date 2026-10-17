/** Lỗi unique của Postgres (23505), có thể bọc trong DrizzleQueryError.cause. */
export function isUniqueViolation(
  error: unknown,
  constraint?: string,
): boolean {
  const pg = ((error as { cause?: unknown })?.cause ?? error) as {
    code?: string;
    constraint?: string;
  };
  if (pg?.code !== '23505') return false;
  return !constraint || pg.constraint === constraint;
}
