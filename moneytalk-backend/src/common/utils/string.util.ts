/** Trim; chuỗi rỗng → null. Giữ nguyên undefined / null. */
export function trimToNull(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export function trimString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}
