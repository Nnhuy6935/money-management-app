import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import {
  AuthResponseDto,
  RefreshResponseDto,
  StatsOverviewResponseDto,
  UserResponseDto,
} from '../common/dto/api-responses.dto';
import { InsightsSummaryResponseDto } from '../modules/insights/dto/insights-summary-response.dto';
import {
  PaymentMethodDeleteImpactResponseDto,
  PaymentMethodResponseDto,
} from '../modules/payment-methods/dto/payment-method-response.dto';
import {
  FriendRequestResponseDto,
  FriendResponseDto,
} from '../modules/friends/dto/friend-response.dto';
import { PresignUploadResponseDto } from '../modules/uploads/dto/presign-upload-response.dto';
import { UploadImageResponseDto } from '../modules/uploads/dto/upload-image-response.dto';
import {
  PaginatedTransactionsResponseDto,
  TransactionResponseDto,
  TransactionTypeResponseDto,
} from '../modules/transactions/dto/transaction-response.dto';
import {
  DeleteImpactResponseDto,
  DeleteWithMoveResponseDto,
} from '../modules/transactions/dto/transaction-type-response.dto';

export function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('MoneyTalk API')
    .setDescription(
      'Backend API for MoneyTalk — quản lý thu chi cá nhân.\n\n' +
        '1. Gọi POST /api/auth/register hoặc /api/auth/login để lấy accessToken\n' +
        '2. Bấm Authorize và dán: Bearer <accessToken>\n' +
        '3. accessToken hết hạn sau `expiresIn` giây → gọi POST /api/auth/refresh với refreshToken\n\n' +
        'Lỗi 4xx có dạng `{ statusCode, code, message, error }` — `code` là mã ổn định (vd TYPE_COLOR_IN_USE).\n' +
        'Mọi ngày giờ lọc/tổng hợp tính theo giờ Việt Nam (UTC+7).',
    )
    .setVersion('1.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Dán accessToken từ /auth/login hoặc /auth/register',
    })
    .addTag('auth', 'Đăng ký / đăng nhập JWT')
    .addTag('health', 'Health check')
    .addTag('users', 'Quản lý người dùng')
    .addTag('friends', 'Kết bạn / lời mời')
    .addTag('stats', 'Thống kê (admin)')
    .addTag('uploads', 'Upload ảnh lên R2')
    .addTag('transaction-types', 'Loại giao dịch (food, shopping, …)')
    .addTag('transactions', 'Giao dịch thu/chi')
    .addTag('payment-methods', 'Phương thức thanh toán')
    .addTag('insights', 'Thống kê chi tiêu cá nhân')
    .addTag('groups', 'Nhóm & thành viên')
    .addTag('group-invitations', 'Lời mời vào nhóm')
    .addTag('group-transactions', 'Giao dịch của nhóm')
    .build();

  const document = SwaggerModule.createDocument(app as never, config, {
    extraModels: [
      UserResponseDto,
      AuthResponseDto,
      RefreshResponseDto,
      StatsOverviewResponseDto,
      FriendRequestResponseDto,
      FriendResponseDto,
      PresignUploadResponseDto,
      UploadImageResponseDto,
      TransactionTypeResponseDto,
      TransactionResponseDto,
      PaginatedTransactionsResponseDto,
      DeleteImpactResponseDto,
      DeleteWithMoveResponseDto,
      PaymentMethodResponseDto,
      PaymentMethodDeleteImpactResponseDto,
      InsightsSummaryResponseDto,
    ],
  });

  SwaggerModule.setup('api/docs', app as never, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}
