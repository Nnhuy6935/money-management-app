import {
  Body,
  Controller,
  Delete,
  Get,
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
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth.types';
import { CreateTransactionTypeDto } from './dto/create-transaction-type.dto';
import { ListTransactionTypesQueryDto } from './dto/list-transaction-types-query.dto';
import {
  DeleteImpactResponseDto,
  DeleteWithMoveResponseDto,
  TransactionTypeResponseDto,
} from './dto/transaction-type-response.dto';
import { UpdateTransactionTypeDto } from './dto/update-transaction-type.dto';
import { TransactionTypesService } from './transaction-types.service';

@ApiTags('transaction-types')
@ApiBearerAuth()
@Controller('transaction-types')
export class TransactionTypesController {
  constructor(
    private readonly transactionTypesService: TransactionTypesService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Danh sách loại giao dịch',
    description:
      'Loại mặc định (isDefault, read-only) + loại custom của bạn, sắp theo `sortOrder` tăng dần. ' +
      'Expense mặc định: entertainment, food, transport, health, education, shopping, other. ' +
      'Income mặc định: salary, gift, other. Type phải cùng `flow` với giao dịch.',
  })
  @ApiOkResponse({ type: [TransactionTypeResponseDto] })
  @ApiUnauthorizedResponse({ description: 'Thiếu / sai JWT' })
  getAppTransactionTypes(
    @Query() query: ListTransactionTypesQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.transactionTypesService.findAll(user.id, query);
  }

  @Post()
  @ApiOperation({
    summary: 'Thêm loại giao dịch custom',
    description:
      'Tạo loại riêng (isDefault=false), xếp cuối danh sách. Chỉ user tạo mới thấy và dùng được. ' +
      'Trùng màu → 409 TYPE_COLOR_IN_USE.',
  })
  @ApiCreatedResponse({ type: TransactionTypeResponseDto })
  @ApiConflictResponse({ description: 'TYPE_COLOR_IN_USE | TYPE_DUPLICATE' })
  @ApiUnauthorizedResponse()
  createTransactionType(
    @Body() dto: CreateTransactionTypeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.transactionTypesService.create(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Sửa loại custom',
    description:
      'Chỉ đổi các field gửi lên: name, description, iconKey, color. `description: ""` → xoá mô tả.',
  })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiOkResponse({ type: TransactionTypeResponseDto })
  @ApiNotFoundResponse({ description: 'TYPE_NOT_FOUND' })
  @ApiForbiddenResponse({ description: 'DEFAULT_TYPE_READ_ONLY' })
  @ApiConflictResponse({ description: 'TYPE_COLOR_IN_USE' })
  updateTransactionType(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTransactionTypeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.transactionTypesService.update(user.id, id, dto);
  }

  @Get(':id/delete-impact')
  @ApiOperation({
    summary: 'Số giao dịch bị ảnh hưởng nếu xoá loại',
    description: 'Giao dịch sẽ được chuyển sang loại `other` cùng flow.',
  })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiOkResponse({ type: DeleteImpactResponseDto })
  @ApiNotFoundResponse({ description: 'TYPE_NOT_FOUND' })
  @ApiForbiddenResponse({ description: 'DEFAULT_TYPE_READ_ONLY' })
  getDeleteImpact(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.transactionTypesService.getDeleteImpact(user.id, id);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Xoá loại custom',
    description:
      'Chuyển giao dịch và receipt item của bạn đang dùng loại này sang `other` cùng flow, rồi xoá loại.',
  })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiOkResponse({ type: DeleteWithMoveResponseDto })
  @ApiNotFoundResponse({ description: 'TYPE_NOT_FOUND' })
  @ApiForbiddenResponse({ description: 'DEFAULT_TYPE_READ_ONLY' })
  @ApiConflictResponse({ description: 'FALLBACK_TYPE_MISSING' })
  removeTransactionType(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.transactionTypesService.remove(user.id, id);
  }
}
