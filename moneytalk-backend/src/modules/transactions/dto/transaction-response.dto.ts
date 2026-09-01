import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionFlow } from '../../../common/constants/transaction.constants';

export class TransactionTypeResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'food' })
  code: string;

  @ApiProperty({ example: 'Food' })
  name: string;

  @ApiProperty({ enum: TransactionFlow, example: TransactionFlow.EXPENSE })
  flow: TransactionFlow;

  @ApiProperty({
    example: true,
    description: 'Loại hệ thống (seed) hay do user tạo',
  })
  isDefault: boolean;
}

export class TransactionResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '150000.00' })
  amount: string;

  @ApiPropertyOptional({ example: 'Cơm trưa', nullable: true })
  description: string | null;

  @ApiProperty({ enum: TransactionFlow, example: TransactionFlow.EXPENSE })
  flow: TransactionFlow;

  @ApiPropertyOptional({ type: TransactionTypeResponseDto, nullable: true })
  type: TransactionTypeResponseDto | null;

  @ApiProperty({ example: 'transactions/1/abc.jpg' })
  imageKey: string;

  @ApiProperty({ example: 'https://pub-xxx.r2.dev/transactions/1/abc.jpg' })
  imageUrl: string;

  @ApiProperty({ example: 'image/jpeg' })
  contentType: string;

  @ApiProperty({ example: 245678 })
  fileSize: number;

  @ApiProperty({ example: '2026-08-23T07:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-08-23T07:00:00.000Z' })
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
