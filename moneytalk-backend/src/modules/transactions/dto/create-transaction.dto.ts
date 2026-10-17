import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { TransactionFlow } from '../../../common/constants/transaction.constants';
import { UUID_EXAMPLE } from '../../../common/constants/swagger.constants';
import { trimString, trimToNull } from '../../../common/utils/string.util';

/** Số tiền VND lớn nhất chấp nhận (an toàn với JS number). */
export const MAX_AMOUNT = 1_000_000_000_000_000;

/** '' | 'null' → null; giữ undefined để phân biệt "không gửi". */
const toNullableUuid = ({ value }: { value: unknown }) =>
  value === '' || value === 'null' ? null : value;

export class ReceiptItemInputDto {
  @ApiProperty({ example: 'Phin sữa đá' })
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    example: 55000,
    nullable: true,
    type: Number,
    description: 'VND, số nguyên >= 0. `null` = không đọc được giá',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_AMOUNT)
  amount?: number | null;

  @ApiPropertyOptional({
    example: UUID_EXAMPLE,
    nullable: true,
    type: String,
    format: 'uuid',
  })
  @IsOptional()
  @Transform(toNullableUuid)
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  typeId?: string | null;
}

export class CreateTransactionDto {
  @ApiProperty({
    example: 185000,
    description:
      'Số tiền VND, số nguyên >= 0. Với hoá đơn: tổng tiền thực trả.',
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_AMOUNT)
  amount: number;

  @ApiPropertyOptional({
    example: 'Highlands',
    nullable: true,
    type: String,
    description: 'Mô tả. Chuỗi rỗng → null',
  })
  @IsOptional()
  @Transform(({ value }) => trimToNull(value))
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @ApiProperty({
    enum: TransactionFlow,
    example: TransactionFlow.EXPENSE,
    description: 'Thu nhập (income) hoặc chi tiêu (expense)',
  })
  @IsEnum(TransactionFlow)
  flow: TransactionFlow;

  @ApiProperty({
    example: 'https://pub-xxx.r2.dev/transactions/<userId>/<uuid>.jpg',
    description:
      'URL ảnh từ POST /api/uploads/image (field `url`). Phải do chính bạn upload.',
  })
  @IsString()
  @MaxLength(1024)
  imageUrl: string;

  @ApiPropertyOptional({
    example: UUID_EXAMPLE,
    nullable: true,
    type: String,
    format: 'uuid',
    description:
      'ID loại giao dịch (GET /transaction-types), phải cùng `flow`. Có thể bỏ trống.',
  })
  @IsOptional()
  @Transform(toNullableUuid)
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  typeId?: string | null;

  @ApiPropertyOptional({
    example: UUID_EXAMPLE,
    nullable: true,
    type: String,
    format: 'uuid',
    description: 'ID phương thức thanh toán (GET /payment-methods).',
  })
  @IsOptional()
  @Transform(toNullableUuid)
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  paymentMethodId?: string | null;

  @ApiProperty({
    example: '2026-10-15T08:10:00+07:00',
    description:
      'Thời điểm chi tiêu, ISO-8601 có offset (hoặc Z). Được phép ở quá khứ.',
  })
  @IsISO8601({ strict: true })
  @Matches(/(Z|[+-]\d{2}:?\d{2})$/, {
    message: 'spentAt phải có timezone offset, vd 2026-10-16T12:30:00+07:00',
  })
  spentAt: string;

  @ApiPropertyOptional({
    type: [ReceiptItemInputDto],
    description:
      'Chỉ dùng khi scan hoá đơn. Thứ tự mảng = thứ tự hiển thị. Không bao giờ được cộng vào thống kê.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => ReceiptItemInputDto)
  receiptItems?: ReceiptItemInputDto[];
}
