import {
  bigint,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { groupsTable } from './groups.schema';
import { paymentMethodsTable } from './payment-methods.schema';
import { transactionFlowEnum } from './transaction.constants';
import { transactionTypesTable } from './transaction-types.schema';
import { usersTable } from './users.schema';

export const transactionsTable = pgTable(
  'transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    typeId: uuid('type_id').references(() => transactionTypesTable.id),
    paymentMethodId: uuid('payment_method_id').references(
      () => paymentMethodsTable.id,
    ),
    // null = giao dịch cá nhân; có giá trị = giao dịch của nhóm đó
    groupId: uuid('group_id').references(() => groupsTable.id),
    flow: transactionFlowEnum('flow').notNull(),
    // VND, số nguyên
    amount: bigint({ mode: 'number' }).notNull(),
    description: text(),
    spentAt: timestamp('spent_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    imageKey: varchar('image_key', { length: 512 }).notNull(),
    imageUrl: varchar('image_url', { length: 1024 }).notNull(),
    contentType: varchar('content_type', { length: 100 }).notNull(),
    fileSize: integer('file_size').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('transactions_user_spent_at_idx').on(table.userId, table.spentAt),
    index('transactions_group_spent_at_idx').on(table.groupId, table.spentAt),
  ],
);

export type Transaction = typeof transactionsTable.$inferSelect;
export type NewTransaction = typeof transactionsTable.$inferInsert;
