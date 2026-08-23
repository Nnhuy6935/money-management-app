import { pgEnum } from 'drizzle-orm/pg-core';
import { TRANSACTION_FLOWS } from '../../common/constants/transaction.constants';

export const transactionFlowEnum = pgEnum('transaction_flow', [
  ...TRANSACTION_FLOWS,
]);
