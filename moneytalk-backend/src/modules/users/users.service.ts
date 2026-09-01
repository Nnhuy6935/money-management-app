import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../common/constants/injection-tokens';
import { UserRole } from '../../common/constants/roles';
import { normalizeEmail } from '../../common/utils/email.util';
import type { Database } from '../../database/database.types';
import { usersTable, type PublicUser, type User } from '../../database/schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

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
      throw new ConflictException('Email đã được sử dụng, không thể đăng ký');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const [user] = await this.db
      .insert(usersTable)
      .values({
        email,
        passwordHash,
        role: UserRole.USER,
      })
      .returning();

    return this.toPublicUser(user);
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
        throw new ConflictException('Email đã được sử dụng');
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
