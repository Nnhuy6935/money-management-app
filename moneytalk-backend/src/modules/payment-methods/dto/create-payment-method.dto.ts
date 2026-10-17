import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { HEX_COLOR_PATTERN } from '../../../common/utils/color.util';
import { trimString, trimToNull } from '../../../common/utils/string.util';

export class CreatePaymentMethodDto {
  @ApiProperty({ example: 'Techcombank card' })
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'card' })
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  iconKey: string;

  @ApiProperty({
    example: '#4387E5',
    description:
      '`#RRGGBB` hoặc `RRGGBB`. Không trùng phương thức khác của bạn hoặc phương thức mặc định.',
  })
  @IsString()
  @Matches(HEX_COLOR_PATTERN, { message: 'color phải có dạng #RRGGBB' })
  color: string;

  @ApiPropertyOptional({
    example: 'Debit card',
    nullable: true,
    type: String,
    description: 'Chuỗi rỗng → null',
  })
  @IsOptional()
  @Transform(({ value }) => trimToNull(value))
  @IsString()
  @MaxLength(500)
  description?: string | null;
}
