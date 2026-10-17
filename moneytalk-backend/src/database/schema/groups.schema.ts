import { sql } from 'drizzle-orm';
import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import {
  GROUP_INVITATION_STATUSES,
  GROUP_MEMBER_ROLES,
  GROUP_STATUSES,
  GroupInvitationStatus,
  GroupMemberRole,
  GroupStatus,
} from '../../common/constants/group.constants';
import { usersTable } from './users.schema';

export const groupStatusEnum = pgEnum('group_status', GROUP_STATUSES);
export const groupMemberRoleEnum = pgEnum(
  'group_member_role',
  GROUP_MEMBER_ROLES,
);
export const groupInvitationStatusEnum = pgEnum(
  'group_invitation_status',
  GROUP_INVITATION_STATUSES,
);

export const groupsTable = pgTable('groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar({ length: 100 }).notNull(),
  description: text(),
  // Không cascade: không để xoá user kéo theo xoá dữ liệu nhóm của người khác
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => usersTable.id),
  status: groupStatusEnum('status').notNull().default(GroupStatus.ACTIVE),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});

export const groupMembersTable = pgTable(
  'group_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    groupId: uuid('group_id')
      .notNull()
      .references(() => groupsTable.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    role: groupMemberRoleEnum('role').notNull().default(GroupMemberRole.MEMBER),
    joinedAt: timestamp('joined_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    // null = đang là thành viên; có giá trị = đã rời / bị xoá (giữ lịch sử)
    leftAt: timestamp('left_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('group_members_active_uidx')
      .on(table.groupId, table.userId)
      .where(sql`${table.leftAt} is null`),
    uniqueIndex('group_members_one_owner_uidx')
      .on(table.groupId)
      .where(sql`${table.role} = 'OWNER' and ${table.leftAt} is null`),
    index('group_members_user_idx').on(table.userId),
  ],
);

export const groupInvitationsTable = pgTable(
  'group_invitations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    groupId: uuid('group_id')
      .notNull()
      .references(() => groupsTable.id, { onDelete: 'cascade' }),
    inviterId: uuid('inviter_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    inviteeId: uuid('invitee_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    status: groupInvitationStatusEnum('status')
      .notNull()
      .default(GroupInvitationStatus.PENDING),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('group_invitations_pending_uidx')
      .on(table.groupId, table.inviteeId)
      .where(sql`${table.status} = 'PENDING'`),
    index('group_invitations_invitee_status_idx').on(
      table.inviteeId,
      table.status,
    ),
    index('group_invitations_group_status_idx').on(table.groupId, table.status),
    index('group_invitations_inviter_status_idx').on(
      table.inviterId,
      table.status,
    ),
  ],
);

export type Group = typeof groupsTable.$inferSelect;
export type GroupMember = typeof groupMembersTable.$inferSelect;
export type GroupInvitation = typeof groupInvitationsTable.$inferSelect;
