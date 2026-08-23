import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { DRIZZLE } from '../../common/constants/injection-tokens';
import { DEFAULT_TRANSACTION_TYPES } from '../../common/constants/transaction.constants';
import type { Database } from '../../database/database.types';
import { transactionTypesTable } from '../../database/schema';

@Injectable()
export class TransactionTypesService implements OnModuleInit {
  private readonly logger = new Logger(TransactionTypesService.name);

  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async onModuleInit() {
    await this.seedDefaults();
  }

  findAll() {
    return this.db
      .select()
      .from(transactionTypesTable)
      .orderBy(asc(transactionTypesTable.id));
  }

  async findById(id: number) {
    const [type] = await this.db
      .select()
      .from(transactionTypesTable)
      .where(eq(transactionTypesTable.id, id));

    return type ?? null;
  }

  private async seedDefaults() {
    for (const item of DEFAULT_TRANSACTION_TYPES) {
      const existing = await this.db
        .select({ id: transactionTypesTable.id })
        .from(transactionTypesTable)
        .where(eq(transactionTypesTable.code, item.code));

      if (!existing.length) {
        await this.db.insert(transactionTypesTable).values(item);
        this.logger.log(`Seeded transaction type: ${item.code}`);
      }
    }
  }
}
