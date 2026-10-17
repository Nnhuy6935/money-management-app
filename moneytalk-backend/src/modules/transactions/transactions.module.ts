import { Module } from '@nestjs/common';
import { PaymentMethodsModule } from '../payment-methods/payment-methods.module';
import { UploadsModule } from '../uploads/uploads.module';
import { IdempotencyService } from './idempotency.service';
import { TransactionTypesController } from './transaction-types.controller';
import { TransactionTypesService } from './transaction-types.service';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

@Module({
  imports: [UploadsModule, PaymentMethodsModule],
  controllers: [TransactionTypesController, TransactionsController],
  providers: [TransactionTypesService, TransactionsService, IdempotencyService],
  exports: [TransactionsService, TransactionTypesService],
})
export class TransactionsModule {}
