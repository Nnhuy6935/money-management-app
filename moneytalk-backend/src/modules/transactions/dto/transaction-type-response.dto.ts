import { ApiProperty } from '@nestjs/swagger';
import { TransactionFlow } from '../../../common/constants/transaction.constants';
import { UUID_EXAMPLE } from '../../../common/constants/swagger.constants';

export class TransactionTypeResponseDto {
  @ApiProperty({ example: UUID_EXAMPLE, format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'food' })
  code: string;

  @ApiProperty({ example: 'Food & Dining' })
  name: string;

  @ApiProperty({ enum: TransactionFlow, example: TransactionFlow.EXPENSE })
  flow: TransactionFlow;

  @ApiProperty({
    example: true,
    description: 'Loại hệ thống (seed, read-only) hay do user tạo',
  })
  isDefault: boolean;

  @ApiProperty({
    example: 'Meals, drinks, groceries',
    type: String,
    nullable: true,
  })
  description: string | null;

  @ApiProperty({ example: 'food' })
  iconKey: string;

  @ApiProperty({ example: '#55C995' })
  color: string;

  @ApiProperty({ example: 1 })
  sortOrder: number;
}

export class TransactionTypeRefDto {
  @ApiProperty({ example: UUID_EXAMPLE, format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'other' })
  code: string;

  @ApiProperty({ example: 'Other' })
  name: string;
}

export class DeleteImpactResponseDto {
  @ApiProperty({
    example: 12,
    description: 'Số giao dịch của bạn sẽ bị chuyển sang `replacement`',
  })
  transactionCount: number;

  @ApiProperty({ type: TransactionTypeRefDto })
  replacement: TransactionTypeRefDto;
}

export class DeleteWithMoveResponseDto {
  @ApiProperty({ example: true })
  deleted: boolean;

  @ApiProperty({ example: 12, description: 'Số giao dịch đã được chuyển' })
  movedCount: number;
}
