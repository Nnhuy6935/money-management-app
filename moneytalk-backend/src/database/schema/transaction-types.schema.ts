import { sql } from 'drizzle-orm';
import {
  boolean,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { transactionFlowEnum } from './transaction.constants';
import { usersTable } from './users.schema';

export const transactionTypesTable = pgTable(
  'transaction_types',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: integer('user_id').references(() => usersTable.id, {
      onDelete: 'cascade',
    }),
    code: varchar({ length: 50 }).notNull(),
    name: varchar({ length: 100 }).notNull(),
    flow: transactionFlowEnum('flow').notNull(),
    isDefault: boolean('is_default').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('transaction_types_default_code_flow_uidx')
      .on(table.code, table.flow)
      .where(sql`${table.userId} is null`),
    uniqueIndex('transaction_types_user_code_flow_uidx')
      .on(table.userId, table.code, table.flow)
      .where(sql`${table.userId} is not null`),
  ],
);

export type TransactionType = typeof transactionTypesTable.$inferSelect;
export type NewTransactionType = typeof transactionTypesTable.$inferInsert;
