import { sql } from 'drizzle-orm';
import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { transactionFlowEnum } from './transaction.constants';
import { usersTable } from './users.schema';

export const transactionTypesTable = pgTable(
  'transaction_types',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => usersTable.id, {
      onDelete: 'cascade',
    }),
    code: varchar({ length: 50 }).notNull(),
    name: varchar({ length: 100 }).notNull(),
    flow: transactionFlowEnum('flow').notNull(),
    isDefault: boolean('is_default').notNull().default(false),
    description: text(),
    iconKey: varchar('icon_key', { length: 50 }).notNull().default('other'),
    color: varchar({ length: 7 }).notNull().default('#7F96B0'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
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
