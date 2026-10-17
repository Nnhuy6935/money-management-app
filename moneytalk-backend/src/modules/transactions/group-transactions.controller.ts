import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { UUID_EXAMPLE } from '../../common/constants/swagger.constants';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth.types';
import { ListTransactionsQueryDto } from './dto/list-transactions-query.dto';
import {
  PaginatedTransactionsResponseDto,
  TransactionResponseDto,
} from './dto/transaction-response.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionsService } from './transactions.service';

/** Giao dịch nhóm: tạo qua POST /api/transactions với `groupId`. */
@ApiTags('group-transactions')
@ApiBearerAuth()
@Controller('groups/:groupId/transactions')
export class GroupTransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  @ApiOperation({
    summary: 'Giao dịch của nhóm',
    description:
      'Chỉ thành viên nhóm ACTIVE. Lọc / phân trang / sắp xếp giống GET /transactions/me. ' +
      '404 GROUP_NOT_FOUND · 409 GROUP_ARCHIVED.',
  })
  @ApiParam({ name: 'groupId', format: 'uuid', example: UUID_EXAMPLE })
  @ApiOkResponse({ type: PaginatedTransactionsResponseDto })
  @ApiNotFoundResponse({ description: 'GROUP_NOT_FOUND' })
  @ApiConflictResponse({ description: 'GROUP_ARCHIVED' })
  findAll(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Query() query: ListTransactionsQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.transactionsService.findInGroup(user.id, groupId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết giao dịch nhóm (kèm receiptItems)' })
  @ApiParam({ name: 'groupId', format: 'uuid' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: TransactionResponseDto })
  @ApiNotFoundResponse({
    description: 'GROUP_NOT_FOUND | TRANSACTION_NOT_FOUND',
  })
  findOne(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.transactionsService.findOneInGroup(user.id, groupId, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Sửa giao dịch nhóm (chỉ người tạo)',
    description:
      'Cùng body với PATCH /transactions/me/{id}. Không đổi được groupId. 403 TRANSACTION_NOT_CREATOR.',
  })
  @ApiParam({ name: 'groupId', format: 'uuid' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: TransactionResponseDto })
  @ApiForbiddenResponse({ description: 'TRANSACTION_NOT_CREATOR' })
  update(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTransactionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.transactionsService.updateInGroup(user.id, groupId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Xoá giao dịch nhóm (chỉ người tạo)',
    description:
      'Xoá giao dịch, receipt items và ảnh. 403 TRANSACTION_NOT_CREATOR.',
  })
  @ApiParam({ name: 'groupId', format: 'uuid' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ schema: { example: { deleted: true, id: UUID_EXAMPLE } } })
  @ApiForbiddenResponse({ description: 'TRANSACTION_NOT_CREATOR' })
  remove(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.transactionsService.removeInGroup(user.id, groupId, id);
  }
}
