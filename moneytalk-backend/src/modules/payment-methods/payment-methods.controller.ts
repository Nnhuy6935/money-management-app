import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth.types';
import { DeleteWithMoveResponseDto } from '../transactions/dto/transaction-type-response.dto';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import {
  PaymentMethodDeleteImpactResponseDto,
  PaymentMethodResponseDto,
} from './dto/payment-method-response.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';
import { PaymentMethodsService } from './payment-methods.service';

@ApiTags('payment-methods')
@ApiBearerAuth()
@Controller('payment-methods')
export class PaymentMethodsController {
  constructor(private readonly paymentMethodsService: PaymentMethodsService) {}

  @Get()
  @ApiOperation({
    summary: 'Danh sách phương thức thanh toán',
    description:
      'Phương thức mặc định `cash` (read-only) + của bạn, sắp theo `sortOrder` tăng dần.',
  })
  @ApiOkResponse({ type: [PaymentMethodResponseDto] })
  @ApiUnauthorizedResponse()
  findAll(@CurrentUser() user: AuthUser) {
    return this.paymentMethodsService.findAll(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Thêm phương thức thanh toán' })
  @ApiCreatedResponse({ type: PaymentMethodResponseDto })
  @ApiConflictResponse({ description: 'PAYMENT_METHOD_COLOR_IN_USE' })
  create(@Body() dto: CreatePaymentMethodDto, @CurrentUser() user: AuthUser) {
    return this.paymentMethodsService.create(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Sửa phương thức thanh toán' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiOkResponse({ type: PaymentMethodResponseDto })
  @ApiNotFoundResponse({ description: 'PAYMENT_METHOD_NOT_FOUND' })
  @ApiForbiddenResponse({ description: 'DEFAULT_PAYMENT_METHOD_READ_ONLY' })
  @ApiConflictResponse({ description: 'PAYMENT_METHOD_COLOR_IN_USE' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePaymentMethodDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.paymentMethodsService.update(user.id, id, dto);
  }

  @Get(':id/delete-impact')
  @ApiOperation({
    summary: 'Số giao dịch bị ảnh hưởng nếu xoá',
    description: 'Giao dịch sẽ được chuyển sang `cash`.',
  })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiOkResponse({ type: PaymentMethodDeleteImpactResponseDto })
  @ApiNotFoundResponse({ description: 'PAYMENT_METHOD_NOT_FOUND' })
  @ApiForbiddenResponse({ description: 'DEFAULT_PAYMENT_METHOD_READ_ONLY' })
  getDeleteImpact(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.paymentMethodsService.getDeleteImpact(user.id, id);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Xoá phương thức thanh toán',
    description: 'Chuyển giao dịch của bạn đang dùng nó sang `cash`, rồi xoá.',
  })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiOkResponse({ type: DeleteWithMoveResponseDto })
  @ApiNotFoundResponse({ description: 'PAYMENT_METHOD_NOT_FOUND' })
  @ApiForbiddenResponse({ description: 'DEFAULT_PAYMENT_METHOD_READ_ONLY' })
  @ApiConflictResponse({ description: 'FALLBACK_PAYMENT_METHOD_MISSING' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.paymentMethodsService.remove(user.id, id);
  }
}
