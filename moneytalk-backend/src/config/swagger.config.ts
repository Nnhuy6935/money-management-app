import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import {
  AuthResponseDto,
  StatsOverviewResponseDto,
  UserResponseDto,
} from '../common/dto/api-responses.dto';

export function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('MoneyTalk API')
    .setDescription(
      'Backend API for MoneyTalk — quản lý thu chi cá nhân.\n\n' +
        '1. Gọi POST /api/auth/register hoặc /api/auth/login để lấy accessToken\n' +
        '2. Bấm Authorize và dán: Bearer <accessToken>',
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
    .addTag('stats', 'Thống kê (admin)')
    .build();

  // pnpm resolve 2 bản @nestjs/common → INestApplication lệch type với @nestjs/swagger
  const document = SwaggerModule.createDocument(app as never, config, {
    extraModels: [UserResponseDto, AuthResponseDto, StatsOverviewResponseDto],
  });

  SwaggerModule.setup('api/docs', app as never, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}
