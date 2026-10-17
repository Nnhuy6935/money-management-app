import {
  bigint,
  index,
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { transactionTypesTable } from './transaction-types.schema';
import { transactionsTable } from './transactions.schema';

export const receiptItemsTable = pgTable(
  'receipt_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    transactionId: uuid('transaction_id')
      .notNull()
      .references(() => transactionsTable.id, { onDelete: 'cascade' }),
    name: varchar({ length: 255 }).notNull(),
    // null = không đọc được giá
    amount: bigint({ mode: 'number' }),
    typeId: uuid('type_id').references(() => transactionTypesTable.id),
    position: integer().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('receipt_items_transaction_idx').on(
      table.transactionId,
      table.position,
    ),
  ],
);

export type ReceiptItem = typeof receiptItemsTable.$inferSelect;
export type NewReceiptItem = typeof receiptItemsTable.$inferInsert;
