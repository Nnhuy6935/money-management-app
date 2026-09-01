import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { TransactionFlow } from '../../../common/constants/transaction.constants';
import { UUID_EXAMPLE } from '../../../common/constants/swagger.constants';

export class UpdateTransactionDto {
  @ApiPropertyOptional({ example: 200000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount?: number;

  @ApiPropertyOptional({ example: 'Cơm tối' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ enum: TransactionFlow })
  @IsOptional()
  @IsEnum(TransactionFlow)
  flow?: TransactionFlow;

  @ApiPropertyOptional({
    example: UUID_EXAMPLE,
    nullable: true,
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
