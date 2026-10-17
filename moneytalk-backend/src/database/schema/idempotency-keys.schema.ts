import {
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { usersTable } from './users.schema';

/** NF-3: kết quả của request đã xử lý theo Idempotency-Key, mỗi user một không gian key. */
export const idempotencyKeysTable = pgTable(
  'idempotency_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    key: varchar({ length: 255 }).notNull(),
    // sha256 của body — cùng key mà khác body thì từ chối
    requestHash: varchar('request_hash', { length: 64 }).notNull(),
    // null = đang xử lý
    response: jsonb(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('idempotency_keys_user_key_uidx').on(table.userId, table.key),
  ],
);

export type IdempotencyKey = typeof idempotencyKeysTable.$inferSelect;
