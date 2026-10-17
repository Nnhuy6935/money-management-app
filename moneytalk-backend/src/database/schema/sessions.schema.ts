import { pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { usersTable } from './users.schema';

export const sessionsTable = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  // jti của access token hiện tại — đổi mỗi lần refresh
  jti: uuid('jti').notNull().unique(),
  // sha256 của refresh token hiện tại — đổi mỗi lần refresh
  refreshTokenHash: varchar('refresh_token_hash', { length: 64 }).unique(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  // Hết hạn của cả session (= hạn refresh token)
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});

export type Session = typeof sessionsTable.$inferSelect;
export type NewSession = typeof sessionsTable.$inferInsert;
