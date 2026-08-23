import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
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
      'food, shopping, home, transport, entertainment, health, education, other',
  })
  @ApiOkResponse({ type: [TransactionTypeResponseDto] })
  @ApiUnauthorizedResponse({ description: 'Thiếu / sai JWT' })
  getAppTransactionTypes() {
    return this.transactionTypesService.findAll();
  }
}
