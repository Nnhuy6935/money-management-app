import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, lt, or, SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import {
  GROUP_INVITATION_TTL_DAYS,
  GroupInvitationStatus,
  GroupMemberRole,
  GroupStatus,
} from '../../common/constants/group.constants';
import { DRIZZLE } from '../../common/constants/injection-tokens';
import { AppException } from '../../common/exceptions';
import { isUniqueViolation } from '../../common/utils/db-error.util';
import type { Database } from '../../database/database.types';
import {
  groupInvitationsTable,
  groupMembersTable,
  groupsTable,
  usersTable,
  type GroupInvitation,
} from '../../database/schema';
import { UsersService } from '../users/users.service';
import type { ListInvitationsQueryDto } from './dto/group-requests.dto';
import type { GroupInvitationResponseDto } from './dto/group-responses.dto';
import { GroupAccessService } from './group-access.service';

const DAY_MS = 24 * 60 * 60 * 1000;

const inviter = alias(usersTable, 'inviter');
const invitee = alias(usersTable, 'invitee');

type InvitationOutcome = 'expired' | null;

@Injectable()
export class GroupInvitationsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly access: GroupAccessService,
    private readonly usersService: UsersService,
  ) {}

  /** Chỉ owner của nhóm ACTIVE. Không tự thêm người nhận vào nhóm. */
  async send(userId: string, groupId: string, rawInviteId: string) {
    const target = await this.usersService.findByInviteId(rawInviteId);
    if (!target) {
      throw AppException.inviteIdNotFound();
    }
    if (target.id === userId) {
      throw AppException.groupInviteSelf();
    }

    try {
      const invitationId = await this.db.transaction(async (tx) => {
        await this.access.requireOwner(userId, groupId, {
          executor: tx,
          lock: 'share',
        });

        if (await this.access.findActiveMembership(groupId, target.id, tx)) {
          throw AppException.groupAlreadyMember();
        }

        // Lời mời PENDING đã quá hạn không được chặn lời mời mới
        await tx
          .update(groupInvitationsTable)
          .set({ status: GroupInvitationStatus.EXPIRED, updatedAt: new Date() })
          .where(
            and(
              eq(groupInvitationsTable.groupId, groupId),
              eq(groupInvitationsTable.inviteeId, target.id),
              this.expiredPending(),
            ),
          );

        const [created] = await tx
          .insert(groupInvitationsTable)
          .values({
            groupId,
            inviterId: userId,
            inviteeId: target.id,
            expiresAt: new Date(
              Date.now() + GROUP_INVITATION_TTL_DAYS * DAY_MS,
            ),
          })
          .returning({ id: groupInvitationsTable.id });

        return created.id;
      });

      return this.findOneResponse(invitationId);
    } catch (error) {
      if (isUniqueViolation(error, 'group_invitations_pending_uidx')) {
        throw AppException.invitationAlreadyPending();
      }
      throw error;
    }
  }

  listReceived(userId: string, query: ListInvitationsQueryDto) {
    return this.list(eq(groupInvitationsTable.inviteeId, userId), query);
  }

  listSent(userId: string, query: ListInvitationsQueryDto) {
    return this.list(eq(groupInvitationsTable.inviterId, userId), query);
  }

  /**
   * Chỉ người nhận. Tạo membership + ACCEPTED trong 1 DB transaction.
   * Khoá dòng lời mời (FOR UPDATE) → 2 request accept song song chỉ 1 cái thành công;
   * khoá share dòng nhóm → không chen được với thao tác giải tán.
   */
  async accept(userId: string, invitationId: string) {
    let outcome: InvitationOutcome;
    try {
      outcome = await this.db.transaction(async (tx) => {
        const invitation = await this.lockForInvitee(tx, userId, invitationId);
        if (this.isExpired(invitation)) {
          await this.setStatus(
            tx,
            invitation.id,
            GroupInvitationStatus.EXPIRED,
          );
          return 'expired';
        }

        const [group] = await tx
          .select()
          .from(groupsTable)
          .where(eq(groupsTable.id, invitation.groupId))
          .for('share');
        if (!group || group.status !== GroupStatus.ACTIVE) {
          throw AppException.groupArchived();
        }

        if (await this.access.findActiveMembership(group.id, userId, tx)) {
          throw AppException.groupAlreadyMember();
        }

        await tx.insert(groupMembersTable).values({
          groupId: group.id,
          userId,
          role: GroupMemberRole.MEMBER,
        });
        await this.setStatus(tx, invitation.id, GroupInvitationStatus.ACCEPTED);
        return null;
      });
    } catch (error) {
      if (isUniqueViolation(error, 'group_members_active_uidx')) {
        throw AppException.groupAlreadyMember();
      }
      throw error;
    }

    // Ném sau khi commit để trạng thái EXPIRED được lưu lại
    if (outcome === 'expired') {
      throw AppException.invitationExpired();
    }
    return this.findOneResponse(invitationId);
  }

  async reject(userId: string, invitationId: string) {
    const outcome = await this.db.transaction(async (tx) => {
      const invitation = await this.lockForInvitee(tx, userId, invitationId);
      if (this.isExpired(invitation)) {
        await this.setStatus(tx, invitation.id, GroupInvitationStatus.EXPIRED);
        return 'expired' as const;
      }
      await this.setStatus(tx, invitation.id, GroupInvitationStatus.REJECTED);
      return null;
    });

    if (outcome === 'expired') {
      throw AppException.invitationExpired();
    }
    return this.findOneResponse(invitationId);
  }

  /** Chỉ người gửi; giữ bản ghi (CANCELLED) để lưu lịch sử. */
  async cancel(userId: string, invitationId: string) {
    await this.db.transaction(async (tx) => {
      const invitation = await this.lockVisible(tx, userId, invitationId);
      if (invitation.inviterId !== userId) {
        throw AppException.invitationAccessDenied();
      }
      if (invitation.status !== GroupInvitationStatus.PENDING) {
        throw AppException.invitationNotPending();
      }
      await this.setStatus(tx, invitation.id, GroupInvitationStatus.CANCELLED);
    });

    return this.findOneResponse(invitationId);
  }

  private async list(scope: SQL, query: ListInvitationsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    // Hết hạn được ghi nhận lúc đọc — không cần background job
    await this.db
      .update(groupInvitationsTable)
      .set({ status: GroupInvitationStatus.EXPIRED, updatedAt: new Date() })
      .where(and(scope, this.expiredPending()));

    const where = and(
      scope,
      query.status ? eq(groupInvitationsTable.status, query.status) : undefined,
    );

    const [totalRow] = await this.db
      .select({ total: count() })
      .from(groupInvitationsTable)
      .where(where);

    const rows = await this.selectResponses()
      .where(where)
      .orderBy(
        desc(groupInvitationsTable.createdAt),
        desc(groupInvitationsTable.id),
      )
      .limit(limit)
      .offset((page - 1) * limit);

    return {
      data: rows,
      meta: { page, limit, total: Number(totalRow?.total ?? 0) },
    };
  }

  /** Người gửi và người nhận thấy được lời mời; người khác → 404. */
  private async lockVisible(
    tx: Pick<Database, 'select'>,
    userId: string,
    invitationId: string,
  ): Promise<GroupInvitation> {
    const [invitation] = await tx
      .select()
      .from(groupInvitationsTable)
      .where(
        and(
          eq(groupInvitationsTable.id, invitationId),
          or(
            eq(groupInvitationsTable.inviteeId, userId),
            eq(groupInvitationsTable.inviterId, userId),
          ),
        ),
      )
      .for('update');

    if (!invitation) {
      throw AppException.invitationNotFound(invitationId);
    }
    return invitation;
  }

  private async lockForInvitee(
    tx: Pick<Database, 'select'>,
    userId: string,
    invitationId: string,
  ) {
    const invitation = await this.lockVisible(tx, userId, invitationId);
    if (invitation.inviteeId !== userId) {
      throw AppException.invitationAccessDenied();
    }
    if (invitation.status !== GroupInvitationStatus.PENDING) {
      throw AppException.invitationNotPending();
    }
    return invitation;
  }

  private isExpired(invitation: GroupInvitation) {
    return !!invitation.expiresAt && invitation.expiresAt <= new Date();
  }

  private expiredPending() {
    return and(
      eq(groupInvitationsTable.status, GroupInvitationStatus.PENDING),
      lt(groupInvitationsTable.expiresAt, new Date()),
    );
  }

  private setStatus(
    tx: Pick<Database, 'update'>,
    invitationId: string,
    status: GroupInvitationStatus,
  ) {
    return tx
      .update(groupInvitationsTable)
      .set({ status, updatedAt: new Date() })
      .where(eq(groupInvitationsTable.id, invitationId));
  }

  private selectResponses() {
    return this.db
      .select({
        id: groupInvitationsTable.id,
        status: groupInvitationsTable.status,
        group: { id: groupsTable.id, name: groupsTable.name },
        inviter: {
          id: inviter.id,
          name: inviter.name,
          inviteId: inviter.inviteId,
        },
        invitee: {
          id: invitee.id,
          name: invitee.name,
          inviteId: invitee.inviteId,
        },
        createdAt: groupInvitationsTable.createdAt,
        updatedAt: groupInvitationsTable.updatedAt,
        expiresAt: groupInvitationsTable.expiresAt,
      })
      .from(groupInvitationsTable)
      .innerJoin(groupsTable, eq(groupInvitationsTable.groupId, groupsTable.id))
      .innerJoin(inviter, eq(groupInvitationsTable.inviterId, inviter.id))
      .innerJoin(invitee, eq(groupInvitationsTable.inviteeId, invitee.id))
      .$dynamic();
  }

  private async findOneResponse(
    invitationId: string,
  ): Promise<GroupInvitationResponseDto> {
    const [row] = await this.selectResponses().where(
      eq(groupInvitationsTable.id, invitationId),
    );
    return row;
  }
}
