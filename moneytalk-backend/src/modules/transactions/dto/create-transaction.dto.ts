import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { TransactionFlow } from '../../../common/constants/transaction.constants';

export class CreateTransactionDto {
  @ApiProperty({ example: 150000, description: 'Số tiền (VND)' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ example: 'Cơm trưa', description: 'Mô tả' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    enum: TransactionFlow,
    example: TransactionFlow.EXPENSE,
    description: 'Thu nhập (income) hoặc chi tiêu (expense)',
  })
  @IsEnum(TransactionFlow)
  flow: TransactionFlow;

  @ApiProperty({
    example: 'https://cdn.example.com/transactions/1/uuid.jpg',
    description: 'URL ảnh từ POST /api/uploads/presign (field `url`)',
  })
  @IsString()
  @MaxLength(1024)
  imageUrl: string;

  @ApiPropertyOptional({
    example: 1,
    nullable: true,
    description:
      'ID loại giao dịch (xem GET /transaction-types). Có thể bỏ trống.',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === '' || value === 'null' || value === undefined ? null : value,
  )
  @ValidateIf((_, value) => value !== null)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  typeId?: number | null;
}
