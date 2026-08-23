import { Inject, Injectable } from '@nestjs/common';
import { count, eq } from 'drizzle-orm';
import { DRIZZLE } from '../../common/constants/injection-tokens';
import { UserRole } from '../../common/constants/roles';
import type { Database } from '../../database/database.types';
import { usersTable } from '../../database/schema';

@Injectable()
export class StatsService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async getOverview() {
    const [totals] = await this.db
      .select({ totalUsers: count() })
      .from(usersTable);

    const [admins] = await this.db
      .select({ adminCount: count() })
      .from(usersTable)
      .where(eq(usersTable.role, UserRole.ADMIN));

    const [regularUsers] = await this.db
      .select({ userCount: count() })
      .from(usersTable)
      .where(eq(usersTable.role, UserRole.USER));

    return {
      totalUsers: Number(totals?.totalUsers ?? 0),
      adminCount: Number(admins?.adminCount ?? 0),
      userCount: Number(regularUsers?.userCount ?? 0),
    };
  }
}
