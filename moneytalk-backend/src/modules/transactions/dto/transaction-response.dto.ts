import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionFlow } from '../../../common/constants/transaction.constants';
import { UUID_EXAMPLE } from '../../../common/constants/swagger.constants';
import { TransactionTypeResponseDto } from './transaction-type-response.dto';

export { TransactionTypeResponseDto } from './transaction-type-response.dto';

export class TransactionPaymentMethodDto {
  @ApiProperty({ example: UUID_EXAMPLE, format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'cash' })
  code: string;

  @ApiProperty({ example: 'Cash' })
  name: string;

  @ApiProperty({ example: 'cash' })
  iconKey: string;

  @ApiProperty({ example: '#55C995' })
  color: string;
}

export class ReceiptItemResponseDto {
  @ApiProperty({ example: UUID_EXAMPLE, format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Phin sữa đá' })
  name: string;

  @ApiProperty({ example: 55000, type: Number, nullable: true })
  amount: number | null;

  @ApiProperty({
    example: UUID_EXAMPLE,
    type: String,
    format: 'uuid',
    nullable: true,
  })
  typeId: string | null;
}

export class TransactionResponseDto {
  @ApiProperty({ example: UUID_EXAMPLE, format: 'uuid' })
  id: string;

  @ApiProperty({ example: 185000, description: 'VND, số nguyên' })
  amount: number;

  @ApiProperty({ example: 'Highlands', type: String, nullable: true })
  description: string | null;

  @ApiProperty({ enum: TransactionFlow, example: TransactionFlow.EXPENSE })
  flow: TransactionFlow;

  @ApiProperty({ example: '2026-10-15T01:10:00.000Z' })
  spentAt: Date;

  @ApiProperty({ type: TransactionTypeResponseDto, nullable: true })
  type: TransactionTypeResponseDto | null;

  @ApiProperty({ type: TransactionPaymentMethodDto, nullable: true })
  paymentMethod: TransactionPaymentMethodDto | null;

  @ApiProperty({
    example: true,
    description: 'Có receipt item hay không — list có thể bỏ qua gọi detail',
  })
  hasReceiptItems: boolean;

  @ApiPropertyOptional({
    type: [ReceiptItemResponseDto],
    description: 'Chỉ có ở GET /transactions/me/{id} (và POST/PATCH)',
  })
  receiptItems?: ReceiptItemResponseDto[];

  @ApiProperty({ example: 'transactions/<userId>/abc.jpg' })
  imageKey: string;

  @ApiProperty({
    example: 'https://pub-xxx.r2.dev/transactions/<userId>/abc.jpg',
  })
  imageUrl: string;

  @ApiProperty({ example: 'image/jpeg' })
  contentType: string;

  @ApiProperty({ example: 245678 })
  fileSize: number;

  @ApiProperty({ example: '2026-10-16T05:31:02.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-10-16T05:31:02.000Z' })
  updatedAt: Date;
}

export class PaginatedTransactionsResponseDto {
  @ApiProperty({ type: [TransactionResponseDto] })
  data: TransactionResponseDto[];

  @ApiProperty({
    example: { page: 1, limit: 20, total: 42 },
  })
  meta: {
    page: number;
    limit: number;
    total: number;
    date?: string;
    from?: string;
    to?: string;
  };
}
