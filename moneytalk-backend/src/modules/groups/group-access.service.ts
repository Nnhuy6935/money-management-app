import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import {
  GroupMemberRole,
  GroupStatus,
} from '../../common/constants/group.constants';
import { DRIZZLE } from '../../common/constants/injection-tokens';
import { AppException } from '../../common/exceptions';
import type { Database } from '../../database/database.types';
import {
  groupMembersTable,
  groupsTable,
  type Group,
  type GroupMember,
} from '../../database/schema';

/** Executor dùng được cả trong lẫn ngoài DB transaction. */
export type Executor = Pick<Database, 'select'>;

export type GroupAccessOptions = {
  executor?: Executor;
  /**
   * Khoá dòng `groups` tới hết DB transaction hiện tại.
   * 'share' cho thao tác ghi dữ liệu trong nhóm; 'update' cho thao tác đổi chính nhóm (giải tán, chuyển owner…).
   * Nhờ vậy giải tán nhóm và tạo giao dịch / nhận lời mời không chen nhau được.
   */
  lock?: 'share' | 'update';
};

/** Kiểm tra quyền nhóm — dùng chung cho groups, invitations và transactions. */
@Injectable()
export class GroupAccessService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * User phải là thành viên đang hoạt động của nhóm đang ACTIVE.
   * Không phải thành viên → 404 (không tiết lộ nhóm tồn tại). Nhóm đã giải tán → 409.
   */
  async requireActiveMembership(
    userId: string,
    groupId: string,
    { executor = this.db, lock }: GroupAccessOptions = {},
  ): Promise<{ group: Group; membership: GroupMember }> {
    const groupQuery = executor
      .select()
      .from(groupsTable)
      .where(eq(groupsTable.id, groupId));
    const [group] = await (lock ? groupQuery.for(lock) : groupQuery);

    const membership = group
      ? await this.findActiveMembership(group.id, userId, executor)
      : null;

    if (!group || !membership) {
      throw AppException.groupNotFound(groupId);
    }

    if (group.status !== GroupStatus.ACTIVE) {
      throw AppException.groupArchived();
    }

    return { group, membership };
  }

  async requireOwner(
    userId: string,
    groupId: string,
    options: GroupAccessOptions = {},
  ) {
    const access = await this.requireActiveMembership(userId, groupId, options);
    if (access.membership.role !== GroupMemberRole.OWNER) {
      throw AppException.groupOwnerOnly();
    }
    return access;
  }

  async findActiveMembership(
    groupId: string,
    userId: string,
    executor: Executor = this.db,
  ): Promise<GroupMember | null> {
    const [membership] = await executor
      .select()
      .from(groupMembersTable)
      .where(
        and(
          eq(groupMembersTable.groupId, groupId),
          eq(groupMembersTable.userId, userId),
          isNull(groupMembersTable.leftAt),
        ),
      );

    return membership ?? null;
  }
}
