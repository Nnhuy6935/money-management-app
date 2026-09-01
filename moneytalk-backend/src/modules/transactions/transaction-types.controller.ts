import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth.types';
import { CreateTransactionTypeDto } from './dto/create-transaction-type.dto';
import { ListTransactionTypesQueryDto } from './dto/list-transaction-types-query.dto';
import { TransactionTypeResponseDto } from './dto/transaction-response.dto';
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
      'Trả về loại mặc định (isDefault) + loại custom của user. ' +
      'Expense mặc định: food, shopping, transport, entertainment, health, education, other. ' +
      'Income mặc định: salary, gift.',
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
      'Tạo loại riêng (isDefault=false). Chỉ user tạo mới dùng được loại đó.',
  })
  @ApiCreatedResponse({ type: TransactionTypeResponseDto })
  @ApiUnauthorizedResponse()
  createTransactionType(
    @Body() dto: CreateTransactionTypeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.transactionTypesService.create(user.id, dto);
  }
}
