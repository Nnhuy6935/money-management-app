import { index, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { usersTable } from './users.schema';

/**
 * NF-4: ảnh đã upload nhưng chưa gắn vào giao dịch.
 * Dòng bị xoá khi giao dịch dùng ảnh được tạo; còn lại quá hạn sẽ bị dọn (cả object R2).
 */
export const pendingUploadsTable = pgTable(
  'pending_uploads',
  {
    key: varchar({ length: 512 }).primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index('pending_uploads_created_at_idx').on(table.createdAt)],
);

export type PendingUpload = typeof pendingUploadsTable.$inferSelect;
