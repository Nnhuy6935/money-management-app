import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateTransactionTypeDto } from './create-transaction-type.dto';

/** N-02: chỉ đổi name, description, iconKey, color. */
export class UpdateTransactionTypeDto extends PartialType(
  OmitType(CreateTransactionTypeDto, ['flow', 'code'] as const),
) {}
