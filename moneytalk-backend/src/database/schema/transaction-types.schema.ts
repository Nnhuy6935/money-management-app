import { integer, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';

export const transactionTypesTable = pgTable('transaction_types', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  code: varchar({ length: 50 }).notNull().unique(),
  name: varchar({ length: 100 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type TransactionType = typeof transactionTypesTable.$inferSelect;
