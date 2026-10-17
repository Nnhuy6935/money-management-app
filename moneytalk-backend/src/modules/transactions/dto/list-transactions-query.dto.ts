import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { TransactionFlow } from '../../../common/constants/transaction.constants';
import { UUID_EXAMPLE } from '../../../common/constants/swagger.constants';

/** Đủ để tải 1 tháng trong 1 lần gọi (M-03). */
export const MAX_TRANSACTIONS_PAGE_LIMIT = 500;

export class ListTransactionsQueryDto {
  @ApiPropertyOptional({
    example: '2026-08-23',
    description: 'Lọc theo 1 ngày theo `spentAt` (giờ Việt Nam UTC+7)',
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({
    example: '2026-08-01',
    description: 'Từ ngày, theo `spentAt` giờ VN (dùng cùng `to`)',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    example: '2026-08-31',
    description: 'Đến ngày, **bao gồm** cả ngày này (dùng cùng `from`)',
  })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ enum: TransactionFlow })
  @IsOptional()
  @IsEnum(TransactionFlow)
  flow?: TransactionFlow;

  @ApiPropertyOptional({
    example: UUID_EXAMPLE,
    format: 'uuid',
    description: 'Lọc theo loại (type id)',
  })
  @IsOptional()
  @IsUUID()
  typeId?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 20,
    default: 20,
    maximum: MAX_TRANSACTIONS_PAGE_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_TRANSACTIONS_PAGE_LIMIT)
  limit?: number = 20;
}
