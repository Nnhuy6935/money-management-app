import { ApiProperty } from '@nestjs/swagger';
import { UUID_EXAMPLE } from '../../../common/constants/swagger.constants';

export class PaymentMethodResponseDto {
  @ApiProperty({ example: UUID_EXAMPLE, format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'cash' })
  code: string;

  @ApiProperty({ example: 'Cash' })
  name: string;

  @ApiProperty({
    example: 'Physical money and cash spending',
    type: String,
    nullable: true,
  })
  description: string | null;

  @ApiProperty({ example: 'cash' })
  iconKey: string;

  @ApiProperty({ example: '#55C995' })
  color: string;

  @ApiProperty({ example: true })
  isDefault: boolean;

  @ApiProperty({ example: 0 })
  sortOrder: number;
}

export class PaymentMethodRefDto {
  @ApiProperty({ example: UUID_EXAMPLE, format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'cash' })
  code: string;

  @ApiProperty({ example: 'Cash' })
  name: string;
}

export class PaymentMethodDeleteImpactResponseDto {
  @ApiProperty({ example: 3 })
  transactionCount: number;

  @ApiProperty({ type: PaymentMethodRefDto })
  replacement: PaymentMethodRefDto;
}
