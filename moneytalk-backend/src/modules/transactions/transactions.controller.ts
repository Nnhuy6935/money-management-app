import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UserRole } from '../../common/constants/roles';
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
import { TransactionsService } from './transactions.service';

@ApiTags('transactions')
@ApiBearerAuth()
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @ApiOperation({
    summary: 'Tạo giao dịch',
    description:
      'Upload ảnh trước qua POST /api/uploads/presign, rồi truyền `imageUrl` vào đây.',
  })
  @ApiCreatedResponse({ type: TransactionResponseDto })
  @ApiUnauthorizedResponse()
  create(@Body() dto: CreateTransactionDto, @CurrentUser() user: AuthUser) {
    return this.transactionsService.create(user.id, dto);
  }

  @Get('me')
  @ApiOperation({
    summary: 'Danh sách giao dịch của tôi',
    description:
      'Lọc theo ngày: `?date=2026-08-23` (giờ VN) hoặc `?from=...&to=...`',
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
  @ApiOperation({ summary: 'Danh sách giao dịch theo user (admin)' })
  @ApiParam({ name: 'userId', type: Number })
  @ApiOkResponse({ type: PaginatedTransactionsResponseDto })
  @ApiForbiddenResponse()
  findByUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Query() query: ListTransactionsQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.transactionsService.findByUser(
      user.id,
      user.role,
      userId,
      query,
    );
  }

  @Get('me/:id')
  @ApiOperation({ summary: 'Chi tiết giao dịch của tôi' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: TransactionResponseDto })
  @ApiNotFoundResponse()
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.transactionsService.findOneForUser(user.id, id);
  }

  @Patch('me/:id')
  @ApiOperation({ summary: 'Cập nhật giao dịch (không đổi ảnh)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: TransactionResponseDto })
  @ApiNotFoundResponse()
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTransactionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.transactionsService.update(user.id, id, dto);
  }

  @Delete('me/:id')
  @ApiOperation({ summary: 'Xóa giao dịch + ảnh trên R2' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({
    schema: { example: { deleted: true, id: 1 } },
  })
  @ApiNotFoundResponse()
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.transactionsService.remove(user.id, id);
  }
}
