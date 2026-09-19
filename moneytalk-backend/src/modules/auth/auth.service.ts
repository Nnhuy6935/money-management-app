import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../common/constants/injection-tokens';
import {
  normalizeEmail,
  validateRegisterEmail,
} from '../../common/utils/email.util';
import type { Database } from '../../database/database.types';
import { sessionsTable, type PublicUser } from '../../database/schema';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';

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
      throw new ConflictException('Email đã được sử dụng, không thể đăng ký');
    }

    const user = await this.usersService.create({
      ...dto,
      email,
    });

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto) {
    const email = normalizeEmail(dto.email);
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const publicUser = this.usersService.toPublicUser(user);
    return this.buildAuthResponse(publicUser);
  }

  async me(userId: string) {
    return this.usersService.findOne(userId);
  }

  async logout(jti: string) {
    await this.db.delete(sessionsTable).where(eq(sessionsTable.jti, jti));

    return {
      message: 'Đăng xuất thành công',
    };
  }

  private async buildAuthResponse(user: PublicUser) {
    const jti = randomUUID();
    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      jti,
    });

    const decoded = this.jwtService.decode<{ exp: number }>(accessToken);

    await this.db.insert(sessionsTable).values({
      userId: user.id,
      jti,
      expiresAt: new Date(decoded.exp * 1000),
    });

    return {
      accessToken,
    };
  }
}
