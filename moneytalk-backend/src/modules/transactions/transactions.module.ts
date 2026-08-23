import { Module } from '@nestjs/common';
import { UploadsModule } from '../uploads/uploads.module';
import { TransactionTypesController } from './transaction-types.controller';
import { TransactionTypesService } from './transaction-types.service';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

@Module({
  imports: [UploadsModule],
  controllers: [TransactionTypesController, TransactionsController],
  providers: [TransactionTypesService, TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
