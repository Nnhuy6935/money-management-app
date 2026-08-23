import { Provider } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { DRIZZLE } from '../common/constants/injection-tokens';

export const databaseProvider: Provider = {
  provide: DRIZZLE,
  useFactory: () => {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // Supabase (và hầu hết cloud PG) yêu cầu SSL
      ssl: process.env.DATABASE_URL?.includes('supabase')
        ? { rejectUnauthorized: false }
        : undefined,
    });

    return drizzle({ client: pool });
  },
};
