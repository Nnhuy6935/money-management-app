import type { TransactionType } from '../../database/schema';
import type { TransactionTypeResponseDto } from './dto/transaction-type-response.dto';

export function toTransactionTypeResponse(
  type: TransactionType,
): TransactionTypeResponseDto {
  return {
    id: type.id,
    code: type.code,
    name: type.name,
    flow: type.flow,
    isDefault: type.isDefault,
    description: type.description,
    iconKey: type.iconKey,
    color: type.color,
    sortOrder: type.sortOrder,
  };
}
