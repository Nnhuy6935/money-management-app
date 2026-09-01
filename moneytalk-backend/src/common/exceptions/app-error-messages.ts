export const AppErrorMessages = {
  transaction: {
    notFound: (id: number) => `Giao dịch #${id} không tồn tại`,
    accessDenied: 'Bạn không có quyền xem giao dịch này',
    dateRangeRequired: 'Cần truyền cả `from` và `to`',
  },
  transactionType: {
    notFound: 'Loại giao dịch không tồn tại',
    flowMismatch: (name: string, typeFlow: string, txFlow: string) =>
      `Loại "${name}" dùng cho ${typeFlow}, không khớp giao dịch ${txFlow}`,
    accessDenied: 'Bạn không có quyền dùng loại giao dịch này',
    duplicate: (code: string, flow: string) =>
      `Loại "${code}" (${flow}) đã tồn tại trong tài khoản của bạn`,
  },
} as const;
