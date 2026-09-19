import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { TransactionFlow } from '../../../common/constants/transaction.constants';

export class CreateTransactionTypeDto {
  @ApiProperty({ example: 'Freelance', description: 'Tên hiển thị' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    enum: TransactionFlow,
    example: TransactionFlow.INCOME,
    description: 'Thu nhập (income) hoặc chi tiêu (expense)',
  })
  @IsEnum(TransactionFlow)
  flow: TransactionFlow;

  @ApiPropertyOptional({
    example: 'freelance',
    description: 'Mã loại (a-z, 0-9, _). Bỏ trống → tự sinh từ `name`',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(/^[a-z0-9_]+$/, {
    message: 'code chỉ gồm chữ thường, số và dấu _',
  })
  code?: string;
}
