import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { UserRole } from '../../common/constants/roles';
import { UUID_EXAMPLE } from '../../common/constants/swagger.constants';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthUser } from '../../common/types/auth.types';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ListTransactionsQueryDto } from './dto/list-transactions-query.dto';
import {
  PaginatedTransactionsResponseDto,
  TransactionResponseDto,
} from './dto/transaction-response.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { IdempotencyService } from './idempotency.service';
import { TransactionsService } from './transactions.service';

const MAX_IDEMPOTENCY_KEY_LENGTH = 255;

@ApiTags('transactions')
@ApiBearerAuth()
@Controller('transactions')
export class TransactionsController {
  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Tạo giao dịch',
    description:
      'Upload ảnh trước qua POST /api/uploads/image, rồi truyền `url` vào `imageUrl`. ' +
      'Giao dịch và receipt item được lưu trong 1 DB transaction. ' +
      'Lỗi: 400 INVALID_REFERENCE (type/paymentMethod không thuộc bạn), 400 TYPE_FLOW_MISMATCH, 400 INVALID_IMAGE.',
  })
  @ApiCreatedResponse({ type: TransactionResponseDto })
  @ApiUnauthorizedResponse()
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description:
      'Khuyến nghị gửi (vd UUID mới cho mỗi giao dịch). Gửi lại cùng key + cùng body trong 24h → trả lại giao dịch đã tạo, không tạo trùng. ' +
      'Cùng key khác body → 422 IDEMPOTENCY_KEY_REUSED; request trước chưa xong → 409 IDEMPOTENCY_KEY_IN_PROGRESS.',
  })
  @ApiUnprocessableEntityResponse({ description: 'IDEMPOTENCY_KEY_REUSED' })
  @ApiConflictResponse({ description: 'IDEMPOTENCY_KEY_IN_PROGRESS' })
  create(
    @Body() dto: CreateTransactionDto,
    @CurrentUser() user: AuthUser,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    const key = idempotencyKey?.trim();
    if (!key) {
      return this.transactionsService.create(user.id, dto);
    }
    if (key.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
      throw new BadRequestException(
        `Idempotency-Key tối đa ${MAX_IDEMPOTENCY_KEY_LENGTH} ký tự`,
      );
    }
    return this.idempotencyService.run(user.id, key, dto, () =>
      this.transactionsService.create(user.id, dto),
    );
  }

  @Get('me')
  @ApiOperation({
    summary: 'Danh sách giao dịch của tôi',
    description:
      'Lọc theo `spentAt` (giờ VN): `?date=2026-10-16` hoặc `?from=2026-10-01&to=2026-10-31` (`to` bao gồm). ' +
      'Sắp xếp: spentAt giảm dần, rồi createdAt giảm dần. `limit` tối đa 500.',
  })
  @ApiOkResponse({ type: PaginatedTransactionsResponseDto })
  findMine(
    @Query() query: ListTransactionsQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.transactionsService.findMine(user.id, query);
  }

  @Get('user/:userId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Danh sách giao dịch theo user (chỉ admin)',
    description: 'Mobile không dùng. Role kiểm tra server-side mỗi lần gọi.',
  })
  @ApiParam({ name: 'userId', type: String, format: 'uuid' })
  @ApiOkResponse({ type: PaginatedTransactionsResponseDto })
  @ApiForbiddenResponse()
  findByUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query() query: ListTransactionsQueryDto,
  ) {
    return this.transactionsService.findByUser(userId, query);
  }

  @Get('me/:id')
  @ApiOperation({
    summary: 'Chi tiết giao dịch của tôi (kèm receiptItems)',
  })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiOkResponse({ type: TransactionResponseDto })
  @ApiNotFoundResponse()
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.transactionsService.findOneForUser(user.id, id);
  }

  @Patch('me/:id')
  @ApiOperation({ summary: 'Cập nhật giao dịch (không đổi ảnh)' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiOkResponse({ type: TransactionResponseDto })
  @ApiNotFoundResponse()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTransactionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.transactionsService.update(user.id, id, dto);
  }

  @Delete('me/:id')
  @ApiOperation({ summary: 'Xóa giao dịch + ảnh trên R2' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiOkResponse({
    schema: { example: { deleted: true, id: UUID_EXAMPLE } },
  })
  @ApiNotFoundResponse()
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.transactionsService.remove(user.id, id);
  }
}
