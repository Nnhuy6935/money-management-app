import {
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { transactionFlowEnum } from './transaction.constants';
import { transactionTypesTable } from './transaction-types.schema';
import { usersTable } from './users.schema';

export const transactionsTable = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  typeId: uuid('type_id').references(() => transactionTypesTable.id),
  flow: transactionFlowEnum('flow').notNull(),
  amount: numeric({ precision: 15, scale: 2 }).notNull(),
  description: text(),
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
});

export type Transaction = typeof transactionsTable.$inferSelect;
export type NewTransaction = typeof transactionsTable.$inferInsert;
