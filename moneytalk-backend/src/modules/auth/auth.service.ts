import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { and, eq, gt } from 'drizzle-orm';
import { DRIZZLE } from '../../common/constants/injection-tokens';
import { AppException } from '../../common/exceptions';
import {
  normalizeEmail,
  validateRegisterEmail,
} from '../../common/utils/email.util';
import type { Database } from '../../database/database.types';
import { sessionsTable, type PublicUser } from '../../database/schema';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UsersService } from '../users/users.service';
import { REFRESH_TOKEN_TTL_DAYS } from './auth.constants';
import { LoginDto } from './dto/login.dto';

const DAY_MS = 24 * 60 * 60 * 1000;

function hashRefreshToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @Inject(DRIZZLE) private readonly db: Database,
  ) {}

  async register(dto: CreateUserDto) {
    const email = await validateRegisterEmail(dto.email);

    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      throw AppException.emailInUse();
    }

    const user = await this.usersService.create({
      ...dto,
      email,
    });

    return this.startSession(user);
  }

  async login(dto: LoginDto) {
    const email = normalizeEmail(dto.email);
    const user = await this.usersService.findByEmail(email);

    // Cùng 1 lỗi cho sai email và sai mật khẩu
    if (!user) {
      throw AppException.invalidCredentials();
    }

    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) {
      throw AppException.invalidCredentials();
    }

    return this.startSession(this.usersService.toPublicUser(user));
  }

  /** N-01: đổi refresh token lấy cặp token mới; refresh token cũ hết hiệu lực. */
  async refresh(refreshToken: string) {
    const [session] = await this.db
      .select()
      .from(sessionsTable)
      .where(
        and(
          eq(sessionsTable.refreshTokenHash, hashRefreshToken(refreshToken)),
          gt(sessionsTable.expiresAt, new Date()),
        ),
      );

    if (!session) {
      throw AppException.invalidRefreshToken();
    }

    const user = await this.usersService.findOne(session.userId);
    const tokens = this.issueTokens(user);

    // So khớp lại hash cũ để 2 request refresh song song không cùng thành công
    const [rotated] = await this.db
      .update(sessionsTable)
      .set({
        jti: tokens.jti,
        refreshTokenHash: hashRefreshToken(tokens.refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * DAY_MS),
      })
      .where(
        and(
          eq(sessionsTable.id, session.id),
          eq(sessionsTable.refreshTokenHash, session.refreshTokenHash!),
        ),
      )
      .returning({ id: sessionsTable.id });

    if (!rotated) {
      throw AppException.invalidRefreshToken();
    }

    return {
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn,
      refreshToken: tokens.refreshToken,
    };
  }

  async me(userId: string) {
    return this.usersService.findOne(userId);
  }

  /** Xoá session → thu hồi cả access token lẫn refresh token. */
  async logout(jti: string) {
    await this.db.delete(sessionsTable).where(eq(sessionsTable.jti, jti));

    return {
      message: 'Đăng xuất thành công',
    };
  }

  private async startSession(user: PublicUser) {
    const tokens = this.issueTokens(user);

    await this.db.insert(sessionsTable).values({
      userId: user.id,
      jti: tokens.jti,
      refreshTokenHash: hashRefreshToken(tokens.refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * DAY_MS),
    });

    return {
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn,
      refreshToken: tokens.refreshToken,
      user,
    };
  }

  private issueTokens(user: Pick<PublicUser, 'id' | 'email' | 'role'>) {
    const jti = randomUUID();
    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      jti,
    });

    const decoded = this.jwtService.decode<{ exp: number; iat: number }>(
      accessToken,
    );

    return {
      jti,
      accessToken,
      expiresIn: decoded.exp - decoded.iat,
      refreshToken: randomBytes(48).toString('base64url'),
    };
  }
}
