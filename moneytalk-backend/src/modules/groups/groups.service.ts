import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, isNull, sql } from 'drizzle-orm';
import {
  GroupInvitationStatus,
  GroupMemberRole,
  GroupStatus,
} from '../../common/constants/group.constants';
import { DRIZZLE } from '../../common/constants/injection-tokens';
import { AppException } from '../../common/exceptions';
import type { Database } from '../../database/database.types';
import {
  groupInvitationsTable,
  groupMembersTable,
  groupsTable,
  usersTable,
  type Group,
  type GroupMember,
} from '../../database/schema';
import type {
  CreateGroupDto,
  PaginationQueryDto,
  UpdateGroupDto,
} from './dto/group-requests.dto';
import type {
  GroupMemberResponseDto,
  GroupResponseDto,
} from './dto/group-responses.dto';
import { GroupAccessService, type Executor } from './group-access.service';
import { GroupSummaryService } from './group-summary.service';

/** Số thành viên đang hoạt động của nhóm (subquery tương quan). */
const activeMemberCount = sql<number>`(
  select count(*)::int from ${groupMembersTable} gm
  where gm.group_id = ${groupsTable.id} and gm.left_at is null
)`;

@Injectable()
export class GroupsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly access: GroupAccessService,
    private readonly summaries: GroupSummaryService,
  ) {}

  /** Tạo nhóm + thêm người tạo làm OWNER trong cùng DB transaction. */
  async create(userId: string, dto: CreateGroupDto) {
    const groupId = await this.db.transaction(async (tx) => {
      const [group] = await tx
        .insert(groupsTable)
        .values({
          name: dto.name,
          description: dto.description ?? null,
          ownerId: userId,
        })
        .returning({ id: groupsTable.id });

      await tx.insert(groupMembersTable).values({
        groupId: group.id,
        userId,
        role: GroupMemberRole.OWNER,
      });

      return group.id;
    });

    return this.findOne(userId, groupId);
  }

  /** Nhóm ACTIVE mà user đang là thành viên. */
  async findMine(userId: string, query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where = and(
      eq(groupMembersTable.userId, userId),
      isNull(groupMembersTable.leftAt),
      eq(groupsTable.status, GroupStatus.ACTIVE),
    );

    const [totalRow] = await this.db
      .select({ total: count() })
      .from(groupMembersTable)
      .innerJoin(groupsTable, eq(groupMembersTable.groupId, groupsTable.id))
      .where(where);

    const rows = await this.db
      .select({
        group: groupsTable,
        myRole: groupMembersTable.role,
        memberCount: activeMemberCount,
        owner: {
          id: usersTable.id,
          name: usersTable.name,
          inviteId: usersTable.inviteId,
        },
      })
      .from(groupMembersTable)
      .innerJoin(groupsTable, eq(groupMembersTable.groupId, groupsTable.id))
      .innerJoin(usersTable, eq(groupsTable.ownerId, usersTable.id))
      .where(where)
      .orderBy(desc(groupsTable.updatedAt), desc(groupsTable.id))
      .limit(limit)
      .offset((page - 1) * limit);

    const summaries = await this.summaries.loadSummaries(
      rows.map((row) => row.group.id),
    );

    return {
      data: rows.map((row) =>
        this.toResponse(
          row.group,
          row.myRole,
          row.memberCount,
          row.owner,
          summaries.get(row.group.id)!,
        ),
      ),
      meta: { page, limit, total: Number(totalRow?.total ?? 0) },
    };
  }

  async findOne(userId: string, groupId: string) {
    const { group, membership } = await this.access.requireActiveMembership(
      userId,
      groupId,
    );
    return this.buildResponse(group, membership);
  }

  /** Chỉ owner; không đổi được owner/status qua API này. */
  async update(userId: string, groupId: string, dto: UpdateGroupDto) {
    await this.db.transaction(async (tx) => {
      await this.access.requireOwner(userId, groupId, {
        executor: tx,
        lock: 'update',
      });

      await tx
        .update(groupsTable)
        .set({
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(groupsTable.id, groupId));
    });

    return this.findOne(userId, groupId);
  }

  /**
   * Giải tán = ARCHIVED, không xoá vật lý. Lời mời đang chờ → CANCELLED.
   * Khoá FOR UPDATE nên chờ các thao tác đang giữ khoá share (tạo giao dịch, nhận lời mời) xong trước.
   */
  async archive(userId: string, groupId: string) {
    return this.db.transaction(async (tx) => {
      await this.access.requireOwner(userId, groupId, {
        executor: tx,
        lock: 'update',
      });

      const now = new Date();
      await tx
        .update(groupsTable)
        .set({ status: GroupStatus.ARCHIVED, archivedAt: now, updatedAt: now })
        .where(eq(groupsTable.id, groupId));

      await tx
        .update(groupInvitationsTable)
        .set({ status: GroupInvitationStatus.CANCELLED, updatedAt: now })
        .where(
          and(
            eq(groupInvitationsTable.groupId, groupId),
            eq(groupInvitationsTable.status, GroupInvitationStatus.PENDING),
          ),
        );

      return { archived: true, id: groupId };
    });
  }

  async listMembers(
    userId: string,
    groupId: string,
  ): Promise<GroupMemberResponseDto[]> {
    await this.access.requireActiveMembership(userId, groupId);

    const rows = await this.db
      .select({
        userId: groupMembersTable.userId,
        name: usersTable.name,
        inviteId: usersTable.inviteId,
        role: groupMembersTable.role,
        joinedAt: groupMembersTable.joinedAt,
      })
      .from(groupMembersTable)
      .innerJoin(usersTable, eq(groupMembersTable.userId, usersTable.id))
      .where(
        and(
          eq(groupMembersTable.groupId, groupId),
          isNull(groupMembersTable.leftAt),
        ),
      )
      // OWNER trước, rồi theo thời điểm tham gia
      .orderBy(
        desc(sql`${groupMembersTable.role} = 'OWNER'`),
        asc(groupMembersTable.joinedAt),
      );

    return rows;
  }

  /** Owner xoá thành viên khác. Giao dịch nhóm của người đó được giữ nguyên. */
  async removeMember(userId: string, groupId: string, targetUserId: string) {
    return this.db.transaction(async (tx) => {
      await this.access.requireOwner(userId, groupId, {
        executor: tx,
        lock: 'update',
      });

      const target = await this.requireMember(tx, groupId, targetUserId);
      if (target.role === GroupMemberRole.OWNER) {
        throw AppException.groupCannotRemoveOwner();
      }

      await this.markLeft(tx, target.id);
      return { removed: true, userId: targetUserId };
    });
  }

  /** Member tự rời nhóm; owner phải chuyển quyền hoặc giải tán trước. */
  async leave(userId: string, groupId: string) {
    return this.db.transaction(async (tx) => {
      const { membership } = await this.access.requireActiveMembership(
        userId,
        groupId,
        { executor: tx, lock: 'update' },
      );

      if (membership.role === GroupMemberRole.OWNER) {
        throw AppException.groupOwnerCannotLeave();
      }

      await this.markLeft(tx, membership.id);
      return { left: true, id: groupId };
    });
  }

  /** Đổi owner_id và role 2 bên trong cùng DB transaction. */
  async transferOwnership(userId: string, groupId: string, newOwnerId: string) {
    await this.db.transaction(async (tx) => {
      const { membership: current } = await this.access.requireOwner(
        userId,
        groupId,
        { executor: tx, lock: 'update' },
      );

      if (newOwnerId === userId) {
        throw AppException.groupTransferToSelf();
      }

      const next = await this.requireMember(tx, groupId, newOwnerId);

      // Hạ owner cũ trước: index chỉ cho phép 1 OWNER đang hoạt động
      await tx
        .update(groupMembersTable)
        .set({ role: GroupMemberRole.MEMBER })
        .where(eq(groupMembersTable.id, current.id));
      await tx
        .update(groupMembersTable)
        .set({ role: GroupMemberRole.OWNER })
        .where(eq(groupMembersTable.id, next.id));
      await tx
        .update(groupsTable)
        .set({ ownerId: newOwnerId, updatedAt: new Date() })
        .where(eq(groupsTable.id, groupId));
    });

    return this.findOne(userId, groupId);
  }

  private async requireMember(
    executor: Executor,
    groupId: string,
    userId: string,
  ) {
    const member = await this.access.findActiveMembership(
      groupId,
      userId,
      executor,
    );
    if (!member) {
      throw AppException.groupMemberNotFound();
    }
    return member;
  }

  private markLeft(executor: Pick<Database, 'update'>, membershipId: string) {
    return executor
      .update(groupMembersTable)
      .set({ leftAt: new Date() })
      .where(eq(groupMembersTable.id, membershipId));
  }

  private async buildResponse(group: Group, membership: GroupMember) {
    const [[owner], [{ memberCount }], summaries] = await Promise.all([
      this.db
        .select({
          id: usersTable.id,
          name: usersTable.name,
          inviteId: usersTable.inviteId,
        })
        .from(usersTable)
        .where(eq(usersTable.id, group.ownerId)),
      this.db
        .select({ memberCount: count() })
        .from(groupMembersTable)
        .where(
          and(
            eq(groupMembersTable.groupId, group.id),
            isNull(groupMembersTable.leftAt),
          ),
        ),
      this.summaries.loadSummaries([group.id]),
    ]);

    return this.toResponse(
      group,
      membership.role,
      memberCount,
      owner,
      summaries.get(group.id)!,
    );
  }

  private toResponse(
    group: Group,
    myRole: GroupMemberRole,
    memberCount: number,
    owner: GroupResponseDto['owner'],
    summary: GroupResponseDto['summary'],
  ): GroupResponseDto {
    return {
      id: group.id,
      name: group.name,
      description: group.description,
      status: group.status,
      owner,
      myRole,
      memberCount: Number(memberCount),
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
      summary,
    };
  }
}
