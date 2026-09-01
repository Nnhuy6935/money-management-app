import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, or } from 'drizzle-orm';
import { FriendRequestStatus } from '../../common/constants/friend.constants';
import { AppException } from '../../common/exceptions';
import { DRIZZLE } from '../../common/constants/injection-tokens';
import type { Database } from '../../database/database.types';
import {
  friendRequestsTable,
  usersTable,
  type FriendRequest,
} from '../../database/schema';
import { UsersService } from '../users/users.service';

@Injectable()
export class FriendsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly usersService: UsersService,
  ) {}

  async sendRequest(requesterId: string, addresseeId: string) {
    if (requesterId === addresseeId) {
      throw AppException.friendCannotAddSelf();
    }

    await this.usersService.findOne(addresseeId);

    if (await this.areFriends(requesterId, addresseeId)) {
      throw AppException.friendAlreadyFriends();
    }

    const outgoing = await this.findDirectedRequest(requesterId, addresseeId);
    if (outgoing?.status === FriendRequestStatus.PENDING) {
      throw AppException.friendRequestAlreadySent();
    }

    const incoming = await this.findDirectedRequest(addresseeId, requesterId);
    if (incoming?.status === FriendRequestStatus.PENDING) {
      return this.acceptRequestRecord(incoming);
    }

    if (outgoing?.status === FriendRequestStatus.REJECTED) {
      const [updated] = await this.db
        .update(friendRequestsTable)
        .set({
          status: FriendRequestStatus.PENDING,
          updatedAt: new Date(),
        })
        .where(eq(friendRequestsTable.id, outgoing.id))
        .returning();

      return this.getRequestById(updated.id);
    }

    const [created] = await this.db
      .insert(friendRequestsTable)
      .values({
        requesterId,
        addresseeId,
        status: FriendRequestStatus.PENDING,
      })
      .returning();

    return this.getRequestById(created.id);
  }

  async listFriends(userId: string) {
    const rows = await this.db
      .select()
      .from(friendRequestsTable)
      .where(
        and(
          eq(friendRequestsTable.status, FriendRequestStatus.ACCEPTED),
          or(
            eq(friendRequestsTable.requesterId, userId),
            eq(friendRequestsTable.addresseeId, userId),
          ),
        ),
      )
      .orderBy(desc(friendRequestsTable.updatedAt));

    return Promise.all(
      rows.map(async (request) => {
        const friendUserId =
          request.requesterId === userId
            ? request.addresseeId
            : request.requesterId;
        const friend = await this.getUserRow(friendUserId);

        return {
          friendshipId: request.id,
          user: this.usersService.toPublicUser(friend),
          friendsSince: request.updatedAt,
        };
      }),
    );
  }

  async listIncomingRequests(userId: string) {
    const rows = await this.db
      .select()
      .from(friendRequestsTable)
      .where(
        and(
          eq(friendRequestsTable.addresseeId, userId),
          eq(friendRequestsTable.status, FriendRequestStatus.PENDING),
        ),
      )
      .orderBy(desc(friendRequestsTable.createdAt));

    return Promise.all(rows.map((row) => this.toRequestResponse(row)));
  }

  async listOutgoingRequests(userId: string) {
    const rows = await this.db
      .select()
      .from(friendRequestsTable)
      .where(
        and(
          eq(friendRequestsTable.requesterId, userId),
          eq(friendRequestsTable.status, FriendRequestStatus.PENDING),
        ),
      )
      .orderBy(desc(friendRequestsTable.createdAt));

    return Promise.all(rows.map((row) => this.toRequestResponse(row)));
  }

  async acceptRequest(userId: string, requestId: string) {
    const request = await this.requireRequest(requestId);

    if (request.addresseeId !== userId) {
      throw AppException.friendRequestAccessDenied();
    }

    if (request.status !== FriendRequestStatus.PENDING) {
      throw AppException.friendRequestNotFound(requestId);
    }

    return this.acceptRequestRecord(request);
  }

  async rejectRequest(userId: string, requestId: string) {
    const request = await this.requireRequest(requestId);

    if (request.addresseeId !== userId) {
      throw AppException.friendRequestAccessDenied();
    }

    if (request.status !== FriendRequestStatus.PENDING) {
      throw AppException.friendRequestNotFound(requestId);
    }

    const [updated] = await this.db
      .update(friendRequestsTable)
      .set({
        status: FriendRequestStatus.REJECTED,
        updatedAt: new Date(),
      })
      .where(eq(friendRequestsTable.id, requestId))
      .returning();

    return this.toRequestResponse(updated);
  }

  async removeFriend(userId: string, friendUserId: string) {
    const friendship = await this.findAcceptedFriendship(userId, friendUserId);

    if (!friendship) {
      throw AppException.friendNotFriends();
    }

    await this.db
      .delete(friendRequestsTable)
      .where(eq(friendRequestsTable.id, friendship.id));

    return { removed: true, userId: friendUserId };
  }

  private async acceptRequestRecord(request: FriendRequest) {
    const [updated] = await this.db
      .update(friendRequestsTable)
      .set({
        status: FriendRequestStatus.ACCEPTED,
        updatedAt: new Date(),
      })
      .where(eq(friendRequestsTable.id, request.id))
      .returning();

    return this.toRequestResponse(updated);
  }

  private async getRequestById(id: string) {
    const request = await this.requireRequest(id);
    return this.toRequestResponse(request);
  }

  private async requireRequest(id: string) {
    const [request] = await this.db
      .select()
      .from(friendRequestsTable)
      .where(eq(friendRequestsTable.id, id));

    if (!request) {
      throw AppException.friendRequestNotFound(id);
    }

    return request;
  }

  private async findDirectedRequest(requesterId: string, addresseeId: string) {
    const [request] = await this.db
      .select()
      .from(friendRequestsTable)
      .where(
        and(
          eq(friendRequestsTable.requesterId, requesterId),
          eq(friendRequestsTable.addresseeId, addresseeId),
        ),
      );

    return request ?? null;
  }

  private async findAcceptedFriendship(userId: string, friendUserId: string) {
    const [request] = await this.db
      .select()
      .from(friendRequestsTable)
      .where(
        and(
          eq(friendRequestsTable.status, FriendRequestStatus.ACCEPTED),
          or(
            and(
              eq(friendRequestsTable.requesterId, userId),
              eq(friendRequestsTable.addresseeId, friendUserId),
            ),
            and(
              eq(friendRequestsTable.requesterId, friendUserId),
              eq(friendRequestsTable.addresseeId, userId),
            ),
          ),
        ),
      );

    return request ?? null;
  }

  private async areFriends(userId: string, otherUserId: string) {
    return !!(await this.findAcceptedFriendship(userId, otherUserId));
  }

  private async getUserRow(id: string) {
    const [user] = await this.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, id));

    if (!user) {
      throw AppException.friendUserNotFound(id);
    }

    return user;
  }

  private async toRequestResponse(request: FriendRequest) {
    const [requester, addressee] = await Promise.all([
      this.getUserRow(request.requesterId),
      this.getUserRow(request.addresseeId),
    ]);

    return {
      id: request.id,
      status: request.status,
      requester: this.usersService.toPublicUser(requester),
      addressee: this.usersService.toPublicUser(addressee),
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    };
  }
}
