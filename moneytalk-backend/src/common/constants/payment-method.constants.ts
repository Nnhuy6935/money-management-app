/** Phương thức mặc định, dùng chung, read-only — fallback khi xoá (N-08). */
export const DEFAULT_PAYMENT_METHOD = {
  code: 'cash',
  name: 'Cash',
  description: 'Physical money and cash spending',
  iconKey: 'cash',
  color: '#55C995',
  sortOrder: 0,
} as const;
