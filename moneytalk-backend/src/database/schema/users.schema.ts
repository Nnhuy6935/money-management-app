import { pgEnum, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { UserRole } from '../../common/constants/roles';

export const userRoleEnum = pgEnum('user_role', [
  UserRole.ADMIN,
  UserRole.USER,
]);

export const usersTable = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar({ length: 255 }),
  email: varchar({ length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: userRoleEnum('role').notNull().default(UserRole.USER),
  // Mã mời vào nhóm — backend tự sinh, client không sửa được
  inviteId: varchar('invite_id', { length: 16 }).notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
export type PublicUser = Omit<User, 'passwordHash'>;
