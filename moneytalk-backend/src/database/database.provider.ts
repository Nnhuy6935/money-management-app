import { Provider } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { DRIZZLE, PG_POOL } from '../common/constants/injection-tokens';

export const poolProvider: Provider = {
  provide: PG_POOL,
  useFactory: () =>
    new Pool({
      connectionString: process.env.DATABASE_URL,
      // Supabase (và hầu hết cloud PG) yêu cầu SSL
      ssl: process.env.DATABASE_URL?.includes('supabase')
        ? { rejectUnauthorized: false }
        : undefined,
    }),
};

export const databaseProvider: Provider = {
  provide: DRIZZLE,
  inject: [PG_POOL],
  useFactory: (pool: Pool) => drizzle({ client: pool }),
};
