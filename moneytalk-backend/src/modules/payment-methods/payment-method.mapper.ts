import type { PaymentMethod } from '../../database/schema';
import type { PaymentMethodResponseDto } from './dto/payment-method-response.dto';

export function toPaymentMethodResponse(
  method: PaymentMethod,
): PaymentMethodResponseDto {
  return {
    id: method.id,
    code: method.code,
    name: method.name,
    description: method.description,
    iconKey: method.iconKey,
    color: method.color,
    isDefault: method.isDefault,
    sortOrder: method.sortOrder,
  };
}
