export const AppErrorMessages = {
  auth: {
    invalidCredentials: 'Email hoặc mật khẩu không đúng',
    invalidRefreshToken: 'Refresh token không hợp lệ hoặc đã bị thu hồi',
    emailInUse: 'Email đã được sử dụng, không thể đăng ký',
  },
  idempotency: {
    reused:
      'Idempotency-Key đã được dùng cho một request khác nội dung. Tạo key mới cho request mới.',
    inProgress:
      'Request với Idempotency-Key này đang được xử lý. Thử lại sau vài giây.',
  },
  reference: {
    invalidType: 'Loại giao dịch không tồn tại hoặc không thuộc về bạn',
    invalidPaymentMethod:
      'Phương thức thanh toán không tồn tại hoặc không thuộc về bạn',
  },
  transaction: {
    notFound: (id: string) => `Giao dịch #${id} không tồn tại`,
    dateRangeRequired: 'Cần truyền cả `from` và `to`',
  },
  transactionType: {
    notFound: (id: string) => `Loại giao dịch #${id} không tồn tại`,
    flowMismatch: (name: string, typeFlow: string, txFlow: string) =>
      `Loại "${name}" dùng cho ${typeFlow}, không khớp giao dịch ${txFlow}`,
    duplicate: (code: string, flow: string) =>
      `Loại "${code}" (${flow}) đã tồn tại trong tài khoản của bạn`,
    colorInUse: (color: string) => `Màu ${color} đã được dùng cho loại khác`,
    defaultReadOnly: 'Loại mặc định không thể sửa hoặc xoá',
    fallbackMissing: (flow: string) =>
      `Không tìm thấy loại "other" (${flow}) để chuyển giao dịch sang`,
  },
  paymentMethod: {
    notFound: (id: string) => `Phương thức thanh toán #${id} không tồn tại`,
    colorInUse: (color: string) =>
      `Màu ${color} đã được dùng cho phương thức thanh toán khác`,
    defaultReadOnly: 'Phương thức thanh toán mặc định không thể sửa hoặc xoá',
    fallbackMissing:
      'Không tìm thấy phương thức "cash" để chuyển giao dịch sang',
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
