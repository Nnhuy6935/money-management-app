import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { TransactionFlow } from '../../../common/constants/transaction.constants';
import { HEX_COLOR_PATTERN } from '../../../common/utils/color.util';
import { trimString, trimToNull } from '../../../common/utils/string.util';

export class CreateTransactionTypeDto {
  @ApiProperty({ example: 'Coffee', description: 'Tên hiển thị' })
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    enum: TransactionFlow,
    example: TransactionFlow.EXPENSE,
    description: 'Thu nhập (income) hoặc chi tiêu (expense)',
  })
  @IsEnum(TransactionFlow)
  flow: TransactionFlow;

  @ApiPropertyOptional({
    example: 'coffee',
    description: 'Mã loại (a-z, 0-9, _). Bỏ trống → tự sinh từ `name`',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(/^[a-z0-9_]+$/, {
    message: 'code chỉ gồm chữ thường, số và dấu _',
  })
  code?: string;

  @ApiProperty({
    example: 'coffee',
    description: 'Key icon (mobile tự map, server không kiểm tra danh sách)',
  })
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  iconKey: string;

  @ApiProperty({
    example: '#A1B2C3',
    description:
      'Màu `#RRGGBB` hoặc `RRGGBB`, lưu dạng `#RRGGBB` in hoa. Không trùng màu loại khác của bạn hoặc loại mặc định.',
  })
  @IsString()
  @Matches(HEX_COLOR_PATTERN, { message: 'color phải có dạng #RRGGBB' })
  color: string;

  @ApiPropertyOptional({
    example: 'Daily coffee',
    nullable: true,
    type: String,
    description: 'Mô tả (dùng cho AI prompt). Chuỗi rỗng → null',
  })
  @IsOptional()
  @Transform(({ value }) => trimToNull(value))
  @IsString()
  @MaxLength(500)
  description?: string | null;
}
