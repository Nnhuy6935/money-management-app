import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { TransactionFlow } from '../../../common/constants/transaction.constants';
import { UUID_EXAMPLE } from '../../../common/constants/swagger.constants';
import { trimToNull } from '../../../common/utils/string.util';
import { MAX_AMOUNT } from './create-transaction.dto';

export class UpdateTransactionDto {
  @ApiPropertyOptional({ example: 200000, description: 'VND, số nguyên >= 0' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_AMOUNT)
  amount?: number;

  @ApiPropertyOptional({ example: 'Cơm tối', nullable: true, type: String })
  @IsOptional()
  @Transform(({ value }) => trimToNull(value))
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @ApiPropertyOptional({ enum: TransactionFlow })
  @IsOptional()
  @IsEnum(TransactionFlow)
  flow?: TransactionFlow;

  @ApiPropertyOptional({
    example: UUID_EXAMPLE,
    nullable: true,
    type: String,
    format: 'uuid',
    description: 'Gửi null để bỏ loại giao dịch',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === '' || value === 'null' ? null : value,
  )
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  typeId?: string | null;
}
