export const AppErrorMessages = {
  transaction: {
    notFound: (id: string) => `Giao dịch #${id} không tồn tại`,
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
  friend: {
    cannotAddSelf: 'Không thể gửi lời mời kết bạn cho chính mình',
    userNotFound: (id: string) => `User #${id} không tồn tại`,
    requestNotFound: (id: string) => `Lời mời kết bạn #${id} không tồn tại`,
    alreadyFriends: 'Hai người đã là bạn bè',
    requestAlreadySent: 'Lời mời kết bạn đã được gửi',
    requestAlreadyPending: 'Đã có lời mời kết bạn đang chờ giữa hai người',
    notFriends: 'Hai người chưa là bạn bè',
    requestAccessDenied: 'Bạn không có quyền xử lý lời mời này',
  },
} as const;
