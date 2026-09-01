import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { TransactionFlow } from '../../../common/constants/transaction.constants';

export class ListTransactionTypesQueryDto {
  @ApiPropertyOptional({
    enum: TransactionFlow,
    description: 'Lọc theo thu nhập hoặc chi tiêu',
  })
  @IsOptional()
  @IsEnum(TransactionFlow)
  flow?: TransactionFlow;
}
