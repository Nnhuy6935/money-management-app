import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../common/constants/injection-tokens';
import { UserRole } from '../../common/constants/roles';
import { AppException } from '../../common/exceptions';
import { isUniqueViolation } from '../../common/utils/db-error.util';
import { normalizeEmail } from '../../common/utils/email.util';
import {
  generateInviteId,
  INVITE_ID_PATTERN,
  normalizeInviteId,
} from '../../common/utils/invite-id.util';
import type { Database } from '../../database/database.types';
import { usersTable, type PublicUser, type User } from '../../database/schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const MAX_INVITE_ID_ATTEMPTS = 5;

@Injectable()
export class UsersService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  toPublicUser(user: User): PublicUser {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _passwordHash, ...publicUser } = user;
    return publicUser;
  }

  async findAll() {
    const users = await this.db.select().from(usersTable);
    return users.map((user) => this.toPublicUser(user));
  }

  async findOne(id: string) {
    const [user] = await this.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, id));

    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }

    return this.toPublicUser(user);
  }

  async findByEmail(email: string) {
    const normalized = normalizeEmail(email);
    const [user] = await this.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, normalized));

    return user ?? null;
  }

  async create(dto: CreateUserDto) {
    const email = normalizeEmail(dto.email);

    const existing = await this.findByEmail(email);
    if (existing) {
      throw AppException.emailInUse();
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Sinh lại inviteId nếu trùng (xác suất rất thấp)
    for (let attempt = 1; ; attempt++) {
      try {
        const [user] = await this.db
          .insert(usersTable)
          .values({
            email,
            name: dto.name ?? null,
            passwordHash,
            role: UserRole.USER,
            inviteId: generateInviteId(),
          })
          .returning();

        return this.toPublicUser(user);
      } catch (error) {
        if (
          attempt < MAX_INVITE_ID_ATTEMPTS &&
          isUniqueViolation(error, 'users_invite_id_key')
        ) {
          continue;
        }
        throw error;
      }
    }
  }

  /** Tra cứu bằng mã mời — chỉ trả thông tin tối thiểu, không có email. */
  async lookupByInviteId(rawInviteId: string) {
    const user = await this.findByInviteId(rawInviteId);
    if (!user) {
      throw AppException.inviteIdNotFound();
    }
    return { inviteId: user.inviteId, name: user.name };
  }

  async findByInviteId(rawInviteId: string) {
    const inviteId = normalizeInviteId(rawInviteId);
    if (!INVITE_ID_PATTERN.test(inviteId)) {
      return null;
    }

    const [user] = await this.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.inviteId, inviteId));

    return user ?? null;
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);

    const payload = {
      ...dto,
      ...(dto.email ? { email: normalizeEmail(dto.email) } : {}),
      updatedAt: new Date(),
    };

    if (payload.email) {
      const existing = await this.findByEmail(payload.email);
      if (existing && existing.id !== id) {
        throw AppException.emailInUse();
      }
    }

    const [user] = await this.db
      .update(usersTable)
      .set(payload)
      .where(eq(usersTable.id, id))
      .returning();

    return this.toPublicUser(user);
  }

  async remove(id: string) {
    await this.findOne(id);

    const [user] = await this.db
      .delete(usersTable)
      .where(eq(usersTable.id, id))
      .returning();

    return this.toPublicUser(user);
  }
}
