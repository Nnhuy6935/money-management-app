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
import { usersTable } from './users.schema';

export const paymentMethodsTable = pgTable(
  'payment_methods',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => usersTable.id, {
      onDelete: 'cascade',
    }),
    code: varchar({ length: 50 }).notNull(),
    name: varchar({ length: 100 }).notNull(),
    description: text(),
    iconKey: varchar('icon_key', { length: 50 }).notNull(),
    color: varchar({ length: 7 }).notNull(),
    isDefault: boolean('is_default').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('payment_methods_default_code_uidx')
      .on(table.code)
      .where(sql`${table.userId} is null`),
    uniqueIndex('payment_methods_user_code_uidx')
      .on(table.userId, table.code)
      .where(sql`${table.userId} is not null`),
  ],
);

export type PaymentMethod = typeof paymentMethodsTable.$inferSelect;
export type NewPaymentMethod = typeof paymentMethodsTable.$inferInsert;
