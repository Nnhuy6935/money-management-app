import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { and, eq } from 'drizzle-orm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { DRIZZLE } from '../../common/constants/injection-tokens';
import type { AuthUser, JwtPayload } from '../../common/types/auth.types';
import type { Database } from '../../database/database.types';
import { sessionsTable } from '../../database/schema';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET!,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    const [session] = await this.db
      .select({ id: sessionsTable.id })
      .from(sessionsTable)
      .where(
        and(
          eq(sessionsTable.jti, payload.jti),
          eq(sessionsTable.userId, payload.sub),
        ),
      );

    if (!session) {
      throw new UnauthorizedException('Token đã bị thu hồi hoặc không hợp lệ');
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      jti: payload.jti,
    };
  }
}
