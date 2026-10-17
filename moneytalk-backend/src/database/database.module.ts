import {
  Global,
  Inject,
  Module,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../common/constants/injection-tokens';
import { databaseProvider, poolProvider } from './database.provider';

@Global()
@Module({
  providers: [poolProvider, databaseProvider],
  exports: [databaseProvider],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /** Đóng connection pool khi app.close() — tránh treo process (vd e2e). */
  async onApplicationShutdown() {
    await this.pool.end();
  }
}
