import {
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import {
  FRIEND_REQUEST_STATUSES,
  FriendRequestStatus,
} from '../../common/constants/friend.constants';
import { usersTable } from './users.schema';

export const friendRequestStatusEnum = pgEnum(
  'friend_request_status',
  FRIEND_REQUEST_STATUSES,
);

export const friendRequestsTable = pgTable(
  'friend_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    requesterId: uuid('requester_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    addresseeId: uuid('addressee_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    status: friendRequestStatusEnum('status')
      .notNull()
      .default(FriendRequestStatus.PENDING),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('friend_requests_pair_uidx').on(
      table.requesterId,
      table.addresseeId,
    ),
  ],
);

export type FriendRequest = typeof friendRequestsTable.$inferSelect;
export type NewFriendRequest = typeof friendRequestsTable.$inferInsert;
